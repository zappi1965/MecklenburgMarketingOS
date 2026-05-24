
const express = require('express')
const MailService = require('../services/mailService')
const PdfService = require('../services/pdfService')
const QrService = require('../services/qrService')
const ApiSyncService = require('../services/apiSyncService')
const { createInvoiceSchema, createQrCampaignSchema, validate } = require('../validators/schemas')

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
