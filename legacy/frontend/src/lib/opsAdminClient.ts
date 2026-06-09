import { BROWSER_BACKEND_BASE } from './backendUrl'
import { apiRequest } from './apiRequest'
import { getCurrentSession } from './authClient'

async function authHeaders(): Promise<Record<string, string>> {
  const session = await getCurrentSession()
  if (!session?.access_token) throw new Error('Nicht angemeldet.')
  return { Authorization: `Bearer ${session.access_token}` }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = { ...(init.headers || {}), ...(await authHeaders()) }
  return apiRequest<T>(`${BROWSER_BACKEND_BASE}/api/ops-admin${path}`, {
    ...init,
    headers,
    timeoutMs: 30000
  })
}

export type HealthSummary = {
  customers_total: number
  green: number
  yellow: number
  red: number
  tickets_open_total: number
  tickets_stale_total: number
  dunning_escalated_total: number
  worker_fails_24h: number
}

export type HealthCustomer = {
  customer: { id: string; name: string; package_name?: string }
  status: 'green' | 'yellow' | 'red'
  tickets_open: number
  tickets_stale: number
  qr_campaigns: number
  qr_inactive: number
  loyalty_members: number
  loyalty_new_recent: number
  dunning_escalated: number
  risk_score: number | null
  warnings: Array<{ key: string; text: string; count?: number }>
  criticals: Array<{ key: string; text: string; count?: number }>
}

export type HealthSnapshot = {
  generated_at: string
  summary: HealthSummary
  customers: HealthCustomer[]
  worker_fails: Array<{ id: string; job_name: string; status: string; finished_at: string; message?: string }>
}

export type MaintenanceAlert = {
  id: string
  customer_id: string
  category: string
  severity: 'info' | 'warning' | 'critical'
  rule_key: string
  title: string
  description?: string
  fix_url?: string
  fix_action?: string
  detected_at: string
}

export type OnboardingAudit = {
  id: string
  customer_id: string
  status: 'pending' | 'running' | 'done' | 'failed'
  score?: number
  findings: Array<{ severity: string; title: string; detail: string }>
  checks: Record<string, any>
  target_url?: string
  created_at: string
  finished_at?: string
}

export const opsAdminClient = {
  healthSnapshot: () => call<{ ok: boolean; snapshot: HealthSnapshot }>('/health-snapshot'),
  listAlerts: (filter: { customer_id?: string; severity?: string } = {}) => {
    const qs = new URLSearchParams()
    if (filter.customer_id) qs.set('customer_id', filter.customer_id)
    if (filter.severity) qs.set('severity', filter.severity)
    return call<{ ok: boolean; alerts: MaintenanceAlert[] }>(`/maintenance-alerts${qs.toString() ? `?${qs}` : ''}`)
  },
  runMaintenanceChecks: () =>
    call<{ ok: boolean; result: any }>('/maintenance-alerts/run', { method: 'POST' }),
  dismissAlert: (id: string) =>
    call<{ ok: boolean }>(`/maintenance-alerts/${encodeURIComponent(id)}/dismiss`, { method: 'POST' }),

  startAudit: (customer_id: string, target_url?: string) =>
    call<{ ok: boolean; audit: OnboardingAudit }>('/audits/start', {
      method: 'POST',
      body: JSON.stringify({ customer_id, target_url })
    }),
  listAudits: (customer_id?: string) => {
    const qs = customer_id ? `?customer_id=${encodeURIComponent(customer_id)}` : ''
    return call<{ ok: boolean; audits: OnboardingAudit[] }>(`/audits${qs}`)
  },
  getAudit: (id: string) =>
    call<{ ok: boolean; audit: OnboardingAudit }>(`/audits/${encodeURIComponent(id)}`)
}
