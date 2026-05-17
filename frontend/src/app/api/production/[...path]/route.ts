import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_BACKEND_URL = 'https://mecklenburgmarketingos-production.up.railway.app'

function normalizeBackendBase(value: string | undefined) {
  const raw = String(value || '').trim().replace(/\/+$/, '')
  if (!raw) return ''
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  return `https://${raw}`
}

function getBackendBase() {
  return normalizeBackendBase(
    process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.RAILWAY_BACKEND_URL ||
      DEFAULT_BACKEND_URL
  )
}

async function readJson(req: NextRequest) {
  try {
    const text = await req.text()
    return text ? JSON.parse(text) : {}
  } catch {
    return {}
  }
}

function customerIdFrom(req: NextRequest, body: any) {
  const url = new URL(req.url)
  return (
    url.searchParams.get('customer_id') ||
    url.searchParams.get('cid') ||
    body?.customer_id ||
    body?.cid ||
    '11111111-1111-1111-1111-111111111111'
  )
}

async function upstreamJson(targetUrl: string, init: RequestInit = {}) {
  try {
    const res = await fetch(targetUrl, {
      ...init,
      cache: 'no-store',
      headers: {
        'content-type': 'application/json',
        ...(init.headers || {})
      }
    })
    const text = await res.text()

    if (text.trim().startsWith('<!DOCTYPE html') || text.trim().startsWith('<html')) {
      return NextResponse.json({
        ok: false,
        code: 'UPSTREAM_HTML_RESPONSE',
        error: 'Backend lieferte HTML statt JSON.',
        targetUrl
      }, { status: 502 })
    }

    return new NextResponse(text, {
      status: res.status,
      statusText: res.statusText,
      headers: {
        'content-type': res.headers.get('content-type') || 'application/json',
        'cache-control': 'no-store',
        'x-mmos-legacy-proxy': 'v42.5'
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      code: 'LEGACY_PROXY_FETCH_FAILED',
      error: error?.message || 'Legacy Proxy konnte Backend nicht erreichen.',
      targetUrl
    }, { status: 502 })
  }
}

async function handler(req: NextRequest, context: { params: Promise<{ path?: string[] }> | { path?: string[] } }) {
  const params = await context.params
  const path = (params.path || []).join('/')
  const base = getBackendBase()
  const body = req.method === 'GET' ? {} : await readJson(req)
  const cid = customerIdFrom(req, body)

  if (path === 'health' || path === 'system/health') {
    return upstreamJson(`${base}/api/system/health`)
  }

  if (path === 'v42/health') {
    return upstreamJson(`${base}/api/v33-functional/v42/health`)
  }

  if (path === 'provision') {
    return upstreamJson(`${base}/api/v33-functional/v39/${cid}/provision-safe`, {
      method: 'POST',
      body: JSON.stringify(body || {})
    })
  }

  if (path === 'customer-360' || path === 'customer360') {
    return upstreamJson(`${base}/api/v33-functional/v38/${cid}/customer-360`)
  }

  // Generic escape hatch:
  return upstreamJson(`${base}/api/${path}${new URL(req.url).search}`, {
    method: req.method,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : JSON.stringify(body || {})
  })
}

export async function GET(req: NextRequest, context: { params: Promise<{ path?: string[] }> | { path?: string[] } }) {
  return handler(req, context)
}

export async function POST(req: NextRequest, context: { params: Promise<{ path?: string[] }> | { path?: string[] } }) {
  return handler(req, context)
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'Content-Type,Authorization',
      'cache-control': 'no-store'
    }
  })
}
