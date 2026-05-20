import { API_BASE } from './config'
import { apiRequest } from './apiRequest'

export const businessToolsClient = {
  health() {
    return apiRequest(`${API_BASE}/api/business-tools/health`, { timeoutMs: 12000 })
  },
  googleBusinessAudit(payload: any) {
    return apiRequest(`${API_BASE}/api/business-tools/google-business-audit`, {
      method: 'POST',
      body: JSON.stringify(payload),
      timeoutMs: 20000
    })
  },
  leadSearch(payload: any) {
    return apiRequest(`${API_BASE}/api/business-tools/lead-search`, {
      method: 'POST',
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
        headers: { 'Content-Type': 'application/json' },
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
