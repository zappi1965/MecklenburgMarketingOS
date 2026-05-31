
const express = require('express')
const MailService = require('../services/mailService')
const PdfService = require('../services/pdfService')
const QrService = require('../services/qrService')
const ApiSyncService = require('../services/apiSyncService')
const { createInvoiceSchema, createQrCampaignSchema, validate } = require('../validators/schemas')
const {
  requireAdminRequest,
  validateDocumentRows,
  validateInvoices,
  runRlsAudit,
  exportBackupSnapshot,
  productionSummary,
  CORE_TABLES
} = require('../services/productionValidationService')
const { sendMonitoringAlert } = require('../services/monitoringAlertService')

function productionRoutes(supabase) {
  const router = express.Router()
  const mail = new MailService()
  const pdf = new PdfService(supabase)
  const qr = new QrService()
  const apiSync = new ApiSyncService(supabase)

  router.get('/health', async (_, res) => {
    res.json({
      ok: true,
      service: 'MMOS Production Readiness API',
      mail_enabled: Boolean(process.env.RESEND_API_KEY),
      timestamp: new Date().toISOString()
    })
  })

  router.post('/mail/test', async (req, res, next) => {
    try {
      const result = await mail.send({
        to: req.body.to,
        subject: req.body.subject || 'MMOS Testmail',
        html: req.body.html || '<b>MMOS Mailservice funktioniert.</b>'
      })
      res.json({ ok: true, data: result })
    } catch (e) { next(e) }
  })

  router.post('/qr/campaign', validate(createQrCampaignSchema), async (req, res, next) => {
    try {
      const { data: campaign, error } = await supabase.from('qr_campaigns').insert({
        ...req.body,
        status: 'Aktiv'
      }).select().single()
      if (error) throw error

      const reviewUrl = qr.buildReviewUrl({ campaignId: campaign.id })
      const dataUrl = await qr.toDataUrl(reviewUrl)

      await supabase.from('qr_campaigns').update({ qr_data_url: dataUrl, review_url: reviewUrl }).eq('id', campaign.id).catch(()=>null)

      res.json({ ok: true, data: { ...campaign, qr_data_url: dataUrl, review_url: reviewUrl } })
    } catch (e) { next(e) }
  })

  router.post('/pdf/render-invoice', validate(createInvoiceSchema), async (req, res, next) => {
    try {
      const customerRes = await supabase.from('customers').select('*').eq('id', req.body.customer_id).maybeSingle()
      const customer = customerRes.data || {}
      const invoiceNumber = `Re_${String(customer.name || 'Kunde').replace(/\s+/g,'_')}_${Date.now()}`
      const rendered = pdf.renderPlaceholders(
        'Rechnung {{RECHNUNGSNUMMER}}\nKunde: {{KUNDENNAME}}\nLeistung: {{LEISTUNG}}\nBetrag: {{BETRAG}}',
        {
          RECHNUNGSNUMMER: invoiceNumber,
          KUNDENNAME: customer.name,
          LEISTUNG: req.body.service_type,
          BETRAG: req.body.amount
        }
      )
      const file = await pdf.generateTextPdfPlaceholder({
        customer_id: req.body.customer_id,
        filename: `${invoiceNumber}.txt`,
        content: rendered
      })
      res.json({ ok: true, data: { invoice_number: invoiceNumber, rendered, file } })
    } catch (e) { next(e) }
  })


  router.get('/validation/summary', async (req, res, next) => {
    try {
      requireAdminRequest(req)
      res.json(await productionSummary(supabase))
    } catch (e) { next(e) }
  })

  router.get('/validation/rls', async (req, res, next) => {
    try {
      requireAdminRequest(req)
      res.json(await runRlsAudit(supabase))
    } catch (e) { next(e) }
  })

  router.post('/validation/documents', async (req, res, next) => {
    try {
      requireAdminRequest(req)
      res.json(await validateDocumentRows(supabase, req.body.customer_id || req.body.customerId))
    } catch (e) { next(e) }
  })

  router.post('/validation/invoices', async (req, res, next) => {
    try {
      requireAdminRequest(req)
      res.json(await validateInvoices(supabase, req.body.customer_id || req.body.customerId || null))
    } catch (e) { next(e) }
  })

  router.post('/backup/export', async (req, res, next) => {
    try {
      requireAdminRequest(req)
      const tables = Array.isArray(req.body.tables) && req.body.tables.length ? req.body.tables : CORE_TABLES
      const limit = Math.min(Number(req.body.limit || 1000), 5000)
      const snapshot = await exportBackupSnapshot(supabase, tables, limit)
      try {
        await supabase.from('backup_drill_runs').insert({
          status: 'exported',
          table_count: Object.keys(snapshot.tables || {}).length,
          row_count: Object.values(snapshot.tables || {}).reduce((sum, t) => sum + Number(t.count || 0), 0),
          metadata: { mode: 'api_export', limit },
          created_at: new Date().toISOString()
        })
      } catch (_) {}
      res.json({ ok: true, snapshot })
    } catch (e) { next(e) }
  })

  router.post('/monitoring/test-alert', async (req, res, next) => {
    try {
      requireAdminRequest(req)
      const result = await sendMonitoringAlert(supabase, {
        level: 'test',
        title: 'MMOS Test-Alarm',
        message: req.body.message || 'Monitoring-/Fehlerbenachrichtigung ist grundsätzlich eingerichtet.',
        to: req.body.to,
        metadata: { source: 'production.validation.test-alert', actor: req.user?.email || req.user?.id || null }
      })
      res.json(result)
    } catch (e) { next(e) }
  })

  router.get('/live-e2e/:customer_id', async (req, res, next) => {
    try {
      requireAdminRequest(req)
      const customer_id = req.params.customer_id
      const [summary, documents, invoices, rls] = await Promise.all([
        productionSummary(supabase),
        validateDocumentRows(supabase, customer_id).catch((e) => ({ ok: false, error: e.message })),
        validateInvoices(supabase, customer_id).catch((e) => ({ ok: false, error: e.message })),
        runRlsAudit(supabase).catch((e) => ({ ok: false, error: e.message }))
      ])
      res.json({
        ok: Boolean(summary.ok && documents.ok && invoices.ok),
        customer_id,
        checks: { summary, documents, invoices, rls },
        timestamp: new Date().toISOString()
      })
    } catch (e) { next(e) }
  })

  router.post('/sync/:provider/:customer_id', async (req, res, next) => {
    try {
      const { provider, customer_id } = req.params
      const result = await apiSync.sync(provider, customer_id, req.body || {})
      res.json({ ok: true, provider: apiSync.normalizeProvider(provider), data: result })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = productionRoutes
