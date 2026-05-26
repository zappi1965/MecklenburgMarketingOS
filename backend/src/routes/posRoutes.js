const express = require('express')
const requireCustomerAccess = require('../middleware/requireCustomerAccess')
const pos = require('../services/posService')

// Webhook ist oeffentlich erreichbar — Signaturpruefung im Service.
// Liest raw body fuer HMAC-Verifikation.
function posRoutes() {
  const router = express.Router()

  // Raw-Body-Capture nur fuer Webhook-Endpoint (alle anderen Routen nutzen
  // den globalen express.json).
  router.post('/webhook/:provider',
    express.text({ type: '*/*', limit: '1mb' }),
    async (req, res, next) => {
      try {
        const provider = String(req.params.provider).toLowerCase()
        const rawPayload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
        let body = {}
        try { body = rawPayload ? JSON.parse(rawPayload) : {} } catch (_) { body = {} }
        const signature = req.get('x-payload-signature') || req.get('x-sumup-signature') || ''
        const row = await pos.ingestWebhook({
          provider, body, rawPayload, signature,
          customer_id_hint: req.get('x-mmos-customer-id') || null
        })
        res.json({ ok: true, transaction: row })
      } catch (e) {
        if (e.status === 401) return res.status(401).json({ ok: false, error: e.message })
        next(e)
      }
    }
  )

  // Admin-Liste der letzten POS-Transaktionen pro Customer.
  router.get('/transactions/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const { getSupabaseAdmin } = require('../lib/supabaseAdmin')
      const supabase = getSupabaseAdmin()
      const { data, error } = await supabase
        .from('pos_transactions')
        .select('*')
        .eq('customer_id', req.params.customer_id)
        .order('transaction_time', { ascending: false })
        .limit(100)
      if (error) throw error
      res.json({ ok: true, transactions: data || [] })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = posRoutes
