
const express = require('express')
const { createDemoInvoicePdf, createDemoMonthlyReportPdf } = require('../services/demoPdfService')
const { createQrPayload } = require('../services/demoQrService')
const { sendDemoMail } = require('../services/demoMailService')

function demoToolRoutes(supabase) {
  const router = express.Router()

  async function insertNotification({ customer_name, customer_id, title, message, type }) {
    await supabase.from('demo_notifications').insert({
      customer_name,
      customer_id,
      title,
      message,
      type,
      actor_name: 'Demo System'
    })
  }

  async function createRun({ customer_name, customer_id, workflow_key, title, message, result }) {
    const { data, error } = await supabase.from('demo_workflow_runs').insert({
      customer_name,
      customer_id,
      workflow_key,
      title,
      status: 'completed',
      progress: 100,
      message,
      result: result || {},
      created_by: 'Demo System',
      finished_at: new Date().toISOString()
    }).select('*').single()
    if (error) throw error
    return data
  }

  router.get('/health', (_, res) => {
    res.json({ ok: true, service: 'MMOS Internal Test Tools', resend: Boolean(process.env.RESEND_API_KEY) })
  })

  router.get('/state', async (_, res, next) => {
    try {
      const [runs, notifications, invoices, qr, mails] = await Promise.all([
        supabase.from('demo_workflow_runs').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('demo_notifications').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('demo_invoices').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('demo_qr_campaigns').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('demo_mail_jobs').select('*').order('created_at', { ascending: false }).limit(50),
      ])
      res.json({
        ok: true,
        runs: runs.data || [],
        notifications: notifications.data || [],
        invoices: invoices.data || [],
        qr_campaigns: qr.data || [],
        mail_jobs: mails.data || []
      })
    } catch (e) { next(e) }
  })

  router.post('/workflow/:key', async (req, res, next) => {
    try {
      const key = req.params.key
      const body = req.body || {}
      const customer_name = body.customer_name || 'Interner Testkunde'
      const customer_id = body.customer_id || null

      const titles = {
        invoice_overdue: 'Rechnung überfällig',
        new_ticket: 'Neues Ticket erstellt',
        seo_decline: 'SEO Rückgang erkannt',
        package_requested: 'Paket angefragt',
        monthly_report: 'Monatsreport fällig',
        review_funnel: 'Review Funnel ausgelöst'
      }

      let result = { action: key, demo: true }
      let message = `${titles[key] || key} wurde in der Demo ausgeführt.`

      if (key === 'invoice_overdue') {
        await insertNotification({
          customer_name,
          customer_id,
          title: 'Rechnung überfällig',
          message: `${customer_name}: Demo-Mahnlauf wurde vorbereitet.`,
          type: 'invoice_overdue'
        })
      }

      if (key === 'monthly_report') {
        const pdf = await createDemoMonthlyReportPdf({ customer_name })
        result.pdf_base64 = pdf.toString('base64')
        result.file_name = `Demo_Monatsreport_${customer_name.replace(/\s+/g,'_')}.pdf`
        message = 'Test-Monatsreport als PDF erzeugt.'
      }

      if (key === 'review_funnel') {
        const qrPayload = await createQrPayload({
          name: 'Review Funnel',
          customer_name,
          redirect_url: body.redirect_url
        })
        const { data: campaign, error } = await supabase.from('demo_qr_campaigns').insert({
          customer_name,
          customer_id,
          name: 'Review Funnel',
          slug: qrPayload.slug,
          public_url: qrPayload.public_url,
          redirect_url: qrPayload.redirect_url,
          internal_email: body.internal_email || 'feedback@mecklenburgmarketing.de',
          internal_threshold: Number(body.internal_threshold || 3),
          google_redirect_threshold: Number(body.google_redirect_threshold || 4),
          qr_svg: qrPayload.qr_svg,
          qr_png_base64: qrPayload.qr_png_base64,
          created_by: 'Demo System'
        }).select('*').single()
        if (error) throw error
        result.campaign = campaign
        message = 'Test Review Funnel QR-Kampagne erzeugt.'
      }

      const run = await createRun({
        customer_name,
        customer_id,
        workflow_key: key,
        title: titles[key] || key,
        message,
        result
      })

      res.json({ ok: true, run })
    } catch (e) { next(e) }
  })

  router.post('/invoice', async (req, res, next) => {
    try {
      const body = req.body || {}
      const customer_name = body.customer_name || 'Interner Testkunde'
      const countRes = await supabase.from('demo_invoices').select('id', { count: 'exact', head: true }).eq('customer_name', customer_name)
      const nextNumber = (countRes.count || 0) + 1
      const invoice_number = body.invoice_number || `RE_${customer_name.replace(/\s+/g,'_')}_${nextNumber}`

      const invoiceDraft = {
        customer_name,
        customer_id: body.customer_id || null,
        invoice_number,
        service_type: body.service_type || 'Testrechnung',
        amount: Number(body.amount || 0),
        status: body.status || 'Offen',
        created_by: body.created_by || 'Demo System'
      }

      const pdf = await createDemoInvoicePdf(invoiceDraft)
      const pdf_base64 = pdf.toString('base64')
      const pdf_url = `data:application/pdf;base64,${pdf_base64}`

      const { data, error } = await supabase.from('demo_invoices').insert({
        ...invoiceDraft,
        pdf_url,
        pdf_storage_path: null
      }).select('*').single()
      if (error) throw error

      await insertNotification({
        customer_name,
        customer_id: body.customer_id || null,
        title: 'Testrechnung erstellt',
        message: `${invoice_number} wurde als PDF erzeugt.`,
        type: 'invoice_created'
      })

      res.json({ ok: true, invoice: data, pdf_base64 })
    } catch (e) { next(e) }
  })

  router.post('/qr-campaign', async (req, res, next) => {
    try {
      const body = req.body || {}
      const customer_name = body.customer_name || 'Interner Testkunde'
      const name = body.name || 'Review Kampagne'
      const qrPayload = await createQrPayload({
        name,
        customer_name,
        redirect_url: body.redirect_url
      })

      const { data, error } = await supabase.from('demo_qr_campaigns').insert({
        customer_name,
        customer_id: body.customer_id || null,
        name,
        slug: qrPayload.slug,
        public_url: qrPayload.public_url,
        redirect_url: qrPayload.redirect_url,
        internal_email: body.internal_email || 'feedback@mecklenburgmarketing.de',
        internal_threshold: Number(body.internal_threshold || 3),
        google_redirect_threshold: Number(body.google_redirect_threshold || 4),
        qr_svg: qrPayload.qr_svg,
        qr_png_base64: qrPayload.qr_png_base64,
        created_by: body.created_by || 'Demo System'
      }).select('*').single()

      if (error) throw error

      await insertNotification({
        customer_name,
        customer_id: body.customer_id || null,
        title: 'QR-Kampagne erstellt',
        message: `${name} wurde erzeugt und kann geöffnet werden.`,
        type: 'qr_campaign_created'
      })

      res.json({ ok: true, campaign: data })
    } catch (e) { next(e) }
  })

  router.get('/qr-campaign/:id', async (req, res, next) => {
    try {
      const { data, error } = await supabase.from('demo_qr_campaigns').select('*').eq('id', req.params.id).single()
      if (error) throw error
      res.json({ ok: true, campaign: data })
    } catch (e) { next(e) }
  })

  router.post('/mail/test', async (req, res, next) => {
    try {
      const body = req.body || {}
      const to = body.to || body.to_email
      if (!to) return res.status(400).json({ ok: false, error: 'Empfänger fehlt' })

      const subject = body.subject || 'MMOS Test Mail'
      const html = body.html || '<b>MMOS Resend Test erfolgreich.</b>'

      const { data: job, error } = await supabase.from('demo_mail_jobs').insert({
        to_email: to,
        from_email: process.env.MAIL_FROM || 'noreply@mecklenburgmarketing.de',
        subject,
        html,
        status: 'pending'
      }).select('*').single()
      if (error) throw error

      let sendResult
      try {
        sendResult = await sendDemoMail({ to, subject, html })
        await supabase.from('demo_mail_jobs').update({
          status: sendResult.sent ? 'sent' : 'skipped',
          provider_response: sendResult,
          sent_at: sendResult.sent ? new Date().toISOString() : null
        }).eq('id', job.id)
      } catch (mailError) {
        sendResult = { sent: false, error: mailError.message || String(mailError) }
        await supabase.from('demo_mail_jobs').update({
          status: 'failed',
          last_error: sendResult.error,
          provider_response: sendResult
        }).eq('id', job.id)
      }

      res.json({ ok: true, job, sendResult })
    } catch (e) { next(e) }
  })

  router.delete('/reset', async (_, res, next) => {
    try {
      // V42.24.3: Non-destructive by design. Demo records must stay available
      // for internal test views and must never be purged by the live cleanup path.
      res.json({ ok: true, preserved: true, message: 'Demo-Daten wurden nicht gelöscht. Die interne Testumgebung bleibt vollständig erhalten.' })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = demoToolRoutes
