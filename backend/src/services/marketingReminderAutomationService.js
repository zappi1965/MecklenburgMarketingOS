const MailService = require('./mailService')
const { calculateRetentionIntelligence } = require('./retentionIntelligenceSuiteService')
const { createUnsubscribeToken } = require('./marketingConsentMailService')

async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

function esc(v = '') {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]))
}

function hasMarketingConsent(member = {}) {
  return Boolean(
    member.consent_marketing ||
    member.metadata?.consent_marketing ||
    member.raw?.metadata?.consent_marketing ||
    member.raw?.consent_marketing
  )
}

function contactEmail(member = {}) {
  return member.email || member.raw?.email || null
}

function reminderText(member) {
  if (member.days_inactive >= 90) return {
    subject: 'Dein Comeback-Vorteil wartet',
    body: `Hallo ${member.display_name || ''}, wir vermissen dich. Dein Comeback-Vorteil wartet auf dich.`
  }
  if (member.points_balance > 0) return {
    subject: 'Du hast noch Punkte offen',
    body: `Hallo ${member.display_name || ''}, du hast noch ${member.points_balance} Punkte. Schau dir deine verfügbaren Rewards an.`
  }
  return {
    subject: 'Schön, dich bald wiederzusehen',
    body: `Hallo ${member.display_name || ''}, komm gern wieder vorbei – es gibt neue Vorteile für dich.`
  }
}

function htmlReminder({ draft, unsubscribe_url }) {
  return `<!doctype html><html lang="de"><body style="margin:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033">
    <div style="max-width:680px;margin:0 auto;padding:28px 18px">
      <div style="background:#0b1020;color:#fff;border-radius:20px;padding:26px">
        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#d4af37">Bonusprogramm</div>
        <h1 style="margin:10px 0 0;font-size:25px;line-height:1.2">${esc(draft.subject)}</h1>
      </div>
      <div style="background:#fff;border:1px solid #e5e9f3;border-radius:20px;margin-top:16px;padding:24px;line-height:1.6">
        <p>${esc(draft.body)}</p>
        <p style="margin-top:22px;color:#5c667a;font-size:13px">Du erhältst diese E-Mail, weil du Werbe-/Reminder-Mails für dieses Bonusprogramm bestätigt hast.</p>
        <p style="font-size:13px"><a href="${esc(unsubscribe_url)}">Abmelden / Einwilligung widerrufen</a></p>
      </div>
    </div>
  </body></html>`
}

async function generateMarketingReminderDrafts(supabase, { customer_id, persist = true } = {}) {
  if (!supabase || !customer_id) return { ok: false, error: 'customer_id fehlt', drafts: [] }
  const intelligence = await calculateRetentionIntelligence(supabase, { customer_id, persist: false })
  const candidates = (intelligence.reactivation_candidates || []).filter((m) => hasMarketingConsent(m) && contactEmail(m))
  const skipped = (intelligence.reactivation_candidates || []).filter((m) => !hasMarketingConsent(m) || !contactEmail(m)).map((m) => ({
    member_id: m.id,
    display_name: m.display_name,
    reason: !contactEmail(m) ? 'keine E-Mail-Adresse' : 'keine bestätigte Werbeeinwilligung'
  }))

  const now = new Date().toISOString()
  const drafts = []
  for (const m of candidates) {
    const copy = reminderText(m)
    const unsub = await createUnsubscribeToken(supabase, { customer_id, member_id: m.id, email: contactEmail(m), slug: m.raw?.metadata?.slug || '' }).catch(() => ({ url: '' }))
    drafts.push({
      id: `marketing_reminder_${m.id}_${now.slice(0,10)}`,
      customer_id,
      loyalty_member_id: m.id,
      email: contactEmail(m),
      display_name: m.display_name,
      subject: copy.subject,
      body: copy.body,
      status: 'draft',
      trigger: m.days_inactive >= 45 ? 'inactive_customer' : 'reward_reminder',
      churn_score: m.churn_score,
      days_inactive: m.days_inactive,
      consent_checked: true,
      unsubscribe_url: unsub.url,
      created_at: now
    })
  }

  let saved = 0
  if (persist) {
    for (const d of drafts) {
      const row = {
        resource: 'marketing_reminder_drafts',
        local_id: d.id,
        customer_id,
        title: d.subject,
        status: 'draft',
        payload: d,
        created_at: now,
        updated_at: now
      }
      const existing = await safeQuery(supabase.from('v33_functional_records').select('id').eq('resource','marketing_reminder_drafts').eq('customer_id', customer_id).eq('local_id', d.id).maybeSingle())
      const patchRow = { ...row }
      if (existing.data?.id) delete patchRow.created_at
      const res = existing.data?.id
        ? await safeQuery(supabase.from('v33_functional_records').update(patchRow).eq('id', existing.data.id))
        : await safeQuery(supabase.from('v33_functional_records').insert(row))
      if (!res.error) saved += 1
    }
  }

  return {
    ok: true,
    drafts,
    skipped,
    saved,
    note: 'Es wurden nur Entwürfe für Kontakte mit bestätigter Werbeeinwilligung und E-Mail-Adresse erzeugt. Versand erfolgt erst über die Versandroute/Freigabe.'
  }
}

async function sendMarketingReminderDrafts(supabase, { customer_id, draft_ids = [], requireDelivery = true, limit = 50 } = {}) {
  if (!supabase || !customer_id) return { ok: false, error: 'customer_id fehlt', sent: [] }
  let q = supabase.from('v33_functional_records').select('*').eq('resource','marketing_reminder_drafts').eq('customer_id', customer_id).eq('status', 'draft').limit(Math.min(Number(limit || 50), 100))
  if (Array.isArray(draft_ids) && draft_ids.length) q = q.in('local_id', draft_ids)
  const records = await safeQuery(q)
  if (records.error) return { ok: false, error: records.error.message, sent: [] }

  const mail = new MailService()
  const sent = []
  const failed = []
  for (const rec of records.data || []) {
    const draft = rec.payload || {}
    if (!draft.email || !draft.consent_checked || !draft.unsubscribe_url) {
      failed.push({ id: rec.local_id, error: 'Draft unvollständig oder ohne Abmeldelink.' })
      continue
    }
    const text = `${draft.body}\n\nDu erhältst diese E-Mail, weil du Werbe-/Reminder-Mails bestätigt hast.\nAbmelden: ${draft.unsubscribe_url}`
    const html = htmlReminder({ draft, unsubscribe_url: draft.unsubscribe_url })
    try {
      const result = await mail.send({
        to: draft.email,
        subject: draft.subject,
        text,
        html,
        requireDelivery
      })
      await safeQuery(supabase.from('v33_functional_records').update({
        status: result?.dryRun ? 'dry_run' : 'sent',
        payload: { ...draft, sent_at: new Date().toISOString(), mail_result: result },
        updated_at: new Date().toISOString()
      }).eq('id', rec.id))
      await safeQuery(supabase.from('mail_events').insert({
        customer_id,
        recipient: draft.email,
        subject: draft.subject,
        template_key: 'marketing_reminder',
        provider: result?.provider || (result?.dryRun ? 'dry_run' : 'resend'),
        status: result?.sent ? 'sent' : result?.dryRun ? 'dry_run' : 'created',
        metadata: { draft_id: rec.local_id, result },
        created_at: new Date().toISOString()
      }))
      sent.push({ id: rec.local_id, email: draft.email, result })
    } catch (error) {
      failed.push({ id: rec.local_id, email: draft.email, error: error.message })
      await safeQuery(supabase.from('v33_functional_records').update({
        status: 'send_failed',
        payload: { ...draft, send_error: error.message, failed_at: new Date().toISOString() },
        updated_at: new Date().toISOString()
      }).eq('id', rec.id))
    }
  }
  return { ok: failed.length === 0, sent, failed, count: sent.length }
}

module.exports = { generateMarketingReminderDrafts, sendMarketingReminderDrafts, hasMarketingConsent }
