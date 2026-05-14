
const express = require('express')
const monitoringRoutes = require('./routes/monitoringRoutes')
const { securityHeaders, generalRateLimit } = require('./middleware/securityHardening')
const googleRoutes = require('./routes/googleRoutes')
const stripeRoutes = require('./routes/stripeRoutes')
const hardeningRoutes = require('./routes/hardeningRoutes')
const { securityHeaders, apiRateLimit } = require('./middleware/security')
const productionRoutes = require('./routes/productionRoutes')
const errorHandler = require('./middleware/errorHandler')
const avatarRoutes = require('./routes/avatarRoutes')
const invoiceTemplateRoutes = require('./routes/invoiceTemplateRoutes')
const StorageService = require('./services/storageService')
const storageRoutes = require('./routes/storageRoutes')
const basicRateLimit = require('./middleware/rateLimit')
const systemRoutes = require('./routes/systemRoutes')
const cors = require('cors')
const multer = require('multer')
const securityHeaders = require('./middleware/securityHeaders')
const { supabaseAdmin } = require('./config')
const asyncHandler = require('./middleware/asyncHandler')
const { notFound, errorMiddleware } = require('./middleware/errorMiddleware')
const ActivityService = require('./services/activityService')
const CrudService = require('./services/crudService')
const NotificationService = require('./services/notificationService')
const WorkflowService = require('./services/workflowService')
const FileService = require('./services/fileService')
const PdfService = require('./services/pdfService')
const WorkerQueue = require('./queues/workerQueue')
const BillingService = require('./services/billingService')
const billingRoutes = require('./routes/billingRoutes')
const ExportService = require('./services/exportService')
const EmailService = require('./services/emailService')
const WorkflowRuleEngine = require('./services/workflowRuleEngine')
const advancedRoutes = require('./routes/advancedRoutes')

const app = express()
const storageService = new StorageService(supabaseAdmin)
const upload = multer({ storage: multer.memoryStorage() })

app.use(cors())
app.use(securityHeaders)
app.use(express.json({ limit: '20mb' }))
app.use(basicRateLimit())

const activityService = new ActivityService(supabaseAdmin)
const crudService = new CrudService(supabaseAdmin, activityService)
const notificationService = new NotificationService(supabaseAdmin, activityService)
const workflowService = new WorkflowService(supabaseAdmin, notificationService, activityService)
const fileService = new FileService(supabaseAdmin, activityService)
const pdfService = new PdfService()
const workerQueue = new WorkerQueue(supabaseAdmin, workflowService)
const billingService = new BillingService(supabaseAdmin, activityService, notificationService)
const exportService = new ExportService(supabaseAdmin)
const emailService = new EmailService(activityService)
const workflowRuleEngine = new WorkflowRuleEngine(workflowService, notificationService, activityService)

function ensureSupabase() {
  if (!supabaseAdmin) {
    const err = new Error('SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt')
    err.status = 500
    throw err
  }
}

app.use('/api/system', systemRoutes(supabaseAdmin))

app.use('/api/billing', billingRoutes(billingService))
app.use('/api/advanced', advancedRoutes({ exportService, emailService, workflowRuleEngine }))

app.use('/api/storage', storageRoutes(storageService))


app.use('/api/avatars', avatarRoutes(supabaseAdmin))
app.use('/api/invoice-templates', invoiceTemplateRoutes(supabaseAdmin))


app.use('/api/production', productionRoutes(supabaseAdmin))



app.use('/api/google', googleRoutes(supabaseAdmin))
app.use('/api/stripe', stripeRoutes(supabaseAdmin))


app.use('/api/monitoring', monitoringRoutes(supabaseAdmin))

app.use('/api/hardening', hardeningRoutes(supabaseAdmin))

app.get('/', (_, res) => res.json({ ok: true, name: 'MMOS v10 Core Backend Production Pass' }))
app.get('/api/health', (_, res) => res.json({ ok: true }))

app.get('/api/:table', asyncHandler(async (req, res) => {
  ensureSupabase()
  const data = await crudService.list(req.params.table, { customer_id: req.query.customer_id })
  res.json({ ok: true, data })
}))

app.post('/api/:table', asyncHandler(async (req, res) => {
  ensureSupabase()
  const data = await crudService.create(req.params.table, req.body)
  res.json({ ok: true, data })
}))

app.patch('/api/:table/:id', asyncHandler(async (req, res) => {
  ensureSupabase()
  const data = await crudService.update(req.params.table, req.params.id, req.body)
  res.json({ ok: true, data })
}))

app.delete('/api/:table/:id', asyncHandler(async (req, res) => {
  ensureSupabase()
  await crudService.remove(req.params.table, req.params.id)
  res.json({ ok: true })
}))

app.post('/api/notifications/enqueue', asyncHandler(async (req, res) => {
  ensureSupabase()
  const data = await notificationService.enqueue(req.body)
  res.json({ ok: true, data })
}))

app.post('/api/workflows/run', asyncHandler(async (req, res) => {
  ensureSupabase()
  const data = await workflowService.run(req.body)
  res.json({ ok: true, data })
}))

app.post('/api/worker/enqueue', asyncHandler(async (req, res) => {
  ensureSupabase()
  const data = await workerQueue.enqueue(req.body)
  res.json({ ok: true, data })
}))

app.post('/api/worker/process', asyncHandler(async (req, res) => {
  ensureSupabase()
  const data = await workerQueue.processNext(req.body.limit || 10)
  res.json({ ok: true, data })
}))

app.post('/api/files/metadata', asyncHandler(async (req, res) => {
  ensureSupabase()
  const data = await fileService.createMetadata(req.body)
  res.json({ ok: true, data })
}))

app.patch('/api/files/:id/version', asyncHandler(async (req, res) => {
  ensureSupabase()
  const data = await fileService.bumpVersion(req.params.id)
  res.json({ ok: true, data })
}))

app.post('/api/upload/:bucket', upload.single('file'), asyncHandler(async (req, res) => {
  ensureSupabase()
  if (!req.file) {
    const err = new Error('file missing')
    err.status = 400
    throw err
  }

  const path = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const { error } = await supabaseAdmin.storage
    .from(req.params.bucket)
    .upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: true })

  if (error) throw error

  const { data } = supabaseAdmin.storage.from(req.params.bucket).getPublicUrl(path)

  if (req.body.customer_id) {
    await fileService.createMetadata({
      customer_id: req.body.customer_id,
      name: req.file.originalname,
      file_type: req.body.file_type || 'general',
      url: data.publicUrl,
      storage_path: path
    })
  }

  res.json({ ok: true, path, url: data.publicUrl })
}))

app.get('/api/pdf/invoice/:id', asyncHandler(async (req, res) => {
  ensureSupabase()
  const { data: invoice, error } = await supabaseAdmin.from('invoices').select('*').eq('id', req.params.id).single()
  if (error) throw error

  const buffer = await pdfService.invoice(invoice)
  res.setHeader('Content-Type', 'application/pdf')
  res.send(buffer)
}))

app.get('/api/pdf/report/:id', asyncHandler(async (req, res) => {
  ensureSupabase()
  const { data: report, error } = await supabaseAdmin.from('reports').select('*').eq('id', req.params.id).single()
  if (error) throw error

  const { data: invoices } = await supabaseAdmin.from('invoices').select('*').eq('customer_id', report.customer_id)
  const { data: tickets } = await supabaseAdmin.from('tickets').select('*').eq('customer_id', report.customer_id)
  const { data: seo } = await supabaseAdmin.from('seo_snapshots').select('*').eq('customer_id', report.customer_id)

  const kpis = {
    revenue: (invoices || []).reduce((s, x) => s + Number(x.amount || 0), 0),
    open_tickets: (tickets || []).filter((x) => x.status !== 'Geschlossen').length,
    seo_traffic: (seo || [])[seo?.length - 1]?.organic_traffic || 0
  }

  const buffer = await pdfService.report(report, kpis)
  res.setHeader('Content-Type', 'application/pdf')
  res.send(buffer)
}))

app.post('/api/bootstrap/demo', asyncHandler(async (req, res) => {
  ensureSupabase()
  if (process.env.BOOTSTRAP_SECRET && req.body.bootstrap_secret !== process.env.BOOTSTRAP_SECRET) {
    const err = new Error('Invalid secret')
    err.status = 401
    throw err
  }

  const { data: customer, error } = await supabaseAdmin.from('customers').upsert({
    name: 'Friseur Nord',
    branch: 'Friseur',
    email: 'kontakt@friseur.de',
    status: 'Aktiv'
  }, { onConflict: 'email' }).select().single()

  if (error) throw error

  await crudService.create('invoices', { customer_id: customer.id, invoice_number: `RE-${Date.now()}`, amount: 1200, status: 'Bezahlt' })
  await crudService.create('tickets', { customer_id: customer.id, title: 'Demo Ticket', status: 'Offen', priority: 'Normal' })
  await crudService.create('seo_snapshots', { customer_id: customer.id, organic_traffic: 1200, impressions: 14000, clicks: 520, ctr: 3.7, top10_keywords: 8 })
  await crudService.create('appointments', { customer_id: customer.id, client_name: 'Strategie Call', appointment_date: new Date().toISOString().slice(0, 10), start_time: '10:00', end_time: '11:00' })

  res.json({ ok: true, data: customer })
}))

app.use(notFound)
app.use(errorMiddleware)

const port = process.env.PORT || 4000
app.use(errorHandler)

app.listen(port, () => console.log(`MMOS v10 Core Backend Production Pass läuft auf ${port}`))
