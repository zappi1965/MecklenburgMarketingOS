const express = require('express')
const requireCustomerAccess = require('../middleware/requireCustomerAccess')
const { staffScan, extractMemberId } = require('../services/loyaltyScanService')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

function loyaltyScanRoutes() {
  const router = express.Router()

  // Hauptscan-Endpunkt: Kassiererin scannt QR-Code eines Endkunden.
  router.post('/staff-scan/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const r = await staffScan({
        qr_payload: req.body?.qr_payload,
        customer_id: req.params.customer_id,
        qr_campaign_id: req.body?.qr_campaign_id,
        points: req.body?.points,
        staff_code: req.body?.staff_code,
        scanned_by_user_id: req.user?.id,
        idempotency_key: req.body?.idempotency_key
      })
      res.json(r)
    } catch (e) {
      // Strukturierte Fehler durchreichen ohne Stack-Leak.
      if (e.status && e.status < 500) {
        return res.status(e.status).json({ ok: false, code: e.code || 'SCAN_ERROR', error: e.message })
      }
      next(e)
    }
  })

  // Lookup-Endpoint: QR-Inhalt parsen + Member-Snapshot zurueckgeben
  // (ohne zu buchen). Damit kann die UI vor dem Add-Points-Klick anzeigen
  // "Hallo Anna, dein aktueller Stand: 78 Punkte".
  router.post('/lookup-member/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const member_id = extractMemberId(req.body?.qr_payload)
      if (!member_id) return res.status(400).json({ ok: false, code: 'INVALID_QR', error: 'QR-Inhalt nicht erkannt.' })
      const supabase = getSupabaseAdmin()
      const { data: member } = await supabase
        .from('loyalty_customers')
        .select('id, customer_id, display_name, email, points_balance, tier, last_scan_at')
        .eq('id', member_id)
        .maybeSingle()
      if (!member) return res.status(404).json({ ok: false, code: 'MEMBER_UNKNOWN', error: 'Mitglied nicht gefunden.' })
      if (member.customer_id !== req.params.customer_id) {
        return res.status(403).json({ ok: false, code: 'WRONG_TENANT', error: 'Dieses Mitglied gehoert zu einem anderen Kunden.' })
      }
      res.json({ ok: true, member })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = loyaltyScanRoutes
