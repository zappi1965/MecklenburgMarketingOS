import { BROWSER_BACKEND_BASE } from './backendUrl'
import { apiRequest } from './apiRequest'

const base = `${BROWSER_BACKEND_BASE}/api/production/retention-intelligence`

export const retentionIntelligenceClient = {
  templates: () => apiRequest(`${base}/templates`, { timeoutMs: 15000 }),
  overview: (customerId: string, persist = false) => apiRequest(`${base}/overview/${encodeURIComponent(customerId)}${persist ? '?persist=true' : ''}`, { timeoutMs: 30000 }),
  createDefaultSegments: (customerId: string) => apiRequest(`${base}/segments/${encodeURIComponent(customerId)}/create-defaults`, { method: 'POST', timeoutMs: 25000 }),
  generateFeedbackActions: (customerId: string, payload: any = {}) => apiRequest(`${base}/feedback-actions/${encodeURIComponent(customerId)}/generate`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 30000 }),
  createServiceRecoveryCase: (customerId: string, payload: any = {}) => apiRequest(`${base}/service-recovery/${encodeURIComponent(customerId)}`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 25000 }),
  createReactivationPlan: (customerId: string, payload: any = {}) => apiRequest(`${base}/reactivation-plan/${encodeURIComponent(customerId)}`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 30000 }),
  startSegmentCampaign: (customerId: string, payload: any = {}) => apiRequest(`${base}/segment-campaign/${encodeURIComponent(customerId)}/start`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 50000 }),
  generateMarketingReminders: (customerId: string, payload: any = {}) => apiRequest(`${base}/marketing-reminders/${encodeURIComponent(customerId)}/generate`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 30000 }),
  sendMarketingReminders: (customerId: string, payload: any = {}) => apiRequest(`${base}/marketing-reminders/${encodeURIComponent(customerId)}/send`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 60000 }),
  legalReviewMarketingConsent: (payload: any = {}) => apiRequest(`${base}/marketing-consent/legal-review`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 20000 })
}
