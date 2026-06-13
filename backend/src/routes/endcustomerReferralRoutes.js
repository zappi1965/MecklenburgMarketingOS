// Routes für das Endkunden-Referral ("Freunde werben").
// Kundenscoped (requireCustomerAccess prüft :customer_id). Public-Registrierung
// läuft über den bestehenden Public-Flow in v33FunctionalRoutes.

const express = require('express')
const { EndcustomerReferralService } = require('../services/endcustomerReferralService')

module.exports = function endcustomerReferralRoutes(supabase) {
  const router = express.Router()
  const service = new EndcustomerReferralService(supabase)

  // Persönlicher Link/QR-Wert eines Mitglieds.
  router.get('/:customer_id/link', async (req, res, next) => {
    try {
      const link = await service.getOrCreateReferralLink({
        customer_id: req.params.customer_id,
        member_token: req.query.member_token || req.query.token
      })
      res.json({ ok: true, ...link })
    } catch (e) { res.status(e.status || 500).json({ ok: false, error: e.message }) }
  })

  // Liste + Statistik für Admin/Portal.
  router.get('/:customer_id', async (req, res, next) => {
    try {
      const result = await service.listForCustomer(req.params.customer_id)
      res.json({ ok: true, ...result })
    } catch (e) { next(e) }
  })

  // Anti-Abuse-/Bonus-Settings aktualisieren.
  router.post('/:customer_id/settings', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const body = req.body || {}
      const patch = {}
      if (body.referral_bonus_referrer !== undefined) patch.referral_bonus_referrer = Math.max(0, Number(body.referral_bonus_referrer) || 0)
      if (body.referral_bonus_friend !== undefined) patch.referral_bonus_friend = Math.max(0, Number(body.referral_bonus_friend) || 0)
      if (body.referral_require_friend_scan !== undefined) patch.referral_require_friend_scan = body.referral_require_friend_scan !== false
      if (body.referral_self_referral_blocked !== undefined) patch.referral_self_referral_blocked = body.referral_self_referral_blocked !== false
      if (body.referral_max_per_referrer !== undefined) patch.referral_max_per_referrer = Math.max(0, Number(body.referral_max_per_referrer) || 0)
      patch.updated_at = new Date().toISOString()

      const updated = await supabase
        .from('v37_loyalty_settings')
        .update(patch)
        .eq('customer_id', customerId)
        .select('*')
        .maybeSingle()
      if (updated.error) throw updated.error
      res.json({ ok: true, settings: updated.data || patch })
    } catch (e) { next(e) }
  })

  return router
}
