// AI-Review-Response-Generator.
//
// Erzeugt 3 Antwort-Vorschlaege zu einer Review im Tonfall des Kunden.
// Provider-agnostisch:
//   - 'anthropic' (Default) → Claude API
//   - 'openai' → GPT API
//   - 'mock' → deterministische Vorschlaege fuer Tests/CI
//
// Provider via ENV AI_PROVIDER, Keys via ANTHROPIC_API_KEY /
// OPENAI_API_KEY. Ohne Keys faellt der Service auf 'mock' zurueck.

const PROVIDERS = ['anthropic', 'openai', 'mock']

function provider() {
  const p = String(process.env.AI_PROVIDER || 'anthropic').toLowerCase()
  if (!PROVIDERS.includes(p)) return 'mock'
  if (p === 'anthropic' && !process.env.ANTHROPIC_API_KEY) return 'mock'
  if (p === 'openai' && !process.env.OPENAI_API_KEY) return 'mock'
  return p
}

function buildPrompt({ rating, text, brandVoice, language = 'de' }) {
  const ratingLabel = rating <= 2 ? 'sehr kritisch' : rating === 3 ? 'gemischt' : rating === 4 ? 'positiv' : 'sehr positiv'
  return {
    system: `Du bist ein professioneller Community-Manager fuer ein Service-Unternehmen. Erzeuge GENAU 3 Antwort-Vorschlaege auf eine Kundenbewertung. Jede Antwort:
- maximal 60 Woerter
- Sprache: ${language}
- Tonfall: ${brandVoice || 'professionell, freundlich, konkret'}
- niemals Versprechen die man nicht halten kann
- bei kritischen Bewertungen: Entschuldigung + konkretes Loesungsangebot
- niemals Vornamen erfinden, niemals interne Personen nennen
Liefere die Antworten als JSON-Array von Strings.`,
    user: `Bewertung ist ${ratingLabel} (${rating}/5 Sterne). Text der Bewertung:

"""${text || '(kein Text)'}"""`
  }
}

const MOCK_RESPONSES = {
  low: [
    'Vielen Dank fuer Ihr Feedback. Es tut uns leid, dass Sie nicht zufrieden waren. Wir wuerden uns gerne direkt mit Ihnen austauschen und das Erlebnis verbessern.',
    'Das tut uns sehr leid zu hoeren. Ihre Beobachtung nehmen wir ernst und besprechen sie im Team. Bei Fragen melden Sie sich gerne direkt bei uns.',
    'Danke, dass Sie sich die Zeit genommen haben. Wir moechten verstehen was schief lief und wie wir es wieder gutmachen koennen. Bitte kontaktieren Sie uns.'
  ],
  mid: [
    'Danke fuer Ihre offene Rueckmeldung. Wir freuen uns ueber die guten Aspekte und arbeiten an den Punkten die noch nicht ueberzeugt haben.',
    'Vielen Dank fuer das ausgewogene Feedback. Wir nehmen Ihre Hinweise in unser kontinuierliches Verbesserungsprogramm auf.',
    'Schoen, dass Sie sich aeussern. Beim naechsten Besuch zeigen wir Ihnen gerne wie wir uns weiterentwickelt haben.'
  ],
  high: [
    'Vielen Dank fuer Ihre Bewertung. Es freut uns sehr, dass es Ihnen bei uns gefallen hat. Wir freuen uns auf den naechsten Besuch.',
    'Das ist tolles Feedback, vielen Dank. Wir geben Ihre Worte gerne ans gesamte Team weiter.',
    'Herzlichen Dank. Solche Bewertungen sind die schoenste Belohnung fuer unser Team.'
  ]
}

async function mockGenerate({ rating }) {
  if (rating <= 2) return MOCK_RESPONSES.low
  if (rating === 3) return MOCK_RESPONSES.mid
  return MOCK_RESPONSES.high
}

async function anthropicGenerate({ system, user }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
      max_tokens: 800,
      system,
      messages: [{ role: 'user', content: user }]
    })
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Anthropic API ${res.status}: ${txt.slice(0, 200)}`)
  }
  const payload = await res.json()
  const text = payload?.content?.[0]?.text || ''
  return parseJsonArray(text)
}

async function openaiGenerate({ system, user }) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      max_tokens: 800,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    })
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`OpenAI API ${res.status}: ${txt.slice(0, 200)}`)
  }
  const payload = await res.json()
  const text = payload?.choices?.[0]?.message?.content || ''
  return parseJsonArray(text)
}

function parseJsonArray(text) {
  const m = text.match(/\[[\s\S]*\]/)
  if (m) {
    try {
      const arr = JSON.parse(m[0])
      if (Array.isArray(arr)) return arr.map((x) => String(x).trim()).filter(Boolean)
    } catch (_) {}
  }
  const lines = text
    .split('\n')
    .map((l) => l.replace(/^[\d.\-\s]+/, '').trim())
    .filter(Boolean)
  if (lines.length > 1) return lines.slice(0, 3)
  return [text.trim()].filter(Boolean)
}

async function generateResponses({ review, customer }) {
  const rating = Number(review?.rating || 0)
  const text = String(review?.feedback_text || '')
  const brandVoice = customer?.brand_voice || customer?.metadata?.brand_voice || ''
  const language = customer?.metadata?.language || 'de'
  const prompt = buildPrompt({ rating, text, brandVoice, language })
  const p = provider()
  let suggestions
  if (p === 'anthropic') suggestions = await anthropicGenerate(prompt)
  else if (p === 'openai') suggestions = await openaiGenerate(prompt)
  else suggestions = await mockGenerate({ rating })
  return { provider: p, suggestions: (suggestions || []).slice(0, 3) }
}

module.exports = {
  generateResponses,
  // Test helpers:
  _buildPrompt: buildPrompt,
  _parseJsonArray: parseJsonArray,
  _mockGenerate: mockGenerate
}
