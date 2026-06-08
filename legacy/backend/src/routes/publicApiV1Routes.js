// Public-API v1.
//
// Wird ueber X-API-Key authentifiziert (siehe requireApiKey-Middleware).
// Endpunkte sind bewusst dünn: nur die wichtigsten Lese-Operationen, die
// ein externes Tool (Zapier, n8n, Buchhaltungs-SaaS) typischerweise braucht.

const express = require('express')
const requireApiKey = require('../middleware/requireApiKey')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

function publicApiV1Routes() {
  const router = express.Router()

  router.get('/me', requireApiKey(), async (req, res, next) => {
    try {
      const supabase = getSupabaseAdmin()
      const { data } = await supabase
        .from('customers').select('id, name, email').eq('id', req.customer_id).maybeSingle()
      res.json({ ok: true, customer: data, scopes: req.apiScopes })
    } catch (e) { next(e) }
  })

  router.get('/invoices', requireApiKey('read:invoices'), async (req, res, next) => {
    try {
      const supabase = getSupabaseAdmin()
      const limit = Math.min(100, Number(req.query?.limit || 50))
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, amount, total, status, issue_date, due_date')
        .eq('customer_id', req.customer_id)
        .order('issue_date', { ascending: false })
        .limit(limit)
      if (error) throw error
      res.json({ ok: true, invoices: data || [] })
    } catch (e) { next(e) }
  })

  router.get('/appointments', requireApiKey('read:appointments'), async (req, res, next) => {
    try {
      const supabase = getSupabaseAdmin()
      const limit = Math.min(100, Number(req.query?.limit || 50))
      const { data, error } = await supabase
        .from('appointments')
        .select('id, title, start_time, status')
        .eq('customer_id', req.customer_id)
        .order('start_time', { ascending: false })
        .limit(limit)
      if (error) throw error
      res.json({ ok: true, appointments: data || [] })
    } catch (e) { next(e) }
  })

  router.get('/reviews', requireApiKey('read:reviews'), async (req, res, next) => {
    try {
      const supabase = getSupabaseAdmin()
      const limit = Math.min(100, Number(req.query?.limit || 50))
      const { data, error } = await supabase
        .from('review_feedback')
        .select('id, rating, feedback_text, reviewer_name, created_at')
        .eq('customer_id', req.customer_id)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      res.json({ ok: true, reviews: data || [] })
    } catch (e) { next(e) }
  })

  router.get('/loyalty/members', requireApiKey('read:loyalty'), async (req, res, next) => {
    try {
      const supabase = getSupabaseAdmin()
      const limit = Math.min(100, Number(req.query?.limit || 50))
      const { data, error } = await supabase
        .from('loyalty_customers')
        .select('id, email, display_name, points_balance, tier')
        .eq('customer_id', req.customer_id)
        .order('points_balance', { ascending: false })
        .limit(limit)
      if (error) throw error
      res.json({ ok: true, members: data || [] })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = publicApiV1Routes
