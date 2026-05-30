import { BROWSER_BACKEND_BASE } from './backendUrl'
import { apiRequest } from './apiRequest'
import { getCurrentSession } from './authClient'

async function authHeaders(): Promise<Record<string, string>> {
  const session = await getCurrentSession()
  if (!session?.access_token) throw new Error('Nicht angemeldet.')
  return { Authorization: `Bearer ${session.access_token}` }
}

const base = (path: string) => `${BROWSER_BACKEND_BASE}/api/production${path}`

export const productionClient = {
  async status() {
    return apiRequest(base('/status'), { headers: await authHeaders(), timeoutMs: 15000 })
  },
  async adminLogs(params: Record<string, any> = {}) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v != null && v !== '') qs.set(k, String(v))
    return apiRequest(base(`/admin-logs${qs.toString() ? `?${qs.toString()}` : ''}`), { headers: await authHeaders(), timeoutMs: 20000 })
  },
  async apiUsage(params: Record<string, any> = {}) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v != null && v !== '') qs.set(k, String(v))
    return apiRequest(base(`/api-usage${qs.toString() ? `?${qs.toString()}` : ''}`), { headers: await authHeaders(), timeoutMs: 20000 })
  },
  async backupRuns() {
    return apiRequest(base('/backup-runs'), { headers: await authHeaders(), timeoutMs: 20000 })
  }
}
