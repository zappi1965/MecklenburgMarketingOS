// Externes Publishing nach WordPress via REST API (Milestone 4).
//
// Nutzt Application Passwords (Basic Auth). Ohne vollstaendige Zugangsdaten
// laeuft der Service im Mock-Modus und liefert eine simulierte URL zurueck,
// damit die komplette Pipeline ohne echte WP-Instanz testbar bleibt.

function hasCredentials({ wpUrl, wpUser, wpAppPassword }) {
  return !!(wpUrl && wpUser && wpAppPassword)
}

function normalizeBase(wpUrl) {
  return String(wpUrl || '').trim().replace(/\/+$/, '')
}

// Laedt ein Bild von einer http(s)-URL in die WP-Mediathek (Milestone 5).
// data:-URIs (Mock-Platzhalter) werden uebersprungen. Liefert media-id oder null.
async function uploadMedia({ wpUrl, wpUser, wpAppPassword, imageUrl, filename = 'cover.jpg' }) {
  if (!hasCredentials({ wpUrl, wpUser, wpAppPassword })) return null
  if (!imageUrl || !/^https?:\/\//i.test(String(imageUrl))) return null // Mock/data-URI -> skip
  try {
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) return null
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
    const buf = Buffer.from(await imgRes.arrayBuffer())
    const base = normalizeBase(wpUrl)
    const auth = Buffer.from(`${wpUser}:${wpAppPassword}`).toString('base64')
    const res = await fetch(`${base}/wp-json/wp/v2/media`, {
      method: 'POST',
      headers: {
        authorization: `Basic ${auth}`,
        'content-type': contentType,
        'content-disposition': `attachment; filename="${filename}"`
      },
      body: buf
    })
    if (!res.ok) return null
    const j = await res.json().catch(() => ({}))
    return j.id || null
  } catch (_) {
    return null
  }
}

async function publishPost({ wpUrl, wpUser, wpAppPassword, title, contentHtml, status = 'publish', featuredImageUrl }) {
  if (!hasCredentials({ wpUrl, wpUser, wpAppPassword })) {
    const base = normalizeBase(wpUrl) || 'https://example.invalid'
    return { mocked: true, id: null, url: `${base}/?p=mock-${Date.now()}`, featured_media: null }
  }
  const base = normalizeBase(wpUrl)
  const auth = Buffer.from(`${wpUser}:${wpAppPassword}`).toString('base64')

  let featured_media = null
  if (featuredImageUrl) {
    featured_media = await uploadMedia({ wpUrl, wpUser, wpAppPassword, imageUrl: featuredImageUrl })
  }

  const body = { title, content: contentHtml, status }
  if (featured_media) body.featured_media = featured_media

  const res = await fetch(`${base}/wp-json/wp/v2/posts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Basic ${auth}` },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`WordPress ${res.status}: ${t.slice(0, 200)}`)
  }
  const j = await res.json().catch(() => ({}))
  return { mocked: false, id: j.id || null, url: j.link || `${base}/?p=${j.id || ''}`, featured_media }
}

module.exports = { publishPost, uploadMedia, _hasCredentials: hasCredentials, _normalizeBase: normalizeBase }
