const express = require('express')
const StripeService = require('../services/stripeService')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

const ALLOWED_REDIRECT_ORIGINS = [
  'https://mecklenburgmarketing.de',
  'https://www.mecklenburgmarketing.de'
]

function isAllowedRedirectUrl(url) {
  if (!url) return false
  try {
    const parsed = new URL(url)
    const envOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.FRONTEND_URL || ''
    const allowed = [...ALLOWED_REDIRECT_ORIGINS, envOrigin].filter(Boolean)
    return allowed.some((origin) => parsed.origin === new URL(origin).origin)
  } catch {
    return false
  }
}

async function idempotencyGuard(supabase, eventId) {
  if (!supabase || !eventId) return false
  const { data } = await supabase
    .from('stripe_events')
    .select('id')
    .eq('stripe_event_id', String(eventId))
    .maybeSingle()
    .catch(() => ({ data: null }))
  return Boolean(data)
}

function stripeRoutes(supabase) {
  const router = express.Router()
  const stripeService = new StripeService()

  router.post('/checkout', async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ ok: false, error: 'Nicht authentifiziert.' })
      }
      const { packageName, priceCents, successUrl, cancelUrl, customerEmail } = req.body || {}

      if (!priceCents || typeof priceCents !== 'number' || priceCents <= 0 || !Number.isInteger(priceCents)) {
        return res.status(400).json({ ok: false, error: 'priceCents muss eine positive Ganzzahl sein.' })
      }
      if (priceCents > 100000 * 100) {
        return res.status(400).json({ ok: false, error: 'priceCents überschreitet das Maximum.' })
      }
      if (!isAllowedRedirectUrl(successUrl)) {
        return res.status(400).json({ ok: false, error: 'successUrl zeigt auf eine nicht erlaubte Domain.' })
      }
      if (!isAllowedRedirectUrl(cancelUrl)) {
        return res.status(400).json({ ok: false, error: 'cancelUrl zeigt auf eine nicht erlaubte Domain.' })
      }

      const session = await stripeService.createCheckoutSession({
        customerEmail: customerEmail || req.user.email,
        packageName: String(packageName || 'MMOS').slice(0, 100),
        priceCents,
        successUrl,
        cancelUrl
      })
      res.json({ ok: true, data: session })
    } catch (e) { next(e) }
  })

  router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
    try {
      const sig = req.headers['stripe-signature']
      const event = await stripeService.constructWebhook(req.body, sig)
      const db = supabase || getSupabaseAdmin()

      if (await idempotencyGuard(db, event.id)) {
        return res.json({ received: true, duplicate: true })
      }

      if (event.type === 'checkout.session.completed') {
        if (db) {
          await db.from('stripe_events').insert({
            stripe_event_id: event.id,
            type: event.type,
            payload: event
          }).catch(() => null)
        }
      }

      if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
        const sub = event.data.object
        if (db) {
          await db.from('stripe_customers')
            .update({ subscription_status: sub.status, stripe_subscription_id: sub.id })
            .eq('stripe_subscription_id', sub.id)
            .catch(() => null)
        }
      }

      res.json({ received: true })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = stripeRoutes
