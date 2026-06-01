import { BROWSER_BACKEND_BASE } from './backendUrl'
import { authenticatedApiRequest, authenticatedDownload } from './authenticatedApiRequest'

const base = `${BROWSER_BACKEND_BASE}/api/production/tool-readiness`

export const toolReadinessClient = {
  overview: () => authenticatedApiRequest(`${base}/overview`, { timeoutMs: 60000 }),
  downloadMarkdown: () => authenticatedDownload(`${base}/export.md`, 'mmos-tool-produktionsreife.md')
}
