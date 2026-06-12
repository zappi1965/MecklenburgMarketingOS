import { BROWSER_BACKEND_BASE } from './backendUrl'
import { apiRequest } from './apiRequest'
import { getCurrentSession } from './authClient'

async function authHeaders(): Promise<Record<string, string>> {
  const session = await getCurrentSession()
  if (!session?.access_token) throw new Error('Nicht angemeldet.')
  return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
}

export type MiniWebsite = {
  id: string
  customer_id: string
  slug: string
  enabled: boolean
  brand: { name?: string; logo_url?: string; primary_color?: string }
  hero: { headline?: string; subline?: string; image_url?: string }
  hours: Array<{ day?: string; open?: string; close?: string }>
  services: Array<{ name?: string; price?: string; note?: string }>
  cta: { label?: string; url?: string; phone?: string }
  show_reviews: boolean
  google_place_id?: string | null
  booster_state?: any
}

const base = (cid: string) => `${BROWSER_BACKEND_BASE}/api/mini-website/${encodeURIComponent(cid)}`

export const miniWebsiteClient = {
  async get(customerId: string) {
    const headers = await authHeaders()
    return apiRequest<{ ok: boolean; site: MiniWebsite }>(base(customerId), { headers, timeoutMs: 20000 })
  },
  async save(customerId: string, payload: Partial<MiniWebsite>) {
    const headers = await authHeaders()
    return apiRequest<{ ok: boolean; site: MiniWebsite }>(base(customerId), { method: 'PUT', headers, body: JSON.stringify(payload), timeoutMs: 20000 })
  },
  async saveBooster(customerId: string, audit: any) {
    const headers = await authHeaders()
    return apiRequest<{ ok: boolean; site: MiniWebsite }>(`${base(customerId)}/booster`, { method: 'POST', headers, body: JSON.stringify({ audit }), timeoutMs: 20000 })
  },
  // Ruft die bestehende, kostengeschützte Google-Mini-Audit-Route auf.
  async runGoogleAudit(query: string) {
    return apiRequest<{ ok: boolean; audit: any; googleData: any }>(`/api/mini-audit/google-place`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      timeoutMs: 25000
    })
  }
}
