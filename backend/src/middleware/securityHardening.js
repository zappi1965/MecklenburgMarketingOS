
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

const securityHeaders = helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
})

const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX || 700),
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Zu viele Anfragen. Bitte später erneut versuchen.' }
})

module.exports = { securityHeaders, generalRateLimit }
