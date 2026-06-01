import { BROWSER_BACKEND_BASE } from './backendUrl'
import { authenticatedApiRequest } from './authenticatedApiRequest'

const base = `${BROWSER_BACKEND_BASE}/api/production/loyalty-growth`

export const loyaltyGrowthSuiteClient = {
  ideas: () => authenticatedApiRequest(`${base}/ideas`, { timeoutMs: 15000 }),
  overview: (customerId: string) => authenticatedApiRequest(`${base}/overview/${encodeURIComponent(customerId)}`, { timeoutMs: 25000 }),
  recommendations: (customerId: string) => authenticatedApiRequest(`${base}/recommendations/${encodeURIComponent(customerId)}`, { timeoutMs: 25000 }),
  createCampaign: (customerId: string, payload: any) => authenticatedApiRequest(`${base}/campaign/${encodeURIComponent(customerId)}`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 25000 }),
  createBooster: (customerId: string, payload: any = {}) => authenticatedApiRequest(`${base}/booster/${encodeURIComponent(customerId)}`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 25000 }),
  createVipLevels: (customerId: string, payload: any = {}) => authenticatedApiRequest(`${base}/vip-levels/${encodeURIComponent(customerId)}`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 25000 }),
  createCoupon: (customerId: string, payload: any = {}) => authenticatedApiRequest(`${base}/coupon/${encodeURIComponent(customerId)}`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 25000 }),
  createReferral: (customerId: string, payload: any = {}) => authenticatedApiRequest(`${base}/referral/${encodeURIComponent(customerId)}`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 25000 }),
  roi: (customerId: string, payload: any = {}) => authenticatedApiRequest(`${base}/roi/${encodeURIComponent(customerId)}`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 25000 })
}
