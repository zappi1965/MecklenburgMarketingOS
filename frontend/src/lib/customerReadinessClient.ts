import { BROWSER_BACKEND_BASE } from './backendUrl'
import { apiRequest } from './apiRequest'

const base = `${BROWSER_BACKEND_BASE}/api/production/customer-readiness`

export const customerReadinessClient = {
  overview: (customerId?: string) => apiRequest(`${base}/overview${customerId ? `?customer_id=${encodeURIComponent(customerId)}` : ''}`, { timeoutMs: 25000 }),
  goLive: (customerId: string) => apiRequest(`${base}/go-live/${encodeURIComponent(customerId)}`, { timeoutMs: 25000 }),
  portalPermissions: (customerId: string, toolKey?: string) => apiRequest(`${base}/portal-permissions/${encodeURIComponent(customerId)}${toolKey ? `?tool_key=${encodeURIComponent(toolKey)}` : ''}`, { timeoutMs: 20000 }),
  dataQuality: (customerId?: string) => apiRequest(`${base}/data-quality${customerId ? `?customer_id=${encodeURIComponent(customerId)}` : ''}`, { timeoutMs: 25000 }),
  mail: () => apiRequest(`${base}/mail`, { timeoutMs: 15000 }),
  booking: (customerId?: string) => apiRequest(`${base}/booking${customerId ? `?customer_id=${encodeURIComponent(customerId)}` : ''}`, { timeoutMs: 20000 }),
  documentsVersioning: (customerId?: string) => apiRequest(`${base}/documents/versioning${customerId ? `?customer_id=${encodeURIComponent(customerId)}` : ''}`, { timeoutMs: 20000 }),
  auditOffer: (customerId?: string) => apiRequest(`${base}/audit-offer${customerId ? `?customer_id=${encodeURIComponent(customerId)}` : ''}`, { timeoutMs: 20000 }),
  adminRbac: () => apiRequest(`${base}/admin-rbac`, { timeoutMs: 20000 }),
  trash: (customerId?: string) => apiRequest(`${base}/trash${customerId ? `?customer_id=${encodeURIComponent(customerId)}` : ''}`, { timeoutMs: 20000 }),
  restoreTrash: (table: string, id: string) => apiRequest(`${base}/trash/restore`, { method: 'POST', body: JSON.stringify({ table, id }), timeoutMs: 20000 }),
  migrateQrTargets: (customerId?: string, dryRun = false) => apiRequest(`${base}/qr/migrate-legacy-targets`, { method: 'POST', body: JSON.stringify({ customer_id: customerId || null, dry_run: dryRun }), timeoutMs: 25000 }),
  cleanupQrTokens: (dryRun = false) => apiRequest(`${base}/qr/cleanup-tokens`, { method: 'POST', body: JSON.stringify({ dry_run: dryRun }), timeoutMs: 25000 }),
  qrE2E: (customerId?: string) => apiRequest(`${base}/qr/e2e${customerId ? `?customer_id=${encodeURIComponent(customerId)}` : ''}`, { timeoutMs: 25000 })
}
