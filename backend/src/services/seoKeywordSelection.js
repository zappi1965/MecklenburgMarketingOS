// Performance-gesteuerte Keyword-Auswahl (Autopilot 2.0). Reine Funktionen,
// damit gut testbar. Bewertet Keywords nach Prioritaet, Suchvolumen,
// (geringer) Difficulty und thematischer Naehe zu bereits gut performenden
// Artikeln ("deepen strong topics").

const STOPWORDS = new Set(['und', 'oder', 'der', 'die', 'das', 'fuer', 'für', 'mit', 'von', 'ein', 'eine', 'den', 'dem', 'bei', 'aus', 'auf', 'zum', 'zur'])

function tokenize(s) {
  return String(s || '').toLowerCase()
    .split(/[^a-z0-9äöüß]+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w))
}

// Aus gut performenden Artikeln ein Gewicht je Wort ableiten.
// perfRows: Array<{ keyword, clicks }>
function performanceSignal(perfRows) {
  const counts = new Map()
  for (const r of perfRows || []) {
    const weight = (Number(r.clicks) || 0) + 1
    for (const w of tokenize(r.keyword)) counts.set(w, (counts.get(w) || 0) + weight)
  }
  return counts
}

function scoreKeyword(k, signal) {
  const vol = Number(k.search_volume) || 0
  const diff = k.difficulty != null ? Number(k.difficulty) : 50
  const prio = Number(k.priority) || 3
  const volScore = Math.min(1, vol / 1500) * 3
  const diffScore = (1 - Math.min(100, Math.max(0, diff)) / 100) * 2
  let theme = 0
  if (signal && signal.size) {
    for (const w of tokenize(k.keyword)) if (signal.has(w)) theme += Math.min(3, signal.get(w))
  }
  const themeScore = Math.min(4, theme * 0.5)
  return prio + volScore + diffScore + themeScore
}

// Waehlt das beste noch nicht genutzte Keyword (hoechster Score).
function pickBest(keywords, usedSet, signal) {
  const used = usedSet instanceof Set ? usedSet : new Set(usedSet || [])
  const fresh = (keywords || []).filter((k) => k && k.keyword && !used.has(String(k.keyword).toLowerCase()))
  if (!fresh.length) return null
  let best = null
  let bestScore = -Infinity
  for (const k of fresh) {
    const s = scoreKeyword(k, signal)
    if (s > bestScore) { bestScore = s; best = k }
  }
  return best
}

module.exports = { pickBest, scoreKeyword, performanceSignal, _tokenize: tokenize }
