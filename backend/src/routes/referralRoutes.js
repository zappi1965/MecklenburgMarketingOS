const express = require('express')
const requireCustomerAccess = require('../middleware/requireCustomerAccess')
const { ReferralService } = require('../services/referralService')

function referralRoutes(supabase) {
  const router = express.Router()
  const service = new ReferralService(supabase)

  // Liefert/erzeugt den Referral-Code des Kunden + Liste eigener Referrals.
  router.get('/customer/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const customerId = String(req.params.customer_id)
      const code = await service.getOrCreateCode(customerId)
      const list = await service.listForCustomer(customerId)
      res.json({ ok: true, code: code.code, referrals: list.referrals })
    } catch (e) { next(e) }
  })

  // Loest einen Referral-Code beim Onboarding ein.
  router.post('/redeem', async (req, res, next) => {
    try {
      const code = String(req.body?.code || '').trim()
      const referred_customer_id = String(req.body?.referred_customer_id || '').trim()
      if (!code || !referred_customer_id) {
        return res.status(400).json({ ok: false, error: 'code und referred_customer_id sind Pflicht' })
      }
      const result = await service.createReferral({ code, referred_customer_id, source: 'api' })
      res.json({ ok: true, referral: result })
    } catch (e) { next(e) }
  })

  // Manuelles Confirm (z.B. durch Admin nach Erstrechnung).
  router.post('/confirm/:referred_customer_id', async (req, res, next) => {
    try {
      if (req.userRole !== 'admin') return res.status(403).json({ ok: false, error: 'Admin erforderlich' })
      const referred_customer_id = String(req.params.referred_customer_id)
      const result = await service.confirmReferral({
        referred_customer_id,
        reward: req.body?.reward || {}
      })
      res.json({ ok: true, result })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = referralRoutes
