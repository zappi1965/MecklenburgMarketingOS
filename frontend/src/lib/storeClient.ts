// Generischer CRUD-Client gegen /api/store.
// Ersetzt direkte Supabase-Anon-Calls aus dem Monolithen.
// Backend prüft Admin/Customer-Scope pro Tabelle.

import { BROWSER_BACKEND_BASE } from './backendUrl'
import { apiRequest } from './apiRequest'
import { getCurrentSession, supabaseAuth } from './authClient'

async function authHeaders(): Promise<Record<string, string>> {
  let session = await getCurrentSession()

  if (!session?.access_token) {
    try {
      const refreshed = await supabaseAuth.auth.refreshSession()
      session = refreshed.data.session as any
    } catch {}
  }

  if (!session?.access_token) {
    throw new Error('Nicht authentifiziert: Bitte neu einloggen, damit Live-Daten aus Supabase geladen und gespeichert werden können.')
  }

  return { Authorization: `Bearer ${session.access_token}` }
}

async function withAuthRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (e: any) {
    const message = String(e?.message || '')
    if (!/UNAUTHENTICATED|INVALID_SESSION|Nicht authentifiziert|Ungültige Session/i.test(message)) {
      throw e
    }

    try {
      await supabaseAuth.auth.refreshSession()
    } catch {}

    return await fn()
  }
}

export async function ensureStoreBackendAuthenticated() {
  const headers = await authHeaders()
  return headers.Authorization
}

type ListQuery = {
  customer_id?: string
  limit?: number
  order_by?: string
  order_dir?: 'asc' | 'desc'
}

export const storeClient = {
  async meta() {
    return withAuthRetry(async () => {
      const headers = await authHeaders()
      return apiRequest<{ ok: boolean; tables: Record<string, { scope: string }>; count: number }>(
        `${BROWSER_BACKEND_BASE}/api/store/_meta`,
        { headers, timeoutMs: 15000 }
      )
    })
  },

  async list<T = any>(table: string, query: ListQuery = {}) {
    return withAuthRetry(async () => {
      const headers = await authHeaders()
      const qs = new URLSearchParams()

      for (const [k, v] of Object.entries(query)) {
        if (v != null) qs.set(k, String(v))
      }

      const url = `${BROWSER_BACKEND_BASE}/api/store/${encodeURIComponent(table)}${qs.toString() ? `?${qs.toString()}` : ''}`

      return apiRequest<{ ok: boolean; data: T[]; count: number }>(
        url,
        { headers, timeoutMs: 20000 }
      )
    })
  },

  async get<T = any>(table: string, id: string) {
    return withAuthRetry(async () => {
      const headers = await authHeaders()

      return apiRequest<{ ok: boolean; data: T }>(
        `${BROWSER_BACKEND_BASE}/api/store/${encodeURIComponent(table)}/${encodeURIComponent(id)}`,
        { headers, timeoutMs: 15000 }
      )
    })
  },

  async create<T = any>(table: string, row: any) {
    return withAuthRetry(async () => {
      const headers = await authHeaders()

      return apiRequest<{ ok: boolean; data: T }>(
        `${BROWSER_BACKEND_BASE}/api/store/${encodeURIComponent(table)}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(row),
          timeoutMs: 20000
        }
      )
    })
  },

  async update<T = any>(table: string, id: string, row: any) {
    return withAuthRetry(async () => {
      const headers = await authHeaders()

      return apiRequest<{ ok: boolean; data: T }>(
        `${BROWSER_BACKEND_BASE}/api/store/${encodeURIComponent(table)}/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify(row),
          timeoutMs: 20000
        }
      )
    })
  },

  async remove(table: string, id: string) {
    return withAuthRetry(async () => {
      const headers = await authHeaders()

      return apiRequest<{ ok: boolean }>(
        `${BROWSER_BACKEND_BASE}/api/store/${encodeURIComponent(table)}/${encodeURIComponent(id)}`,
        {
          method: 'DELETE',
          headers,
          timeoutMs: 15000
        }
      )
    })
  }
}
