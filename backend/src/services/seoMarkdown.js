// Serverseitiger, XSS-sicherer Markdown -> HTML Renderer (Spiegel von
// frontend/src/lib/miniMarkdown.ts). Wird fuer externes Publishing (z. B.
// WordPress) benoetigt, wo HTML statt Markdown erwartet wird.
// Strategie: erst ALLES HTML-escapen, dann ein sicheres Subset anwenden.

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function inline(s) {
  let out = s
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, t, u) => `<a href="${u}" rel="nofollow noopener">${t}</a>`)
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')
  return out
}

function markdownToHtml(markdown) {
  const escaped = escapeHtml(markdown)
  const lines = escaped.split(/\r?\n/)
  const html = []
  let para = []
  let list = []
  const flushPara = () => { if (para.length) { html.push(`<p>${inline(para.join(' ').trim())}</p>`); para = [] } }
  const flushList = () => { if (list.length) { html.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join('')}</ul>`); list = [] } }
  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) { flushPara(); flushList(); continue }
    let m
    if ((m = line.match(/^###\s+(.*)$/))) { flushPara(); flushList(); html.push(`<h3>${inline(m[1])}</h3>`); continue }
    if ((m = line.match(/^##\s+(.*)$/))) { flushPara(); flushList(); html.push(`<h2>${inline(m[1])}</h2>`); continue }
    if ((m = line.match(/^#\s+(.*)$/))) { flushPara(); flushList(); html.push(`<h2>${inline(m[1])}</h2>`); continue }
    if ((m = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/))) { flushPara(); list.push(m[1]); continue }
    para.push(line.trim())
  }
  flushPara(); flushList()
  return html.join('\n')
}

module.exports = { markdownToHtml, _escapeHtml: escapeHtml }
