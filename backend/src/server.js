const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')

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
const { securityHeaders, generalRateLimit } = require('./middleware/securityHardening')

const app = express()

// Railway/Vercel run the backend behind a reverse proxy.
// express-rate-limit requires Express to trust exactly the proxy hop count,
// otherwise X-Forwarded-For triggers ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
const trustProxyHopsRaw = process.env.TRUST_PROXY_HOPS || process.env.RAILWAY_TRUST_PROXY_HOPS || '1'
const trustProxyHops = Math.max(0, Number(trustProxyHopsRaw) || 1)
app.set('trust proxy', trustProxyHops)


// V42.16 STABILITY HARDENING
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

const supabaseConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
const envFlag = (value) => ['true','1','yes','on','enabled'].includes(String(value || '').trim().toLowerCase())
const demoModeEnabled = envFlag(process.env.ENABLE_DEMO_MODE)
const supabaseAdmin = supabaseConfigured
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null

app.get('/api/health', (_, res) => {
  res.json({ ok: true, service: 'MMOS Backend', timestamp: new Date().toISOString() })
})

// System route is critical because Vercel proxy-health and deployment checks use it.
app.use('/api/system', systemRoutes(supabaseAdmin))

const criticalRoutes = [
  ['/api/monitoring', monitoringRoutes],
  ['/api/ops', opsRoutes],
  ['/api/package-billing', packageBillingRoutes],
  ['/api/v20-growth', v20GrowthRoutes],
  ['/api/customer-intelligence', customerIntelligenceRoutes],
  ['/api/ai-automation-core', aiAutomationCoreRoutes],
  ['/api/advanced-loyalty', advancedLoyaltyRoutes],
  ['/api/revenue-dynamic-billing', revenueDynamicBillingRoutes],
  ['/api/review-intelligence', reviewIntelligenceRoutes],
  ['/api/v33-functional', v33FunctionalRoutes],
  ['/api/enterprise', enterpriseRoutes],
  ['/api/customer-portal', customerPortalRoutes],
  ['/api/auth', authRoutes],
  ['/api/admin-profiles', adminProfilesRoutes],
  ['/api/google', googleRoutes],
  ['/api/business-tools', businessToolsRoutes]
]

for (const [routePath, routeFactory] of criticalRoutes) {
  app.use(routePath, routeFactory(supabaseAdmin))
  console.log(`[V42.16] Loaded critical route ${routePath}`)
}

if (demoModeEnabled) {
  const demoEnvironmentRoutes = require('./routes/demoEnvironmentRoutes')
  const demoToolRoutes = require('./routes/demoToolRoutes')
  app.use('/api/demo-environment', demoEnvironmentRoutes(supabaseAdmin))
  app.use('/api/demo-tools', demoToolRoutes(supabaseAdmin))
  console.log('[V42.24] Demo/Test routes enabled by ENABLE_DEMO_MODE=true')
} else {
  console.log('[V42.24] Demo/Test routes disabled for live system')
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
      app.use(routePath, routeFactory(supabaseAdmin))
      console.log(`[V42.16] Loaded optional route ${routePath}`)
    }
  } catch (error) {
    console.log(`[V42.16] Optional route skipped ${routePath}: ${error.message}`)
  }
}

// One final error handler only. Keeps runtime errors JSON-safe and readable in Vercel proxy responses.
app.use((err, req, res, next) => {
  console.error('[V42.16 API ERROR]', err)
  if (res.headersSent) return next(err)
  res.status(err.status || 500).json({
    ok: false,
    code: err.code || 'INTERNAL_ERROR',
    error: err.message || 'Interner Serverfehler',
    details: process.env.NODE_ENV === 'production' ? undefined : String(err.stack || ''),
    hint: err.hint || 'Prüfe Railway Logs, Supabase Migrationen, API Provider Mapping und Backend-ENV.',
    provider: err.provider,
    google_status: err.google_status,
    missing_env: err.missing_env
  })
})

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`MMOS backend running on ${port}`))
