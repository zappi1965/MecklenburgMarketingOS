const express = require('express')
const GotenbergService = require('../services/gotenbergService')
const DocumentMediaService = require('../services/documentMediaService')

function safeFilename(value = 'document') {
  return String(value || 'document')
    .replace(/\.pdf$/i, '')
    .replace(/[^a-z0-9äöüß_-]+/gi, '_')
    .replace(/^_+|_+$/g, '') || 'document'
}

function documentMediaRoutes(supabase) {
  const router = express.Router()
  const gotenberg = new GotenbergService(supabase)
  const media = new DocumentMediaService(supabase)

  router.get('/health', async (_, res) => {
    const gotenbergHealth = await gotenberg.health()
    res.json({
      ok: true,
      service: 'MMOS Document Media',
      bucket: media.bucket,
      gotenberg: gotenbergHealth,
      features: ['render_and_store_pdf', 'customer_document_list', 'signed_download_links', 'media_center_metadata']
    })
  })

  router.post('/render-and-store-pdf', async (req, res, next) => {
    try {
      await media.assertAdmin(req.userRole)
      const body = req.body || {}
      const customer_id = body.customer_id || body.customerId
      const html = String(body.html || '')
      if (!customer_id) return res.status(400).json({ ok: false, code: 'CUSTOMER_ID_REQUIRED', error: 'customer_id fehlt.' })
      if (!html.trim()) return res.status(400).json({ ok: false, code: 'HTML_REQUIRED', error: 'HTML-Inhalt fehlt.' })

      const filename = `${safeFilename(body.filename || body.title || 'mmos-dokument')}.pdf`
      const pdf = await gotenberg.convertHtmlToPdf(html, filename)
      if (pdf?.dryRun) return res.status(503).json({ ok: false, code: 'GOTENBERG_NOT_CONFIGURED', error: pdf.note })

      const stored = await media.storePdf({
        customer_id,
        pdfBuffer: pdf,
        filename,
        title: body.title || filename,
        document_type: body.document_type || body.type || 'report',
        source_table: body.source_table || null,
        source_id: body.source_id || null,
        visibility: body.visibility || 'customer',
        actor_name: body.actor_name || body.generated_by || 'Mecklenburg Marketing'
      })

      res.json({ ok: true, document: stored })
    } catch (error) { next(error) }
  })

  router.post('/store-existing-pdf', async (req, res, next) => {
    try {
      await media.assertAdmin(req.userRole)
      const body = req.body || {}
      const customer_id = body.customer_id || body.customerId
      if (!customer_id) return res.status(400).json({ ok: false, code: 'CUSTOMER_ID_REQUIRED', error: 'customer_id fehlt.' })
      if (!body.pdf_base64) return res.status(400).json({ ok: false, code: 'PDF_BASE64_REQUIRED', error: 'pdf_base64 fehlt.' })
      const pdfBuffer = Buffer.from(String(body.pdf_base64), 'base64')
      const stored = await media.storePdf({
        customer_id,
        pdfBuffer,
        filename: `${safeFilename(body.filename || body.title || 'mmos-dokument')}.pdf`,
        title: body.title || body.filename || 'Dokument',
        document_type: body.document_type || body.type || 'document',
        source_table: body.source_table || null,
        source_id: body.source_id || null,
        visibility: body.visibility || 'customer',
        actor_name: body.actor_name || body.generated_by || 'Mecklenburg Marketing'
      })
      res.json({ ok: true, document: stored })
    } catch (error) { next(error) }
  })

  router.get('/customers/:customer_id/documents', async (req, res, next) => {
    try {
      await media.assertCustomerAccess({ user: req.user, userRole: req.userRole, customerId: req.params.customer_id })
      const documents = await media.listCustomerDocuments({ customer_id: req.params.customer_id, include_signed_urls: true })
      res.json({ ok: true, documents, count: documents.length })
    } catch (error) { next(error) }
  })

  router.get('/customers/:customer_id/documents/:source/:id/download', async (req, res, next) => {
    try {
      await media.assertCustomerAccess({ user: req.user, userRole: req.userRole, customerId: req.params.customer_id })
      const document = await media.resolveDownload({ customer_id: req.params.customer_id, source: req.params.source, id: req.params.id })
      if (!document.url) return res.status(404).json({ ok: false, code: 'DOCUMENT_URL_MISSING', error: 'Für dieses Dokument ist kein Datei-Link hinterlegt.' })
      res.json({ ok: true, document, url: document.url })
    } catch (error) { next(error) }
  })

  return router
}

module.exports = documentMediaRoutes
