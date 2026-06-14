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

async function publishPost({ wpUrl, wpUser, wpAppPassword, title, contentHtml, status = 'publish' }) {
  if (!hasCredentials({ wpUrl, wpUser, wpAppPassword })) {
    const base = normalizeBase(wpUrl) || 'https://example.invalid'
    return { mocked: true, id: null, url: `${base}/?p=mock-${Date.now()}` }
  }
  const base = normalizeBase(wpUrl)
  const auth = Buffer.from(`${wpUser}:${wpAppPassword}`).toString('base64')
  const res = await fetch(`${base}/wp-json/wp/v2/posts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Basic ${auth}` },
    body: JSON.stringify({ title, content: contentHtml, status })
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`WordPress ${res.status}: ${t.slice(0, 200)}`)
  }
  const j = await res.json().catch(() => ({}))
  return { mocked: false, id: j.id || null, url: j.link || `${base}/?p=${j.id || ''}` }
}

module.exports = { publishPost, _hasCredentials: hasCredentials, _normalizeBase: normalizeBase }
