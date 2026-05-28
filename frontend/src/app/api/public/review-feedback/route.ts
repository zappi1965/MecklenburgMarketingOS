
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { reportServerError } from '@/lib/errorReporter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const buckets = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60_000
const MAX_REQUESTS = 8

function ipFrom(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
}

function rateLimited(ip: string) {
  const now = Date.now()
  const entry = buckets.get(ip)
  if (!entry || entry.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }

  entry.count += 1
  return entry.count > MAX_REQUESTS
}

function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

async function readBody(req: NextRequest) {
  try {
    return await req.json()
  } catch {
    return {}
  }
}

export async function POST(req: NextRequest) {
  const ip = ipFrom(req)

  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  }

  const body = await readBody(req)
  const customerId = String(body.customer_id || '').trim()
  const rating = Number(body.rating)
  const message = String(body.message || '').trim().slice(0, 1200)

  if (!customerId) {
    return NextResponse.json({ ok: false, error: 'missing_customer_id' }, { status: 400 })
  }

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ ok: false, error: 'invalid_rating' }, { status: 400 })
  }

  const payload = {
    id: body.id || `public_review_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    customer_id: customerId,
    rating,
    message,
    status: rating >= 4 ? 'Google Weiterleitung' : 'Internes Feedback',
    source: 'public_hub',
    is_demo: Boolean(body.is_demo),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const client = supabaseServer()
  if (!client) {
    return NextResponse.json({ ok: true, stored: false, reason: 'supabase_not_configured', feedback: payload }, { status: 202 })
  }

  try {
    const { error } = await client.from('review_feedback').insert(payload)
    if (error) throw error
    return NextResponse.json({ ok: true, stored: true, feedback: payload })
  } catch (error) {
    reportServerError('public_review_feedback_insert_failed', error, { customerId, rating })
    return NextResponse.json({ ok: true, stored: false, reason: 'insert_failed', feedback: payload }, { status: 202 })
  }
}
