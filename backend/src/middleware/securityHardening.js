const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

const securityHeaders = helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'none'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
})

const generalRateLimit = rateLimit({
  // trust proxy is configured centrally in server.js for Railway/Vercel.
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX || 700),
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Zu viele Anfragen. Bitte später erneut versuchen.' }
})

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Zu viele Authentifizierungsversuche. Bitte später erneut versuchen.' }
})

module.exports = { securityHeaders, generalRateLimit, authRateLimit }
