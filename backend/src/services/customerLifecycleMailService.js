const MailService = require('./mailService')

const COMPANY_NAME = process.env.COMPANY_NAME || process.env.MAIL_COMPANY_NAME || 'MecklenburgMarketing GbR'
const BRAND_DOMAIN = process.env.MAIL_DOMAIN || 'mecklenburgmarketing.de'
const APP_URL = (process.env.FRONTEND_URL || process.env.PUBLIC_APP_URL || `https://${BRAND_DOMAIN}`).replace(/\/$/, '')
const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || process.env.MAIL_ADMIN_TO || `info@${BRAND_DOMAIN}`
const REPLY_TO = process.env.MAIL_REPLY_TO || `info@${BRAND_DOMAIN}`

function esc(v = '') {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function layout({ title, intro, body, ctaUrl, ctaLabel, footerNote }) {
  return `<!doctype html>
<html lang="de">
<body style="margin:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033">
  <div style="max-width:680px;margin:0 auto;padding:28px 18px">
    <div style="background:#0b1020;color:#fff;border-radius:20px;padding:26px 26px 22px">
      <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#9fb3ff">${esc(COMPANY_NAME)}</div>
      <h1 style="margin:10px 0 0;font-size:26px;line-height:1.2">${esc(title)}</h1>
      ${intro ? `<p style="margin:12px 0 0;color:#d8def7;line-height:1.55">${esc(intro)}</p>` : ''}
    </div>
    <div style="background:#fff;border:1px solid #e5e9f3;border-radius:20px;margin-top:16px;padding:24px;line-height:1.6">
      ${body}
      ${ctaUrl ? `<p style="margin:24px 0 8px"><a href="${esc(ctaUrl)}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:12px;padding:12px 18px;font-weight:700">${esc(ctaLabel || 'Öffnen')}</a></p>` : ''}
      <p style="margin-top:22px;color:#5c667a;font-size:13px">${esc(footerNote || 'Diese E-Mail wurde automatisch von MecklenburgMarketingOS versendet.')}</p>
    </div>
    <p style="text-align:center;color:#7b8498;font-size:12px;margin:18px 0 0">${esc(COMPANY_NAME)} · ${esc(BRAND_DOMAIN)}</p>
  </div>
</body>
</html>`
}

function textBlock(lines = []) {
  return lines.filter(Boolean).join('\n')
}

async function logMailEvent(supabase, payload = {}) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.from('mail_events').insert({
      customer_id: payload.customer_id || null,
      recipient: payload.to || payload.recipient || '',
      subject: payload.subject || '',
      template_key: payload.template_key || '',
      provider: payload.provider || 'resend',
      status: payload.status || 'created',
      metadata: payload.metadata || {},
      created_at: new Date().toISOString()
    }).select('*').maybeSingle()
    if (error) throw error
    return data
  } catch (_) {
    return null
  }
}

async function sendLifecycleMail(supabase, { to, subject, html, text, customer_id, template_key, metadata = {}, requireDelivery = false }) {
  const mail = new MailService()
  const result = await mail.send({
    to,
    subject,
    html,
    text,
    replyTo: REPLY_TO,
    requireDelivery
  })
  await logMailEvent(supabase, {
    to,
    subject,
    customer_id,
    template_key,
    provider: result?.provider || (result?.dryRun ? 'dry_run' : 'resend'),
    status: result?.sent ? 'sent' : result?.dryRun ? 'dry_run' : 'created',
    metadata: { ...metadata, result }
  })
  return result
}

async function sendRegistrationReceived(supabase, registration = {}) {
  const subject = `Registrierung erhalten · ${COMPANY_NAME}`
  const html = layout({
    title: 'Registrierung erhalten',
    intro: 'Wir haben deine Anfrage erhalten und prüfen deinen Zugang.',
    body: `
      <p>Hallo ${esc(registration.contact_person || registration.company_name || 'und willkommen')},</p>
      <p>vielen Dank für deine Registrierung bei <b>${esc(COMPANY_NAME)}</b>.</p>
      <p><b>Firma:</b> ${esc(registration.company_name || '')}<br/>
      <b>Paketwunsch:</b> ${esc(registration.requested_package || 'Starter')}</p>
      <p>Dein Kundenkonto wird freigeschaltet, sobald wir die Anfrage geprüft haben.</p>
    `,
    ctaUrl: APP_URL,
    ctaLabel: 'Portal öffnen'
  })
  const text = textBlock([
    `Hallo ${registration.contact_person || registration.company_name || ''},`,
    `vielen Dank für deine Registrierung bei ${COMPANY_NAME}.`,
    `Paketwunsch: ${registration.requested_package || 'Starter'}`,
    'Dein Kundenkonto wird nach Prüfung freigeschaltet.',
    APP_URL
  ])
  return sendLifecycleMail(supabase, { to: registration.email, subject, html, text, customer_id: registration.customer_id, template_key: 'customer_registration_received', metadata: { registration_id: registration.id } })
}

async function sendRegistrationApproved(supabase, registration = {}) {
  const subject = `Kundenzugang freigeschaltet · ${COMPANY_NAME}`
  const html = layout({
    title: 'Dein Kundenzugang ist freigeschaltet',
    intro: 'Du kannst dich jetzt im Kundenportal anmelden.',
    body: `
      <p>Hallo ${esc(registration.contact_person || registration.company_name || '')},</p>
      <p>dein Zugang zu <b>MecklenburgMarketingOS</b> wurde freigeschaltet.</p>
      <p><b>Aktives Paket:</b> ${esc(registration.requested_package || 'Starter')}</p>
      <p>Bitte melde dich mit deiner E-Mail-Adresse und deinem Passwort an.</p>
    `,
    ctaUrl: `${APP_URL}/auth`,
    ctaLabel: 'Jetzt anmelden'
  })
  const text = textBlock([
    `Dein Kundenzugang wurde freigeschaltet.`,
    `Paket: ${registration.requested_package || 'Starter'}`,
    `${APP_URL}/auth`
  ])
  return sendLifecycleMail(supabase, { to: registration.email, subject, html, text, customer_id: registration.customer_id, template_key: 'customer_registration_approved', metadata: { registration_id: registration.id } })
}

async function sendCustomerInvite(supabase, invite = {}, customer = {}) {
  const subject = `Einladung zum Kundenportal · ${COMPANY_NAME}`
  const html = layout({
    title: 'Einladung zum Kundenportal',
    intro: `${customer.name || invite.metadata?.company_name || 'Dein Unternehmen'} wurde für MecklenburgMarketingOS vorbereitet.`,
    body: `
      <p>Hallo ${esc(invite.contact_person || customer.contact_person || '')},</p>
      <p>du wurdest zum Kundenportal von <b>${esc(COMPANY_NAME)}</b> eingeladen.</p>
      <p><b>Kunde:</b> ${esc(customer.name || invite.metadata?.company_name || '')}<br/>
      <b>Paket:</b> ${esc(invite.package_name || customer.package_name || 'Starter')}</p>
      <p>Über den Button kannst du dein Passwort setzen und den Zugang aktivieren.</p>
      <p style="color:#5c667a;font-size:13px">Der Link ist bis ${esc((invite.expires_at || '').slice(0, 10) || 'zum Ablaufdatum')} gültig.</p>
    `,
    ctaUrl: invite.invite_url,
    ctaLabel: 'Zugang aktivieren'
  })
  const text = textBlock([
    `Du wurdest zum Kundenportal von ${COMPANY_NAME} eingeladen.`,
    `Kunde: ${customer.name || invite.metadata?.company_name || ''}`,
    `Paket: ${invite.package_name || customer.package_name || 'Starter'}`,
    `Zugang aktivieren: ${invite.invite_url}`
  ])
  return sendLifecycleMail(supabase, { to: invite.email, subject, html, text, customer_id: invite.customer_id, template_key: 'customer_invite', metadata: { invite_id: invite.id, expires_at: invite.expires_at } })
}

async function sendInviteAcceptedAdminNotice(supabase, invite = {}, customer = {}) {
  const subject = `Kunde hat Zugang aktiviert · ${customer.name || invite.email}`
  const html = layout({
    title: 'Kundenzugang aktiviert',
    intro: 'Eine Einladung wurde angenommen.',
    body: `
      <p><b>Kunde:</b> ${esc(customer.name || invite.metadata?.company_name || '')}</p>
      <p><b>E-Mail:</b> ${esc(invite.email || '')}</p>
      <p><b>Paket:</b> ${esc(invite.package_name || customer.package_name || 'Starter')}</p>
    `,
    ctaUrl: APP_URL,
    ctaLabel: 'MMOS öffnen'
  })
  return sendLifecycleMail(supabase, { to: ADMIN_EMAIL, subject, html, text: `Kunde aktiviert: ${customer.name || invite.email}`, customer_id: invite.customer_id, template_key: 'customer_invite_accepted_admin', metadata: { invite_id: invite.id } })
}

async function sendAdminRegistrationNotice(supabase, registration = {}) {
  const subject = `Neue Kundenregistrierung · ${registration.company_name || registration.email}`
  const html = layout({
    title: 'Neue Kundenregistrierung',
    intro: 'Eine neue Paket-Anfrage ist eingegangen.',
    body: `
      <p><b>Firma:</b> ${esc(registration.company_name || '')}</p>
      <p><b>Kontakt:</b> ${esc(registration.contact_person || '')}</p>
      <p><b>E-Mail:</b> ${esc(registration.email || '')}</p>
      <p><b>Paketwunsch:</b> ${esc(registration.requested_package || 'Starter')}</p>
    `,
    ctaUrl: APP_URL,
    ctaLabel: 'Im Backoffice prüfen'
  })
  return sendLifecycleMail(supabase, { to: ADMIN_EMAIL, subject, html, text: `Neue Registrierung: ${registration.company_name || registration.email}`, customer_id: registration.customer_id, template_key: 'customer_registration_admin', metadata: { registration_id: registration.id } })
}

async function sendPackageRequestNotice(supabase, reqRow = {}, customer = {}) {
  const subject = `Paket-Anfrage erhalten · ${COMPANY_NAME}`
  const html = layout({
    title: 'Paket-Anfrage erhalten',
    intro: 'Wir haben deinen Paketwunsch erhalten.',
    body: `
      <p>Hallo ${esc(customer.contact_person || customer.name || '')},</p>
      <p>deine Anfrage für <b>${esc(reqRow.package_name || '')}</b> wurde gespeichert.</p>
      <p>Wir prüfen die Freischaltung und melden uns bei dir.</p>
    `,
    ctaUrl: APP_URL,
    ctaLabel: 'Portal öffnen'
  })
  return sendLifecycleMail(supabase, { to: customer.email, subject, html, text: `Paket-Anfrage erhalten: ${reqRow.package_name}`, customer_id: customer.id || reqRow.customer_id, template_key: 'package_request_received', metadata: { package_request_id: reqRow.id } })
}

module.exports = {
  COMPANY_NAME,
  BRAND_DOMAIN,
  APP_URL,
  ADMIN_EMAIL,
  sendRegistrationReceived,
  sendRegistrationApproved,
  sendCustomerInvite,
  sendInviteAcceptedAdminNotice,
  sendAdminRegistrationNotice,
  sendPackageRequestNotice,
  logMailEvent
}
