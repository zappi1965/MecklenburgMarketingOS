import { BROWSER_BACKEND_BASE } from './backendUrl'
import { authenticatedApiRequest } from './authenticatedApiRequest'

const base = `${BROWSER_BACKEND_BASE}/api/production/completeness-audit`

export const completenessAuditClient = {
  overview: (customerId?: string) =>
    authenticatedApiRequest(`${base}/overview${customerId ? `?customer_id=${encodeURIComponent(customerId)}` : ''}`, { timeoutMs: 60000 }),
  proof: (payload: { key: string; status?: string; note?: string }) =>
    authenticatedApiRequest(`${base}/proof`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 20000 })
}
