import { NextRequest, NextResponse } from 'next/server'
import { cleanProxyHeaders, isHtmlResponse, proxyErrorMessage, resolveBackendCandidates } from '../../_proxy/backend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ReviewPayload = {
  slug?: string
  publicSlug?: string
  public_slug?: string
  campaignSlug?: string
  rating?: number | string
  feedback?: string
  comment?: string
  reviewerName?: string
  name?: string
  customerEmail?: string
  email?: string
  customerId?: string
  customerName?: string
  googleReviewUrl?: string
}

function withCors(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

function json(payload: unknown, status = 200) {
  return withCors(NextResponse.json(payload, { status }))
}

function clean(value: unknown, max = 300) {
  const v = String(value ?? '').trim()
  return v ? v.slice(0, max) : ''
}

export async function OPTIONS() {
  return json({ ok: true })
}

export async function POST(request: NextRequest) {
  let payload: ReviewPayload
  try {
    payload = await request.json()
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400)
  }

  const slug = clean(payload.slug || payload.publicSlug || payload.public_slug || payload.campaignSlug, 120)
  if (!slug) {
    return json({
      ok: false,
      code: 'PUBLIC_REVIEW_SLUG_REQUIRED',
      error: 'Diese Review-Route speichert nicht mehr direkt per Vercel-Service-Role. Bitte die Slugseite /l/[slug] bzw. /api/v33-functional/public/loyalty/[slug]/review nutzen oder im Payload slug mitgeben.'
    }, 400)
  }

  const mappedPayload = {
    rating: payload.rating,
    feedback_text: payload.feedback ?? payload.comment ?? null,
    comment: payload.comment ?? payload.feedback ?? null,
    reviewer_name: payload.reviewerName ?? payload.name ?? null,
    reviewer_email: payload.customerEmail ?? payload.email ?? null,
    customer_id: payload.customerId ?? null,
    customer_name: payload.customerName ?? null,
    google_review_url: payload.googleReviewUrl ?? null,
    source: 'public_review_feedback_proxy'
  }

  const body = JSON.stringify(mappedPayload)
  const attempts: any[] = []
  const backends = resolveBackendCandidates(request)

  for (const backend of backends) {
    const targetUrl = `${backend.base}/api/v33-functional/public/loyalty/${encodeURIComponent(slug)}/review`
    try {
      const upstream = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          ...Object.fromEntries(cleanProxyHeaders(request).entries()),
          'content-type': 'application/json'
        },
        body,
        cache: 'no-store',
        redirect: 'manual'
      })
      const text = await upstream.text()
      if (isHtmlResponse(text)) {
        attempts.push({ targetUrl, backendSource: backend.source, warning: backend.warning, error: 'Backend lieferte HTML statt JSON.' })
        continue
      }
      return withCors(new NextResponse(text, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: {
          'content-type': upstream.headers.get('content-type') || 'application/json',
          'cache-control': 'no-store',
          'x-mmos-review-feedback-proxy': 'v103.8'
        }
      }))
    } catch (error: any) {
      attempts.push({ targetUrl, backendSource: backend.source, warning: backend.warning, error: proxyErrorMessage(error) })
    }
  }

  return json({ ok: false, code: 'PUBLIC_REVIEW_PROXY_FAILED', error: attempts.at(-1)?.error || 'Backend nicht erreichbar.', attempts }, 502)
}
