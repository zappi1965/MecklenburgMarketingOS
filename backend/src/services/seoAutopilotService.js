// SEO-Autopilot Generierungs-Service.
//
// Erzeugt im Markenton des Kunden: (1) ein Brand-DNA-Profil, (2) Keyword-Ideen
// und (3) vollstaendige SEO-Artikel (Titel, Meta-Description, Markdown-Body,
// interne Link-Vorschlaege). Provider-agnostisch, identisches Muster wie
// aiSocialPostService / aiReviewResponseService:
//   - 'anthropic' (Default) → Claude API
//   - 'openai' → GPT API
//   - 'mock' → deterministische Inhalte fuer Tests/CI (ohne Keys)
//
// Hinweis: Ohne ANTHROPIC_API_KEY / OPENAI_API_KEY faellt der Service
// automatisch auf 'mock' zurueck, sodass die komplette Pipeline ohne Kosten
// und ohne externe Abhaengigkeit testbar bleibt.

const PROVIDERS = ['anthropic', 'openai', 'mock']

function provider() {
  const p = String(process.env.AI_PROVIDER || 'anthropic').toLowerCase()
  if (!PROVIDERS.includes(p)) return 'mock'
  if (p === 'anthropic' && !process.env.ANTHROPIC_API_KEY) return 'mock'
  if (p === 'openai' && !process.env.OPENAI_API_KEY) return 'mock'
  return p
}

// --- Hilfsfunktionen -------------------------------------------------------

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function clampWords(s, max) {
  const words = String(s || '').trim().split(/\s+/)
  if (words.length <= max) return String(s || '').trim()
  return words.slice(0, max).join(' ')
}

// Extrahiert das erste JSON-Objekt/Array aus einem LLM-Text (robust gegen
// Markdown-Codefences und Begleittext).
function extractJson(text) {
  const fenced = String(text || '').match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced ? fenced[1] : String(text || '')
  const objMatch = raw.match(/[[{][\s\S]*[\]}]/)
  if (!objMatch) return null
  try { return JSON.parse(objMatch[0]) } catch (_) { return null }
}

// --- Anthropic / OpenAI Aufrufe -------------------------------------------

async function anthropicCall({ system, user, maxTokens = 2400 }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
      max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }]
    })
  })
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(`Anthropic API ${res.status}: ${t.slice(0, 200)}`) }
  const payload = await res.json()
  return payload?.content?.[0]?.text || ''
}

async function openaiCall({ system, user, maxTokens = 2400 }) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      max_tokens: maxTokens, messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
    })
  })
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(`OpenAI API ${res.status}: ${t.slice(0, 200)}`) }
  const payload = await res.json()
  return payload?.choices?.[0]?.message?.content || ''
}

async function llm(prompt) {
  const p = provider()
  if (p === 'anthropic') return { provider: p, text: await anthropicCall(prompt) }
  if (p === 'openai') return { provider: p, text: await openaiCall(prompt) }
  return { provider: 'mock', text: '' }
}

// --- 1) Brand-DNA ----------------------------------------------------------

function buildBrandPrompt({ businessName, branch, websiteUrl, notes, language = 'de' }) {
  return {
    system: `Du bist SEO- und Content-Stratege fuer lokale Betriebe.
Analysiere den Betrieb und liefere ein praezises "Brand-DNA"-Profil als Grundlage fuer SEO-Texte.
Sprache der Ausgabe: ${language}.
Liefere AUSSCHLIESSLICH ein JSON-Objekt der Form:
{"audience":"...","tone":"...","topics":["...","..."],"value_props":["...","..."]}
- audience: wer die typische Zielgruppe ist (1-2 Saetze)
- tone: Markenton in Stichworten
- topics: 5-8 relevante Content-Themen
- value_props: 3-5 Kernnutzen/Alleinstellungsmerkmale
Keine erfundenen Fakten, keine Halluzination konkreter Zahlen.`,
    user: `Betrieb: "${businessName || 'Lokaler Betrieb'}"
Branche: "${branch || 'unbekannt'}"
Website: "${websiteUrl || '—'}"
Zusatzinfos: """${notes || '—'}"""`
  }
}

function mockBrandProfile({ businessName, branch }) {
  const b = String(branch || '').toLowerCase()
  const byBranch = {
    friseur: { topics: ['Trendfrisuren der Saison', 'Haarpflege-Tipps', 'Coloration & Strähnen', 'Typberatung', 'Pflege für coloriertes Haar', 'Hochsteckfrisuren für Anlässe'], value: ['persönliche Typberatung', 'hochwertige Pflegeprodukte', 'erfahrenes Team'] },
    gastro: { topics: ['Saisonale Gerichte', 'Regionale Zutaten', 'Events & Reservierung', 'Mittagstisch', 'Catering vor Ort', 'Getränkeempfehlungen'], value: ['frische regionale Küche', 'gemütliches Ambiente', 'persönlicher Service'] },
    beauty: { topics: ['Gesichtsbehandlungen', 'Maniküre & Nageldesign', 'Wimpern & Augenbrauen', 'Hautpflege-Routinen', 'Wellness-Angebote', 'Geschenkgutscheine'], value: ['individuelle Beratung', 'entspannte Atmosphäre', 'sichtbare Ergebnisse'] }
  }
  let pick = byBranch.gastro
  if (b.includes('fris') || b.includes('hair')) pick = byBranch.friseur
  else if (b.includes('beauty') || b.includes('kosm') || b.includes('nagel') || b.includes('wellness')) pick = byBranch.beauty
  return {
    audience: `Lokale Kundinnen und Kunden in der Region, die ${branch || 'einen verlässlichen Anbieter'} mit persönlicher Betreuung und guter Erreichbarkeit suchen.`,
    tone: 'freundlich, nahbar, kompetent, regional',
    topics: pick.topics,
    value_props: pick.value
  }
}

async function generateBrandProfile({ businessName, branch, websiteUrl, notes, language = 'de' }) {
  const p = provider()
  if (p === 'mock') return { provider: 'mock', profile: mockBrandProfile({ businessName, branch }) }
  const { provider: used, text } = await llm(buildBrandPrompt({ businessName, branch, websiteUrl, notes, language }))
  const parsed = extractJson(text)
  if (!parsed || typeof parsed !== 'object') return { provider: used, profile: mockBrandProfile({ businessName, branch }) }
  return {
    provider: used,
    profile: {
      audience: String(parsed.audience || '').trim(),
      tone: String(parsed.tone || '').trim(),
      topics: Array.isArray(parsed.topics) ? parsed.topics.map((t) => String(t).trim()).filter(Boolean).slice(0, 8) : [],
      value_props: Array.isArray(parsed.value_props) ? parsed.value_props.map((t) => String(t).trim()).filter(Boolean).slice(0, 5) : []
    }
  }
}

// --- 2) Keyword-Ideen ------------------------------------------------------

function buildKeywordPrompt({ businessName, branch, audience, city, language = 'de', count = 10 }) {
  return {
    system: `Du bist lokaler SEO-Experte. Erzeuge GENAU ${count} kaufrelevante Keyword-Ideen,
auf die ein lokaler Betrieb realistisch ranken kann (Mischung aus lokalen, informativen und
transaktionalen Suchanfragen). Sprache: ${language}.
Liefere AUSSCHLIESSLICH ein JSON-Array mit Objekten der Form:
{"keyword":"...","intent":"local|informational|transactional","priority":1-5}
- priority 5 = höchstes Potenzial.
Keine erfundenen Suchvolumina.`,
    user: `Betrieb: "${businessName || 'Lokaler Betrieb'}", Branche: "${branch || 'unbekannt'}"${city ? `, Ort: "${city}"` : ''}.
Zielgruppe: "${audience || '—'}".`
  }
}

function mockKeywords({ branch, city, count = 10 }) {
  const place = city || 'deiner Stadt'
  const b = String(branch || 'Betrieb')
  const base = [
    { keyword: `${b} ${place}`, intent: 'local', priority: 5 },
    { keyword: `bester ${b} in ${place}`, intent: 'local', priority: 5 },
    { keyword: `${b} Termin online buchen`, intent: 'transactional', priority: 4 },
    { keyword: `${b} Preise`, intent: 'transactional', priority: 4 },
    { keyword: `${b} in der Nähe`, intent: 'local', priority: 4 },
    { keyword: `${b} Erfahrungen Bewertungen`, intent: 'informational', priority: 3 },
    { keyword: `${b} Öffnungszeiten ${place}`, intent: 'local', priority: 3 },
    { keyword: `worauf bei einem ${b} achten`, intent: 'informational', priority: 2 },
    { keyword: `${b} Gutschein verschenken`, intent: 'transactional', priority: 3 },
    { keyword: `${b} Tipps`, intent: 'informational', priority: 2 }
  ]
  return base.slice(0, count)
}

async function generateKeywords({ businessName, branch, audience, city, language = 'de', count = 10 }) {
  const n = Math.min(20, Math.max(3, Number(count) || 10))
  const p = provider()
  if (p === 'mock') return { provider: 'mock', keywords: mockKeywords({ branch, city, count: n }) }
  const { provider: used, text } = await llm(buildKeywordPrompt({ businessName, branch, audience, city, language, count: n }))
  const parsed = extractJson(text)
  if (!Array.isArray(parsed)) return { provider: used, keywords: mockKeywords({ branch, city, count: n }) }
  const keywords = parsed.map((k) => ({
    keyword: String(k?.keyword || '').trim(),
    intent: ['local', 'informational', 'transactional'].includes(String(k?.intent)) ? String(k.intent) : 'informational',
    priority: Math.min(5, Math.max(1, Number(k?.priority) || 3))
  })).filter((k) => k.keyword).slice(0, n)
  return { provider: used, keywords: keywords.length ? keywords : mockKeywords({ branch, city, count: n }) }
}

// --- 3) Artikel ------------------------------------------------------------

function buildArticlePrompt({ keyword, businessName, branch, tone, audience, language = 'de' }) {
  return {
    system: `Du bist SEO-Redakteur fuer lokale Betriebe. Schreibe einen vollstaendigen,
suchmaschinenoptimierten Artikel auf ${language}.
Anforderungen:
- 600-900 Woerter, gut strukturiert mit Markdown-Ueberschriften (##, ###)
- natuerliche Einbindung des Keywords, keine Keyword-Stuffing
- konkreter, hilfreicher Mehrwert; KEINE erfundenen Fakten/Zahlen/Bewertungen
- klarer Call-to-Action am Ende (Termin/Kontakt)
- Markenton: ${tone || 'freundlich, regional, kompetent'}
Liefere AUSSCHLIESSLICH ein JSON-Objekt der Form:
{"title":"...","meta_description":"...","body_markdown":"...","internal_link_ideas":["...","..."]}
- title: max 60 Zeichen, enthaelt das Keyword
- meta_description: max 155 Zeichen
- internal_link_ideas: 2-4 Vorschlaege fuer interne Verlinkungen (Ankertexte)`,
    user: `Keyword/Thema: "${keyword}"
Betrieb: "${businessName || 'Lokaler Betrieb'}", Branche: "${branch || 'unbekannt'}"
Zielgruppe: "${audience || '—'}"`
  }
}

function mockArticle({ keyword, businessName, branch }) {
  const kw = String(keyword || 'unser Angebot').trim()
  const name = businessName || 'unserem Betrieb'
  const title = clampWords(`${kw.charAt(0).toUpperCase() + kw.slice(1)} – das solltest du wissen`, 10)
  const body = `## ${kw.charAt(0).toUpperCase() + kw.slice(1)}: worauf es wirklich ankommt

Wer nach **${kw}** sucht, möchte vor allem eins: ein verlässliches Ergebnis und eine persönliche Beratung vor Ort. In diesem Beitrag erfährst du, worauf du achten solltest und wie wir bei ${name} dich dabei unterstützen.

### Warum die Wahl des richtigen Anbieters zählt

Gerade bei ${branch || 'lokalen Dienstleistungen'} entscheidet die Qualität der Beratung über das Ergebnis. Nimm dir Zeit, vergleiche Leistungen statt nur Preise und achte auf echte Kundenstimmen aus deiner Region.

### Unsere Empfehlung in drei Schritten

1. **Bedarf klären:** Überlege dir vorab, was dir wichtig ist.
2. **Beratung nutzen:** Ein gutes Gespräch spart später Zeit und Geld.
3. **Termin sichern:** Plane frühzeitig, besonders zu Stoßzeiten.

### Häufige Fragen

**Wie schnell bekomme ich einen Termin?** In der Regel kurzfristig – sprich uns einfach an.
**Was kostet es?** Das hängt vom Umfang ab; wir beraten dich transparent und unverbindlich.

## Jetzt persönlich beraten lassen

Du hast Fragen rund um **${kw}**? Wir bei ${name} nehmen uns Zeit für dich. Vereinbare jetzt deinen Termin – persönlich, regional und unverbindlich.`
  return {
    title,
    meta_description: clampWords(`Alles Wichtige zu ${kw}: Tipps, Ablauf und persönliche Beratung bei ${name}. Jetzt informieren und Termin sichern.`, 24),
    body_markdown: body,
    internal_link_ideas: ['Unsere Leistungen im Überblick', 'Termin online buchen', 'Über uns & Team']
  }
}

async function generateArticle({ keyword, businessName, branch, tone, audience, language = 'de' }) {
  if (!keyword) throw new Error('keyword erforderlich')
  const p = provider()
  let article
  let used = 'mock'
  if (p === 'mock') {
    article = mockArticle({ keyword, businessName, branch })
  } else {
    const { provider: prov, text } = await llm(buildArticlePrompt({ keyword, businessName, branch, tone, audience, language }))
    used = prov
    const parsed = extractJson(text)
    if (parsed && typeof parsed === 'object' && parsed.body_markdown) {
      article = {
        title: clampWords(String(parsed.title || keyword), 12),
        meta_description: clampWords(String(parsed.meta_description || ''), 26),
        body_markdown: String(parsed.body_markdown || '').trim(),
        internal_link_ideas: Array.isArray(parsed.internal_link_ideas)
          ? parsed.internal_link_ideas.map((x) => String(x).trim()).filter(Boolean).slice(0, 4) : []
      }
    } else {
      article = mockArticle({ keyword, businessName, branch })
      used = 'mock'
    }
  }
  return {
    provider: used,
    article: { ...article, slug: slugify(article.title || keyword), language }
  }
}

module.exports = {
  generateBrandProfile,
  generateKeywords,
  generateArticle,
  // Test-Helpers:
  _slugify: slugify,
  _extractJson: extractJson,
  _mockBrandProfile: mockBrandProfile,
  _mockKeywords: mockKeywords,
  _mockArticle: mockArticle,
  _provider: provider
}
