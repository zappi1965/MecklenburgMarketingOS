// AI-Chatbot fuer die oeffentliche Slug-Seite.
//
// Liefert kurze Antworten zu FAQs des jeweiligen Anbieters. Kontext wird
// pro Customer aus:
//   - customers.metadata.chatbot_context (Freitext)
//   - customers.brand_voice
//   - Loyalty-Programm-Beschreibung
//   - Oeffnungszeiten / Services (sofern in customers.metadata)
//
// Provider: anthropic | openai | mock (gleiche Logik wie aiReviewResponseService).
//
// Sicherheits-Guardrails:
//   - Maximal 8 Messages pro Conversation
//   - Maximal 500 Zeichen pro User-Message
//   - Rate-Limit per visitor_token (im Route-Layer)

const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

const PROVIDERS = ['anthropic', 'openai', 'mock']
const MAX_MESSAGES_PER_CONVERSATION = 8
const MAX_USER_MESSAGE_CHARS = 500

function provider() {
  const p = String(process.env.AI_PROVIDER || 'anthropic').toLowerCase()
  if (!PROVIDERS.includes(p)) return 'mock'
  if (p === 'anthropic' && !process.env.ANTHROPIC_API_KEY) return 'mock'
  if (p === 'openai' && !process.env.OPENAI_API_KEY) return 'mock'
  return p
}

function buildSystemPrompt({ customer, slug, brandVoice }) {
  const name = customer?.name || 'der Anbieter'
  const context = customer?.metadata?.chatbot_context || ''
  const services = customer?.metadata?.services || ''
  const hours = customer?.metadata?.opening_hours || ''
  return [
    `Du bist ein freundlicher Service-Assistent fuer "${name}".`,
    `Tonfall: ${brandVoice || 'professionell, knapp, hilfsbereit'}.`,
    `Antworte maximal 80 Woerter. Auf Deutsch. Niemals erfundene Versprechen, Preise oder Personen.`,
    `Wenn die Frage Buchung, Reklamation oder Datenschutz beruehrt, leite zu ${customer?.email || 'der Kontakt-E-Mail'} weiter.`,
    services ? `Leistungen: ${services}` : '',
    hours ? `Oeffnungszeiten: ${hours}` : '',
    context ? `Zusatzkontext:\n${context}` : '',
    slug ? `Diese Konversation laeuft auf der Slug-Seite /l/${slug}.` : ''
  ].filter(Boolean).join('\n')
}

const MOCK_REPLIES = [
  'Vielen Dank fuer Ihre Nachricht. Ich gebe Ihnen gerne eine erste Auskunft. Fuer verbindliche Termine wenden Sie sich bitte direkt an den Anbieter.',
  'Das laesst sich ueber unsere Buchungsseite klaeren. Ich kann Ihnen die wichtigsten Schritte erklaeren — moechten Sie das?',
  'Gerne. Kurz: wir empfehlen, ueber den Punkte-Button rechts unten zu starten. Bei Fragen steht das Team telefonisch zur Verfuegung.'
]

function mockReply(history) {
  return MOCK_REPLIES[history.length % MOCK_REPLIES.length]
}

async function anthropicReply({ system, messages }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
      max_tokens: 400,
      system,
      messages
    })
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Anthropic ${res.status}: ${t.slice(0, 200)}`)
  }
  const payload = await res.json()
  return payload?.content?.[0]?.text || ''
}

async function openaiReply({ system, messages }) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      max_tokens: 400,
      messages: [{ role: 'system', content: system }, ...messages]
    })
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`OpenAI ${res.status}: ${t.slice(0, 200)}`)
  }
  const payload = await res.json()
  return payload?.choices?.[0]?.message?.content || ''
}

async function startConversation({ slug, visitor_token, customer_id = null }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }
  const { data, error } = await supabase
    .from('chatbot_conversations')
    .insert({
      customer_id,
      slug: slug || null,
      visitor_token: String(visitor_token || '').slice(0, 128) || null
    })
    .select('id, started_at')
    .maybeSingle()
  if (error) throw error
  return data
}

async function sendMessage({ conversation_id, user_message, customer = null, slug = null }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }

  const trimmed = String(user_message || '').trim().slice(0, MAX_USER_MESSAGE_CHARS)
  if (!trimmed) { const e = new Error('Leere Nachricht'); e.status = 400; throw e }

  const { data: conv } = await supabase
    .from('chatbot_conversations')
    .select('id, message_count, customer_id, slug')
    .eq('id', conversation_id)
    .maybeSingle()
  if (!conv) { const e = new Error('Konversation nicht gefunden'); e.status = 404; throw e }
  if (conv.message_count >= MAX_MESSAGES_PER_CONVERSATION) {
    const e = new Error('Konversation hat das Nachrichtenlimit erreicht'); e.status = 429; throw e
  }

  // User-Message speichern.
  await supabase.from('chatbot_messages').insert({
    conversation_id, role: 'user', content: trimmed
  })

  // Vergangene Messages laden fuer Kontext.
  const { data: history } = await supabase
    .from('chatbot_messages')
    .select('role, content')
    .eq('conversation_id', conversation_id)
    .order('created_at', { ascending: true })
    .limit(20)
  const messages = (history || []).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))

  const system = buildSystemPrompt({ customer, slug: slug || conv.slug, brandVoice: customer?.brand_voice })
  const p = provider()
  let reply
  try {
    if (p === 'anthropic') reply = await anthropicReply({ system, messages })
    else if (p === 'openai') reply = await openaiReply({ system, messages })
    else reply = mockReply(messages)
  } catch (e) {
    reply = `Tut mir leid, ich kann gerade nicht antworten. Bitte wende dich direkt an ${customer?.email || 'den Anbieter'}.`
  }

  await supabase.from('chatbot_messages').insert({
    conversation_id, role: 'assistant', content: reply, provider: p
  })
  await supabase
    .from('chatbot_conversations')
    .update({ message_count: (conv.message_count || 0) + 2 })
    .eq('id', conversation_id)

  return { reply, provider: p }
}

module.exports = {
  startConversation,
  sendMessage,
  buildSystemPrompt,
  PROVIDERS,
  MAX_MESSAGES_PER_CONVERSATION,
  MAX_USER_MESSAGE_CHARS,
  // Test helpers:
  _mockReply: mockReply
}
