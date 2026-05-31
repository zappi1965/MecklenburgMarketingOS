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
  if (!session?.access_token) throw new Error('Nicht angemeldet. Bitte im Backoffice neu einloggen, damit ein gültiger Supabase-Token vorliegt.')
  return { Authorization: `Bearer ${session.access_token}` }
}

async function withAuthRetry<T>(fn: () => Promise<T>): Promise<T> {
  try { return await fn() } catch (e: any) {
    if (!/UNAUTHENTICATED|INVALID_SESSION|Nicht authentifiziert|Ungültige Session/i.test(String(e?.message || ''))) throw e
    try { await supabaseAuth.auth.refreshSession() } catch {}
    return await fn()
  }
}

const base = (path: string) => `${BROWSER_BACKEND_BASE}/api/production${path}`

export const productionClient = {
  async status() {
    return withAuthRetry(async () => apiRequest(base('/status'), { headers: await authHeaders(), timeoutMs: 15000 }))
  },
  async adminLogs(params: Record<string, any> = {}) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v != null && v !== '') qs.set(k, String(v))
    return withAuthRetry(async () => apiRequest(base(`/admin-logs${qs.toString() ? `?${qs.toString()}` : ''}`), { headers: await authHeaders(), timeoutMs: 20000 }))
  },
  async apiUsage(params: Record<string, any> = {}) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v != null && v !== '') qs.set(k, String(v))
    return withAuthRetry(async () => apiRequest(base(`/api-usage${qs.toString() ? `?${qs.toString()}` : ''}`), { headers: await authHeaders(), timeoutMs: 20000 }))
  },
  async backupRuns() {
    return withAuthRetry(async () => apiRequest(base('/backup-runs'), { headers: await authHeaders(), timeoutMs: 20000 }))
  }
}
