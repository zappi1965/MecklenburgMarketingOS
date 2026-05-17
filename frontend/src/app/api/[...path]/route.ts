import { NextRequest, NextResponse } from 'next/server'
import { cleanProxyHeaders, isHtmlResponse, proxyErrorMessage, resolveBackendBase } from '../_proxy/backend'

async function proxy(req: NextRequest, context: { params: Promise<{ path?: string[] }> | { path?: string[] } }) {
  const params = await context.params
  const path = (params.path || []).join('/')
  const incomingUrl = new URL(req.url)
  const backend = resolveBackendBase(req)
  const targetUrl = `${backend.base}/api/${path}${incomingUrl.search}`

  if (path === 'proxy-health') {
    return NextResponse.json({
      ok: true,
      service: 'mmos-next-api-proxy',
      backendBase: backend.base,
      backendSource: backend.source,
      warning: backend.warning,
      timestamp: new Date().toISOString()
    })
  }

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

    if (isHtmlResponse(text)) {
      return NextResponse.json({
        ok: false,
        code: 'UPSTREAM_HTML_RESPONSE',
        error: 'Backend lieferte HTML statt JSON.',
        targetUrl,
        backendSource: backend.source,
        warning: backend.warning,
        hint: 'Pruefe BACKEND_URL/NEXT_PUBLIC_BACKEND_URL und ob der Backend-Pfad existiert.'
      }, { status: 502 })
    }

    return new NextResponse(text, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: {
        'content-type': upstream.headers.get('content-type') || 'application/json',
        'cache-control': 'no-store',
        'x-mmos-proxy': 'generic-v42.6'
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      code: 'GENERIC_PROXY_FETCH_FAILED',
      error: proxyErrorMessage(error),
      targetUrl,
      backendSource: backend.source,
      warning: backend.warning,
      hint: 'Pruefe BACKEND_URL/NEXT_PUBLIC_BACKEND_URL in Vercel und Railway Public Networking.'
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
