// Externes Publishing nach Shopify (Blog-Artikel) via Admin REST API.
// Benoetigt Shop-Domain, Access-Token und Blog-ID. Ohne vollstaendige
// Zugangsdaten Mock-Modus (simulierte URL) -> kostenfrei testbar.

function hasCredentials({ shop, accessToken, blogId }) {
  return !!(shop && accessToken && blogId)
}

function normalizeShop(shop) {
  return String(shop || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')
}

async function publishPost({ shop, accessToken, blogId, title, contentHtml, status = 'published' }) {
  if (!hasCredentials({ shop, accessToken, blogId })) {
    const base = normalizeShop(shop) || 'example.myshopify.com'
    return { mocked: true, id: null, url: `https://${base}/blogs/news/mock-${Date.now()}` }
  }
  const base = normalizeShop(shop)
  const version = process.env.SHOPIFY_API_VERSION || '2024-01'
  const res = await fetch(`https://${base}/admin/api/${version}/blogs/${encodeURIComponent(blogId)}/articles.json`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-shopify-access-token': accessToken },
    body: JSON.stringify({ article: { title, body_html: contentHtml, published: status === 'published' } })
  })
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(`Shopify ${res.status}: ${t.slice(0, 200)}`) }
  const j = await res.json().catch(() => ({}))
  const art = j.article || {}
  const handle = art.handle || ''
  return { mocked: false, id: art.id || null, url: handle ? `https://${base}/blogs/news/${handle}` : `https://${base}` }
}

module.exports = { publishPost, _hasCredentials: hasCredentials, _normalizeShop: normalizeShop }
