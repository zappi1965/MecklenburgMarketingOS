import { BROWSER_BACKEND_BASE } from './backendUrl'
import { apiRequest } from './apiRequest'

const base = `${BROWSER_BACKEND_BASE}/api/production/go-live-cockpit`

export const goLiveCockpitClient = {
  overview: (customerId?: string) => apiRequest(`${base}/overview${customerId ? `?customer_id=${encodeURIComponent(customerId)}` : ''}`, { timeoutMs: 60000 })
}
