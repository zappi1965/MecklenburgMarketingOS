import { API_BASE } from './config'
import { apiRequest } from './apiRequest'
import { getCurrentSession } from './authClient'

async function authHeaders(): Promise<Record<string, string>> {
  const session = await getCurrentSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

export const businessToolsClient = {
  async health() {
    return apiRequest(`${API_BASE}/api/business-tools/health`, { headers: await authHeaders(), timeoutMs: 12000 })
  },
  async googleBusinessAudit(payload: any) {
    return apiRequest(`${API_BASE}/api/business-tools/google-business-audit`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload),
      timeoutMs: 20000
    })
  },
  async leadSearch(payload: any) {
    return apiRequest(`${API_BASE}/api/business-tools/lead-search`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload),
      timeoutMs: 25000
    })
  },
  async renderPdf(payload: { html: string; filename?: string; title?: string }) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45000)
    try {
      const res = await fetch(`${API_BASE}/api/business-tools/render-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify(payload),
        signal: controller.signal,
        cache: 'no-store'
      })
      const contentType = res.headers.get('content-type') || ''
      if (!res.ok) {
        let error = `${res.status} ${res.statusText}`
        if (contentType.includes('application/json')) {
          const json = await res.json().catch(() => null)
          error = json?.error || json?.message || error
        } else {
          error = await res.text().catch(() => error)
        }
        throw new Error(error)
      }
      return await res.blob()
    } finally {
      clearTimeout(timeout)
    }
  }
}
