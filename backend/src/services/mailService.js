
class MailService {
  constructor() {
    this.enabled = Boolean(process.env.RESEND_API_KEY)
    if (this.enabled) {
      const { Resend } = require('resend')
      this.resend = new Resend(process.env.RESEND_API_KEY)
    }
    this.from = process.env.MAIL_FROM || 'MMOS <noreply@example.com>'
  }

  async send({ to, subject, html, text }) {
    if (!to) throw new Error('Mail Empfänger fehlt')

    if (!this.enabled) {
      console.log('[MAIL_DRY_RUN]', { to, subject, html, text })
      return { dryRun: true }
    }

    const result = await this.resend.emails.send({
      from: this.from,
      to,
      subject,
      html: html || `<pre>${text || ''}</pre>`
    })

    return result
  }
}

module.exports = MailService
