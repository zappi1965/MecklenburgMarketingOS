const express = require('express')
const cors = require('cors')

const { getSupabaseAdmin } = require('./lib/supabaseAdmin')
const authMiddleware = require('./middleware/auth')
const requireCustomerAccess = require('./middleware/requireCustomerAccess')
const { initSentry, attachErrorHandler, getSentry } = require('./services/sentryService')
const { recordAdminLog } = require('./services/adminLogService')
const { verifyMfaWithRescue } = require('./services/mfaVerifyRescueService')

const monitoringRoutes = require('./routes/monitoringRoutes')
const opsRoutes = require('./routes/opsRoutes')
const packageBillingRoutes = require('./routes/packageBillingRoutes')
const v20GrowthRoutes = require('./routes/v20GrowthRoutes')
const customerIntelligenceRoutes = require('./routes/customerIntelligenceRoutes')
const aiAutomationCoreRoutes = require('./routes/aiAutomationCoreRoutes')
const advancedLoyaltyRoutes = require('./routes/advancedLoyaltyRoutes')
const revenueDynamicBillingRoutes = require('./routes/revenueDynamicBillingRoutes')
const reviewIntelligenceRoutes = require('./routes/reviewIntelligenceRoutes')
const v33FunctionalRoutes = require('./routes/v33FunctionalRoutes')
const enterpriseRoutes = require('./routes/enterpriseRoutes')
const customerPortalRoutes = require('./routes/customerPortalRoutes')
const adminProfilesRoutes = require('./routes/adminProfilesRoutes')
const authRoutes = require('./routes/authRoutes')
const systemRoutes = require('./routes/systemRoutes')
const googleRoutes = require('./routes/googleRoutes')
const businessToolsRoutes = require('./routes/businessToolsRoutes')
const documentMediaRoutes = require('./routes/documentMediaRoutes')
const productionReadinessRoutes = require('./routes/productionReadinessRoutes')
const productionRoutes = require('./routes/productionRoutes')
const customerReadinessRoutes = require('./routes/customerReadinessRoutes')
const finalProductionHardeningRoutes = require('./routes/finalProductionHardeningRoutes')
const operationsRoutes = require('./routes/operationsRoutes')
const qrCampaignGrowthRoutes = require('./routes/qrCampaignGrowthRoutes')
const loyaltyGrowthSuiteRoutes = require('./routes/loyaltyGrowthSuiteRoutes')
const retentionIntelligenceRoutes = require('./routes/retentionIntelligenceRoutes')
const mailDomainComplianceRoutes = require('./routes/mailDomainComplianceRoutes')
const goLiveCockpitRoutes = require('./routes/goLiveCockpitRoutes')
const completenessAuditRoutes = require('./routes/completenessAuditRoutes')
const toolReadinessRoutes = require('./routes/toolReadinessRoutes')
const globalGuardRoutes = require('./routes/globalGuardRoutes')
const finalHardeningRoutes = require('./routes/finalHardeningRoutes')
const documentEngineV2Routes = require('./routes/documentEngineV2Routes')
const securityCoreRoutes = require('./routes/securityCoreRoutes')
const qrRoutes = require('./routes/qrRoutes')
const gdprRoutes = require('./routes/gdprRoutes')
const automationRoutes = require('./routes/automationRoutes')
const eInvoiceRoutes = require('./routes/eInvoiceRoutes')
const referralRoutes = require('./routes/referralRoutes')
const endcustomerReferralRoutes = require('./routes/endcustomerReferralRoutes')
const dealCampaignRoutes = require('./routes/dealCampaignRoutes')
const miniWebsiteRoutes = require('./routes/miniWebsiteRoutes')
const brancheBenchmarkRoutes = require('./routes/brancheBenchmarkRoutes')
const { walletPassRoutes, newsletterRoutes, voucherRoutes } = require('./routes/quickWinRoutes')
const securityRoutes = require('./routes/securityRoutes')
const dataQualityRoutes = require('./routes/dataQualityRoutes')
const accountingRoutes = require('./routes/accountingRoutes')
const dunningRoutes = require('./routes/dunningRoutes')
const posRoutes = require('./routes/posRoutes')
const noShowRoutes = require('./routes/noShowRoutes')
const chatbotRoutes = require('./routes/chatbotRoutes')
const analyticsRoutes = require('./routes/analyticsRoutes')
const gmbRoutes = require('./routes/gmbRoutes')
const aiCrmMailRoutes = require('./routes/aiCrmMailRoutes')
const socialRoutes = require('./routes/socialRoutes')
const { reviewWidgetRoutes, reviewWidgetEmbedRouter } = require('./routes/reviewWidgetRoutes')
const complianceCockpitRoutes = require('./routes/complianceCockpitRoutes')
const apiKeyRoutes = require('./routes/apiKeyRoutes')
const publicApiV1Routes = require('./routes/publicApiV1Routes')
const packageInquiryRoutes = require('./routes/packageInquiryRoutes')
const pricingRoutes = require('./routes/pricingRoutes')
const onboardingRoutes = require('./routes/onboardingRoutes')
const loyaltyScanRoutes = require('./routes/loyaltyScanRoutes')
const walletMeRoutes = require('./routes/walletMeRoutes')
const storeRoutes = require('./routes/storeRoutes')
const opsAdminRoutes = require('./routes/opsAdminRoutes')
const { bookingPublicRoutes } = require('./routes/bookingRoutes')
const { securityHeaders, generalRateLimit } = require('./middleware/securityHardening')
const { createAdminAuditMiddleware } = require('./middleware/adminAuditMiddleware')

const app = express()
const MMOS_VERSION = process.env.MMOS_VERSION || 'v103.8-stability-security-cleanup'

initSentry(app)

const trustProxyHopsRaw = process.env.TRUST_PROXY_HOPS || process.env.RAILWAY_TRUST_PROXY_HOPS || '1'
const trustProxyHops = Math.max(0, Number(trustProxyHopsRaw) || 1)
app.set('trust proxy', trustProxyHops)

// V103.6 CORS Rescue
// Problem in V103.5: production requests were rejected unless FRONTEND_URL/CORS_ALLOWED_ORIGINS
// matched the browser origin exactly. That broke /api/security/mfa/verify on Vercel previews/custom domains.
// Safe defaults: explicit ENV origins + your production domain + Vercel preview domains.
function splitCsv(value = '') {
  return String(value || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}

function normalizeOrigin(value = '') {
  const raw = String(value || '').trim().replace(/\/+$/, '')
  if (!raw) return ''
  try {
    return new URL(raw.startsWith('http') ? raw : `https://${raw}`).origin
  } catch (_) {
    return raw
  }
}

const configuredCorsOrigins = [
  ...splitCsv(process.env.CORS_ALLOWED_ORIGINS),
  process.env.FRONTEND_URL,
  process.env.PUBLIC_APP_URL,
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
  'https://mecklenburgmarketing.de',
  'https://www.mecklenburgmarketing.de'
]
  .map(normalizeOrigin)
  .filter(Boolean)

const configuredCorsPatterns = [
  ...splitCsv(process.env.CORS_ALLOWED_ORIGIN_PATTERNS),
  'https://*.vercel.app',
  'https://*.mecklenburgmarketing.de'
]
  .map((v) => String(v || '').trim())
  .filter(Boolean)

const allowAllCors = process.env.CORS_ALLOW_ALL === 'true' || (configuredCorsOrigins.length === 0 && process.env.NODE_ENV !== 'production')

function wildcardToRegExp(pattern) {
  const escaped = String(pattern)
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
  return new RegExp(`^${escaped}$`, 'i')
}

function isAllowedCorsOrigin(origin) {
  if (!origin) return true
  if (allowAllCors) return true
  const normalized = normalizeOrigin(origin)
  if (configuredCorsOrigins.includes(normalized)) return true
  return configuredCorsPatterns.some((pattern) => wildcardToRegExp(normalizeOrigin(pattern)).test(normalized))
}

app.use(cors({
  origin(origin, cb) {
    if (isAllowedCorsOrigin(origin)) return cb(null, true)
    // Do not throw here. Throwing turns CORS into a noisy 500 and hides the real auth/MFA error.
    console.warn('[CORS_BLOCKED]', origin || 'no-origin')
    return cb(null, false)
  },
  credentials: false,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-MFA-Code',
    'X-MMOS-MFA-Code',
    'X-Webhook-Secret',
    'X-Resend-Webhook-Secret'
  ],
  exposedHeaders: ['Content-Type']
}))
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  return next()
})

app.use(securityHeaders)
app.use(generalRateLimit)

const publicJsonPaths = [
  /^\/api\/client-error$/,
  /^\/api\/production\/client-error$/,
  /^\/api\/security\/mfa\/verify$/,
  /^\/api\/production\/client-error$/,
  /^\/api\/v33-functional\/public\//,
  /^\/api\/qr(\/.*)?$/,
  /^\/api\/chatbot\//,
  /^\/api\/review-widget\/embed\//,
  /^\/api\/public\//,
  /^\/api\/customer-portal\/(register|invite|accept-invite)/,
  /^\/api\/wallet\/me/,
  /^\/api\/booking\//
]
const publicJsonParser = express.json({ limit: process.env.PUBLIC_JSON_LIMIT || '250kb' })
const privateJsonParser = express.json({ limit: process.env.JSON_BODY_LIMIT || '50mb' })
app.use((req, res, next) => {
  const fullPath = (req.originalUrl || req.url || '').split('?')[0]
  const parser = publicJsonPaths.some((re) => re.test(fullPath)) ? publicJsonParser : privateJsonParser
  return parser(req, res, next)
})

const supabaseAdmin = getSupabaseAdmin()
const supabaseConfigured = Boolean(supabaseAdmin)
app.locals.supabaseAdmin = supabaseAdmin
const demoModeEnabled = process.env.ENABLE_DEMO_MODE === 'true'

app.get('/api/health', (_, res) => {
  res.json({ ok: true, service: 'MMOS Backend', version: MMOS_VERSION, timestamp: new Date().toISOString() })
})

app.get('/api/version', (_, res) => {
  res.json({ ok: true, service: 'MMOS Backend', version: MMOS_VERSION, timestamp: new Date().toISOString() })
})

app.get('/api/system/runtime', (_, res) => {
  res.json({
    ok: true,
    service: 'MMOS Backend',
    version: MMOS_VERSION,
    node_env: process.env.NODE_ENV || 'unknown',
    supabase_configured: Boolean(supabaseAdmin),
    public_shield_mode: process.env.PUBLIC_SHIELD_PERSISTENT === 'false' ? 'memory' : 'persistent_with_memory_fallback',
    cors_allow_all: process.env.CORS_ALLOW_ALL === 'true',
    timestamp: new Date().toISOString()
  })
})
// Public client error collector; must stay before the global /api auth guard.
app.post('/api/client-error', async (req, res) => res.json({ ok: true }))


// Public, no-auth client error collector. This prevents public QR/slug pages from
// creating noisy 401 logs when the browser reports frontend errors without an admin session.
app.post('/api/production/client-error', async (req, res) => {
  try {
    const body = req.body || {}
    await recordAdminLog(supabaseAdmin, {
      event_type: 'client_error',
      severity: 'error',
      actor_user_id: null,
      actor_email: null,
      actor_role: null,
      customer_id: null,
      route: body.pathname || req.get('referer') || null,
      method: 'CLIENT',
      message: body.message || 'Frontend error',
      user_agent: req.headers['user-agent'],
      metadata: { source: 'ClientErrorReporter.public', ...body }
    }).catch(() => null)
  } catch (_) {}
  res.json({ ok: true })
})


// V103.5 pre-auth MFA verify rescue.
// Validates the Supabase bearer session first, then verifies TOTP/backup code with a schema-tolerant helper.
app.post('/api/security/mfa/verify', async (req, res) => {
  try {
    const supabase = supabaseAdmin || getSupabaseAdmin()
    if (!supabase) return res.status(503).json({ ok: false, code: 'SUPABASE_ADMIN_UNCONFIGURED', error: 'Backend-Supabase ist nicht konfiguriert.' })
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
    if (!token) return res.status(401).json({ ok: false, code: 'UNAUTHENTICATED', error: 'Nicht authentifiziert.' })
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) return res.status(401).json({ ok: false, code: 'INVALID_SESSION', error: 'Session ungültig oder abgelaufen.' })
    const result = await verifyMfaWithRescue(supabase, data.user, req.body?.code, { ip_address: req.ip, user_agent: req.get('user-agent') })
    return res.status(result.status || (result.ok ? 200 : 401)).json(result)
  } catch (e) {
    console.error('[MFA_VERIFY_RESCUE_FATAL]', e?.code || '', e?.message || e)
    return res.status(500).json({ ok: false, code: 'MFA_VERIFY_FATAL', error: e?.message || '2FA konnte serverseitig nicht geprüft werden.' })
  }
})

const PUBLIC_PATHS = [
  /^\/api\/client-error$/,
  /^\/api\/security\/mfa\/verify$/,
  /^\/api\/health$/,
  /^\/api\/version$/,
  /^\/api\/system\/health$/,
  /^\/api\/system\/runtime$/,
  /^\/api\/system\/status$/,
  /^\/api\/v33-functional\/v42\/health$/,
  /^\/api\/auth\//,
  /^\/api\/production\/client-error$/,
  /^\/api\/v33-functional\/public\/loyalty\/[^/]+\/status$/,
  /^\/api\/v33-functional\/public\/loyalty\/[^/]+\/scan-start$/,
  /^\/api\/v33-functional\/public\/loyalty\/[^/]+\/current-qr$/,
  /^\/api\/v33-functional\/public\/loyalty\/[^/]+\/join-or-scan$/,
  /^\/api\/v33-functional\/public\/loyalty\/[^/]+\/rewards\/[^/]+\/redeem$/,
  /^\/api\/v33-functional\/public\/loyalty\/[^/]+\/password-reset-request$/,
  /^\/api\/v33-functional\/public\/loyalty\/[^/]+\/marketing-consent\/confirm$/,
  /^\/api\/v33-functional\/public\/loyalty\/[^/]+\/marketing-consent\/withdraw$/,
  /^\/api\/v33-functional\/public\/loyalty\/[^/]+\/marketing-consent\/status$/,
  /^\/api\/v33-functional\/public\/loyalty\/[^/]+\/marketing-consent\/resend-double-opt-in$/,
  /^\/api\/v33-functional\/public\/loyalty\/[^/]+\/review$/,
  /^\/api\/v33-functional\/public\/reactivation\/[^/]+\/status$/,
  /^\/api\/v33-functional\/public\/reactivation\/[^/]+\/redeem$/,
  /^\/api\/v33-functional\/public\/reactivation\/mail-webhook$/, 
  /^\/api\/qr(\?.*)?$/,
  /^\/api\/pos\/webhook\/[^/]+$/,
  /^\/api\/chatbot\/(start|message)$/,
  /^\/api\/review-widget\/embed\/[^/]+$/,
  /^\/api\/public\/package-inquiry$/,
  /^\/api\/customer-portal\/register$/,
  /^\/api\/customer-portal\/invite\/[^/]+$/,
  /^\/api\/customer-portal\/accept-invite$/,
  /^\/api\/public\/v1\//,
  /^\/api\/wallet\/me(\/request-link)?$/,
  /^\/api\/booking\/[^/]+\/(services|slots|book)$/
]

const requireAuth = authMiddleware()
const requireAdmin = authMiddleware({ roles: ['admin'] })

app.use('/api', (req, res, next) => {
  const fullPath = (req.originalUrl || req.url || '').split('?')[0]
  if (PUBLIC_PATHS.some((re) => re.test(fullPath))) return next()
  return requireAuth(req, res, next)
})

app.use('/api', createAdminAuditMiddleware(supabaseAdmin))

app.use('/api/system', systemRoutes(supabaseAdmin))
app.use('/api/public', packageInquiryRoutes(supabaseAdmin))

const adminScopedRoutes = [
  ['/api/monitoring', monitoringRoutes],
  ['/api/ops', opsRoutes],
  ['/api/package-billing', packageBillingRoutes],
  ['/api/v20-growth', v20GrowthRoutes],
  ['/api/ai-automation-core', aiAutomationCoreRoutes],
  ['/api/advanced-loyalty', advancedLoyaltyRoutes],
  ['/api/revenue-dynamic-billing', revenueDynamicBillingRoutes],
  ['/api/review-intelligence', reviewIntelligenceRoutes],
  ['/api/enterprise', enterpriseRoutes],
  ['/api/admin-profiles', adminProfilesRoutes],
  ['/api/google', googleRoutes],
  ['/api/business-tools', businessToolsRoutes],
  ['/api/automations', automationRoutes],
  ['/api/e-invoice', eInvoiceRoutes]
]

for (const [routePath, routeFactory] of adminScopedRoutes) {
  app.use(routePath, requireAdmin, routeFactory(supabaseAdmin))
}

app.use('/api/production', requireAdmin, productionRoutes(supabaseAdmin))
app.use('/api/production', requireAdmin, finalHardeningRoutes(supabaseAdmin))
app.use('/api/production', requireAdmin, productionReadinessRoutes(supabaseAdmin))
app.use('/api/production/global-guards', requireAdmin, globalGuardRoutes(supabaseAdmin))
app.use('/api/production/customer-readiness', requireAdmin, customerReadinessRoutes(supabaseAdmin))
app.use('/api/production/final-hardening', requireAdmin, finalProductionHardeningRoutes(supabaseAdmin))
app.use('/api/production/operations', requireAdmin, operationsRoutes(supabaseAdmin))
app.use('/api/production/qr-growth', requireAdmin, qrCampaignGrowthRoutes(supabaseAdmin))
app.use('/api/production/loyalty-growth', requireAdmin, loyaltyGrowthSuiteRoutes(supabaseAdmin))
app.use('/api/production/retention-intelligence', requireAdmin, retentionIntelligenceRoutes(supabaseAdmin))
app.use('/api/production/mail-domain', requireAdmin, mailDomainComplianceRoutes(supabaseAdmin))
app.use('/api/production/go-live-cockpit', requireAdmin, goLiveCockpitRoutes(supabaseAdmin))
app.use('/api/production/completeness-audit', requireAdmin, completenessAuditRoutes(supabaseAdmin))
app.use('/api/production/tool-readiness', requireAdmin, toolReadinessRoutes())
app.use('/api/document-media', documentMediaRoutes(supabaseAdmin))

app.use('/api/customer-intelligence', requireCustomerAccess(), customerIntelligenceRoutes(supabaseAdmin))
app.use('/api/customer-portal', customerPortalRoutes(supabaseAdmin))
app.use('/api/v33-functional', v33FunctionalRoutes(supabaseAdmin))
app.use('/api/auth', authRoutes(supabaseAdmin))
app.use('/api/qr', qrRoutes())
app.use('/api/gdpr', gdprRoutes(supabaseAdmin))
app.use('/api/referrals', referralRoutes(supabaseAdmin))
app.use('/api/endcustomer-referrals', requireCustomerAccess(), endcustomerReferralRoutes(supabaseAdmin))
app.use('/api/deals', requireCustomerAccess(), dealCampaignRoutes(supabaseAdmin))
app.use('/api/mini-website', requireCustomerAccess(), miniWebsiteRoutes(supabaseAdmin))
app.use('/api/branche-benchmark', brancheBenchmarkRoutes(supabaseAdmin))
app.use('/api/wallet', walletPassRoutes(supabaseAdmin))
app.use('/api/newsletter', newsletterRoutes(supabaseAdmin))
app.use('/api/vouchers', voucherRoutes(supabaseAdmin))
app.use('/api/security', securityRoutes())
app.use('/api/data-quality', dataQualityRoutes())
app.use('/api/accounting', accountingRoutes())
app.use('/api/dunning', dunningRoutes())
app.use('/api/pos', posRoutes())
app.use('/api/no-show', noShowRoutes())
app.use('/api/chatbot', chatbotRoutes())
app.use('/api/analytics', analyticsRoutes())
app.use('/api/gmb', gmbRoutes())
app.use('/api/ai-crm-mail', aiCrmMailRoutes())
app.use('/api/social', socialRoutes())
app.use('/api/review-widget', reviewWidgetRoutes())
app.use('/api/review-widget/embed', reviewWidgetEmbedRouter())
app.use('/api/compliance', complianceCockpitRoutes())
app.use('/api/api-keys', apiKeyRoutes())
app.use('/api/public/v1', publicApiV1Routes())
app.use('/api/pricing', pricingRoutes())
app.use('/api/onboarding', onboardingRoutes())
app.use('/api/loyalty', loyaltyScanRoutes())
app.use('/api/wallet/me', walletMeRoutes())
app.use('/api/store', storeRoutes())

app.use('/api/document-engine-v2', requireAdmin, documentEngineV2Routes(supabaseAdmin))
app.use('/api/security-core', requireAdmin, securityCoreRoutes(supabaseAdmin))

app.use('/api/ops-admin', opsAdminRoutes())
app.use('/api/booking', bookingPublicRoutes())

if (demoModeEnabled) {
  const demoEnvironmentRoutes = require('./routes/demoEnvironmentRoutes')
  const demoToolRoutes = require('./routes/demoToolRoutes')
  app.use('/api/demo-environment', requireAdmin, demoEnvironmentRoutes(supabaseAdmin))
  app.use('/api/demo-tools', requireAdmin, demoToolRoutes(supabaseAdmin))
}

const optionalRoutes = [
  ['./routes/hardeningRoutes', '/api/hardening'],
  ['./routes/storageRoutes', '/api/storage'],
  ['./routes/pdfRoutes', '/api/pdf'],
  ['./routes/mailRoutes', '/api/mail'],
  ['./routes/apiReadyRoutes', '/api/api-ready']
]

for (const [modulePath, routePath] of optionalRoutes) {
  try {
    const routeFactory = require(modulePath)
    if (typeof routeFactory === 'function') {
      app.use(routePath, requireAuth, routeFactory(supabaseAdmin))
    }
  } catch (_) {}
}

attachErrorHandler(app)

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err)
  const status = err.status || err.statusCode || 500
  const productionRuntime = process.env.NODE_ENV === 'production' || Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID || process.env.VERCEL)
  const rawMessage = typeof err.message === 'string' ? err.message.slice(0, 500) : 'Interner Serverfehler'
  const isMfaVerifyRoute = req.path === '/api/security/mfa/verify'
  const safeMessage = productionRuntime && status >= 500 && !isMfaVerifyRoute ? 'Interner Serverfehler' : rawMessage
  res.status(status).json({
    ok: false,
    code: err.code || 'INTERNAL_ERROR',
    error: safeMessage,
    hint: err.hint || undefined
  })
  const { enabled } = getSentry()
  if (!enabled) {
    console.error('[API_ERROR]', req.method, req.path, status, safeMessage)
  }
})

const port = process.env.PORT || 4000
const server = app.listen(port, () => {
  console.log(`MMOS backend running on ${port}`)
})

function shutdown(signal) {
  console.log(`[${signal}] graceful shutdown initiated`)
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 10000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

process.on('unhandledRejection', (reason) => {
  const { enabled, Sentry } = getSentry()
  if (enabled && Sentry) { try { Sentry.captureException(reason) } catch (_) {} }
  console.error('[unhandledRejection]', reason instanceof Error ? reason.message : String(reason))
})
process.on('uncaughtException', (err) => {
  const { enabled, Sentry } = getSentry()
  if (enabled && Sentry) { try { Sentry.captureException(err) } catch (_) {} }
  console.error('[uncaughtException]', err?.message || String(err))
  shutdown('uncaughtException')
})
