import { BROWSER_BACKEND_BASE } from './backendUrl'
import { apiRequest } from './apiRequest'

const base = `${BROWSER_BACKEND_BASE}/api/production/completeness-audit`

export const completenessAuditClient = {
  overview: (customerId?: string) =>
    apiRequest(`${base}/overview${customerId ? `?customer_id=${encodeURIComponent(customerId)}` : ''}`, { timeoutMs: 60000 }),
  proof: (payload: { key: string; status?: string; note?: string }) =>
    apiRequest(`${base}/proof`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 20000 })
}
