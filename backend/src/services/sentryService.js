const { redact } = require('../utils/redact')

let sentryHandle = { enabled: false, Sentry: null }

function initSentry(app) {
  if (sentryHandle.enabled) return sentryHandle
  if (!process.env.SENTRY_DSN) return sentryHandle

  const Sentry = require('@sentry/node')
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    environment: process.env.NODE_ENV || 'production',
    beforeSend(event) {
      if (event.request) {
        if (event.request.data) event.request.data = redact(event.request.data)
        if (event.request.headers) event.request.headers = redact(event.request.headers)
        if (event.request.cookies) event.request.cookies = redact(event.request.cookies)
        if (event.request.query_string && typeof event.request.query_string === 'string') {
          event.request.query_string = event.request.query_string.replace(
            /(password|token|secret|api_?key|staff_code)=[^&]*/gi,
            '$1=[REDACTED]'
          )
        }
      }
      if (event.extra) event.extra = redact(event.extra)
      if (event.contexts) event.contexts = redact(event.contexts)
      return event
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb?.data) breadcrumb.data = redact(breadcrumb.data)
      return breadcrumb
    }
  })

  if (app && typeof Sentry.Handlers?.requestHandler === 'function') {
    app.use(Sentry.Handlers.requestHandler())
  }

  sentryHandle = { enabled: true, Sentry }
  return sentryHandle
}

function getSentry() {
  return sentryHandle
}

function attachErrorHandler(app) {
  if (!sentryHandle.enabled || !sentryHandle.Sentry) return
  if (typeof sentryHandle.Sentry.Handlers?.errorHandler === 'function') {
    app.use(sentryHandle.Sentry.Handlers.errorHandler())
  }
}

module.exports = { initSentry, getSentry, attachErrorHandler }
