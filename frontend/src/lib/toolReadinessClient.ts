import { BROWSER_BACKEND_BASE } from './backendUrl'
import { apiRequest } from './apiRequest'

const base = `${BROWSER_BACKEND_BASE}/api/production/tool-readiness`

export const toolReadinessClient = {
  overview: () => apiRequest(`${base}/overview`, { timeoutMs: 60000 }),
  markdownUrl: () => `${base}/export.md`
}
