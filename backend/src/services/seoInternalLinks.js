// Automatische interne Verlinkung (Milestone 5).
//
// Setzt im Markdown-Text Links auf andere veroeffentlichte Artikel desselben
// Kunden – jeweils das ERSTE Vorkommen eines Keywords, das noch nicht Teil
// eines Links ist und nicht in einer Ueberschrift steht. Rein funktional und
// damit gut testbar.

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// links: Array<{ keyword, url }>. maxLinks begrenzt die Gesamtzahl.
function injectInternalLinks(markdown, links, maxLinks = 3) {
  let text = String(markdown || '')
  if (!Array.isArray(links) || !links.length) return text

  // Laengere Keywords zuerst (spezifischere Treffer bevorzugen).
  const sorted = [...links]
    .filter((l) => l && l.keyword && l.url)
    .sort((a, b) => String(b.keyword).length - String(a.keyword).length)

  let used = 0
  for (const { keyword, url } of sorted) {
    if (used >= maxLinks) break
    const kw = String(keyword).trim()
    if (kw.length < 4) continue
    // Wortgrenzen, case-insensitive; ueberspringt Treffer in Markdown-Links
    // (negativer Lookahead auf "](") und solche direkt nach "[".
    const re = new RegExp(`(^|[^\\[])\\b(${escapeRegExp(kw)})\\b(?!\\]\\()`, 'gi')
    let linked = false
    text = text.replace(re, (match, pre, hit, offset) => {
      if (linked) return match
      // Keine Verlinkung innerhalb einer Ueberschriftszeile.
      const lineStart = text.lastIndexOf('\n', offset) + 1
      const linePrefix = text.slice(lineStart, offset + pre.length)
      if (/^\s*#{1,6}\s/.test(linePrefix)) return match
      linked = true
      return `${pre}[${hit}](${url})`
    })
    if (linked) used++
  }
  return text
}

module.exports = { injectInternalLinks, _escapeRegExp: escapeRegExp }
