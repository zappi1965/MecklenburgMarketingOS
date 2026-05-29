function cleanEnv(value) {
  const raw = String(value || '').trim().replace(/^['"]|['"]$/g, '')
  if (!raw) return ''
  if (['null', 'undefined', 'false', '0', '-'].includes(raw.toLowerCase())) return ''
  return raw
}

class MailService {
  constructor() {
    this.apiKey = cleanEnv(process.env.RESEND_API_KEY)
    this.enabled = Boolean(this.apiKey)
    if (this.enabled) {
      const { Resend } = require('resend')
      this.resend = new Resend(this.apiKey)
    }
    this.from = cleanEnv(process.env.MAIL_FROM) || cleanEnv(process.env.RESEND_FROM) || 'Mecklenburg Marketing <noreply@mecklenburgmarketing.de>'
  }

  diagnostics() {
    return {
      enabled: this.enabled,
      provider: this.enabled ? 'resend' : 'dry_run',
      from: this.from,
      missing_env: this.enabled ? [] : ['RESEND_API_KEY'],
      hint: this.enabled
        ? 'RESEND_API_KEY ist gesetzt. Falls Mails nicht ankommen: MAIL_FROM muss in Resend als Domain/Sender verifiziert sein.'
        : 'Setze RESEND_API_KEY und idealerweise MAIL_FROM mit verifizierter Absenderdomain.'
    }
  }

  async send({ to, subject, html, text, body, replyTo, requireDelivery = false, from }) {
    if (!to) throw new Error('Mail Empfänger fehlt')
    if (!text && body) text = body

    if (!this.enabled) {
      const dryRun = { dryRun: true, provider: 'dry_run', to, subject, html, text, missing_env: ['RESEND_API_KEY'] }
      console.log('[MAIL_DRY_RUN]', dryRun)
      if (requireDelivery) {
        const err = new Error('Mailversand nicht konfiguriert: RESEND_API_KEY fehlt.')
        err.code = 'MAIL_NOT_CONFIGURED'
        err.status = 503
        err.details = dryRun
        throw err
      }
      return dryRun
    }

    const sender = cleanEnv(from) || this.from
    const payload = {
      from: sender,
      to,
      subject,
      html: html || `<pre>${String(text || '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]))}</pre>`
    }
    if (text) payload.text = text
    if (replyTo) payload.replyTo = replyTo

    const result = await this.resend.emails.send(payload)
    if (result?.error) {
      const err = new Error(result.error.message || 'Resend konnte die E-Mail nicht senden.')
      err.code = result.error.name || 'RESEND_ERROR'
      err.status = 502
      err.details = result.error
      err.payload = { ...payload, html: '[redacted]', text: text ? '[redacted]' : undefined }
      throw err
    }

    return {
      sent: true,
      provider: 'resend',
      id: result?.data?.id || result?.id || null,
      to,
      from: sender
    }
  }
}

module.exports = MailService
