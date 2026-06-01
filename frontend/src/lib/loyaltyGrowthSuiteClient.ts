import { BROWSER_BACKEND_BASE } from './backendUrl'
import { apiRequest } from './apiRequest'

const base = `${BROWSER_BACKEND_BASE}/api/production/loyalty-growth`

export const loyaltyGrowthSuiteClient = {
  ideas: () => apiRequest(`${base}/ideas`, { timeoutMs: 15000 }),
  overview: (customerId: string) => apiRequest(`${base}/overview/${encodeURIComponent(customerId)}`, { timeoutMs: 25000 }),
  recommendations: (customerId: string) => apiRequest(`${base}/recommendations/${encodeURIComponent(customerId)}`, { timeoutMs: 25000 }),
  createCampaign: (customerId: string, payload: any) => apiRequest(`${base}/campaign/${encodeURIComponent(customerId)}`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 25000 }),
  createBooster: (customerId: string, payload: any = {}) => apiRequest(`${base}/booster/${encodeURIComponent(customerId)}`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 25000 }),
  createVipLevels: (customerId: string, payload: any = {}) => apiRequest(`${base}/vip-levels/${encodeURIComponent(customerId)}`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 25000 }),
  createCoupon: (customerId: string, payload: any = {}) => apiRequest(`${base}/coupon/${encodeURIComponent(customerId)}`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 25000 }),
  createReferral: (customerId: string, payload: any = {}) => apiRequest(`${base}/referral/${encodeURIComponent(customerId)}`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 25000 }),
  roi: (customerId: string, payload: any = {}) => apiRequest(`${base}/roi/${encodeURIComponent(customerId)}`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 25000 })
}
