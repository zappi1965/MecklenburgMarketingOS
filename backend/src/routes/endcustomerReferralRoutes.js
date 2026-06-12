// Routes für das Endkunden-Referral ("Freunde werben").
// Kundenscoped (requireCustomerAccess prüft :customer_id). Public-Registrierung
// läuft über den bestehenden Public-Flow in v33FunctionalRoutes.

const express = require('express')
const { EndcustomerReferralService } = require('../services/endcustomerReferralService')
const MailService = require('../services/mailService')

function appBaseUrl() {
  return String(process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.FRONTEND_URL || '').replace(/\/+$/, '')
}

module.exports = function endcustomerReferralRoutes(supabase) {
  const router = express.Router()
  const service = new EndcustomerReferralService(supabase)
  const mail = new MailService()

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

  // Freund per E-Mail einladen: registriert PENDING-Referral + sendet den Link.
  router.post('/:customer_id/invite', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const body = req.body || {}
      const memberToken = body.member_token || body.token
      const friendEmail = String(body.friend_email || body.email || '').trim()
      if (!memberToken) return res.status(400).json({ ok: false, error: 'member_token fehlt.' })
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(friendEmail)) return res.status(400).json({ ok: false, error: 'Gültige Freund-E-Mail erforderlich.' })

      const link = await service.getOrCreateReferralLink({ customer_id: customerId, member_token: memberToken })
      const referral = await service.registerReferral({ customer_id: customerId, referrer_token: memberToken, friend_email: friendEmail, source: 'email_invite' })

      const base = appBaseUrl()
      const url = base ? `${base}${link.path}` : link.path
      let emailSent = false
      try {
        const result = await mail.send({
          to: friendEmail,
          subject: 'Du wurdest eingeladen – sichere dir Bonuspunkte',
          html: `<p>Hallo,</p><p>du wurdest zu einem Bonusprogramm eingeladen. Tritt über diesen Link bei und sichere dir Startpunkte:</p><p><a href="${url}">${url}</a></p>`,
          text: `Du wurdest eingeladen. Jetzt beitreten: ${url}`
        })
        emailSent = Boolean(result?.ok ?? true)
      } catch (_) { emailSent = false }

      res.json({ ok: true, referral, url, email_sent: emailSent, dry_run: !base || !process.env.RESEND_API_KEY })
    } catch (e) { res.status(e.status || 500).json({ ok: false, error: e.message, code: e.code }) }
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
