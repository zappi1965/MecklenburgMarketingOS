const express = require('express')
const mfaService = require('../services/mfaService')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

function securityRoutes() {
  const router = express.Router()

  router.get('/mfa/status', async (req, res, next) => {
    try {
      if (!req.user?.id) return res.status(401).json({ ok: false, error: 'Nicht authentifiziert' })
      const supabase = getSupabaseAdmin()
      if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase nicht konfiguriert' })
      let profile = null
      const { data: byId } = await supabase.from('user_profiles').select('id, email, mfa_enabled, mfa_enrolled_at, mfa_last_used_at, mfa_verified_until').eq('id', req.user.id).maybeSingle()
      profile = byId
      if (!profile && req.user.email) {
        const { data: byEmail } = await supabase.from('user_profiles').select('id, email, mfa_enabled, mfa_enrolled_at, mfa_last_used_at, mfa_verified_until').ilike('email', String(req.user.email).toLowerCase()).maybeSingle()
        profile = byEmail
      }
      const verified = profile?.mfa_verified_until ? Date.parse(profile.mfa_verified_until) > Date.now() : false
      res.json({ ok: true, mfa_enabled: Boolean(profile?.mfa_enabled), mfa_verified: verified, mfa_verified_until: profile?.mfa_verified_until || null, mfa_last_used_at: profile?.mfa_last_used_at || null, mfa_policy: process.env.MFA_REQUIRE_EVERY_LOGIN === 'true' ? 'every_login' : 'session_ttl', server_time: new Date().toISOString(), totp_window: Number(process.env.MFA_TOTP_WINDOW || 2) })
    } catch (e) { next(e) }
  })


  router.post('/mfa/enroll', async (req, res, next) => {
    try {
      if (!req.user?.id) return res.status(401).json({ ok: false, error: 'Nicht authentifiziert' })
      const email = req.userProfile?.email || req.user.email
      const r = await mfaService.enroll({ user_id: req.user.id, email })
      // Secret NUR in dieser Response zurueckgeben — niemals erneut.
      res.json({ ok: true, otpauth: r.otpauth, secret: r.secret })
    } catch (e) { next(e) }
  })

  router.post('/mfa/activate', async (req, res, next) => {
    try {
      if (!req.user?.id) return res.status(401).json({ ok: false, error: 'Nicht authentifiziert' })
      const r = await mfaService.activate({
        user_id: req.user.id,
        email: req.user.email,
        code: req.body?.code,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      })
      // Backup-Codes nur in dieser Response zurueckliefern.
      res.json({ ok: true, backupCodes: r.backupCodes })
    } catch (e) { next(e) }
  })

  router.post('/mfa/verify', async (req, res) => {
    try {
      if (!req.user?.id) return res.status(401).json({ ok: false, code: 'UNAUTHENTICATED', error: 'Nicht authentifiziert' })
      const r = await mfaService.verify({
        user_id: req.user.id,
        email: req.user.email,
        code: req.body?.code,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      })
      if (!r.ok) return res.status(401).json({ ok: false, code: 'MFA_INVALID', ...r, error: '2FA-Code ungueltig' })
      res.json({ ok: true, ...r })
    } catch (e) {
      console.error('[MFA_VERIFY_ROUTE_ERROR]', e?.code || '', e?.message || e)
      const missingSchema = /column .* does not exist|relation .* does not exist|schema|mfa_/i.test(String(e?.message || ''))
      res.status(e?.status && e.status < 500 ? e.status : 500).json({
        ok: false,
        code: e?.code || (missingSchema ? 'MFA_SCHEMA_MISSING' : 'MFA_VERIFY_INTERNAL'),
        error: missingSchema
          ? '2FA-Schema fehlt oder ist unvollständig. Bitte die Migration supabase/migrations/0103_3_mfa_schema.sql in Supabase ausführen.'
          : '2FA konnte serverseitig nicht geprüft werden. Railway-Logs nach [MFA_VERIFY_ROUTE_ERROR] prüfen.'
      })
    }
  })

  router.post('/mfa/disable', async (req, res, next) => {
    try {
      if (!req.user?.id) return res.status(401).json({ ok: false, error: 'Nicht authentifiziert' })
      // Verify first to prevent unauthorised disable.
      const r = await mfaService.verify({
        user_id: req.user.id,
        email: req.user.email,
        code: req.body?.code,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      })
      if (!r.ok) return res.status(401).json({ ok: false, error: 'Code ungueltig' })
      await mfaService.disable({ user_id: req.user.id, email: req.user.email, ip_address: req.ip, user_agent: req.get('user-agent') })
      res.json({ ok: true })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = securityRoutes
