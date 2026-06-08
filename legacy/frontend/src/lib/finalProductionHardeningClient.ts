import { BROWSER_BACKEND_BASE } from './backendUrl'
import { apiRequest } from './apiRequest'

const base = `${BROWSER_BACKEND_BASE}/api/production/final-hardening`

export const finalProductionHardeningClient = {
  overview: (customerId?: string) => apiRequest(`${base}/overview${customerId ? `?customer_id=${encodeURIComponent(customerId)}` : ''}`, { timeoutMs: 30000 }),
  smoke: (customerId?: string) => apiRequest(`${base}/smoke${customerId ? `?customer_id=${encodeURIComponent(customerId)}` : ''}`, { timeoutMs: 30000 }),
  tenantIsolation: () => apiRequest(`${base}/tenant-isolation`, { timeoutMs: 30000 }),
  webhooks: () => apiRequest(`${base}/webhooks`, { timeoutMs: 15000 }),
  uploadPolicy: () => apiRequest(`${base}/upload-policy`, { timeoutMs: 15000 }),
  inspectUpload: (payload: any) => apiRequest(`${base}/upload/inspect`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 15000 }),
  rbacMatrix: () => apiRequest(`${base}/rbac/matrix`, { timeoutMs: 15000 }),
  role: (role: string) => apiRequest(`${base}/rbac/role/${encodeURIComponent(role)}`, { timeoutMs: 15000 }),
  mailCompliance: (customerId?: string) => apiRequest(`${base}/mail-compliance${customerId ? `?customer_id=${encodeURIComponent(customerId)}` : ''}`, { timeoutMs: 20000 }),
  errors: (customerId?: string) => apiRequest(`${base}/errors${customerId ? `?customer_id=${encodeURIComponent(customerId)}` : ''}`, { timeoutMs: 20000 }),
  jobs: () => apiRequest(`${base}/jobs`, { timeoutMs: 15000 }),
  runJob: (key: string) => apiRequest(`${base}/jobs/${encodeURIComponent(key)}/run`, { method: 'POST', timeoutMs: 30000 }),
  runAllJobs: () => apiRequest(`${base}/jobs/run-all`, { method: 'POST', timeoutMs: 60000 }),
  activationReadiness: (customerId?: string) => apiRequest(`${base}/activation-readiness${customerId ? `?customer_id=${encodeURIComponent(customerId)}` : ''}`, { timeoutMs: 20000 }),
  verifyActivationItem: (key: string, note = '', status = 'green') => apiRequest(`${base}/activation-readiness/verify`, { method: 'POST', body: JSON.stringify({ key, note, status }), timeoutMs: 20000 })
}
