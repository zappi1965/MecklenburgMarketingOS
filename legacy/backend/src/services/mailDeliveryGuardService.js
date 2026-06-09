function clean(value) {
  const raw = String(value || '').trim().replace(/^['"]|['"]$/g, '')
  if (!raw || ['null','undefined','false','0','-'].includes(raw.toLowerCase())) return ''
  return raw
}

function mask(value = '') {
  const v = String(value || '')
  if (!v) return null
  if (v.includes('@')) return v.replace(/^(.{2}).*(@.*)$/, '$1…$2')
  if (v.length <= 8) return `${v.slice(0,2)}***`
  return `${v.slice(0,6)}…${v.slice(-4)}`
}

function inspectMailDeliveryGuard() {
  const resend = clean(process.env.RESEND_API_KEY)
  const smtpHost = clean(process.env.SMTP_HOST)
  const mailFrom = clean(process.env.MAIL_FROM || process.env.PACKAGE_INQUIRY_FROM)
  const replyTo = clean(process.env.MAIL_REPLY_TO)
  const domain = clean(process.env.MAIL_DOMAIN)
  const adminTo = clean(process.env.ADMIN_NOTIFY_EMAIL || process.env.PACKAGE_INQUIRY_TO || process.env.ADMIN_ALERT_EMAIL)
  const issues = []

  if (!resend && !smtpHost) issues.push({ severity: 'critical', issue: 'mail_provider_missing', hint: 'RESEND_API_KEY oder SMTP_HOST setzen.' })
  if (!mailFrom) issues.push({ severity: 'critical', issue: 'mail_from_missing', hint: 'MAIL_FROM setzen.' })
  if (!adminTo) issues.push({ severity: 'warning', issue: 'admin_recipient_missing', hint: 'ADMIN_NOTIFY_EMAIL setzen.' })
  if (mailFrom && domain && !mailFrom.includes(domain)) issues.push({ severity: 'warning', issue: 'mail_from_domain_mismatch', hint: 'MAIL_FROM sollte zur MAIL_DOMAIN passen.' })
  if (!domain) issues.push({ severity: 'warning', issue: 'mail_domain_missing', hint: 'MAIL_DOMAIN setzen und SPF/DKIM/DMARC beim Provider prüfen.' })

  return {
    ok: !issues.some((x) => x.severity === 'critical'),
    provider: resend ? 'resend' : (smtpHost ? 'smtp' : null),
    from_masked: mask(mailFrom),
    reply_to_masked: mask(replyTo),
    admin_to_masked: mask(adminTo),
    domain: domain || null,
    checks: {
      resend_present: Boolean(resend),
      smtp_present: Boolean(smtpHost),
      from_present: Boolean(mailFrom),
      domain_present: Boolean(domain),
      admin_recipient_present: Boolean(adminTo)
    },
    issues
  }
}

module.exports = { inspectMailDeliveryGuard }
