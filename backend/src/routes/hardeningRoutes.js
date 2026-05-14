
const express = require('express')
const multer = require('multer')
const MailService = require('../services/mailService')
const GotenbergService = require('../services/gotenbergService')
const { ticketReplyTemplate, invoiceTemplate, reviewInternalTemplate } = require('../services/hardenedMailTemplates')
const { envStatus, missingEnv } = require('../services/envService')

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })

function hardeningRoutes(supabase) {
  const router = express.Router()
  const mail = new MailService()
  const gotenberg = new GotenbergService(supabase)

  router.get('/health', async (_, res) => {
    res.json({
      ok: true,
      service: 'MMOS API Ready',
      services: envStatus(),
      missing: missingEnv()
    })
  })

  router.post('/mail/ticket-reply', async (req, res, next) => {
    try {
      const tpl = ticketReplyTemplate(req.body)
      const result = await mail.send({ to: req.body.to, ...tpl })
      res.json({ ok: true, data: result })
    } catch (e) { next(e) }
  })

  router.post('/mail/invoice', async (req, res, next) => {
    try {
      const tpl = invoiceTemplate(req.body)
      const result = await mail.send({ to: req.body.to, ...tpl })
      res.json({ ok: true, data: result })
    } catch (e) { next(e) }
  })

  router.post('/mail/review-internal', async (req, res, next) => {
    try {
      const tpl = reviewInternalTemplate(req.body)
      const result = await mail.send({ to: req.body.to, ...tpl })
      res.json({ ok: true, data: result })
    } catch (e) { next(e) }
  })

  router.post('/pdf/convert-office', upload.single('file'), async (req, res, next) => {
    try {
      if (!req.file) throw new Error('Datei fehlt')
      const customer_id = req.body.customer_id
      const file_type = req.body.file_type || 'documents'
      if (customer_id) {
        const stored = await gotenberg.convertAndStore({
          customer_id,
          fileBuffer: req.file.buffer,
          filename: req.file.originalname,
          file_type
        })
        return res.json({ ok: true, data: stored })
      }
      const result = await gotenberg.convertOfficeToPdf(req.file.buffer, req.file.originalname)
      if (result?.dryRun) return res.json({ ok: true, data: result })
      res.setHeader('Content-Type', 'application/pdf')
      res.send(result)
    } catch (e) { next(e) }
  })

  router.post('/jobs/retry-failed', async (_, res, next) => {
    try {
      const { data } = await supabase.from('job_runs').update({
        status: 'pending',
        attempts: 0,
        last_error: null
      }).eq('status', 'failed').select()
      res.json({ ok: true, retried: data?.length || 0 })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = hardeningRoutes
