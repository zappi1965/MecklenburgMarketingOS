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
const documentMediaRoutes = require('./routes/documentMediaRoutes')
const productionReadinessRoutes = require('./routes/productionReadinessRoutes')
const productionRoutes = require('./routes/productionRoutes')
const finalHardeningRoutes = require('./routes/finalHardeningRoutes')
const documentEngineV2Routes = require('./routes/documentEngineV2Routes')
const securityCoreRoutes = require('./routes/securityCoreRoutes')
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

initSentry(app)

const trustProxyHopsRaw = process.env.TRUST_PROXY_HOPS || process.env.RAILWAY_TRUST_PROXY_HOPS || '1'
const trustProxyHops = Math.max(0, Number(trustProxyHopsRaw) || 1)
app.set('trust proxy', trustProxyHops)

app.use(cors({
  origin: true,
  credentials: false,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-MFA-Code', 'X-MMOS-MFA-Code']
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
app.locals.supabaseAdmin = supabaseAdmin
const demoModeEnabled = process.env.ENABLE_DEMO_MODE === 'true'

app.get('/api/health', (_, res) => {
  res.json({ ok: true, service: 'MMOS Backend', timestamp: new Date().toISOString() })
})

const PUBLIC_PATHS = [
  /^\/api\/health$/,
  /^\/api\/system\/health$/,
  /^\/api\/system\/status$/,
  /^\/api\/v33-functional\/v42\/health$/,
  /^\/api\/auth\//,
  /^\/api\/v33-functional\/public\/loyalty\/[^/]+\/status$/,
  /^\/api\/v33-functional\/public\/loyalty\/[^/]+\/join-or-scan$/,
  /^\/api\/v33-functional\/public\/loyalty\/[^/]+\/rewards\/[^/]+\/redeem$/,
  /^\/api\/v33-functional\/public\/loyalty\/[^/]+\/password-reset-request$/,
  /^\/api\/v33-functional\/public\/loyalty\/[^/]+\/review$/,
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
app.use('/api/document-media', documentMediaRoutes(supabaseAdmin))

app.use('/api/customer-intelligence', requireCustomerAccess(), customerIntelligenceRoutes(supabaseAdmin))
app.use('/api/customer-portal', customerPortalRoutes(supabaseAdmin))
app.use('/api/v33-functional', v33FunctionalRoutes(supabaseAdmin))
app.use('/api/auth', authRoutes(supabaseAdmin))
app.use('/api/qr', qrRoutes())
app.use('/api/gdpr', gdprRoutes(supabaseAdmin))
app.use('/api/referrals', referralRoutes(supabaseAdmin))
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
  const safeMessage = typeof err.message === 'string' ? err.message.slice(0, 500) : 'Interner Serverfehler'
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
