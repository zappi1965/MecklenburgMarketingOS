// AI Social-Post-Generator.
//
// Erzeugt mehrere Social-Media-Post-Varianten (Text + Hashtags) im Markenton
// des Kunden fuer eine Plattform. Provider-agnostisch, identisches Muster wie
// aiReviewResponseService:
//   - 'anthropic' (Default) → Claude API
//   - 'openai' → GPT API
//   - 'mock' → deterministische Varianten fuer Tests/CI (ohne Keys)

const PROVIDERS = ['anthropic', 'openai', 'mock']
const PLATFORMS = ['instagram', 'facebook', 'google_post', 'linkedin']

function provider() {
  const p = String(process.env.AI_PROVIDER || 'anthropic').toLowerCase()
  if (!PROVIDERS.includes(p)) return 'mock'
  if (p === 'anthropic' && !process.env.ANTHROPIC_API_KEY) return 'mock'
  if (p === 'openai' && !process.env.OPENAI_API_KEY) return 'mock'
  return p
}

function platformGuide(platform) {
  switch (platform) {
    case 'instagram': return 'locker, visuell, mit Emojis, 5-10 Hashtags, max 120 Woerter'
    case 'facebook': return 'nahbar, etwas ausfuehrlicher, 2-4 Hashtags, max 150 Woerter'
    case 'google_post': return 'sachlich, lokaler Bezug, klarer Call-to-Action, KEINE Hashtags, max 80 Woerter'
    case 'linkedin': return 'professionell, fachlich, 3-5 Hashtags, max 150 Woerter'
    default: return 'klar, freundlich, max 120 Woerter'
  }
}

function buildPrompt({ platform, topic, tone, language = 'de', businessName, count = 3 }) {
  return {
    system: `Du bist Social-Media-Manager fuer ein lokales Service-Unternehmen${businessName ? ` namens "${businessName}"` : ''}.
Erzeuge GENAU ${count} unterschiedliche Post-Varianten fuer die Plattform "${platform}".
Stilvorgaben fuer diese Plattform: ${platformGuide(platform)}.
- Sprache: ${language}
- Markenton: ${tone || 'freundlich, authentisch, regional'}
- konkreter Call-to-Action pro Post
- keine erfundenen Fakten, keine falschen Versprechen
Liefere AUSSCHLIESSLICH ein JSON-Array mit ${count} Objekten der Form {"text": "...", "hashtags": ["#...", "#..."]}.`,
    user: `Thema / Anlass des Posts: """${topic || 'Allgemeiner Post ueber unser Angebot'}"""`
  }
}

const MOCK_BY_PLATFORM = {
  instagram: [
    { text: 'Heute schon was Gutes gegoennt? ✨ Schau bei uns vorbei und lass dich verwoehnen. Wir freuen uns auf dich!', hashtags: ['#lokal', '#service', '#qualitaet', '#willkommen', '#region'] },
    { text: 'Neue Woche, neue Chance dich wohlzufuehlen. 💛 Termin sichern und entspannt geniessen.', hashtags: ['#termin', '#wohlfuehlen', '#stammkunde', '#lieblingsladen'] },
    { text: 'Wir lieben was wir tun – und das sieht man. 🙌 Komm vorbei und ueberzeug dich selbst!', hashtags: ['#handgemacht', '#leidenschaft', '#vorbeikommen'] }
  ],
  facebook: [
    { text: 'Wir haben diese Woche noch freie Termine fuer euch. Meldet euch gerne – wir nehmen uns Zeit fuer eure Wuensche.', hashtags: ['#termin', '#lokal'] },
    { text: 'Danke an alle Stammkunden, die uns treu bleiben. Als kleines Dankeschoen erwartet euch beim naechsten Besuch eine Ueberraschung.', hashtags: ['#danke', '#stammkunden'] },
    { text: 'Qualitaet, auf die ihr euch verlassen koennt. Schaut vorbei und erlebt unseren Service selbst.', hashtags: ['#qualitaet', '#service'] }
  ],
  google_post: [
    { text: 'Jetzt Termin sichern: Wir beraten Sie persoenlich und nehmen uns Zeit fuer Ihre Wuensche. Rufen Sie uns an oder buchen Sie online.', hashtags: [] },
    { text: 'Neu bei uns: erweiterte Oeffnungszeiten fuer mehr Flexibilitaet. Besuchen Sie uns – wir freuen uns auf Sie.', hashtags: [] },
    { text: 'Ihre Zufriedenheit ist unser Ziel. Vereinbaren Sie noch heute einen Termin und ueberzeugen Sie sich selbst.', hashtags: [] }
  ],
  linkedin: [
    { text: 'Regionale Naehe trifft professionellen Service. Wir investieren in Qualitaet und in langfristige Kundenbeziehungen.', hashtags: ['#regional', '#service', '#qualitaet'] },
    { text: 'Hinter jedem guten Ergebnis steht ein engagiertes Team. Wir sind stolz auf das, was wir taeglich leisten.', hashtags: ['#team', '#leidenschaft', '#mittelstand'] },
    { text: 'Verlaesslichkeit zahlt sich aus: Darum vertrauen uns unsere Kundinnen und Kunden seit Jahren.', hashtags: ['#vertrauen', '#kundenbindung'] }
  ]
}

async function mockGenerate({ platform, count = 3 }) {
  const base = MOCK_BY_PLATFORM[platform] || MOCK_BY_PLATFORM.instagram
  return base.slice(0, count)
}

async function anthropicGenerate({ system, user }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
      max_tokens: 1200, system, messages: [{ role: 'user', content: user }]
    })
  })
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(`Anthropic API ${res.status}: ${t.slice(0, 200)}`) }
  const payload = await res.json()
  return parsePosts(payload?.content?.[0]?.text || '')
}

async function openaiGenerate({ system, user }) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      max_tokens: 1200, messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
    })
  })
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(`OpenAI API ${res.status}: ${t.slice(0, 200)}`) }
  const payload = await res.json()
  return parsePosts(payload?.choices?.[0]?.message?.content || '')
}

// Robustes Parsing: bevorzugt JSON-Array von Objekten, faellt auf
// Zeilen-Splitting zurueck. Hashtags werden notfalls aus dem Text extrahiert.
function parsePosts(text) {
  const m = text.match(/\[[\s\S]*\]/)
  if (m) {
    try {
      const arr = JSON.parse(m[0])
      if (Array.isArray(arr)) {
        return arr.map((x) => normalizePost(x)).filter((p) => p.text)
      }
    } catch (_) {}
  }
  const lines = text.split('\n').map((l) => l.replace(/^[\d.\-\s]+/, '').trim()).filter(Boolean)
  return lines.slice(0, 3).map((l) => normalizePost(l))
}

function normalizePost(x) {
  if (typeof x === 'string') {
    const hashtags = (x.match(/#[\wäöüÄÖÜß]+/g) || [])
    return { text: x.trim(), hashtags }
  }
  if (x && typeof x === 'object') {
    const text = String(x.text || x.content || '').trim()
    let hashtags = x.hashtags
    if (!Array.isArray(hashtags)) hashtags = (text.match(/#[\wäöüÄÖÜß]+/g) || [])
    return { text, hashtags: hashtags.map((h) => String(h).trim()).filter(Boolean) }
  }
  return { text: '', hashtags: [] }
}

async function generatePosts({ platform, topic, tone, language = 'de', businessName, count = 3 }) {
  const pf = PLATFORMS.includes(String(platform)) ? String(platform) : 'instagram'
  const n = Math.min(5, Math.max(1, Number(count) || 3))
  const prompt = buildPrompt({ platform: pf, topic, tone, language, businessName, count: n })
  const p = provider()
  let posts
  if (p === 'anthropic') posts = await anthropicGenerate(prompt)
  else if (p === 'openai') posts = await openaiGenerate(prompt)
  else posts = await mockGenerate({ platform: pf, count: n })
  return { provider: p, platform: pf, posts: (posts || []).slice(0, n) }
}

module.exports = {
  generatePosts,
  PLATFORMS,
  // Test-Helpers:
  _buildPrompt: buildPrompt,
  _parsePosts: parsePosts,
  _normalizePost: normalizePost,
  _mockGenerate: mockGenerate
}
