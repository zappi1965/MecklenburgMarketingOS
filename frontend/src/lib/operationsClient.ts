import { BROWSER_BACKEND_BASE } from './backendUrl'
import { authenticatedApiRequest } from './authenticatedApiRequest'

const base = `${BROWSER_BACKEND_BASE}/api/production/operations`

export const operationsClient = {
  supportDiagnostics: (customerId: string) => authenticatedApiRequest(`${base}/support-diagnostics/${encodeURIComponent(customerId)}`, { timeoutMs: 25000 }),
  billingConsistency: (customerId?: string) => authenticatedApiRequest(`${base}/billing-consistency${customerId ? `?customer_id=${encodeURIComponent(customerId)}` : ''}`, { timeoutMs: 25000 }),
  monthlyReport: (customerId: string, payload: any = {}) => authenticatedApiRequest(`${base}/monthly-report/${encodeURIComponent(customerId)}`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 30000 }),
  monthlyReportPdf: (customerId: string, payload: any = {}) => authenticatedApiRequest(`${base}/monthly-report/${encodeURIComponent(customerId)}/pdf`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 70000 }),
  sendMonthlyReport: (customerId: string, payload: any = {}) => authenticatedApiRequest(`${base}/monthly-report/${encodeURIComponent(customerId)}/send`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 90000 }),
  onboarding: (customerId: string) => authenticatedApiRequest(`${base}/onboarding/${encodeURIComponent(customerId)}`, { timeoutMs: 20000 }),
  updateOnboardingStep: (customerId: string, payload: any) => authenticatedApiRequest(`${base}/onboarding/${encodeURIComponent(customerId)}/step`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 20000 }),
  lifecycle: (customerId: string) => authenticatedApiRequest(`${base}/lifecycle/${encodeURIComponent(customerId)}`, { timeoutMs: 20000 }),
  setLifecycle: (customerId: string, payload: any) => authenticatedApiRequest(`${base}/lifecycle/${encodeURIComponent(customerId)}`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 20000 }),
  incidents: (customerId?: string) => authenticatedApiRequest(`${base}/incidents${customerId ? `?customer_id=${encodeURIComponent(customerId)}` : ''}`, { timeoutMs: 20000 }),
  saveIncident: (payload: any) => authenticatedApiRequest(`${base}/incidents`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 20000 }),
  backupRestore: () => authenticatedApiRequest(`${base}/backup-restore`, { timeoutMs: 20000 }),
  recordRestoreTest: (payload: any = {}) => authenticatedApiRequest(`${base}/backup-restore/restore-test`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 20000 })
}
