// Performance-Kennzahlen je veroeffentlichtem Artikel.
//   - 'gsc'  → Google Search Console (sofern angebunden)
//   - 'mock' → deterministische, plausible Werte (ohne Anbindung)
// Standardmaessig Mock, damit Auswertungen ohne externe Anbindung testbar sind.

const crypto = require('crypto')

function provider() {
  const p = String(process.env.SEO_METRICS_PROVIDER || 'mock').toLowerCase()
  return p === 'gsc' ? 'gsc' : 'mock'
}

// Deterministische Kennzahlen aus Artikel-ID und Alter (Tage seit Publish).
function mockMetrics(articleId, publishedAt) {
  const h = crypto.createHash('sha256').update(String(articleId)).digest()
  const days = publishedAt ? Math.max(0, Math.floor((Date.now() - new Date(publishedAt).getTime()) / 86400000)) : 0
  // Impressionen wachsen mit dem Alter (Ramp-up), begrenzt.
  const ramp = Math.min(1, days / 30)
  const impressions = Math.round((40 + (h[0] % 160)) * (0.3 + ramp))
  const ctr = ((h[1] % 60) / 1000 + 0.01) // 1%–7%
  const clicks = Math.round(impressions * ctr)
  const position = Math.round((4 + (h[2] % 30) - ramp * 6) * 10) / 10 // verbessert sich mit Alter
  return { impressions, clicks, position: Math.max(1, position), ctr: Math.round(ctr * 10000) / 10000, source: 'mock' }
}

// Liefert Tageskennzahlen fuer einen Artikel. GSC-Anbindung ist optional;
// faellt bei Fehlen/Fehler auf Mock zurueck.
async function fetchMetrics(article) {
  if (provider() === 'gsc') {
    try {
      // Platzhalter fuer echte GSC-Abfrage (benoetigt OAuth + Property-Mapping).
      // Bis zur Anbindung: Mock, damit der Flow funktioniert.
      return mockMetrics(article.id, article.published_at)
    } catch (_) { /* fallthrough */ }
  }
  return mockMetrics(article.id, article.published_at)
}

module.exports = { fetchMetrics, _mockMetrics: mockMetrics, _provider: provider }
