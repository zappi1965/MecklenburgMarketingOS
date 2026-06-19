// Externes Publishing nach Webflow CMS (API v2). Benoetigt API-Token und
// Collection-ID; das Feld fuer den Inhalt ist je Collection unterschiedlich
// und wird ueber bodyField konfiguriert (Default 'post-body'). Ohne
// vollstaendige Zugangsdaten Mock-Modus (simulierte URL).

function hasCredentials({ apiToken, collectionId }) {
  return !!(apiToken && collectionId)
}

function slugify(s) {
  return String(s || '').toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
}

async function publishPost({ apiToken, collectionId, siteUrl, title, contentHtml, slug, bodyField = 'post-body' }) {
  const itemSlug = slug || slugify(title)
  if (!hasCredentials({ apiToken, collectionId })) {
    const base = String(siteUrl || 'https://example.webflow.io').replace(/\/+$/, '')
    return { mocked: true, id: null, url: `${base}/post/${itemSlug}` }
  }
  const fieldData = { name: title, slug: itemSlug }
  fieldData[bodyField] = contentHtml
  const res = await fetch(`https://api.webflow.com/v2/collections/${encodeURIComponent(collectionId)}/items/live`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiToken}`, 'accept-version': '2.0.0' },
    body: JSON.stringify({ isArchived: false, isDraft: false, fieldData })
  })
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(`Webflow ${res.status}: ${t.slice(0, 200)}`) }
  const j = await res.json().catch(() => ({}))
  const base = String(siteUrl || '').replace(/\/+$/, '')
  return { mocked: false, id: j.id || null, url: base ? `${base}/post/${itemSlug}` : '' }
}

module.exports = { publishPost, _hasCredentials: hasCredentials, _slugify: slugify }
