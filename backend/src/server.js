
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
const demoEnvironmentRoutes = require('./routes/demoEnvironmentRoutes')
const v33FunctionalRoutes = require('./routes/v33FunctionalRoutes')
const demoToolRoutes = require('./routes/demoToolRoutes')
const enterpriseRoutes = require('./routes/enterpriseRoutes')
const customerPortalRoutes = require('./routes/customerPortalRoutes')
const { securityHeaders, generalRateLimit } = require('./middleware/securityHardening')

const app = express()



// V42.2 CORS HOTFIX
// V42.3 EXPRESS OPTIONS HOTFIX: uses route-less OPTIONS middleware for Express 5 compatibility
// Allows Vercel/frontend domains to call the Railway backend.
// For the demo stage we allow all origins. Credentials are disabled because
// the current frontend does not rely on cookie-based auth.
app.use(cors({
  origin: true,
  credentials: false,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }
  return next()
})
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

app.use(cors())
app.use(securityHeaders)
app.use(generalRateLimit)
app.use(express.json({ limit: '50mb' }))

app.get('/api/health', (_, res) => {
  res.json({ ok: true, service: 'MMOS Backend', timestamp: new Date().toISOString() })
})

app.get('/api/system/health', (_, res) => {
  res.json({
    ok: true,
    service: 'MMOS Backend',
    supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    resend: Boolean(process.env.RESEND_API_KEY),
    gotenberg: Boolean(process.env.GOTENBERG_URL),
    timestamp: new Date().toISOString()
  })
})

app.use('/api/monitoring', monitoringRoutes(supabaseAdmin))
app.use('/api/ops', opsRoutes(supabaseAdmin))
app.use('/api/package-billing', packageBillingRoutes(supabaseAdmin))
app.use('/api/v20-growth', v20GrowthRoutes(supabaseAdmin))
app.use('/api/customer-intelligence', customerIntelligenceRoutes(supabaseAdmin))
app.use('/api/ai-automation-core', aiAutomationCoreRoutes(supabaseAdmin))
app.use('/api/advanced-loyalty', advancedLoyaltyRoutes(supabaseAdmin))
app.use('/api/revenue-dynamic-billing', revenueDynamicBillingRoutes(supabaseAdmin))
app.use('/api/review-intelligence', reviewIntelligenceRoutes(supabaseAdmin))
app.use('/api/demo-environment', demoEnvironmentRoutes(supabaseAdmin))
app.use('/api/v33-functional', v33FunctionalRoutes(supabaseAdmin))
app.use('/api/demo-tools', demoToolRoutes(supabaseAdmin))
app.use('/api/enterprise', enterpriseRoutes(supabaseAdmin))
app.use('/api/customer-portal', customerPortalRoutes(supabaseAdmin))

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
      console.log(`Loaded route ${routePath}`)
    }
  } catch (error) {
    console.log(`Optional route skipped ${routePath}: ${error.message}`)
  }
}

app.use((err, req, res, next) => {
  console.error('[API_ERROR]', err)
  res.status(500).json({ ok: false, error: err.message || 'Interner Serverfehler' })
})

const port = process.env.PORT || 4000

// V39_GLOBAL_ERROR_HANDLER
app.use((err, req, res, next) => {
  console.error('[V39 API ERROR]', err)
  if (res.headersSent) return next(err)
  res.status(err.status || 500).json({
    ok: false,
    code: err.code || 'INTERNAL_ERROR',
    error: err.message || 'Interner Serverfehler',
    details: process.env.NODE_ENV === 'production' ? undefined : String(err.stack || ''),
    hint: 'Prüfe Railway Logs, Supabase Migrationen und NEXT_PUBLIC_BACKEND_URL.'
  })
})

app.listen(port, () => console.log(`MMOS backend running on ${port}`))
