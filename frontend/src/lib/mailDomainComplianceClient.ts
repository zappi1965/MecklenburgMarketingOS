import { BROWSER_BACKEND_BASE } from './backendUrl'
import { apiRequest } from './apiRequest'

const base = `${BROWSER_BACKEND_BASE}/api/production/mail-domain`

export const mailDomainComplianceClient = {
  readiness: (domain?: string) => apiRequest(`${base}/readiness${domain ? `?domain=${encodeURIComponent(domain)}` : ''}`, { timeoutMs: 30000 }),
  testMail: (payload: any = {}) => apiRequest(`${base}/test-mail`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 60000 }),
  unsubscribeSelfTest: (payload: any = {}) => apiRequest(`${base}/unsubscribe-self-test`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 30000 }),
  privacyReminderText: () => apiRequest(`${base}/privacy-reminder-text`, { timeoutMs: 15000 }),
  legalChecklist: () => apiRequest(`${base}/legal-checklist`, { timeoutMs: 15000 })
}
