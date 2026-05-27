const express = require('express')
const mfaService = require('../services/mfaService')

function securityRoutes() {
  const router = express.Router()

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
        code: req.body?.code,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      })
      // Backup-Codes nur in dieser Response zurueckliefern.
      res.json({ ok: true, backupCodes: r.backupCodes })
    } catch (e) { next(e) }
  })

  router.post('/mfa/verify', async (req, res, next) => {
    try {
      if (!req.user?.id) return res.status(401).json({ ok: false, error: 'Nicht authentifiziert' })
      const r = await mfaService.verify({
        user_id: req.user.id,
        code: req.body?.code,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      })
      res.json({ ok: r.ok, ...r })
    } catch (e) { next(e) }
  })

  router.post('/mfa/disable', async (req, res, next) => {
    try {
      if (!req.user?.id) return res.status(401).json({ ok: false, error: 'Nicht authentifiziert' })
      // Verify first to prevent unauthorised disable.
      const r = await mfaService.verify({
        user_id: req.user.id,
        code: req.body?.code,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      })
      if (!r.ok) return res.status(401).json({ ok: false, error: 'Code ungueltig' })
      await mfaService.disable({ user_id: req.user.id, ip_address: req.ip, user_agent: req.get('user-agent') })
      res.json({ ok: true })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = securityRoutes
