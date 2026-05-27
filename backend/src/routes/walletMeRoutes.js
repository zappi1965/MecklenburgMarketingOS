const express = require('express')
const rateLimit = require('express-rate-limit')
const svc = require('../services/walletMagicLinkService')

// Aggressiver Rate-Limit: 5 Magic-Links pro IP pro Stunde reichen fuer
// normale Nutzung, blocken aber Spam/Mail-Bombing-Versuche.
const requestLinkLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: Number(process.env.WALLET_REQUEST_LIMIT_PER_HOUR || 5),
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Zu viele Anfragen. Bitte spaeter erneut versuchen.' }
})

function walletMeRoutes() {
  const router = express.Router()

  // POST /api/wallet/me/request-link
  // Body: { email, base_url? }
  // Antwort: { ok: true } — IMMER, kein User-Enumeration.
  router.post('/request-link', requestLinkLimit, async (req, res, next) => {
    try {
      const email = req.body?.email
      const base_url = req.body?.base_url || req.get('origin') || undefined
      const r = await svc.requestMagicLink({ email, base_url })
      // dispatched bewusst NICHT zurueckgeben in der API, nur ok.
      res.json({ ok: true })
    } catch (e) { next(e) }
  })

  // GET /api/wallet/me?email=...&exp=...&sig=...
  // Verifiziert HMAC-Token, liefert Memberships.
  router.get('/', async (req, res, next) => {
    try {
      const { email, exp, sig } = req.query || {}
      const verify = svc.verifyToken({ email, exp, sig })
      if (!verify.ok) {
        return res.status(401).json({ ok: false, code: 'TOKEN_INVALID', error: 'Link ist abgelaufen oder ungueltig.', reason: verify.reason })
      }
      const r = await svc.listMemberships({ email: verify.email })
      res.json({ ok: true, ...r, token_expires_at: new Date(verify.exp).toISOString() })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = walletMeRoutes
