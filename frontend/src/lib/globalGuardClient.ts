import { BROWSER_BACKEND_BASE } from './backendUrl'
import { apiRequest } from './apiRequest'

const base = `${BROWSER_BACKEND_BASE}/api/production/global-guards`

export const globalGuardClient = {
  schemaDoctor: () => apiRequest(`${base}/schema-doctor`, { timeoutMs: 20000 }),
  documentIntegrity: (customerId?: string) => apiRequest(`${base}/document-integrity${customerId ? `?customer_id=${encodeURIComponent(customerId)}` : ''}`, { timeoutMs: 20000 }),
  publicShieldStatus: () => apiRequest(`${base}/public-shield-status`, { timeoutMs: 15000 }),
  toolAccessPolicy: (customerId: string) => apiRequest(`${base}/tool-access-policy/${encodeURIComponent(customerId)}`, { timeoutMs: 20000 }),
  limitPolicy: (customerId: string) => apiRequest(`${base}/limit-policy/${encodeURIComponent(customerId)}`, { timeoutMs: 20000 })
}
