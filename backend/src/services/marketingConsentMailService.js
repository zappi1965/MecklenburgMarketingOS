const crypto = require('crypto')
const MailService = require('./mailService')

const COMPANY_NAME = process.env.COMPANY_NAME || process.env.MAIL_COMPANY_NAME || 'MecklenburgMarketing GbR'
const FRONTEND_URL = String(process.env.FRONTEND_URL || process.env.PUBLIC_APP_URL || 'https://mecklenburgmarketing.de').replace(/\/$/, '')
const DEFAULT_CONSENT_VERSION = 'marketing-reminders-v1-2026-06-01'
const TOKEN_TTL_HOURS = Number(process.env.MARKETING_DOUBLE_OPT_IN_TTL_HOURS || 72)

function esc(v = '') {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]))
}

function sha(value = '') {
  return crypto.createHash('sha256').update(String(value)).digest('hex')
}

function clean(v) {
  return v === undefined || v === null ? null : String(v).trim() || null
}

function nowIso() { return new Date().toISOString() }

function expiresAt() {
  return new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000).toISOString()
}

function randomToken() {
  return crypto.randomBytes(32).toString('base64url')
}

function marketingConsentIpHash(req) {
  try {
    const raw = `${req?.ip || ''}|${req?.get?.('x-forwarded-for') || ''}|${req?.get?.('user-agent') || ''}`
    return sha(raw)
  } catch (_) {
    return null
  }
}

function consentFromBody(body = {}) {
  const requested = body.marketing_consent === true || body.marketingConsent === true || body.consent_marketing === true || body.consentMarketing === true
  if (!requested) return null
  return {
    requested: true,
    version: clean(body.marketing_consent_version || body.marketingConsentVersion) || DEFAULT_CONSENT_VERSION,
    source: clean(body.marketing_consent_source || body.marketingConsentSource) || 'public_slug_page',
    purposes: Array.isArray(body.marketing_consent_purposes || body.marketingConsentPurposes)
      ? (body.marketing_consent_purposes || body.marketingConsentPurposes).map(clean).filter(Boolean)
      : ['loyalty_reminders','reward_reminders','coupon_offers','reactivation'],
    text: clean(body.marketing_consent_text || body.marketingConsentText) || 'Ich möchte per E-Mail zu Bonuspunkten, Rewards, Coupons und Reaktivierungsaktionen dieses Anbieters kontaktiert werden. Ich kann die Einwilligung jederzeit widerrufen.',
    requested_at: nowIso()
  }
}

function confirmUrl({ token, slug }) {
  return `${FRONTEND_URL}/marketing/confirm?token=${encodeURIComponent(token)}&slug=${encodeURIComponent(slug || '')}`
}

function unsubscribeUrl({ token, slug, email }) {
  return `${FRONTEND_URL}/marketing/unsubscribe?token=${encodeURIComponent(token || '')}&slug=${encodeURIComponent(slug || '')}&email=${encodeURIComponent(email || '')}`
}

function layout({ title, intro, body, ctaUrl, ctaLabel, footer }) {
  return `<!doctype html><html lang="de"><body style="margin:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033">
  <div style="max-width:680px;margin:0 auto;padding:28px 18px">
    <div style="background:#0b1020;color:#fff;border-radius:20px;padding:26px">
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#d4af37">${esc(COMPANY_NAME)}</div>
      <h1 style="margin:10px 0 0;font-size:25px;line-height:1.2">${esc(title)}</h1>
      ${intro ? `<p style="margin:12px 0 0;color:#d8def7;line-height:1.55">${esc(intro)}</p>` : ''}
    </div>
    <div style="background:#fff;border:1px solid #e5e9f3;border-radius:20px;margin-top:16px;padding:24px;line-height:1.6">
      ${body}
      ${ctaUrl ? `<p style="margin:24px 0 8px"><a href="${esc(ctaUrl)}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:12px;padding:12px 18px;font-weight:700">${esc(ctaLabel || 'Öffnen')}</a></p>` : ''}
      <p style="margin-top:22px;color:#5c667a;font-size:13px">${esc(footer || 'Diese E-Mail wurde automatisch vom Bonusprogramm des jeweiligen Anbieters versendet.')}</p>
    </div>
    <p style="text-align:center;color:#7b8498;font-size:12px;margin:18px 0 0">${esc(COMPANY_NAME)}</p>
  </div></body></html>`
}

async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

async function logMail(supabase, payload = {}) {
  try {
    await supabase.from('mail_events').insert({
      customer_id: payload.customer_id || null,
      recipient: payload.to || '',
      subject: payload.subject || '',
      template_key: payload.template_key || '',
      provider: payload.provider || 'resend',
      status: payload.status || 'created',
      metadata: payload.metadata || {},
      created_at: nowIso()
    })
  } catch (_) {}
}

async function requestMarketingDoubleOptIn(supabase, { customerId, program, qrCampaign, member, slug, email, displayName, body, req, requireDelivery = false } = {}) {
  const consent = consentFromBody(body)
  if (!consent || !member?.id || !customerId || !email) return null

  const token = randomToken()
  const tokenHash = sha(token)
  const localId = `doi_${tokenHash.slice(0, 32)}`
  const confirm = confirmUrl({ token, slug })
  const expires = expiresAt()
  const evidence = {
    ...consent,
    status: 'pending_double_opt_in',
    customer_id: customerId,
    loyalty_program_id: program?.id || null,
    loyalty_customer_id: member.id,
    qr_campaign_id: qrCampaign?.id || program?.qr_campaign_id || null,
    slug,
    email,
    display_name: displayName,
    token_hash: tokenHash,
    token_local_id: localId,
    expires_at: expires,
    ip_hash: marketingConsentIpHash(req),
    user_agent: req?.get?.('user-agent') || null
  }

  const metadata = {
    ...(member.metadata || {}),
    consent_marketing: false,
    marketing_consent_status: 'pending_double_opt_in',
    marketing_consent_pending_at: consent.requested_at,
    marketing_consent_version: consent.version,
    marketing_consent_pending: { ...evidence, token_hash: '[redacted]' }
  }
  await safeQuery(supabase.from('loyalty_customers').update({ metadata }).eq('id', member.id))

  await safeQuery(supabase.from('v33_functional_records').insert({
    resource: 'marketing_double_opt_in_tokens',
    local_id: localId,
    customer_id: customerId,
    title: `Double-Opt-in ${displayName || email}`,
    status: 'pending',
    payload: evidence,
    created_at: consent.requested_at,
    updated_at: consent.requested_at
  }))

  const subject = 'Bitte bestätige deine E-Mail-Erinnerungen'
  const text = [
    `Hallo ${displayName || ''},`,
    '',
    'bitte bestätige, dass du per E-Mail zu Bonuspunkten, Rewards, Coupons und Reaktivierungsaktionen dieses Anbieters kontaktiert werden möchtest.',
    '',
    `Bestätigen: ${confirm}`,
    '',
    `Diese Bestätigung ist ${TOKEN_TTL_HOURS} Stunden gültig.`,
    'Ohne Bestätigung erhältst du keine Werbe-/Reminder-Mails.'
  ].join('\n')

  const html = layout({
    title: 'E-Mail-Erinnerungen bestätigen',
    intro: 'Bitte bestätige deine Einwilligung per Klick.',
    body: `<p>Hallo ${esc(displayName || '')},</p>
      <p>du hast angekreuzt, dass du per E-Mail zu <b>Bonuspunkten, Rewards, Coupons und Reaktivierungsaktionen</b> dieses Anbieters kontaktiert werden möchtest.</p>
      <p>Bitte bestätige diese Einwilligung über den Button. Ohne Bestätigung erhältst du keine Werbe-/Reminder-Mails.</p>
      <p style="color:#5c667a;font-size:13px">Gültig bis: ${esc(expires)}</p>`,
    ctaUrl: confirm,
    ctaLabel: 'Einwilligung bestätigen',
    footer: 'Du kannst diese Einwilligung jederzeit widerrufen.'
  })

  const mail = new MailService()
  let mailResult
  try {
    mailResult = await mail.send({ to: email, subject, html, text, requireDelivery })
    await logMail(supabase, { customer_id: customerId, to: email, subject, template_key: 'marketing_double_opt_in', provider: mailResult.provider || 'resend', status: mailResult.sent ? 'sent' : mailResult.dryRun ? 'dry_run' : 'created', metadata: { result: mailResult, token_local_id: localId } })
  } catch (error) {
    await logMail(supabase, { customer_id: customerId, to: email, subject, template_key: 'marketing_double_opt_in', provider: 'resend', status: 'failed', metadata: { error: error.message, token_local_id: localId } })
    if (requireDelivery) throw error
    mailResult = { sent: false, error: error.message }
  }

  return {
    ok: true,
    status: 'pending_double_opt_in',
    email_sent: Boolean(mailResult?.sent),
    dryRun: Boolean(mailResult?.dryRun),
    token_local_id: localId,
    expires_at: expires,
    confirm_url: mailResult?.dryRun ? confirm : undefined,
    mail: mailResult
  }
}

async function confirmMarketingConsentToken(supabase, { token, slug, req } = {}) {
  const tokenHash = sha(token || '')
  const localId = `doi_${tokenHash.slice(0, 32)}`
  const found = await safeQuery(supabase.from('v33_functional_records').select('*').eq('resource','marketing_double_opt_in_tokens').eq('local_id', localId).maybeSingle())
  const rec = found.data
  if (!rec || found.error) return { ok: false, error: 'Bestätigungslink ungültig oder abgelaufen.' }
  if (rec.status !== 'pending') return { ok: false, error: 'Diese Einwilligung wurde bereits verarbeitet.', status: rec.status }
  const payload = rec.payload || {}
  if (payload.token_hash !== tokenHash) return { ok: false, error: 'Bestätigungslink ungültig.' }
  if (payload.expires_at && Date.parse(payload.expires_at) < Date.now()) {
    await safeQuery(supabase.from('v33_functional_records').update({ status:'expired', updated_at: nowIso() }).eq('id', rec.id))
    return { ok: false, error: 'Bestätigungslink ist abgelaufen.' }
  }

  const memberRes = await safeQuery(supabase.from('loyalty_customers').select('*').eq('id', payload.loyalty_customer_id).maybeSingle())
  const member = memberRes.data
  if (!member) return { ok: false, error: 'Bonusmitglied nicht gefunden.' }

  const confirmedAt = nowIso()
  const evidence = {
    ...payload,
    status: 'granted',
    confirmed_at: confirmedAt,
    confirmed_ip_hash: marketingConsentIpHash(req),
    confirmed_user_agent: req?.get?.('user-agent') || null,
    token_hash: '[redacted]'
  }
  const metadata = {
    ...(member.metadata || {}),
    consent_marketing: true,
    marketing_consent_status: 'granted',
    marketing_consent_at: confirmedAt,
    marketing_consent_version: payload.version || DEFAULT_CONSENT_VERSION,
    marketing_consent: evidence
  }

  await safeQuery(supabase.from('loyalty_customers').update({ metadata }).eq('id', member.id))
  await safeQuery(supabase.from('v33_functional_records').update({
    status: 'confirmed',
    payload: { ...payload, status: 'confirmed', confirmed_at: confirmedAt, token_hash: '[redacted]' },
    updated_at: confirmedAt
  }).eq('id', rec.id))
  await safeQuery(supabase.from('v33_functional_records').insert({
    resource: 'marketing_consents',
    local_id: `marketing_consent_${member.id}_${Date.now()}`,
    customer_id: payload.customer_id,
    title: `Werbeeinwilligung ${payload.display_name || payload.email || member.id}`,
    status: 'granted',
    payload: evidence,
    created_at: confirmedAt,
    updated_at: confirmedAt
  }))

  return { ok: true, status: 'granted', email: payload.email, slug: payload.slug || slug || null, confirmed_at: confirmedAt }
}

async function withdrawMarketingConsentByTokenOrLogin(supabase, { token = '', customerId = null, member = null, slug = '', email = '', req, reason = 'unsubscribe' } = {}) {
  let resolvedMember = member
  let payload = {}
  if (token) {
    const tokenHash = sha(token)
    const localId = `unsub_${tokenHash.slice(0, 32)}`
    const found = await safeQuery(supabase.from('v33_functional_records').select('*').eq('resource','marketing_unsubscribe_tokens').eq('local_id', localId).maybeSingle())
    if (found.data?.payload?.loyalty_customer_id) {
      payload = found.data.payload
      const m = await safeQuery(supabase.from('loyalty_customers').select('*').eq('id', payload.loyalty_customer_id).maybeSingle())
      resolvedMember = m.data || null
      customerId = payload.customer_id || customerId
      slug = payload.slug || slug
      email = payload.email || email
    }
  }
  if (!resolvedMember?.id || !customerId) return { ok: false, error: 'Einwilligung konnte nicht gefunden werden.' }
  const now = nowIso()
  const evidence = {
    customer_id: customerId,
    loyalty_customer_id: resolvedMember.id,
    slug,
    email,
    reason,
    withdrawn_at: now,
    ip_hash: marketingConsentIpHash(req),
    user_agent: req?.get?.('user-agent') || null
  }
  const nextMetadata = {
    ...(resolvedMember.metadata || {}),
    consent_marketing: false,
    marketing_consent_status: 'withdrawn',
    marketing_consent_withdrawn_at: now,
    marketing_consent_withdrawal: evidence
  }
  await safeQuery(supabase.from('loyalty_customers').update({ metadata: nextMetadata }).eq('id', resolvedMember.id))
  await safeQuery(supabase.from('v33_functional_records').insert({
    resource: 'marketing_consent_withdrawals',
    local_id: `marketing_consent_withdrawal_${resolvedMember.id}_${Date.now()}`,
    customer_id: customerId,
    title: `Widerruf Werbeeinwilligung ${email || resolvedMember.id}`,
    status: 'withdrawn',
    payload: evidence,
    created_at: now,
    updated_at: now
  }))
  return { ok: true, status: 'withdrawn', withdrawn: true }
}

async function createUnsubscribeToken(supabase, { customer_id, member_id, email, slug }) {
  const token = randomToken()
  const tokenHash = sha(token)
  const localId = `unsub_${tokenHash.slice(0, 32)}`
  const now = nowIso()
  await safeQuery(supabase.from('v33_functional_records').insert({
    resource: 'marketing_unsubscribe_tokens',
    local_id: localId,
    customer_id,
    title: `Unsubscribe ${email || member_id}`,
    status: 'active',
    payload: { token_hash: tokenHash, customer_id, loyalty_customer_id: member_id, email, slug, created_at: now },
    created_at: now,
    updated_at: now
  }))
  return { token, url: unsubscribeUrl({ token, slug, email }) }
}

module.exports = {
  DEFAULT_CONSENT_VERSION,
  consentFromBody,
  requestMarketingDoubleOptIn,
  confirmMarketingConsentToken,
  withdrawMarketingConsentByTokenOrLogin,
  createUnsubscribeToken,
  unsubscribeUrl
}
