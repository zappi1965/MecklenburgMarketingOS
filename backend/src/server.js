const express = require('express')
const cors = require('cors')

const { getSupabaseAdmin } = require('./lib/supabaseAdmin')
const authMiddleware = require('./middleware/auth')
const requireCustomerAccess = require('./middleware/requireCustomerAccess')
const { initSentry, attachErrorHandler, getSentry } = require('./services/sentryService')

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
const qrRoutes = require('./routes/qrRoutes')
const gdprRoutes = require('./routes/gdprRoutes')
const automationRoutes = require('./routes/automationRoutes')
const eInvoiceRoutes = require('./routes/eInvoiceRoutes')
const referralRoutes = require('./routes/referralRoutes')
const { walletPassRoutes, newsletterRoutes, voucherRoutes } = require('./routes/quickWinRoutes')
const securityRoutes = require('./routes/securityRoutes')
const dataQualityRoutes = require('./routes/dataQualityRoutes')
const accountingRoutes = require('./routes/accountingRoutes')
const dunningRoutes = require('./routes/dunningRoutes')
const posRoutes = require('./routes/posRoutes')
const noShowRoutes = require('./routes/noShowRoutes')
const chatbotRoutes = require('./routes/chatbotRoutes')
const { securityHeaders, generalRateLimit } = require('./middleware/securityHardening')

const app = express()

// Sentry first so it can capture errors raised by everything else.
initSentry(app)

// Railway/Vercel run the backend behind a reverse proxy.
// express-rate-limit requires Express to trust exactly the proxy hop count,
// otherwise X-Forwarded-For triggers ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
const trustProxyHopsRaw = process.env.TRUST_PROXY_HOPS || process.env.RAILWAY_TRUST_PROXY_HOPS || '1'
const trustProxyHops = Math.max(0, Number(trustProxyHopsRaw) || 1)
app.set('trust proxy', trustProxyHops)

// One CORS block only. Credentials stay disabled because the current app does
// not use cookie auth between Vercel and Railway.
app.use(cors({
  origin: true,
  credentials: false,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  return next()
})

app.use(securityHeaders)
app.use(generalRateLimit)
app.use(express.json({ limit: '50mb' }))

const supabaseAdmin = getSupabaseAdmin()
const supabaseConfigured = Boolean(supabaseAdmin)
const demoModeEnabled = process.env.ENABLE_DEMO_MODE === 'true'

app.get('/api/health', (_, res) => {
  res.json({ ok: true, service: 'MMOS Backend', timestamp: new Date().toISOString() })
})

// Public endpoints that must remain accessible without a Supabase session.
// Health checks, auth bootstrap, and the public QR/loyalty slug surface.
const PUBLIC_PATHS = [
  /^\/api\/health$/,
  /^\/api\/system\/health$/,
  /^\/api\/auth\//,
  /^\/api\/v33-functional\/public\/loyalty\/[^/]+\/status$/,
  /^\/api\/v33-functional\/public\/loyalty\/[^/]+\/join-or-scan$/,
  /^\/api\/v33-functional\/public\/loyalty\/[^/]+\/rewards\/[^/]+\/redeem$/,
  /^\/api\/v33-functional\/public\/loyalty\/[^/]+\/password-reset-request$/,
  /^\/api\/v33-functional\/public\/loyalty\/[^/]+\/review$/,
  /^\/api\/qr(\?.*)?$/,
  /^\/api\/pos\/webhook\/[^/]+$/,
  /^\/api\/chatbot\/(start|message)$/
]

const requireAuth = authMiddleware()
const requireAdmin = authMiddleware({ roles: ['admin'] })

app.use('/api', (req, res, next) => {
  // req.originalUrl is the full path before any router stripping; strip the
  // query string so the whitelist regexes only need to match the path.
  const fullPath = (req.originalUrl || req.url || '').split('?')[0]
  if (PUBLIC_PATHS.some((re) => re.test(fullPath))) return next()
  return requireAuth(req, res, next)
})

// System route is critical because Vercel proxy-health and deployment checks use it.
app.use('/api/system', systemRoutes(supabaseAdmin))

// Routes that touch admin-only or cross-tenant data. Adds a second guard
// requiring role=admin in user_profiles (admin or super_admin with status=active).
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

// Customer-intelligence reads PII per customer. Mount with per-customer access
// check that admins automatically pass through.
app.use('/api/customer-intelligence', requireCustomerAccess(), customerIntelligenceRoutes(supabaseAdmin))

// Customer portal also operates on the authenticated user's own customer.
app.use('/api/customer-portal', customerPortalRoutes(supabaseAdmin))

// v33-functional has a mix: public /public/* paths (whitelisted above) plus
// admin/customer endpoints. Auth is already enforced by the global middleware
// for everything that isn't whitelisted, so we mount the router as-is.
app.use('/api/v33-functional', v33FunctionalRoutes(supabaseAdmin))

// Auth router needs no guard (in PUBLIC_PATHS) and handles its own checks.
app.use('/api/auth', authRoutes(supabaseAdmin))

// Public QR endpoint replaces the third-party api.qrserver.com / quickchart.io
// calls that previously leaked customer slugs and IP addresses to non-EU
// providers. Whitelisted above; rate-limited inside the route.
app.use('/api/qr', qrRoutes())

// Art. 15 / 17 DSGVO self-service endpoints (export, delete-request,
// delete-cancel, status). Each route inside enforces auth on its own via
// authMiddleware() so the global guard above is redundant but harmless.
app.use('/api/gdpr', gdprRoutes(supabaseAdmin))

// Referral-Programm: GET/POST sind authentifiziert (global), per-customer-
// Access wird im Router selbst via requireCustomerAccess geprueft.
app.use('/api/referrals', referralRoutes(supabaseAdmin))

// Phase-11 Quick-Win-Bundle (Wallet, Newsletter, Vouchers). Alle global
// authentifiziert ueber den /api-Guard; per-customer-Pruefung im Router.
app.use('/api/wallet', walletPassRoutes(supabaseAdmin))
app.use('/api/newsletter', newsletterRoutes(supabaseAdmin))
app.use('/api/vouchers', voucherRoutes(supabaseAdmin))

// Phase 11c — Sicherheit (2FA) + Datenqualitaet + AI-Review-Response.
// Alle global authentifiziert; pro Route eigene Admin-/Customer-Pruefung.
app.use('/api/security', securityRoutes())
app.use('/api/data-quality', dataQualityRoutes())

// Phase 11d — Buchhaltung, Mahnstufen, POS, No-Show, Chatbot.
app.use('/api/accounting', accountingRoutes())
app.use('/api/dunning', dunningRoutes())
app.use('/api/pos', posRoutes())
app.use('/api/no-show', noShowRoutes())
// Chatbot ist oeffentlich (PUBLIC_PATHS-Whitelist deckt /start und /message).
app.use('/api/chatbot', chatbotRoutes())

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
  } catch (_) {
    // Optional route not present in this build; skip silently.
  }
}

// Sentry error handler must run before the JSON error responder.
attachErrorHandler(app)

// Final error responder. Never leaks stack traces or request bodies to the client.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err)
  const status = err.status || err.statusCode || 500
  const safeMessage = typeof err.message === 'string' ? err.message.slice(0, 500) : 'Interner Serverfehler'
  res.status(status).json({
    ok: false,
    code: err.code || 'INTERNAL_ERROR',
    error: safeMessage,
    hint: err.hint || undefined
  })
  // Lightweight fallback log when Sentry is not configured. Only path + method,
  // never the body or stack.
  const { enabled } = getSentry()
  if (!enabled) {
    console.error('[API_ERROR]', req.method, req.path, status, safeMessage)
  }
})

const port = process.env.PORT || 4000
const server = app.listen(port, () => {
  console.log(`MMOS backend running on ${port}`)
})

// Graceful shutdown so in-flight requests can complete under Railway SIGTERM.
function shutdown(signal) {
  console.log(`[${signal}] graceful shutdown initiated`)
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 10000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
