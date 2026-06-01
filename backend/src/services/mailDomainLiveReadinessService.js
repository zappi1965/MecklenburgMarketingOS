const dns = require('dns').promises
const MailService = require('./mailService')
const { createUnsubscribeToken } = require('./marketingConsentMailService')
const { inspectMarketingConsentWording } = require('./marketingConsentComplianceService')

function clean(value) {
  const raw = String(value || '').trim().replace(/^['"]|['"]$/g, '')
  if (!raw || ['null','undefined','false','0','-'].includes(raw.toLowerCase())) return ''
  return raw
}

function splitEnv(value) {
  return clean(value).split(',').map((x) => x.trim()).filter(Boolean)
}

function flattenTxt(records = []) {
  return records.map((r) => Array.isArray(r) ? r.join('') : String(r)).filter(Boolean)
}

async function resolveTxtSafe(name) {
  try {
    const records = await dns.resolveTxt(name)
    return { ok: true, name, records: flattenTxt(records) }
  } catch (error) {
    return { ok: false, name, records: [], error: error.code || error.message }
  }
}

async function resolveMxSafe(name) {
  try {
    const records = await dns.resolveMx(name)
    return { ok: true, name, records }
  } catch (error) {
    return { ok: false, name, records: [], error: error.code || error.message }
  }
}

async function resolveNsSafe(name) {
  try {
    const records = await dns.resolveNs(name)
    return { ok: true, name, records }
  } catch (error) {
    return { ok: false, name, records: [], error: error.code || error.message }
  }
}

function spfCheck(records = [], expectedInclude = 'include:amazonses.com') {
  const spf = records.find((r) => /^v=spf1\b/i.test(r))
  if (!spf) return { ok: false, severity: 'critical', issue: 'spf_missing', hint: `TXT @ mit v=spf1 und ${expectedInclude} setzen.`, value: null }
  if (expectedInclude && !spf.includes(expectedInclude)) return { ok: false, severity: 'warning', issue: 'spf_include_missing', hint: `SPF gefunden, aber ${expectedInclude} fehlt.`, value: spf }
  return { ok: true, issue: 'spf_ok', value: spf }
}

function dmarcCheck(records = []) {
  const dmarc = records.find((r) => /^v=DMARC1\b/i.test(r))
  if (!dmarc) return { ok: false, severity: 'critical', issue: 'dmarc_missing', hint: 'TXT _dmarc mit v=DMARC1 setzen, z. B. p=quarantine oder p=none für Startphase.', value: null }
  const hasPolicy = /\bp=(none|quarantine|reject)\b/i.test(dmarc)
  if (!hasPolicy) return { ok: false, severity: 'warning', issue: 'dmarc_policy_missing', hint: 'DMARC-Eintrag braucht p=none/quarantine/reject.', value: dmarc }
  return { ok: true, issue: 'dmarc_ok', value: dmarc }
}

function dkimCheck(results = [], expectedSelectors = []) {
  if (!expectedSelectors.length) {
    return { ok: false, severity: 'warning', issue: 'dkim_selectors_not_configured', hint: 'RESEND_DKIM_SELECTORS mit den drei Resend-DKIM-Hosts setzen, damit DKIM live prüfbar ist.', checked: [] }
  }
  const checked = results.map((r) => ({ name: r.name, ok: r.ok && r.records.length > 0, records: r.records, error: r.error || null }))
  const missing = checked.filter((r) => !r.ok)
  return {
    ok: missing.length === 0,
    severity: missing.length ? 'critical' : undefined,
    issue: missing.length ? 'dkim_missing' : 'dkim_ok',
    hint: missing.length ? 'Fehlende DKIM-CNAME/TXT Records im DNS nach Resend-Vorgabe setzen.' : 'DKIM Records wurden gefunden.',
    checked
  }
}

async function inspectMailDomainReadiness({ domain = null } = {}) {
  const mailDomain = clean(domain) || clean(process.env.MAIL_DOMAIN) || 'mecklenburgmarketing.de'
  const expectedSpfInclude = clean(process.env.EXPECTED_SPF_INCLUDE) || 'include:amazonses.com'
  const dkimSelectors = splitEnv(process.env.RESEND_DKIM_SELECTORS || process.env.EXPECTED_DKIM_SELECTORS)
  const ns = await resolveNsSafe(mailDomain)
  const mx = await resolveMxSafe(mailDomain)
  const rootTxt = await resolveTxtSafe(mailDomain)
  const dmarcTxt = await resolveTxtSafe(`_dmarc.${mailDomain}`)
  const dkimResults = []
  for (const selector of dkimSelectors) {
    const host = selector.includes('.') ? selector : `${selector}._domainkey.${mailDomain}`
    dkimResults.push(await resolveTxtSafe(host))
  }

  const checks = [
    { key: 'domain_dns_resolves', ok: ns.ok || mx.ok || rootTxt.ok, severity: 'critical', hint: 'Domain muss DNS-seitig erreichbar sein.', records: { ns: ns.records, mx: mx.records } },
    { key: 'spf', ...spfCheck(rootTxt.records, expectedSpfInclude) },
    { key: 'dmarc', ...dmarcCheck(dmarcTxt.records) },
    { key: 'dkim', ...dkimCheck(dkimResults, dkimSelectors) },
    { key: 'mail_from_present', ok: Boolean(clean(process.env.MAIL_FROM)), severity: 'critical', hint: 'MAIL_FROM setzen, z. B. MecklenburgMarketing <noreply@mecklenburgmarketing.de>.' },
    { key: 'resend_api_key_present', ok: Boolean(clean(process.env.RESEND_API_KEY)), severity: 'critical', hint: 'RESEND_API_KEY in Railway/Backend setzen.' },
    { key: 'frontend_url_present', ok: Boolean(clean(process.env.FRONTEND_URL || process.env.PUBLIC_APP_URL)), severity: 'warning', hint: 'FRONTEND_URL/PUBLIC_APP_URL setzen, damit Bestätigungs- und Abmeldelinks korrekt sind.' }
  ]

  return {
    ok: !checks.some((c) => c.severity === 'critical' && !c.ok),
    domain: mailDomain,
    provider: 'resend',
    checks,
    dns: { ns, mx, root_txt: rootTxt, dmarc_txt: dmarcTxt, dkim: dkimResults },
    required_dns_hint: {
      spf: `TXT @ "v=spf1 ${expectedSpfInclude} ~all"`,
      dmarc_start: `TXT _dmarc "v=DMARC1; p=none; rua=mailto:postmaster@${mailDomain}; adkim=s; aspf=s"`,
      dkim: 'Die exakten DKIM-CNAME/TXT-Werte in Resend unter Domains abrufen und als RESEND_DKIM_SELECTORS im Backend hinterlegen.'
    },
    note: 'DNS-Liveprüfung läuft erst im deployed Backend mit Netzwerkzugriff zuverlässig.'
  }
}

async function sendLiveTestMail(supabase, { to, subject = null, requireDelivery = true } = {}) {
  const recipient = clean(to) || clean(process.env.ADMIN_NOTIFY_EMAIL || process.env.MAIL_REPLY_TO)
  if (!recipient) return { ok: false, error: 'Testmail-Empfänger fehlt.' }
  const mail = new MailService()
  const finalSubject = subject || `MMOS Testmail · ${new Date().toISOString()}`
  const text = [
    'Dies ist eine MMOS-Testmail.',
    'Wenn diese E-Mail ankommt, ist der technische Versand grundsätzlich funktionsfähig.',
    '',
    'Bitte zusätzlich SPF, DKIM, DMARC und Spam-Einstufung prüfen.'
  ].join('\n')
  const html = `<p>Dies ist eine <b>MMOS-Testmail</b>.</p><p>Wenn diese E-Mail ankommt, ist der technische Versand grundsätzlich funktionsfähig.</p><p>Bitte zusätzlich SPF, DKIM, DMARC und Spam-Einstufung prüfen.</p>`
  try {
    const result = await mail.send({ to: recipient, subject: finalSubject, text, html, requireDelivery })
    try {
      await supabase.from('mail_events').insert({
        customer_id: null,
        recipient,
        subject: finalSubject,
        template_key: 'mail_domain_live_test',
        provider: result.provider || (result.dryRun ? 'dry_run' : 'resend'),
        status: result.sent ? 'sent' : result.dryRun ? 'dry_run' : 'created',
        metadata: { result },
        created_at: new Date().toISOString()
      })
    } catch (_) {}
    return { ok: true, result }
  } catch (error) {
    return { ok: false, error: error.message, code: error.code || null, details: error.details || null }
  }
}

async function createUnsubscribeLiveTest(supabase, { customer_id = null, email = null, slug = 'test', member_id = null } = {}) {
  const testCustomer = clean(customer_id) || 'mail_domain_live_test'
  const testEmail = clean(email) || clean(process.env.ADMIN_NOTIFY_EMAIL || process.env.MAIL_REPLY_TO)
  const testMember = clean(member_id) || `test_member_${Date.now()}`
  const unsub = await createUnsubscribeToken(supabase, { customer_id: testCustomer, member_id: testMember, email: testEmail, slug })
  return {
    ok: true,
    test: {
      customer_id: testCustomer,
      email: testEmail,
      member_id: testMember,
      slug,
      unsubscribe_url: unsub.url,
      note: 'Öffne diese URL im Browser. Im Live-Test mit echtem Member sollte danach consent_marketing=false gesetzt und ein withdrawal record geschrieben werden.'
    }
  }
}

function privacyMarketingReminderText() {
  return {
    updated_at: new Date().toISOString(),
    sections: [
      {
        title: 'Newsletter, Werbeeinwilligungen und Reminder-Mails',
        text: 'Wenn Nutzer auf einer Bonus-, Loyalty- oder Slug-Seite ausdrücklich einwilligen, können sie per E-Mail zu Bonuspunkten, Rewards, Coupons, Reaktivierungsaktionen oder ähnlichen Kundenbindungsmaßnahmen kontaktiert werden. Die Einwilligung erfolgt freiwillig, ist nicht Voraussetzung für die Teilnahme am Bonusprogramm und wird über ein Double-Opt-in-Verfahren bestätigt.'
      },
      {
        title: 'Nachweis und Widerruf',
        text: 'Zum Nachweis der Einwilligung speichern wir Zeitpunkt, Einwilligungstext, Version, Zwecke, E-Mail-Adresse, technische Nachweisdaten in gekürzter/gehaster Form sowie den Bestätigungsstatus. Jede Reminder-Mail enthält einen Abmeldelink. Ein Widerruf ist jederzeit mit Wirkung für die Zukunft möglich.'
      },
      {
        title: 'Dienstleister',
        text: 'Für den Versand von E-Mails kann Resend als E-Mail-Dienstleister eingesetzt werden. Dabei werden E-Mail-Adresse, Inhalte der Nachricht und Versand-/Statusdaten verarbeitet. Soweit erforderlich erfolgt dies auf Grundlage eines Auftragsverarbeitungsvertrags.'
      }
    ]
  }
}

function finalLegalChecklist() {
  return inspectMarketingConsentWording({
    text: 'Ich möchte per E-Mail zu Bonuspunkten, Rewards, Coupons und Reaktivierungsaktionen dieses Anbieters kontaktiert werden. Ich kann die Einwilligung jederzeit widerrufen.',
    checkbox_preselected: false,
    participation_coupled: false,
    double_opt_in_enabled: true,
    unsubscribe_link_enabled: true
  })
}

module.exports = { inspectMailDomainReadiness, sendLiveTestMail, createUnsubscribeLiveTest, privacyMarketingReminderText, finalLegalChecklist }
