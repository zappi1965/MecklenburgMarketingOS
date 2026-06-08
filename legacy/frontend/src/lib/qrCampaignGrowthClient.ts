import { BROWSER_BACKEND_BASE } from './backendUrl'
import { authenticatedApiRequest } from './authenticatedApiRequest'

const base = `${BROWSER_BACKEND_BASE}/api/production/qr-growth`

export const qrCampaignGrowthClient = {
  templates: () => authenticatedApiRequest(`${base}/templates`, { timeoutMs: 15000 }),
  overview: (customerId: string) => authenticatedApiRequest(`${base}/overview/${encodeURIComponent(customerId)}`, { timeoutMs: 25000 }),
  createPlacements: (customerId: string, payload: any) => authenticatedApiRequest(`${base}/placements/${encodeURIComponent(customerId)}`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 30000 }),
  recordEvent: (payload: any) => authenticatedApiRequest(`${base}/event`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 15000 }),
  createPrintPackage: (customerId: string, qrCampaignId: string, payload: any = {}) => authenticatedApiRequest(`${base}/print-package/${encodeURIComponent(customerId)}/${encodeURIComponent(qrCampaignId)}`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 30000 }),
  recommendations: (customerId: string) => authenticatedApiRequest(`${base}/recommendations/${encodeURIComponent(customerId)}`, { timeoutMs: 25000 })
}
