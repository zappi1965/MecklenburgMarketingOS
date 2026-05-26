const express = require('express')
const requireCustomerAccess = require('../middleware/requireCustomerAccess')
const noShow = require('../services/noShowService')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

function noShowRoutes() {
  const router = express.Router()

  // Einzel-Berechnung fuer einen Termin (Admin oder berechtigter Customer).
  router.post('/calculate/:appointment_id', async (req, res, next) => {
    try {
      const supabase = getSupabaseAdmin()
      const { data: appt } = await supabase
        .from('appointments')
        .select('customer_id')
        .eq('id', req.params.appointment_id)
        .maybeSingle()
      if (!appt) return res.status(404).json({ ok: false, error: 'Termin nicht gefunden' })
      // Per-Customer-Access-Pruefung manuell, weil customer_id aus der Termin-Zeile kommt.
      if (req.userRole !== 'admin') {
        const { data } = await supabase
          .from('customer_users')
          .select('id').eq('auth_user_id', req.user.id).eq('customer_id', appt.customer_id).maybeSingle()
        if (!data) return res.status(403).json({ ok: false, error: 'Kein Zugriff' })
      }
      const score = await noShow.calculateForAppointment(req.params.appointment_id)
      res.json({ ok: true, score })
    } catch (e) { next(e) }
  })

  // Bulk-Scan fuer alle anstehenden Termine. Admin-only.
  router.post('/scan', async (req, res, next) => {
    try {
      if (req.userRole !== 'admin') return res.status(403).json({ ok: false, error: 'Admin erforderlich' })
      const result = await noShow.scanUpcoming({
        days_ahead: Number(req.body?.days_ahead || 14),
        limit: Math.min(500, Number(req.body?.limit || 200))
      })
      res.json({ ok: true, result })
    } catch (e) { next(e) }
  })

  // Liste der hoch-/mittel-Risiko-Termine eines Customers.
  router.get('/high-risk/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const supabase = getSupabaseAdmin()
      const { data, error } = await supabase
        .from('appointment_risk_scores')
        .select('appointment_id, risk_score, risk_level, reasons, reminder_strategy')
        .eq('customer_id', req.params.customer_id)
        .in('risk_level', ['medium', 'high'])
        .order('risk_score', { ascending: false })
        .limit(50)
      if (error) throw error
      res.json({ ok: true, scores: data || [] })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = noShowRoutes
