// AI-CRM-Mail-Assistant.
//
// Erzeugt Entwuerfe fuer ausgehende E-Mails an Endkunden, mit Kontext
// aus der Kundenhistorie:
//   - letzte Termine
//   - letzte Reviews
//   - offene Rechnungen
//   - Health/Risk-Score aus customer_intelligence_scores
//   - brand_voice
//
// Use-Cases: Reaktivierung, Bedankung nach Bewertung, Mahnungs-Einleitung,
// Geburtstagsgruss, Abklarung kritischer Reviews.
//
// Provider: anthropic | openai | mock (gleicher Switch wie review-response).

const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

const PROVIDERS = ['anthropic', 'openai', 'mock']
const PURPOSES = ['reactivation', 'thank_you', 'dunning_intro', 'birthday', 'review_followup', 'free']

function provider() {
  const p = String(process.env.AI_PROVIDER || 'anthropic').toLowerCase()
  if (!PROVIDERS.includes(p)) return 'mock'
  if (p === 'anthropic' && !process.env.ANTHROPIC_API_KEY) return 'mock'
  if (p === 'openai' && !process.env.OPENAI_API_KEY) return 'mock'
  return p
}

function buildContext({ customer, recipient, context }) {
  const parts = []
  parts.push(`Sender: ${customer?.name || 'Mecklenburg Marketing'}`)
  if (customer?.brand_voice) parts.push(`Tonfall: ${customer.brand_voice}`)
  parts.push(`Empfaenger: ${recipient?.name || recipient?.email || 'Kunde'}`)
  if (recipient?.email) parts.push(`E-Mail: ${recipient.email}`)
  if (context?.last_appointment) parts.push(`Letzter Termin: ${context.last_appointment}`)
  if (context?.open_invoices_count) parts.push(`Offene Rechnungen: ${context.open_invoices_count}`)
  if (context?.last_review_rating != null) parts.push(`Letzte Bewertung: ${context.last_review_rating}/5`)
  if (context?.risk_score != null) parts.push(`Customer-Health-Score: ${100 - Number(context.risk_score || 0)}/100`)
  if (context?.custom_note) parts.push(`Notiz: ${context.custom_note}`)
  return parts.join('\n')
}

function buildPrompt({ purpose, customer, recipient, context }) {
  const goal = {
    reactivation: 'Reaktivieren Sie einen seit Monaten inaktiven Kunden mit einem warmen, konkreten Anlass (kein Rabatt-Versprechen).',
    thank_you: 'Bedanken Sie sich fuer die letzte Bewertung oder den letzten Termin.',
    dunning_intro: 'Erste freundliche Zahlungserinnerung bei ueberfaelliger Rechnung; sachlich, ohne Gebuehrenhinweis.',
    birthday: 'Kurzer, freundlicher Geburtstagsgruss mit Bezug zum Unternehmen.',
    review_followup: 'Nachfassen auf eine schlechte Bewertung; zuhoeren, Loesung anbieten.',
    free: 'Schreiben Sie eine kurze, persoenliche E-Mail im Tonfall des Unternehmens.'
  }[purpose] || 'Schreiben Sie eine kurze, freundliche E-Mail.'

  const system = [
    'Du verfasst E-Mail-Entwuerfe fuer Service-Unternehmen.',
    'Sprache: Deutsch. Maximal 120 Woerter. Keine erfundenen Fakten oder Personen.',
    'Liefere JSON: {"subject": "...", "body": "..."}. body ohne Anrede/Gruss-Floskeln aus dem System, der Sender setzt sie selbst.'
  ].join(' ')
  const user = `Ziel: ${goal}\n\nKontext:\n${buildContext({ customer, recipient, context })}`
  return { system, user }
}

const MOCK = {
  reactivation: {
    subject: 'Schoen, von Ihnen zu hoeren',
    body: 'Wir haben Sie laenger nicht bei uns gesehen und wollten kurz fragen, ob alles in Ordnung ist. Wenn Sie wieder einen Termin moechten, melden Sie sich gerne direkt — wir freuen uns.'
  },
  thank_you: {
    subject: 'Vielen Dank fuer Ihre Bewertung',
    body: 'Ihre freundlichen Worte freuen uns sehr und wir geben sie gerne ans Team weiter. Wir freuen uns auf den naechsten Besuch.'
  },
  dunning_intro: {
    subject: 'Kurze freundliche Erinnerung',
    body: 'Vermutlich ist es untergegangen — wir haben noch eine offene Rechnung bei Ihnen. Sollten Sie Fragen haben, kommen Sie gerne auf uns zu. Andernfalls bitten wir um zeitnahe Begleichung.'
  },
  birthday: {
    subject: 'Alles Gute zum Geburtstag',
    body: 'Wir wuenschen Ihnen einen wunderschoenen Geburtstag und ein erfolgreiches neues Lebensjahr. Schoen, dass Sie unser Kunde sind.'
  },
  review_followup: {
    subject: 'Wir moechten verstehen',
    body: 'Ihr Feedback haben wir ernst genommen und moechten gerne verstehen, was schief lief. Bitte melden Sie sich direkt bei uns — wir hoeren zu.'
  },
  free: {
    subject: 'Kurze Nachricht',
    body: 'Kurze persoenliche Nachricht — bei Fragen melden Sie sich gerne.'
  }
}

async function mockDraft({ purpose }) {
  return MOCK[purpose] || MOCK.free
}

async function anthropicDraft({ system, user }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
      max_tokens: 500,
      system,
      messages: [{ role: 'user', content: user }]
    })
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Anthropic ${res.status}: ${t.slice(0, 200)}`)
  }
  const payload = await res.json()
  return parseDraft(payload?.content?.[0]?.text || '')
}

async function openaiDraft({ system, user }) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      max_tokens: 500,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
    })
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`OpenAI ${res.status}: ${t.slice(0, 200)}`)
  }
  const payload = await res.json()
  return parseDraft(payload?.choices?.[0]?.message?.content || '')
}

function parseDraft(text) {
  try {
    const m = text.match(/\{[\s\S]*\}/)
    if (m) {
      const obj = JSON.parse(m[0])
      if (obj && typeof obj.body === 'string') {
        return { subject: String(obj.subject || '').slice(0, 200), body: String(obj.body).slice(0, 4000) }
      }
    }
  } catch (_) {}
  // Fallback: Subject = erste Zeile, Body = Rest.
  const lines = text.trim().split('\n')
  return {
    subject: (lines[0] || 'Nachricht').slice(0, 200),
    body: lines.slice(1).join('\n').trim() || text.slice(0, 4000)
  }
}

// Laedt Kontext zu einem Empfaenger (loyalty_customer oder customer_user).
async function loadContext({ customer_id, recipient_email }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return {}
  const norm = String(recipient_email || '').toLowerCase()
  const out = {}
  try {
    const { data: appts } = await supabase
      .from('appointments').select('start_time, title')
      .eq('customer_id', customer_id).eq('contact_email', norm)
      .order('start_time', { ascending: false }).limit(1)
    if (appts?.[0]) out.last_appointment = `${appts[0].title || 'Termin'} am ${appts[0].start_time}`
  } catch (_) {}
  try {
    const { data: invs } = await supabase
      .from('invoices').select('id, status')
      .eq('customer_id', customer_id).eq('customer_email', norm)
    out.open_invoices_count = (invs || []).filter((i) => !/bezahlt|paid/i.test(i.status || '')).length
  } catch (_) {}
  try {
    const { data: revs } = await supabase
      .from('review_feedback').select('rating, created_at')
      .eq('customer_id', customer_id).eq('reviewer_email', norm)
      .order('created_at', { ascending: false }).limit(1)
    if (revs?.[0]) out.last_review_rating = revs[0].rating
  } catch (_) {}
  try {
    const { data: intel } = await supabase
      .from('customer_intelligence_scores').select('risk_score').eq('customer_id', customer_id).maybeSingle()
    if (intel) out.risk_score = intel.risk_score
  } catch (_) {}
  return out
}

async function draftMail({ purpose = 'free', customer, recipient, custom_note }) {
  if (!PURPOSES.includes(purpose)) { const e = new Error('Unbekannter purpose'); e.status = 400; throw e }
  const context = customer && recipient?.email
    ? { ...(await loadContext({ customer_id: customer.id, recipient_email: recipient.email })), custom_note }
    : { custom_note }
  const prompt = buildPrompt({ purpose, customer, recipient, context })
  const p = provider()
  if (p === 'mock') return { provider: p, draft: await mockDraft({ purpose }), context }
  try {
    const draft = p === 'anthropic' ? await anthropicDraft(prompt) : await openaiDraft(prompt)
    return { provider: p, draft, context }
  } catch (_) {
    return { provider: 'mock-fallback', draft: await mockDraft({ purpose }), context }
  }
}

module.exports = {
  draftMail,
  buildPrompt,
  PURPOSES,
  // Test helpers:
  _buildContext: buildContext,
  _parseDraft: parseDraft,
  _mockDraft: mockDraft
}
