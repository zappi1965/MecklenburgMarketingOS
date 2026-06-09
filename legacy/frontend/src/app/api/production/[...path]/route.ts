import { NextRequest, NextResponse } from 'next/server'
import { isHtmlResponse, proxyErrorMessage, resolveBackendCandidates, type ResolvedBackend } from '../../_proxy/backend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

async function upstreamJson(targets: Array<{ targetUrl: string; backend: ResolvedBackend }>, init: RequestInit = {}) {
  const attempts: any[] = []

  for (const { targetUrl, backend } of targets) {
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
      attempts.push({
        targetUrl,
        backendSource: backend.source,
        warning: backend.warning,
        error: 'Backend lieferte HTML statt JSON.'
      })
      continue
    }

    return new NextResponse(text, {
      status: res.status,
      statusText: res.statusText,
      headers: {
        'content-type': res.headers.get('content-type') || 'application/json',
        'cache-control': 'no-store',
        'x-mmos-legacy-proxy': 'v42.10',
        'x-mmos-backend-source': backend.source
      }
    })
  } catch (error: any) {
    attempts.push({
      targetUrl,
      backendSource: backend.source,
      warning: backend.warning,
      error: proxyErrorMessage(error)
    })
  }
  }

  return NextResponse.json({
    ok: false,
    code: 'LEGACY_PROXY_FETCH_FAILED',
    error: attempts.at(-1)?.error || 'fetch failed',
    attempts
  }, { status: 502 })
}

type RouteContext = { params: Promise<{ path?: string[] }> }

async function handler(req: NextRequest, context: RouteContext) {
  const params = await context.params
  const path = (params.path || []).join('/')
  const backends = resolveBackendCandidates(req)
  const body = req.method === 'GET' ? {} : await readJson(req)
  const cid = customerIdFrom(req, body)

  if (path === 'health' || path === 'system/health') {
    return upstreamJson(backends.map((backend) => ({ backend, targetUrl: `${backend.base}/api/system/health` })))
  }

  if (path === 'v42/health') {
    return upstreamJson(backends.map((backend) => ({ backend, targetUrl: `${backend.base}/api/v33-functional/v42/health` })))
  }

  if (path === 'provision') {
    return upstreamJson(backends.map((backend) => ({ backend, targetUrl: `${backend.base}/api/v33-functional/v39/${cid}/provision-safe` })), {
      method: 'POST',
      body: JSON.stringify(body || {})
    })
  }

  if (path === 'customer-360' || path === 'customer360') {
    return upstreamJson(backends.map((backend) => ({ backend, targetUrl: `${backend.base}/api/v33-functional/v38/${cid}/customer-360` })))
  }

  // Generic escape hatch:
  return upstreamJson(backends.map((backend) => ({ backend, targetUrl: `${backend.base}/api/${path}${new URL(req.url).search}` })), {
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
