import { getCurrentSession } from './authClient'

async function headers() {
  const session = await getCurrentSession()
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
  }
}

async function jsonFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(path, { ...init, headers: { ...(await headers()), ...(init.headers || {}) }, cache: 'no-store' })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok || payload?.ok === false) throw new Error(payload?.error || `Request failed ${res.status}`)
  return payload
}

export const documentEngineV2Client = {
  renderSync(input: any) {
    return jsonFetch('/api/document-engine-v2/documents/render-sync', { method: 'POST', body: JSON.stringify(input) })
  },
  enqueueDocument(input: any) {
    return jsonFetch('/api/document-engine-v2/jobs/document', { method: 'POST', body: JSON.stringify(input) })
  },
  getJob(id: string) {
    return jsonFetch(`/api/document-engine-v2/jobs/${encodeURIComponent(id)}`)
  },
  getSignedUrl(documentId: string) {
    return jsonFetch(`/api/document-engine-v2/documents/${encodeURIComponent(documentId)}/signed-url`)
  }
}
