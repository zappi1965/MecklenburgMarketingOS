import { BROWSER_BACKEND_BASE } from './backendUrl'
import { authenticatedApiRequest } from './authenticatedApiRequest'

const base = `${BROWSER_BACKEND_BASE}/api/production/mail-domain`

export const mailDomainComplianceClient = {
  readiness: (domain?: string) => authenticatedApiRequest(`${base}/readiness${domain ? `?domain=${encodeURIComponent(domain)}` : ''}`, { timeoutMs: 30000 }),
  testMail: (payload: any = {}) => authenticatedApiRequest(`${base}/test-mail`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 60000 }),
  unsubscribeSelfTest: (payload: any = {}) => authenticatedApiRequest(`${base}/unsubscribe-self-test`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 30000 }),
  privacyReminderText: () => authenticatedApiRequest(`${base}/privacy-reminder-text`, { timeoutMs: 15000 }),
  legalChecklist: () => authenticatedApiRequest(`${base}/legal-checklist`, { timeoutMs: 15000 })
}
