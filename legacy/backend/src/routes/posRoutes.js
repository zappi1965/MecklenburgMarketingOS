const express = require('express')
const requireCustomerAccess = require('../middleware/requireCustomerAccess')
const pos = require('../services/posService')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

// Webhook ist oeffentlich erreichbar — Signaturpruefung im Service.
// V1-Fokus: Umsatz-/Transaktionsdaten anzeigen, keine Kassensystem-Ersetzung.
function posRoutes() {
  const router = express.Router()

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

  router.get('/providers/sumup/status/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const supabase = getSupabaseAdmin()
      const config = await pos.readSumUpConfig(supabase, { customer_id: req.params.customer_id })
      res.json({ ok: true, provider: 'sumup', config: { ...config, access_token: undefined } })
    } catch (e) { next(e) }
  })

  router.post('/providers/sumup/connect/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const supabase = getSupabaseAdmin()
      const result = await pos.upsertSumUpConfig(supabase, {
        customer_id: req.params.customer_id,
        access_token: req.body?.access_token,
        merchant_code: req.body?.merchant_code || '',
        api_base: req.body?.api_base || '',
        actor: req.user?.email || req.body?.actor || 'Admin'
      })
      res.json(result)
    } catch (e) { next(e) }
  })

  router.post('/providers/sumup/sync/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const supabase = getSupabaseAdmin()
      const result = await pos.syncSumUpTransactions(supabase, {
        customer_id: req.params.customer_id,
        from: req.body?.from || null,
        to: req.body?.to || null,
        limit: req.body?.limit || 100
      })
      res.json(result)
    } catch (e) { next(e) }
  })

  router.get('/summary/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const supabase = getSupabaseAdmin()
      const result = await pos.getRevenueSummary(supabase, { customer_id: req.params.customer_id, days: req.query.days || 90 })
      res.json(result)
    } catch (e) { next(e) }
  })

  router.get('/transactions/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const supabase = getSupabaseAdmin()
      const transactions = await pos.listTransactions(supabase, {
        customer_id: req.params.customer_id,
        from: req.query.from || null,
        to: req.query.to || null,
        limit: req.query.limit || 100
      })
      res.json({ ok: true, transactions })
    } catch (e) { next(e) }
  })

  router.patch('/transactions/:transaction_id/link', requireCustomerAccess(), async (req, res, next) => {
    try {
      const supabase = getSupabaseAdmin()
      const result = await pos.linkTransaction(supabase, {
        transaction_id: req.params.transaction_id,
        customer_id: req.body?.customer_id || null,
        qr_campaign_id: req.body?.qr_campaign_id || null,
        appointment_id: req.body?.appointment_id || null,
        loyalty_customer_id: req.body?.loyalty_customer_id || null,
        lead_id: req.body?.lead_id || null,
        note: req.body?.note || '',
        actor: req.user?.email || 'Admin'
      })
      res.json(result)
    } catch (e) { next(e) }
  })

  return router
}

module.exports = posRoutes
