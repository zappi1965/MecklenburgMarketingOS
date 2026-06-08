
const { Resend } = require('resend')

async function sendDemoMail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    return { sent: false, skipped: true, reason: 'RESEND_API_KEY fehlt' }
  }
  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.MAIL_FROM || 'noreply@mecklenburgmarketing.de'
  const response = await resend.emails.send({
    from,
    to,
    subject,
    html
  })
  return { sent: true, response }
}

module.exports = { sendDemoMail }
