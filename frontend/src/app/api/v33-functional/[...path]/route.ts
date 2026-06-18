import { NextRequest, NextResponse } from 'next/server'
import { cleanProxyHeaders, isHtmlResponse, proxyErrorMessage, resolveBackendCandidates } from '../../_proxy/backend'

const API_PREFIX = '/api/v33-functional'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ path?: string[] }> }

async function proxy(req: NextRequest, context: RouteContext) {
  const backends = resolveBackendCandidates(req)
  const params = await context.params
  const path = (params.path || []).join('/')
  const incomingUrl = new URL(req.url)
  const method = req.method.toUpperCase()
  const body = method !== 'GET' && method !== 'HEAD' ? await req.text() : undefined
  const attempts: any[] = []

  for (const backend of backends) {
    const targetUrl = `${backend.base}${API_PREFIX}/${path}${incomingUrl.search}`

    try {
      const init: RequestInit = {
        method,
        headers: cleanProxyHeaders(req),
        cache: 'no-store',
        redirect: 'manual',
        body
      }

      const upstream = await fetch(targetUrl, init)
      const text = await upstream.text()
      const contentType = upstream.headers.get('content-type') || 'application/json'

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
        status: upstream.status,
        statusText: upstream.statusText,
        headers: {
          'content-type': contentType,
          'cache-control': 'no-store',
          'x-mmos-proxy': 'v42.10',
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
    code: 'PROXY_FETCH_FAILED',
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
