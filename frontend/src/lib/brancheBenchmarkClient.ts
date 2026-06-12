import { BROWSER_BACKEND_BASE } from './backendUrl'
import { apiRequest } from './apiRequest'
import { getCurrentSession } from './authClient'

async function authHeaders(): Promise<Record<string, string>> {
  const session = await getCurrentSession()
  if (!session?.access_token) throw new Error('Nicht angemeldet.')
  return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
}

const base = `${BROWSER_BACKEND_BASE}/api/branche-benchmark`

export type BenchmarkTarget = { id?: string; branch: string; metric_key: string; target_value: number }
export type BenchmarkReport = {
  id: string
  customer_id: string
  period_start: string
  period_end: string
  branch?: string | null
  comparison: any[]
  peer_count: number
  used_fallback: boolean
  pdf_url?: string | null
}

export const brancheBenchmarkClient = {
  async getTargets(branch?: string) {
    const headers = await authHeaders()
    const q = branch ? `?branch=${encodeURIComponent(branch)}` : ''
    return apiRequest<{ ok: boolean; targets: BenchmarkTarget[] }>(`${base}/targets${q}`, { headers, timeoutMs: 20000 })
  },
  async saveTarget(target: BenchmarkTarget) {
    const headers = await authHeaders()
    return apiRequest<{ ok: boolean; target: BenchmarkTarget }>(`${base}/targets`, { method: 'PUT', headers, body: JSON.stringify(target), timeoutMs: 20000 })
  },
  async compute(period: { period_start: string; period_end: string }) {
    const headers = await authHeaders()
    return apiRequest<{ ok: boolean; branches: number; rows: number }>(`${base}/compute`, { method: 'POST', headers, body: JSON.stringify(period), timeoutMs: 60000 })
  },
  async generate(customerId: string, period: { period_start: string; period_end: string }) {
    const headers = await authHeaders()
    return apiRequest<{ ok: boolean; report: BenchmarkReport }>(`${base}/generate/${encodeURIComponent(customerId)}`, { method: 'POST', headers, body: JSON.stringify(period), timeoutMs: 60000 })
  },
  async listReports(customerId: string) {
    const headers = await authHeaders()
    return apiRequest<{ ok: boolean; reports: BenchmarkReport[] }>(`${base}/${encodeURIComponent(customerId)}/reports`, { headers, timeoutMs: 20000 })
  }
}
