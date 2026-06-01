const crypto = require('crypto')

function timingSafeEqualString(a = '', b = '') {
  try {
    const aa = Buffer.from(String(a))
    const bb = Buffer.from(String(b))
    if (aa.length !== bb.length) return false
    return crypto.timingSafeEqual(aa, bb)
  } catch (_) { return false }
}

function hmacHex(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

function verifyHmacSignature({ secret, payload, signature, prefix = '' } = {}) {
  if (!secret || !signature) return { ok: false, error: 'Webhook Secret oder Signatur fehlt' }
  const raw = typeof payload === 'string' ? payload : JSON.stringify(payload || {})
  const expected = `${prefix}${hmacHex(secret, raw)}`
  return { ok: timingSafeEqualString(expected, String(signature)), expected_prefix: prefix || null }
}

function inspectWebhookSignatureConfig() {
  const providers = [
    { key: 'stripe', env: 'STRIPE_WEBHOOK_SECRET' },
    { key: 'resend', env: 'RESEND_WEBHOOK_SECRET' },
    { key: 'sumup', env: 'SUMUP_WEBHOOK_SECRET' },
    { key: 'google', env: 'GOOGLE_WEBHOOK_SECRET' },
    { key: 'booking', env: 'BOOKING_WEBHOOK_SECRET' }
  ]
  const checks = providers.map((p) => ({ provider: p.key, env: p.env, configured: Boolean(process.env[p.env]) }))
  return { ok: checks.every((c) => c.configured || ['google','booking','sumup'].includes(c.provider)), checks, recommendation: 'Für angebundene Provider muss der jeweilige *_WEBHOOK_SECRET gesetzt sein.' }
}

function requireWebhookSignature({ provider, secretEnv, headerName = 'x-mmos-signature' } = {}) {
  return function webhookSignatureMiddleware(req, res, next) {
    const secret = process.env[secretEnv]
    if (!secret) return res.status(503).json({ ok: false, code: 'WEBHOOK_SECRET_MISSING', error: `${secretEnv} fehlt.` })
    const signature = req.get(headerName) || req.get('x-signature') || req.get('stripe-signature') || ''
    const payload = req.rawBody || JSON.stringify(req.body || {})
    const result = verifyHmacSignature({ secret, payload, signature })
    if (!result.ok) return res.status(401).json({ ok: false, code: 'WEBHOOK_SIGNATURE_INVALID', error: `Webhook Signatur für ${provider || secretEnv} ungültig.` })
    next()
  }
}

module.exports = { verifyHmacSignature, inspectWebhookSignatureConfig, requireWebhookSignature }
