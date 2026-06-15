// Keyword-Kennzahlen (Suchvolumen, Difficulty, CPC) – provider-agnostisch.
//   - 'dataforseo' → DataForSEO Labs API (Basic Auth)
//   - 'mock'       → deterministische Schaetzwerte aus dem Keyword (ohne Keys)
// Ohne DATAFORSEO_LOGIN/PASSWORD automatisch Mock -> kostenfrei testbar.

const crypto = require('crypto')

function provider() {
  const p = String(process.env.SEO_KEYWORD_PROVIDER || 'dataforseo').toLowerCase()
  if (p === 'dataforseo' && process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD) return 'dataforseo'
  return 'mock'
}

// Deterministische, plausible Kennzahlen aus dem Keyword ableiten.
function mockMetrics(keyword) {
  const h = crypto.createHash('sha256').update(String(keyword).toLowerCase()).digest()
  const n = (i) => h[i]
  const words = String(keyword).trim().split(/\s+/).length
  // Laengere/spezifischere Keywords -> tendenziell weniger Volumen.
  const base = 2200 - words * 350
  const search_volume = Math.max(10, base + (n(0) % 1200) - 300)
  const difficulty = Math.min(95, 8 + (n(1) % 80))
  const cpc = Math.round(((n(2) % 380) / 100 + 0.2) * 100) / 100
  return { search_volume, difficulty, cpc }
}

async function dataforseoMetrics(keywords, locationName = 'Germany', languageName = 'German') {
  const login = process.env.DATAFORSEO_LOGIN
  const password = process.env.DATAFORSEO_PASSWORD
  const auth = Buffer.from(`${login}:${password}`).toString('base64')
  const res = await fetch('https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Basic ${auth}` },
    body: JSON.stringify([{ keywords: keywords.map((k) => k.keyword), location_name: locationName, language_name: languageName }])
  })
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(`DataForSEO ${res.status}: ${t.slice(0, 200)}`) }
  const json = await res.json()
  const items = json?.tasks?.[0]?.result || []
  const byKw = new Map(items.map((it) => [String(it.keyword || '').toLowerCase(), it]))
  return keywords.map((k) => {
    const it = byKw.get(String(k.keyword).toLowerCase())
    if (!it) return { ...k, ...mockMetrics(k.keyword), data_provider: 'mock' }
    return {
      ...k,
      search_volume: Number(it.search_volume) || 0,
      difficulty: Number(it.competition_index) || 0,
      cpc: Math.round((Number(it.cpc) || 0) * 100) / 100,
      data_provider: 'dataforseo'
    }
  })
}

// Reichert eine Keyword-Liste [{keyword, intent, priority}] um Kennzahlen an.
async function enrichKeywords(keywords, opts = {}) {
  const list = Array.isArray(keywords) ? keywords : []
  if (!list.length) return { provider: 'mock', keywords: [] }
  const p = provider()
  if (p === 'dataforseo') {
    try {
      const enriched = await dataforseoMetrics(list, opts.locationName, opts.languageName)
      return { provider: 'dataforseo', keywords: enriched }
    } catch (_) { /* faellt auf mock zurueck */ }
  }
  return {
    provider: 'mock',
    keywords: list.map((k) => ({ ...k, ...mockMetrics(k.keyword), data_provider: 'mock' }))
  }
}

module.exports = { enrichKeywords, _mockMetrics: mockMetrics, _provider: provider }
