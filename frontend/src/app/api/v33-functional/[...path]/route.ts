import { NextRequest, NextResponse } from 'next/server'

const API_PREFIX = '/api/v33-functional'
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

function cleanHeaders(req: NextRequest) {
  const headers = new Headers(req.headers)
  headers.delete('host')
  headers.delete('connection')
  headers.delete('content-length')
  headers.delete('accept-encoding')
  return headers
}

async function proxy(req: NextRequest, context: { params: Promise<{ path?: string[] }> | { path?: string[] } }) {
  const base = getBackendBase()
  const params = await context.params
  const path = (params.path || []).join('/')
  const incomingUrl = new URL(req.url)
  const targetUrl = `${base}${API_PREFIX}/${path}${incomingUrl.search}`

  try {
    const method = req.method.toUpperCase()
    const init: RequestInit = {
      method,
      headers: cleanHeaders(req),
      cache: 'no-store',
      redirect: 'manual'
    }

    if (method !== 'GET' && method !== 'HEAD') {
      init.body = await req.text()
    }

    const upstream = await fetch(targetUrl, init)
    const text = await upstream.text()
    const contentType = upstream.headers.get('content-type') || 'application/json'

    if (text.trim().startsWith('<!DOCTYPE html') || text.trim().startsWith('<html')) {
      return NextResponse.json({
        ok: false,
        code: 'UPSTREAM_HTML_RESPONSE',
        error: 'Backend lieferte HTML statt JSON.',
        targetUrl,
        hint: 'Prüfe Railway-Backend-URL und Backend-Deploy.'
      }, { status: 502 })
    }

    return new NextResponse(text, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: {
        'content-type': contentType,
        'cache-control': 'no-store',
        'x-mmos-proxy': 'v42.5'
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      code: 'PROXY_FETCH_FAILED',
      error: error?.message || 'Proxy konnte Backend nicht erreichen.',
      targetUrl,
      hint: 'Prüfe BACKEND_URL/NEXT_PUBLIC_BACKEND_URL in Vercel und Railway Public Networking.'
    }, { status: 502 })
  }
}

export async function GET(req: NextRequest, context: { params: Promise<{ path?: string[] }> | { path?: string[] } }) {
  return proxy(req, context)
}

export async function POST(req: NextRequest, context: { params: Promise<{ path?: string[] }> | { path?: string[] } }) {
  return proxy(req, context)
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ path?: string[] }> | { path?: string[] } }) {
  return proxy(req, context)
}

export async function PUT(req: NextRequest, context: { params: Promise<{ path?: string[] }> | { path?: string[] } }) {
  return proxy(req, context)
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ path?: string[] }> | { path?: string[] } }) {
  return proxy(req, context)
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
      'access-control-allow-headers': 'Content-Type,Authorization',
      'cache-control': 'no-store'
    }
  })
}
