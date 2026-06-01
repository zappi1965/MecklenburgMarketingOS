import { BROWSER_BACKEND_BASE } from './backendUrl'
import { apiRequest } from './apiRequest'

const base = `${BROWSER_BACKEND_BASE}/api/production/qr-growth`

export const qrCampaignGrowthClient = {
  templates: () => apiRequest(`${base}/templates`, { timeoutMs: 15000 }),
  overview: (customerId: string) => apiRequest(`${base}/overview/${encodeURIComponent(customerId)}`, { timeoutMs: 25000 }),
  createPlacements: (customerId: string, payload: any) => apiRequest(`${base}/placements/${encodeURIComponent(customerId)}`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 30000 }),
  recordEvent: (payload: any) => apiRequest(`${base}/event`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 15000 }),
  createPrintPackage: (customerId: string, qrCampaignId: string, payload: any = {}) => apiRequest(`${base}/print-package/${encodeURIComponent(customerId)}/${encodeURIComponent(qrCampaignId)}`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 30000 }),
  recommendations: (customerId: string) => apiRequest(`${base}/recommendations/${encodeURIComponent(customerId)}`, { timeoutMs: 25000 })
}
