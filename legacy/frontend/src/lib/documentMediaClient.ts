import { BROWSER_BACKEND_BASE } from './backendUrl'
import { apiRequest } from './apiRequest'
import { getCurrentSession } from './authClient'

async function authHeaders(): Promise<Record<string, string>> {
  const session = await getCurrentSession()
  if (!session?.access_token) throw new Error('Nicht angemeldet.')
  return { Authorization: `Bearer ${session.access_token}` }
}

export type MediaDocument = {
  id: string
  source: string
  customer_id: string
  title: string
  type: string
  status?: string
  created_at?: string
  updated_at?: string
  bucket?: string
  storage_path?: string
  url?: string
  mime_type?: string
  size_bytes?: number
}

export const documentMediaClient = {
  async listCustomerDocuments(customerId: string) {
    const headers = await authHeaders()
    return apiRequest<{ ok: boolean; documents: MediaDocument[]; count: number }>(
      `${BROWSER_BACKEND_BASE}/api/document-media/customers/${encodeURIComponent(customerId)}/documents`,
      { headers, timeoutMs: 25000 }
    )
  },

  async renderAndStorePdf(payload: {
    customer_id: string
    html: string
    title?: string
    filename?: string
    document_type?: string
    source_table?: string
    source_id?: string
    visibility?: 'customer' | 'internal'
    actor_name?: string
  }) {
    const headers = await authHeaders()
    return apiRequest<{ ok: boolean; document: any }>(`${BROWSER_BACKEND_BASE}/api/document-media/render-and-store-pdf`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      timeoutMs: 60000
    })
  },

  async resolveDownload(customerId: string, source: string, id: string) {
    const headers = await authHeaders()
    return apiRequest<{ ok: boolean; url: string; document: MediaDocument }>(
      `${BROWSER_BACKEND_BASE}/api/document-media/customers/${encodeURIComponent(customerId)}/documents/${encodeURIComponent(source)}/${encodeURIComponent(id)}/download`,
      { headers, timeoutMs: 15000 }
    )
  }
}

export default documentMediaClient
