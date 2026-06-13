import { BROWSER_BACKEND_BASE } from './backendUrl'
import { apiRequest } from './apiRequest'
import { getCurrentSession } from './authClient'

async function authHeaders(): Promise<Record<string, string>> {
  const session = await getCurrentSession()
  if (!session?.access_token) throw new Error('Nicht angemeldet.')
  return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
}

export type DealCampaign = {
  id: string
  customer_id: string
  slug: string
  title: string
  subtitle?: string | null
  body?: string | null
  discount_label?: string | null
  image_url?: string | null
  cta_label?: string | null
  cta_url?: string | null
  starts_at?: string | null
  expires_at?: string | null
  status: 'draft' | 'active' | 'expired' | 'archived'
  effective_status?: string
  view_count?: number
  share_count?: number
}

const base = (cid: string) => `${BROWSER_BACKEND_BASE}/api/deals/${encodeURIComponent(cid)}`

export const dealClient = {
  async list(customerId: string) {
    const headers = await authHeaders()
    return apiRequest<{ ok: boolean; deals: DealCampaign[] }>(base(customerId), { headers, timeoutMs: 20000 })
  },
  async create(customerId: string, payload: Partial<DealCampaign>) {
    const headers = await authHeaders()
    return apiRequest<{ ok: boolean; deal: DealCampaign }>(base(customerId), { method: 'POST', headers, body: JSON.stringify(payload), timeoutMs: 20000 })
  },
  async update(customerId: string, id: string, payload: Partial<DealCampaign>) {
    const headers = await authHeaders()
    return apiRequest<{ ok: boolean; deal: DealCampaign }>(`${base(customerId)}/${encodeURIComponent(id)}`, { method: 'PUT', headers, body: JSON.stringify(payload), timeoutMs: 20000 })
  },
  async setStatus(customerId: string, id: string, status: string) {
    const headers = await authHeaders()
    return apiRequest<{ ok: boolean; deal: DealCampaign }>(`${base(customerId)}/${encodeURIComponent(id)}/status`, { method: 'POST', headers, body: JSON.stringify({ status }), timeoutMs: 20000 })
  },
  async remove(customerId: string, id: string) {
    const headers = await authHeaders()
    return apiRequest<{ ok: boolean }>(`${base(customerId)}/${encodeURIComponent(id)}`, { method: 'DELETE', headers, timeoutMs: 20000 })
  }
}
