import { NextRequest, NextResponse } from 'next/server'
import { getOptionalEnv, getPublicAppUrl } from '../../../../lib/mmos/env'
import { createSupabaseAdminClient } from '../../../../lib/mmos/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ReviewPayload = {
  customerId?: string
  customerName?: string
  rating?: number | string
  feedback?: string
  comment?: string
  reviewerName?: string
  name?: string
  customerEmail?: string
  email?: string
  source?: string
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

function normalizeRating(value: unknown): number | null {
  const rating = Number(value)

  if (!Number.isFinite(rating)) return null

  const rounded = Math.round(rating)

  if (rounded < 1 || rounded > 5) return null

  return rounded
}

function cleanText(value: unknown, maxLength = 2000): string | null {
  const cleaned = String(value ?? '').trim()

  if (!cleaned) return null

  return cleaned.slice(0, maxLength)
}

async function sendInternalReviewAlert(input: {
  rating: number
  customerName: string | null
  feedback: string | null
  reviewerName: string | null
  customerEmail: string | null
}) {
  const apiKey = getOptionalEnv(['RESEND_API_KEY'])
  const from = getOptionalEnv(['MAIL_FROM'])
  const to = getOptionalEnv(['REVIEW_ALERT_TO', 'MAIL_TO', 'MAIL_FROM'])

  if (!apiKey || !from || !to) {
    return {
      sent: false,
      skipped: true,
      reason: 'mail_not_configured'
    }
  }

  const subject = `MMOS Review Shield: ${input.rating}-Sterne Feedback`

  const text = [
    'Neues internes Kundenfeedback ist eingegangen.',
    '',
    `Bewertung: ${input.rating} / 5`,
    `Betrieb: ${input.customerName ?? 'Nicht angegeben'}`,
    `Name: ${input.reviewerName ?? 'Nicht angegeben'}`,
    `E-Mail: ${input.customerEmail ?? 'Nicht angegeben'}`,
    '',
    'Feedback:',
    input.feedback ?? 'Kein Textfeedback angegeben.',
    '',
    `Quelle: ${getPublicAppUrl()}`
  ].join('\n')

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text
    })
  })

  if (!response.ok) {
    return {
      sent: false,
      skipped: false,
      reason: `resend_${response.status}`
    }
  }

  return {
    sent: true,
    skipped: false,
    reason: null
  }
}

export async function OPTIONS() {
  return json({ ok: true })
}

export async function POST(request: NextRequest) {
  let payload: ReviewPayload

  try {
    payload = await request.json()
  } catch {
    return json(
      {
        ok: false,
        error: 'invalid_json'
      },
      400
    )
  }

  const rating = normalizeRating(payload.rating)

  if (!rating) {
    return json(
      {
        ok: false,
        error: 'invalid_rating',
        message: 'rating muss eine Zahl zwischen 1 und 5 sein.'
      },
      400
    )
  }

  const feedback = cleanText(payload.feedback ?? payload.comment)
  const customerName = cleanText(payload.customerName, 180)
  const reviewerName = cleanText(payload.reviewerName ?? payload.name, 180)
  const customerEmail = cleanText(payload.customerEmail ?? payload.email, 240)
  const customerId = cleanText(payload.customerId, 120)
  const source = cleanText(payload.source, 120) ?? 'public_review_page'
  const googleReviewUrl = cleanText(payload.googleReviewUrl, 600)

  const shouldRedirectToGoogle = rating >= 4 && Boolean(googleReviewUrl)

  try {
    const supabase = createSupabaseAdminClient()

    const { error } = await supabase.from('review_feedback').insert({
      customer_id: customerId,
      customer_name: customerName,
      rating,
      feedback,
      reviewer_name: reviewerName,
      customer_email: customerEmail,
      source,
      google_review_url: googleReviewUrl,
      status: rating <= 3 ? 'internal_followup' : 'positive',
      is_demo: false,
      metadata: {
        user_agent: request.headers.get('user-agent'),
        ip_hint:
          request.headers.get('x-forwarded-for') ??
          request.headers.get('x-real-ip') ??
          null
      }
    })

    if (error) {
      return json(
        {
          ok: false,
          error: 'database_insert_failed',
          message: error.message
        },
        500
      )
    }

    const mail =
      rating <= 3
        ? await sendInternalReviewAlert({
            rating,
            customerName,
            feedback,
            reviewerName,
            customerEmail
          })
        : {
            sent: false,
            skipped: true,
            reason: 'positive_review'
          }

    return json({
      ok: true,
      rating,
      status: rating <= 3 ? 'internal_followup' : 'positive',
      redirectToGoogle: shouldRedirectToGoogle,
      googleReviewUrl: shouldRedirectToGoogle ? googleReviewUrl : null,
      mail
    })
  } catch (error) {
    return json(
      {
        ok: false,
        error: 'review_feedback_failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    )
  }
}
