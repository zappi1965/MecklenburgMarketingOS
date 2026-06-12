// Schlanke Observability-Helfer für die Marketing-Tools.
// - captureToolError: an Sentry melden (falls konfiguriert) + strukturiertes Log.
// - logToolEvent: strukturierte JSON-Logzeile (tenant/tool/action/latency).

let sentry = null
try {
  sentry = require('../services/sentryService').getSentry()
} catch (_) {
  sentry = null
}

function captureToolError(error, ctx = {}) {
  try {
    if (sentry && typeof sentry.withScope === 'function') {
      sentry.withScope((scope) => {
        scope.setTag('tool', ctx.tool || 'unknown')
        if (ctx.action) scope.setTag('action', ctx.action)
        if (ctx.customer_id) scope.setTag('customer_id', String(ctx.customer_id))
        sentry.captureException(error)
      })
    } else if (sentry && typeof sentry.captureException === 'function') {
      sentry.captureException(error)
    }
  } catch (_) {}
  try {
    console.error(JSON.stringify({
      level: 'error',
      tool: ctx.tool || 'unknown',
      action: ctx.action || null,
      customer_id: ctx.customer_id || null,
      message: String(error?.message || error),
      status: error?.status || 500,
      ts: new Date().toISOString()
    }))
  } catch (_) {}
}

function logToolEvent(ctx = {}) {
  try {
    console.log(JSON.stringify({
      level: 'info',
      tool: ctx.tool || 'unknown',
      action: ctx.action || null,
      customer_id: ctx.customer_id || null,
      latency_ms: ctx.latency_ms ?? null,
      ts: new Date().toISOString()
    }))
  } catch (_) {}
}

module.exports = { captureToolError, logToolEvent }
