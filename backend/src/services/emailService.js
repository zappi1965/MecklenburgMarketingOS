
const templates = require('../templates/emailTemplates')

class EmailService {
  constructor(activityService) {
    this.activity = activityService
  }

  async send({ customer_id = null, to, template, variables = {} }) {
    const tpl = templates[template]
    const rendered = tpl ? tpl(variables) : { subject: template, html: variables.html || '' }

    // Provider-agnostic: real sending requires SMTP/Resend/SendGrid credentials.
    await this.activity.log({
      customer_id,
      action: 'email_prepared',
      message: rendered.subject,
      payload: { to, template, variables, html: rendered.html }
    })

    return {
      delivered: false,
      prepared: true,
      reason: 'Kein produktiver Mailprovider konfiguriert',
      email: { to, ...rendered }
    }
  }
}

module.exports = EmailService
