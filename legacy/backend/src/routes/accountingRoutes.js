const express = require('express')
const requireCustomerAccess = require('../middleware/requireCustomerAccess')
const { buildExport } = require('../services/accountingExportService')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

const ALLOWED_FORMATS = ['datev_extf', 'lexoffice_csv', 'sevdesk_csv']

function accountingRoutes() {
  const router = express.Router()

  // Generiert den Export als Download (Streaming-CSV/EXTF).
  // Optional customer_id-Filter; ohne ihn ueber alle Customers (Admin-only).
  router.get('/export', async (req, res, next) => {
    try {
      const format = String(req.query.format || 'datev_extf')
      if (!ALLOWED_FORMATS.includes(format)) {
        return res.status(400).json({ ok: false, error: `Format unbekannt. Erlaubt: ${ALLOWED_FORMATS.join(', ')}` })
      }
      const period_start = String(req.query.period_start || '')
      const period_end = String(req.query.period_end || '')
      if (!/^\d{4}-\d{2}-\d{2}$/.test(period_start) || !/^\d{4}-\d{2}-\d{2}$/.test(period_end)) {
        return res.status(400).json({ ok: false, error: 'period_start und period_end im Format YYYY-MM-DD erforderlich' })
      }
      const customer_id = req.query.customer_id ? String(req.query.customer_id) : null
      if (!customer_id && req.userRole !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Ohne customer_id-Filter ist Admin erforderlich' })
      }
      // Per-Customer-Access-Check, wenn customer_id gesetzt.
      if (customer_id && req.userRole !== 'admin') {
        const supabase = getSupabaseAdmin()
        const { data } = await supabase
          .from('customer_users')
          .select('id').eq('auth_user_id', req.user.id).eq('customer_id', customer_id).maybeSingle()
        if (!data) return res.status(403).json({ ok: false, error: 'Kein Zugriff auf diesen Kunden' })
      }

      const result = await buildExport({ format, period_start, period_end, customer_id })

      // Audit-Eintrag.
      try {
        const supabase = getSupabaseAdmin()
        await supabase.from('accounting_exports').insert({
          customer_id,
          format,
          period_start,
          period_end,
          status: 'ready',
          row_count: result.rowCount,
          finished_at: new Date().toISOString(),
          requested_by: req.user?.id || null,
          metadata: { range: `${period_start}..${period_end}` }
        })
      } catch (_) {}

      const filename = `${format.replace('_', '-')}-${period_start}-${period_end}.${result.suffix}`
      res.setHeader('Content-Type', result.contentType)
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.send(result.payload)
    } catch (e) { next(e) }
  })

  return router
}

module.exports = accountingRoutes
