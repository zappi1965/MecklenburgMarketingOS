// Generischer CRUD-Client gegen /api/store.
// Ersetzt direkte Supabase-Anon-Calls aus dem Monolithen (useStore).
// Backend prueft Admin/Customer-Scope pro Tabelle.

import { BROWSER_BACKEND_BASE } from './backendUrl'
import { apiRequest } from './apiRequest'
import { getCurrentSession } from './authClient'

async function authHeaders(): Promise<Record<string, string>> {
  const session = await getCurrentSession()
  if (!session?.access_token) throw new Error('Nicht angemeldet.')
  return { Authorization: `Bearer ${session.access_token}` }
}

type ListQuery = {
  customer_id?: string
  limit?: number
  order_by?: string
  order_dir?: 'asc' | 'desc'
}

export const storeClient = {
  async meta() {
    const headers = await authHeaders()
    return apiRequest<{ ok: boolean; tables: Record<string, { scope: string }>; count: number }>(
      `${BROWSER_BACKEND_BASE}/api/store/_meta`,
      { headers, timeoutMs: 15000 }
    )
  },

  async list<T = any>(table: string, query: ListQuery = {}) {
    const headers = await authHeaders()
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) if (v != null) qs.set(k, String(v))
    const url = `${BROWSER_BACKEND_BASE}/api/store/${encodeURIComponent(table)}${qs.toString() ? `?${qs.toString()}` : ''}`
    return apiRequest<{ ok: boolean; data: T[]; count: number }>(url, { headers, timeoutMs: 20000 })
  },

  async get<T = any>(table: string, id: string) {
    const headers = await authHeaders()
    return apiRequest<{ ok: boolean; data: T }>(`${BROWSER_BACKEND_BASE}/api/store/${encodeURIComponent(table)}/${encodeURIComponent(id)}`, {
      headers,
      timeoutMs: 15000
    })
  },

  async create<T = any>(table: string, row: any) {
    const headers = await authHeaders()
    return apiRequest<{ ok: boolean; data: T }>(`${BROWSER_BACKEND_BASE}/api/store/${encodeURIComponent(table)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(row),
      timeoutMs: 20000
    })
  },

  async update<T = any>(table: string, id: string, row: any) {
    const headers = await authHeaders()
    return apiRequest<{ ok: boolean; data: T }>(`${BROWSER_BACKEND_BASE}/api/store/${encodeURIComponent(table)}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(row),
      timeoutMs: 20000
    })
  },

  async remove(table: string, id: string) {
    const headers = await authHeaders()
    return apiRequest<{ ok: boolean }>(`${BROWSER_BACKEND_BASE}/api/store/${encodeURIComponent(table)}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
      timeoutMs: 15000
    })
  }
}
