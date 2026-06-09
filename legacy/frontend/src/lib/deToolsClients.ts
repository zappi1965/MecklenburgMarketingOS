// Clients fuer die DE-Compliance- & Datenqualitaets-Tools:
// Datenqualitaet (Dubletten/Validierung/AI-Review-Response), Buchhaltungs-
// Export (DATEV/lexoffice/sevDesk), E-Rechnung (XRechnung/ZUGFeRD), POS.

import { BROWSER_BACKEND_BASE } from './backendUrl'
import { apiRequest } from './apiRequest'
import { getCurrentSession } from './authClient'

async function authHeaders(): Promise<Record<string, string>> {
  const session = await getCurrentSession()
  if (!session?.access_token) throw new Error('Nicht angemeldet.')
  return { Authorization: `Bearer ${session.access_token}` }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = { ...(init.headers || {}), ...(await authHeaders()) }
  return apiRequest<T>(`${BROWSER_BACKEND_BASE}${path}`, { ...init, headers, timeoutMs: 45000 })
}

// Laedt eine Binaer-/Text-Datei mit Auth herunter und triggert den Browser-Download.
async function download(path: string, fallbackName: string): Promise<void> {
  const headers = await authHeaders()
  const res = await fetch(`${BROWSER_BACKEND_BASE}${path}`, { headers, cache: 'no-store' })
  if (!res.ok) {
    let msg = `Download fehlgeschlagen (${res.status})`
    try { const j = await res.json(); msg = j?.error || msg } catch (_) {}
    throw new Error(msg)
  }
  const cd = res.headers.get('content-disposition') || ''
  const m = cd.match(/filename="?([^"]+)"?/)
  const name = m?.[1] || fallbackName
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

// === Datenqualitaet ===
export type DuplicateCluster = {
  confidence: number
  reason?: string
  records: Array<{ id: string; name?: string; email?: string; phone?: string; postal_code?: string; city?: string }>
}
export type EmailValidation = { email: string; valid: boolean; reason?: string; mx?: boolean; disposable?: boolean }
export type ReviewResponseSuggestion = { tone?: string; text: string }

export const dataQualityClient = {
  findDuplicates: (threshold = 0.8, limit = 500) =>
    call<{ ok: boolean; clusters: DuplicateCluster[] }>(`/api/data-quality/duplicates?threshold=${threshold}&limit=${limit}`),
  merge: (primary_id: string, merge_ids: string[]) =>
    call<{ ok: boolean; result: any }>(`/api/data-quality/duplicates/merge`, {
      method: 'POST', body: JSON.stringify({ primary_id, merge_ids })
    }),
  validateEmail: (email: string) =>
    call<{ ok: boolean; validation: EmailValidation }>(`/api/data-quality/validate/email`, {
      method: 'POST', body: JSON.stringify({ email })
    }),
  aiReviewResponse: (review_feedback_id: string) =>
    call<{ ok: boolean; suggestions?: ReviewResponseSuggestion[]; responses?: ReviewResponseSuggestion[]; provider?: string }>(
      `/api/data-quality/ai/review-response`, { method: 'POST', body: JSON.stringify({ review_feedback_id }) }
    )
}

// === Buchhaltungs-Export ===
export type AccountingFormat = 'datev_extf' | 'lexoffice_csv' | 'sevdesk_csv'

export const accountingClient = {
  exportDownload: (format: AccountingFormat, period_start: string, period_end: string, customer_id?: string) => {
    const qs = new URLSearchParams({ format, period_start, period_end })
    if (customer_id) qs.set('customer_id', customer_id)
    return download(`/api/accounting/export?${qs.toString()}`, `${format}-${period_start}-${period_end}.csv`)
  }
}

// === E-Rechnung ===
export const eInvoiceClient = {
  preview: (invoiceId: string) =>
    call<{ ok: boolean; xml: string; format: string }>(`/api/e-invoice/invoices/${encodeURIComponent(invoiceId)}/preview`),
  downloadXml: (invoiceId: string) =>
    download(`/api/e-invoice/invoices/${encodeURIComponent(invoiceId)}/xml`, `${invoiceId}_xrechnung.xml`),
  downloadZugferd: (invoiceId: string) =>
    download(`/api/e-invoice/invoices/${encodeURIComponent(invoiceId)}/zugferd`, `${invoiceId}_zugferd.pdf`)
}

// === AI Social-Post-Generator ===
export type SocialPlatform = 'instagram' | 'facebook' | 'google_post' | 'linkedin'
export type SocialPost = { text: string; hashtags: string[] }

export const socialClient = {
  generate: (params: { customer_id?: string; platform: SocialPlatform; topic?: string; tone?: string; language?: string; count?: number }) =>
    call<{ ok: boolean; provider: string; platform: string; posts: SocialPost[] }>(`/api/social/generate`, {
      method: 'POST', body: JSON.stringify(params)
    })
}

// === POS ===
export type PosTransaction = {
  id: string
  provider?: string
  provider_transaction_id?: string
  amount?: number
  currency?: string
  payment_type?: string
  status?: string
  transaction_time?: string
  reference?: string
  metadata?: any
}
export type PosSummary = {
  count: number
  successful_count: number
  total_revenue: number
  today_revenue: number
  month_revenue: number
  avg_transaction: number
  by_provider: Record<string, number>
  by_payment_type: Record<string, number>
  daily: Array<{ date: string; amount: number }>
}
export const posClient = {
  listTransactions: (customer_id: string, params: { limit?: number; from?: string; to?: string } = {}) => {
    const qs = new URLSearchParams()
    if (params.limit) qs.set('limit', String(params.limit))
    if (params.from) qs.set('from', params.from)
    if (params.to) qs.set('to', params.to)
    const query = qs.toString() ? `?${qs.toString()}` : ''
    return call<{ ok: boolean; transactions: PosTransaction[] }>(`/api/pos/transactions/${encodeURIComponent(customer_id)}${query}`)
  },
  summary: (customer_id: string, days = 90) =>
    call<{ ok: boolean; summary: PosSummary; transactions: PosTransaction[] }>(`/api/pos/summary/${encodeURIComponent(customer_id)}?days=${days}`),
  sumupStatus: (customer_id: string) =>
    call<{ ok: boolean; provider: string; config: any }>(`/api/pos/providers/sumup/status/${encodeURIComponent(customer_id)}`),
  sumupConnect: (customer_id: string, payload: { access_token: string; merchant_code?: string; api_base?: string }) =>
    call<{ ok: boolean; config?: any; error?: string }>(`/api/pos/providers/sumup/connect/${encodeURIComponent(customer_id)}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  sumupSync: (customer_id: string, payload: { from?: string; to?: string; limit?: number } = {}) =>
    call<{ ok: boolean; fetched?: number; inserted?: number; updated?: number; error?: string; results?: PosTransaction[] }>(`/api/pos/providers/sumup/sync/${encodeURIComponent(customer_id)}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  linkTransaction: (transaction_id: string, payload: any) =>
    call<{ ok: boolean; transaction?: PosTransaction; error?: string }>(`/api/pos/transactions/${encodeURIComponent(transaction_id)}/link`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
}
