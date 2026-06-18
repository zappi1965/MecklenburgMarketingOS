// Minimaler, XSS-sicherer Markdown -> HTML Renderer fuer den SEO-Blog.
//
// Bewusst klein gehalten und ohne externe Abhaengigkeit. Strategie:
// 1) ALLES HTML-escapen (verhindert Injection aus generierten Inhalten)
// 2) danach ein sicheres Subset an Markdown auf den escapten Text anwenden
//    (Ueberschriften, Listen, Absaetze, **fett**, *kursiv*, [text](url)).
// Da Schritt 1 zuerst laeuft, kann eingebettetes HTML niemals ausgefuehrt
// werden; nur die hier erzeugten Tags entstehen.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function inline(s: string): string {
  let out = s
  // Links: [text](http...) – nur http/https zulassen.
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, text, url) =>
    `<a href="${url}" rel="nofollow noopener" target="_blank">${text}</a>`)
  // **fett**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // *kursiv*
  out = out.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')
  return out
}

export function markdownToHtml(markdown: string): string {
  const escaped = escapeHtml(String(markdown || ''))
  const lines = escaped.split(/\r?\n/)
  const html: string[] = []
  let para: string[] = []
  let list: string[] = []

  const flushPara = () => {
    if (para.length) { html.push(`<p>${inline(para.join(' ').trim())}</p>`); para = [] }
  }
  const flushList = () => {
    if (list.length) { html.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join('')}</ul>`); list = [] }
  }

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
