const express = require('express')
const rateLimit = require('express-rate-limit')
const booking = require('../services/bookingService')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

// Buchungs-Erstellung rate-limiten (Spam-/Abuse-Schutz fuer den
// oeffentlichen Endpoint).
const bookLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.BOOKING_RATE_LIMIT_PER_MIN || 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Zu viele Buchungsversuche. Bitte spaeter erneut.' }
})

// Oeffentliche Routen — vom Buchungs-Widget der Endkunden genutzt.
// Slug wird zu customer_id aufgeloest. In PUBLIC_PATHS whitelisted.
function bookingPublicRoutes() {
  const router = express.Router()

  async function resolve(req, res) {
    const supabase = getSupabaseAdmin()
    if (!supabase) { res.status(503).json({ ok: false, error: 'Supabase nicht konfiguriert' }); return null }
    const resolved = await booking.resolveCustomerBySlug(supabase, String(req.params.slug))
    if (!resolved) { res.status(404).json({ ok: false, error: 'Buchungsseite nicht gefunden' }); return null }
    return resolved
  }

  router.get('/:slug/services', async (req, res, next) => {
    try {
      const r = await resolve(req, res); if (!r) return
      const services = await booking.listServices({ customer_id: r.customer_id })
      res.json({ ok: true, services })
    } catch (e) { next(e) }
  })

  router.get('/:slug/slots', async (req, res, next) => {
    try {
      const r = await resolve(req, res); if (!r) return
      const { service_id, date, resource_id } = req.query || {}
      if (!service_id || !date) return res.status(400).json({ ok: false, error: 'service_id und date erforderlich' })
      const avail = await booking.getAvailability({
        customer_id: r.customer_id,
        service_id: String(service_id),
        date: String(date),
        resource_id: resource_id ? String(resource_id) : null
      })
      res.json({ ok: true, ...avail })
    } catch (e) {
      if (e.status && e.status < 500) return res.status(e.status).json({ ok: false, code: e.code, error: e.message })
      next(e)
    }
  })

  router.post('/:slug/book', bookLimit, async (req, res, next) => {
    try {
      const r = await resolve(req, res); if (!r) return
      const result = await booking.createBooking({
        customer_id: r.customer_id,
        service_id: req.body?.service_id,
        resource_id: req.body?.resource_id || null,
        date: req.body?.date,
        time: req.body?.time,
        contact: req.body?.contact || {}
      })
      res.json({ ok: true, ...result })
    } catch (e) {
      if (e.status && e.status < 500) return res.status(e.status).json({ ok: false, code: e.code, error: e.message })
      next(e)
    }
  })

  return router
}

module.exports = { bookingPublicRoutes }
