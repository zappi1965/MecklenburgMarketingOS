import { NextRequest, NextResponse } from 'next/server'
import { cleanProxyHeaders, isHtmlResponse, proxyErrorMessage, resolveBackendBase } from '../../_proxy/backend'

const API_PREFIX = '/api/v33-functional'

type RouteContext = { params: Promise<{ path?: string[] }> }

async function proxy(req: NextRequest, context: RouteContext) {
  const backend = resolveBackendBase(req)
  const params = await context.params
  const path = (params.path || []).join('/')
  const incomingUrl = new URL(req.url)
  const targetUrl = `${backend.base}${API_PREFIX}/${path}${incomingUrl.search}`

  try {
    const method = req.method.toUpperCase()
    const init: RequestInit = {
      method,
      headers: cleanProxyHeaders(req),
      cache: 'no-store',
      redirect: 'manual'
    }

    if (method !== 'GET' && method !== 'HEAD') {
      init.body = await req.text()
    }

    const upstream = await fetch(targetUrl, init)
    const text = await upstream.text()
    const contentType = upstream.headers.get('content-type') || 'application/json'

    if (isHtmlResponse(text)) {
      return NextResponse.json({
        ok: false,
        code: 'UPSTREAM_HTML_RESPONSE',
        error: 'Backend lieferte HTML statt JSON.',
        targetUrl,
        backendSource: backend.source,
        warning: backend.warning,
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
      error: proxyErrorMessage(error),
      targetUrl,
      backendSource: backend.source,
      warning: backend.warning,
      hint: 'Prüfe BACKEND_URL/NEXT_PUBLIC_BACKEND_URL in Vercel und Railway Public Networking.'
    }, { status: 502 })
  }
}

export async function GET(req: NextRequest, context: RouteContext) {
  return proxy(req, context)
}

export async function POST(req: NextRequest, context: RouteContext) {
  return proxy(req, context)
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  return proxy(req, context)
}

export async function PUT(req: NextRequest, context: RouteContext) {
  return proxy(req, context)
}

export async function DELETE(req: NextRequest, context: RouteContext) {
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
