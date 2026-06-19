// KI-Titelbild-Generator fuer SEO-Artikel (Milestone 4).
//
// Provider:
//   - 'openai' → OpenAI Images API (DALL·E), liefert gehostete URL
//   - 'mock'   → gebrandetes SVG-Platzhalterbild als data:-URI (ohne Key)
// Ohne OPENAI_API_KEY automatisch Mock -> kostenfrei testbar.

function provider() {
  const p = String(process.env.AI_IMAGE_PROVIDER || 'openai').toLowerCase()
  if (p === 'openai' && process.env.OPENAI_API_KEY) return 'openai'
  return 'mock'
}

function escapeXml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Bricht einen Titel in bis zu 3 Zeilen fuer das Platzhalterbild um.
function wrap(title, perLine = 22, maxLines = 3) {
  const words = String(title || 'Beitrag').trim().split(/\s+/)
  const lines = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > perLine) { if (cur) lines.push(cur); cur = w } else { cur = (cur + ' ' + w).trim() }
    if (lines.length >= maxLines) break
  }
  if (cur && lines.length < maxLines) lines.push(cur)
  return lines.slice(0, maxLines)
}

function mockCover(title) {
  const lines = wrap(title)
  const tspans = lines.map((l, i) =>
    `<tspan x="60" dy="${i === 0 ? 0 : 64}">${escapeXml(l)}</tspan>`).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#5d5dfc"/><stop offset="1" stop-color="#c084fc"/></linearGradient></defs>
<rect width="1200" height="630" fill="#0b0b16"/>
<rect width="1200" height="630" fill="url(#g)" opacity="0.22"/>
<circle cx="1040" cy="120" r="220" fill="#8b5cf6" opacity="0.18"/>
<text x="60" y="300" fill="#ffffff" font-family="Arial, sans-serif" font-size="56" font-weight="800">${tspans}</text>
<text x="60" y="560" fill="#cbbaff" font-family="Arial, sans-serif" font-size="26" font-weight="600">MecklenburgMarketing · Blog</text>
</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\n\s*/g, ' '))}`
}

async function openaiImage({ prompt }) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3', prompt, n: 1, size: '1792x1024' })
  })
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(`OpenAI Images ${res.status}: ${t.slice(0, 200)}`) }
  const j = await res.json()
  return j?.data?.[0]?.url || ''
}

async function generateCoverImage({ title, branch, businessName }) {
  const p = provider()
  if (p === 'openai') {
    const prompt = `Modernes, professionelles Titelbild fuer einen Blogartikel mit dem Titel "${title}" `
      + `fuer einen lokalen Betrieb${branch ? ` (Branche: ${branch})` : ''}. Clean, hochwertig, ohne Text.`
    try {
      const url = await openaiImage({ prompt })
      if (url) return { provider: 'openai', url }
    } catch (_) { /* faellt auf mock zurueck */ }
  }
  return { provider: 'mock', url: mockCover(title) }
}

module.exports = { generateCoverImage, _mockCover: mockCover, _wrap: wrap, _provider: provider }
