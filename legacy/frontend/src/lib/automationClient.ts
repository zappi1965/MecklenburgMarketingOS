import { BROWSER_BACKEND_BASE } from './backendUrl'
import { apiRequest } from './apiRequest'
import { getCurrentSession } from './authClient'

export type AutomationRule = {
  id: string | null
  name: string
  trigger_type: string
  conditions: Record<string, any>
  actions: Array<{ type: string; [k: string]: any }>
  enabled: boolean
  source?: 'database' | 'default'
  created_at?: string | null
}

export type AutomationRunResult = {
  startedAt: string
  finishedAt: string
  runs: Record<string, { rule?: string; processed?: number; skipped?: boolean; reason?: string; error?: string; results?: any[] }>
}

async function authHeaders(): Promise<Record<string, string>> {
  const session = await getCurrentSession()
  if (!session?.access_token) throw new Error('Nicht angemeldet.')
  return { Authorization: `Bearer ${session.access_token}` }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = { ...(init.headers || {}), ...(await authHeaders()) }
  return apiRequest<T>(`${BROWSER_BACKEND_BASE}/api/automations${path}`, {
    ...init,
    headers,
    timeoutMs: 30000
  })
}

export const automationClient = {
  listRules: () => call<{ ok: boolean; rules: AutomationRule[] }>('/rules'),
  toggleRule: (name: string, enabled?: boolean) =>
    call<{ ok: boolean; rule: Pick<AutomationRule, 'id' | 'name' | 'enabled'> }>(
      `/rules/${encodeURIComponent(name)}/toggle`,
      {
        method: 'POST',
        body: JSON.stringify(typeof enabled === 'boolean' ? { enabled } : {})
      }
    ),
  runNow: () =>
    call<{ ok: boolean; result: AutomationRunResult }>('/run-now', { method: 'POST' })
}
