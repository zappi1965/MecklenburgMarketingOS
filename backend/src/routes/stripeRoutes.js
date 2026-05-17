
const express = require('express')
const StripeService = require('../services/stripeService')

function stripeRoutes(supabase) {
  const router = express.Router()
  const stripeService = new StripeService()

  router.post('/checkout', async (req, res, next) => {
    try {
      const session = await stripeService.createCheckoutSession(req.body)
      res.json({ ok: true, data: session })
    } catch (e) { next(e) }
  })

  router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
    try {
      const sig = req.headers['stripe-signature']
      const event = await stripeService.constructWebhook(req.body, sig)

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object
        await supabase.from('stripe_events').insert({
          stripe_event_id: event.id,
          type: event.type,
          payload: event
        }).catch(()=>null)
      }

      if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
        const sub = event.data.object
        await supabase.from('stripe_customers')
          .update({ subscription_status: sub.status, stripe_subscription_id: sub.id })
          .eq('stripe_subscription_id', sub.id)
          .catch(()=>null)
      }

      res.json({ received: true })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = stripeRoutes
