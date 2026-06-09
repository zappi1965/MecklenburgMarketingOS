import { BROWSER_BACKEND_BASE } from './backendUrl'
import { apiRequest } from './apiRequest'

const API_BASE = BROWSER_BACKEND_BASE

async function request(path: string, options: RequestInit = {}) {
  return apiRequest(`${API_BASE}/api/customer-portal${path}`, {
    ...options,
    timeoutMs: 20000
  })
}

export const customerPortalClient = {
  overview: (customerId?: string) => request(`/overview${customerId ? `?customer_id=${encodeURIComponent(customerId)}` : ''}`),
  register: (body: any) => request('/register', { method: 'POST', body: JSON.stringify(body) }),
  registrations: () => request('/registrations'),
  approve: (id: string, body: any = {}) => request(`/approve/${id}`, { method: 'POST', body: JSON.stringify(body) }),
  createInvite: (body: any) => request('/invite', { method: 'POST', body: JSON.stringify(body) }),
  getInvite: (token: string) => request(`/invite/${encodeURIComponent(token)}`),
  acceptInvite: (body: any) => request('/accept-invite', { method: 'POST', body: JSON.stringify(body) }),
  revokeInvite: (id: string, body: any = {}) => request(`/invite/${encodeURIComponent(id)}/revoke`, { method: 'POST', body: JSON.stringify(body) }),
  resendInvite: (id: string, body: any = {}) => request(`/invite/${encodeURIComponent(id)}/resend`, { method: 'POST', body: JSON.stringify(body) }),
  packageRequest: (body: any) => request('/package-request', { method: 'POST', body: JSON.stringify(body) }),
  syncPackageAccess: (body: any) => request('/sync-package-access', { method: 'POST', body: JSON.stringify(body) }),
  marketingConsents: (customerId?: string) => request(`/marketing-consents${customerId ? `?customer_id=${encodeURIComponent(customerId)}` : ''}`),
}
