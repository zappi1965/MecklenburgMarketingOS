
function initSentry(app) {
  if (!process.env.SENTRY_DSN) return { enabled: false }
  const Sentry = require('@sentry/node')
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    environment: process.env.NODE_ENV || 'production'
  })
  return { enabled: true, Sentry }
}
module.exports = { initSentry }
