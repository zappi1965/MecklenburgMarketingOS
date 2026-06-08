const express = require('express')
const QRCode = require('qrcode')
const rateLimit = require('express-rate-limit')

const MAX_VALUE_BYTES = 1500
const ALLOWED_SIZES = [128, 256, 384, 512, 768, 900]

const qrRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.QR_RATE_LIMIT_PER_MIN || 120),
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Zu viele QR-Anfragen. Bitte später erneut versuchen.' }
})

function clampSize(raw) {
  const n = Number(raw) || 512
  let best = ALLOWED_SIZES[0]
  for (const s of ALLOWED_SIZES) if (Math.abs(s - n) < Math.abs(best - n)) best = s
  return best
}

function qrRoutes() {
  const router = express.Router()

  router.get('/', qrRateLimit, async (req, res, next) => {
    try {
      const value = String(req.query.value || '').trim()
      if (!value) {
        return res.status(400).json({ ok: false, error: 'value-Parameter fehlt.' })
      }
      if (Buffer.byteLength(value, 'utf8') > MAX_VALUE_BYTES) {
        return res.status(413).json({ ok: false, error: 'value zu groß für einen QR-Code.' })
      }
      const size = clampSize(req.query.size)
      const margin = Math.max(0, Math.min(8, Number(req.query.margin) || 2))

      const HEX = /^#?[0-9a-fA-F]{6}$/
      const normHex = (raw, fallback) => {
        const s = String(raw || '').trim()
        if (!s) return fallback
        return HEX.test(s) ? (s.startsWith('#') ? s : `#${s}`) : fallback
      }
      const dark = normHex(req.query.fg, '#111827')
      const light = normHex(req.query.bg, '#ffffff')

      const buffer = await QRCode.toBuffer(value, {
        type: 'png',
        width: size,
        margin,
        errorCorrectionLevel: 'M',
        color: { dark, light }
      })

      res.setHeader('Content-Type', 'image/png')
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable')
      res.setHeader('Content-Length', buffer.length)
      res.end(buffer)
    } catch (e) {
      next(e)
    }
  })

  return router
}

module.exports = qrRoutes
