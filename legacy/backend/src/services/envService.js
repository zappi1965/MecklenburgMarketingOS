
function cleanEnv(value) {
  const raw = String(value || '').trim().replace(/^['\"]|['\"]$/g, '').replace(/\/+$/, '')
  if (!raw) return ''
  if (['null', 'undefined', 'false', '0', '-'].includes(raw.toLowerCase())) return ''
  return raw
}

function envStatus() {
  return {
    supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    resend: Boolean(cleanEnv(process.env.RESEND_API_KEY)),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    stripeWebhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    gotenberg: Boolean(cleanEnv(process.env.GOTENBERG_URL)),
    googleOAuth: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI),
    sentry: Boolean(process.env.SENTRY_DSN),
    publicAppUrl: Boolean(process.env.PUBLIC_APP_URL)
  }
}

function missingEnv() {
  const s = envStatus()
  return Object.entries(s).filter(([, ok]) => !ok).map(([key]) => key)
}

module.exports = { envStatus, missingEnv }
