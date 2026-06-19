import { NextRequest, NextResponse } from 'next/server'
import { cleanProxyHeaders, isHtmlResponse, proxyErrorMessage, resolveBackendCandidates } from '../_proxy/backend'

type RouteContext = { params: Promise<{ path?: string[] }> }

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function proxy(req: NextRequest, context: RouteContext) {
  const params = await context.params
  const path = (params.path || []).join('/')
  const incomingUrl = new URL(req.url)
  const backends = resolveBackendCandidates(req)

  if (path === 'proxy-health') {
    const checks: any[] = []

    for (const backend of backends) {
      const targetUrl = `${backend.base}/api/system/health`
      try {
        const upstream = await fetch(targetUrl, { cache: 'no-store' })
        const text = await upstream.text()
        checks.push({
          ok: upstream.ok,
          status: upstream.status,
          backendBase: backend.base,
          backendSource: backend.source,
          warning: backend.warning,
          body: text.slice(0, 500)
        })
        if (upstream.ok) break
      } catch (error: any) {
        checks.push({
          ok: false,
          backendBase: backend.base,
          backendSource: backend.source,
          warning: backend.warning,
          error: proxyErrorMessage(error)
        })
      }
    }

    return NextResponse.json({
      ok: checks.some((x) => x.ok),
      service: 'mmos-next-api-proxy',
      checks,
      timestamp: new Date().toISOString()
    })
  }

  const method = req.method.toUpperCase()
  const body = method !== 'GET' && method !== 'HEAD' ? await req.text() : undefined
  const attempts: any[] = []

  for (const backend of backends) {
    const targetUrl = `${backend.base}/api/${path}${incomingUrl.search}`

    try {
      const init: RequestInit = {
        method,
        headers: cleanProxyHeaders(req),
        cache: 'no-store',
        redirect: 'manual',
        body
      }

      const upstream = await fetch(targetUrl, init)
      const contentType = upstream.headers.get('content-type') || 'application/json'
      const bodyBuffer = await upstream.arrayBuffer()

      if (contentType.includes('text/html')) {
        const text = new TextDecoder().decode(bodyBuffer)
        if (isHtmlResponse(text)) {
          attempts.push({
            targetUrl,
            backendSource: backend.source,
            warning: backend.warning,
            error: 'Backend lieferte HTML statt JSON/PDF.'
          })
          continue
        }
      }

      return new NextResponse(bodyBuffer, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: {
          'content-type': contentType,
          'cache-control': 'no-store',
          'content-disposition': upstream.headers.get('content-disposition') || '',
          'x-mmos-proxy': 'generic-v42.20.1-binary',
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
    code: 'GENERIC_PROXY_FETCH_FAILED',
    error: attempts.at(-1)?.error || 'fetch failed',
    attempts,
    hint: 'Vercel konnte keinen Backend-Kandidaten erreichen. BACKEND_URL darf keine Railway-Private-URL (*.railway.internal) sein; der Proxy nutzt als Fallback die oeffentliche Railway-URL.'
  }, { status: 502 })
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
      'access-control-allow-origin': process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://mecklenburgmarketing.de',
      'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
      'access-control-allow-headers': 'Content-Type,Authorization',
      'cache-control': 'no-store'
    }
  })
}
