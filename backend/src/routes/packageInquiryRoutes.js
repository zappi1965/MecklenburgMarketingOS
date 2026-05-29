const express = require('express')
const MailService = require('../services/mailService')

function clean(value, max = 2000) {
  return String(value || '').trim().slice(0, max)
}

function htmlEscape(value) {
  return String(value || '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]))
}

function packageInquiryRoutes(supabase) {
  const router = express.Router()

  router.post('/package-inquiry', async (req, res, next) => {
    try {
      const body = req.body || {}
      const packageName = clean(body.package_name || body.package || 'Individuelles Setup', 120)
      const contactName = clean(body.contact_name || body.name || body.requested_by, 160)
      const companyName = clean(body.company_name || body.company || body.business_name, 180)
      const email = clean(body.email || body.contact_email, 220).toLowerCase()
      const phone = clean(body.phone || body.telefon, 80)
      const message = clean(body.message || body.note, 2500)
      const source = clean(body.source || 'public_landingpage', 120)

      if (!contactName || !email || !email.includes('@')) return res.status(400).json({ ok:false, error:'Name und gültige E-Mail sind erforderlich.' })

      const now = new Date().toISOString()
      const metadata = { source, contact_name: contactName, company_name: companyName, email, phone, message, user_agent: req.get('user-agent') || null, ip: req.ip || req.get('x-forwarded-for') || null }
      let requestRow = null
      let dbStatus = 'skipped'

      if (supabase) {
        const fullPayload = { package_name: packageName, package_key: packageName.toLowerCase().replace(/[^a-z0-9]+/g, '_'), status: 'Angefragt', billing_interval: 'month', requested_by: contactName, contact_name: contactName, company_name: companyName, email, phone, message, source, metadata, created_at: now, updated_at: now }
        let result = await supabase.from('package_requests').insert(fullPayload).select('*').single()
        if (result.error) result = await supabase.from('package_requests').insert({ package_name: packageName, status:'Angefragt', billing_interval:'month', created_at: now }).select('*').single()
        if (!result.error) { requestRow = result.data; dbStatus = 'stored' }
        else dbStatus = result.error.message || 'db_error'

        await supabase.from('notifications').insert({ customer_id: null, title: 'Neue Paketanfrage über Landingpage', message: `${companyName || contactName} fragt ${packageName} an. E-Mail: ${email}${phone ? ' · Telefon: ' + phone : ''}`, type: 'public_package_inquiry', actor_name: companyName || contactName, created_at: now }).then(() => undefined, () => undefined)
      }

      const subject = `Neue Paketanfrage: ${packageName}`
      const text = `Neue Paketanfrage über die Landingpage\n\nPaket: ${packageName}\nName: ${contactName}\nBetrieb: ${companyName || '-'}\nE-Mail: ${email}\nTelefon: ${phone || '-'}\n\nNachricht:\n${message || '-'}\n\nQuelle: ${source}\nZeitpunkt: ${now}`
      const html = `<h2>Neue Paketanfrage</h2><p><b>Paket:</b> ${htmlEscape(packageName)}</p><p><b>Name:</b> ${htmlEscape(contactName)}</p><p><b>Betrieb:</b> ${htmlEscape(companyName || '-')}</p><p><b>E-Mail:</b> ${htmlEscape(email)}</p><p><b>Telefon:</b> ${htmlEscape(phone || '-')}</p><h3>Nachricht</h3><p>${htmlEscape(message || '-').replace(/\n/g,'<br/>')}</p><p><small>Quelle: ${htmlEscape(source)} · ${htmlEscape(now)}</small></p>`
      let mailStatus = 'skipped'
      try {
        const mail = new MailService()
        const result = await mail.send({ to: 'zapf@mecklenburgmarketing.de', subject, html, text })
        mailStatus = result?.dryRun ? 'dry_run' : 'sent'
      } catch (mailError) { mailStatus = mailError.message || 'mail_error' }

      res.json({ ok:true, request: requestRow, db_status: dbStatus, mail_status: mailStatus })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = packageInquiryRoutes
