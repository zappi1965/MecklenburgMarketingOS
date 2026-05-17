import { NextRequest, NextResponse } from 'next/server'
import { isHtmlResponse, proxyErrorMessage, resolveBackendBase } from '../../_proxy/backend'

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

async function upstreamJson(targetUrl: string, backend: ReturnType<typeof resolveBackendBase>, init: RequestInit = {}) {
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

    if (isHtmlResponse(text)) {
      return NextResponse.json({
        ok: false,
        code: 'UPSTREAM_HTML_RESPONSE',
        error: 'Backend lieferte HTML statt JSON.',
        targetUrl,
        backendSource: backend.source,
        warning: backend.warning
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
      error: proxyErrorMessage(error),
      targetUrl,
      backendSource: backend.source,
      warning: backend.warning
    }, { status: 502 })
  }
}

type RouteContext = { params: Promise<{ path?: string[] }> }

async function handler(req: NextRequest, context: RouteContext) {
  const params = await context.params
  const path = (params.path || []).join('/')
  const backend = resolveBackendBase(req)
  const base = backend.base
  const body = req.method === 'GET' ? {} : await readJson(req)
  const cid = customerIdFrom(req, body)

  if (path === 'health' || path === 'system/health') {
    return upstreamJson(`${base}/api/system/health`, backend)
  }

  if (path === 'v42/health') {
    return upstreamJson(`${base}/api/v33-functional/v42/health`, backend)
  }

  if (path === 'provision') {
    return upstreamJson(`${base}/api/v33-functional/v39/${cid}/provision-safe`, backend, {
      method: 'POST',
      body: JSON.stringify(body || {})
    })
  }

  if (path === 'customer-360' || path === 'customer360') {
    return upstreamJson(`${base}/api/v33-functional/v38/${cid}/customer-360`, backend)
  }

  // Generic escape hatch:
  return upstreamJson(`${base}/api/${path}${new URL(req.url).search}`, backend, {
    method: req.method,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : JSON.stringify(body || {})
  })
}

export async function GET(req: NextRequest, context: RouteContext) {
  return handler(req, context)
}

export async function POST(req: NextRequest, context: RouteContext) {
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
