
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

const securityHeaders = helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
})

const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX || 500),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: 'Zu viele Anfragen. Bitte später erneut versuchen.'
  }
})

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT_MAX || 50),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: 'Zu viele Login-Versuche. Bitte später erneut versuchen.'
  }
})

module.exports = {
  securityHeaders,
  apiRateLimit,
  authRateLimit
}
