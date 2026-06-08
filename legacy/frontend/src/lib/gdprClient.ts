import { BROWSER_BACKEND_BASE } from './backendUrl'
import { apiRequest } from './apiRequest'
import { getCurrentSession } from './authClient'

export type DsarRequestType = 'export' | 'delete' | 'rectify' | 'restrict' | 'consent'

export type DsarRequest = {
  id: string
  type: DsarRequestType
  status: string
  subject_email?: string | null
  export_url?: string | null
  completed_at?: string | null
  notes?: string | null
  metadata?: Record<string, any> | null
  created_at?: string | null
  updated_at?: string | null
}

async function authHeaders(): Promise<Record<string, string>> {
  const session = await getCurrentSession()
  if (!session?.access_token) {
    throw new Error('Nicht angemeldet. Bitte erneut einloggen.')
  }
  return { Authorization: `Bearer ${session.access_token}` }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = { ...(init.headers || {}), ...(await authHeaders()) }
  return apiRequest<T>(`${BROWSER_BACKEND_BASE}/api/gdpr${path}`, {
    ...init,
    headers,
    timeoutMs: 20000
  })
}

export const gdprClient = {
  listMyRequests: () => call<{ ok: boolean; requests: DsarRequest[] }>('/requests'),
  requestExport: (notes?: string) =>
    call<{ ok: boolean; request: DsarRequest; sla_days: number }>('/export', {
      method: 'POST',
      body: JSON.stringify({ notes: notes || null })
    }),
  requestDeletion: (reason?: string) =>
    call<{ ok: boolean; request: DsarRequest; scheduled_for: string; alreadyPending?: boolean }>('/delete-request', {
      method: 'POST',
      body: JSON.stringify({ reason: reason || null })
    }),
  cancelDeletion: (requestId: string) =>
    call<{ ok: boolean; request: DsarRequest }>(`/delete-cancel/${encodeURIComponent(requestId)}`, {
      method: 'POST'
    })
}
