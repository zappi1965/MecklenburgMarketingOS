// Routen fuer das Phase-11 Quick-Win-Bundle:
// Wallet-Pass, Newsletter, Vouchers.

const express = require('express')
const requireCustomerAccess = require('../middleware/requireCustomerAccess')
const { buildGoogleWalletPass, buildApplePassJson } = require('../services/walletPassService')
const { NewsletterService } = require('../services/newsletterService')
const { VoucherService } = require('../services/voucherService')

function walletPassRoutes(supabase) {
  const router = express.Router()

  // Liefert Wallet-Objekte fuer einen Loyalty-Member. Member-ID kommt aus
  // dem Path; der Aufrufer muss Zugriff auf den zugehoerigen Customer haben.
  router.get('/loyalty-member/:member_id', async (req, res, next) => {
    try {
      if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase nicht konfiguriert' })
      const memberId = String(req.params.member_id)
      const { data: member } = await supabase
        .from('loyalty_customers')
        .select('id, customer_id, email, display_name, points_balance, tier')
        .eq('id', memberId)
        .maybeSingle()
      if (!member) return res.status(404).json({ ok: false, error: 'Loyalty-Mitglied nicht gefunden' })

      const { data: customer } = await supabase
        .from('customers')
        .select('id, name, email, brand_primary, brand_secondary, brand_hero_url')
        .eq('id', member.customer_id)
        .maybeSingle()
      const { data: program } = await supabase
        .from('loyalty_programs')
        .select('id, name')
        .eq('customer_id', member.customer_id)
        .maybeSingle()

      const google = buildGoogleWalletPass({ member, customer, program })
      const applePass = buildApplePassJson({ member, customer, program })
      res.json({
        ok: true,
        google: { saveUrl: google.saveUrl, signed: google.signed, loyaltyObject: google.loyaltyObject },
        apple: { passJson: applePass, signing: 'requires_signer' }
      })
    } catch (e) { next(e) }
  })

  return router
}

function newsletterRoutes(supabase) {
  const router = express.Router()
  const service = new NewsletterService(supabase)

  router.post('/subscribe', async (req, res, next) => {
    try {
      const customer_id = req.body?.customer_id || null
      const email = req.body?.email
      const source = req.body?.source || 'web'
      const result = await service.subscribe({ customer_id, email, source })
      res.json({ ok: true, subscriber: result.subscriber, confirmToken: result.confirmToken })
    } catch (e) { next(e) }
  })

  router.post('/confirm', async (req, res, next) => {
    try {
      const t = req.body?.token || req.query?.token
      const sub = await service.confirm({ token: t })
      res.json({ ok: true, subscriber: sub })
    } catch (e) { next(e) }
  })

  router.post('/unsubscribe', async (req, res, next) => {
    try {
      const sub = await service.unsubscribe({
        email: req.body?.email,
        customer_id: req.body?.customer_id
      })
      res.json({ ok: true, subscriber: sub })
    } catch (e) { next(e) }
  })

  router.get('/subscribers/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const list = await service.listSubscribers({
        customer_id: req.params.customer_id,
        status: req.query?.status || 'active'
      })
      res.json({ ok: true, subscribers: list })
    } catch (e) { next(e) }
  })

  router.post('/campaigns', requireCustomerAccess({ bodyKey: 'customer_id' }), async (req, res, next) => {
    try {
      const data = await service.createCampaign({
        customer_id: req.body?.customer_id,
        subject: req.body?.subject,
        body: req.body?.body,
        audience: req.body?.audience,
        created_by: req.user?.id
      })
      res.json({ ok: true, campaign: data })
    } catch (e) { next(e) }
  })

  router.post('/campaigns/:id/send', async (req, res, next) => {
    try {
      if (req.userRole !== 'admin') return res.status(403).json({ ok: false, error: 'Admin erforderlich' })
      const result = await service.sendCampaign({ campaign_id: req.params.id })
      res.json({ ok: true, result })
    } catch (e) { next(e) }
  })

  return router
}

function voucherRoutes(supabase) {
  const router = express.Router()
  const service = new VoucherService(supabase)

  router.post('/', requireCustomerAccess({ bodyKey: 'customer_id' }), async (req, res, next) => {
    try {
      const v = await service.create({
        customer_id: req.body?.customer_id,
        value_eur: req.body?.value_eur,
        value_points: req.body?.value_points,
        recipient_email: req.body?.recipient_email,
        recipient_name: req.body?.recipient_name,
        expires_at: req.body?.expires_at,
        note: req.body?.note,
        created_by: req.user?.id
      })
      res.json({ ok: true, voucher: v })
    } catch (e) { next(e) }
  })

  router.get('/lookup/:code', async (req, res, next) => {
    try {
      const v = await service.lookup({ code: req.params.code })
      res.json({ ok: true, voucher: v })
    } catch (e) { next(e) }
  })

  router.post('/redeem', async (req, res, next) => {
    try {
      const v = await service.redeem({
        code: req.body?.code,
        redeemed_by_loyalty_customer_id: req.body?.redeemed_by_loyalty_customer_id,
        redeemed_by_user_id: req.user?.id,
        staff_code: req.body?.staff_code
      })
      res.json({ ok: true, voucher: v })
    } catch (e) { next(e) }
  })

  router.get('/customer/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const list = await service.listForCustomer({
        customer_id: req.params.customer_id,
        status: req.query?.status
      })
      res.json({ ok: true, vouchers: list })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = { walletPassRoutes, newsletterRoutes, voucherRoutes }
