
import { API_BASE, hasSupabase, supabase } from './supabase'

export type ApiResult<T = any> = {
  ok: boolean
  data?: T
  error?: string
}

export async function apiRequest<T = any>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  if (!API_BASE) return { ok: false, error: 'NEXT_PUBLIC_API_BASE fehlt' }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    })

    const payload = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: payload.error || `HTTP ${res.status}` }

    return { ok: true, data: payload.data ?? payload }
  } catch (error: any) {
    return { ok: false, error: error.message || 'Netzwerkfehler' }
  }
}

export async function listRows(table: string, customerId?: string | null) {
  const query = customerId ? `?customer_id=${customerId}` : ''
  return apiRequest(`/api/${table}${query}`)
}

export async function createRow(table: string, payload: any) {
  return apiRequest(`/api/${table}`, { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateRow(table: string, id: string, payload: any) {
  return apiRequest(`/api/${table}/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export async function deleteRow(table: string, id: string) {
  return apiRequest(`/api/${table}/${id}`, { method: 'DELETE' })
}

export async function runWorkflow(payload: any) {
  return apiRequest('/api/workflows/run', { method: 'POST', body: JSON.stringify(payload) })
}

export async function createNotification(payload: any) {
  return createRow('notifications', payload)
}


export async function approvePackageRequest(requestId: string) {
  return apiRequest(`/api/billing/package-requests/${requestId}/approve`, { method: 'POST' })
}

export async function changeSubscription(customer_id: string, package_name: string) {
  return apiRequest('/api/billing/subscriptions/change', {
    method: 'POST',
    body: JSON.stringify({ customer_id, package_name })
  })
}

export async function createPackageInvoice(customer_id: string, package_name: string) {
  return apiRequest('/api/billing/invoices/package', {
    method: 'POST',
    body: JSON.stringify({ customer_id, package_name })
  })
}

export async function generatePackageContract(customer_id: string, package_name: string) {
  return apiRequest('/api/billing/contracts/generate', {
    method: 'POST',
    body: JSON.stringify({ customer_id, package_name })
  })
}

export async function createStripeCheckout(customer_id: string, package_name: string) {
  return apiRequest('/api/billing/checkout/stripe', {
    method: 'POST',
    body: JSON.stringify({ customer_id, package_name })
  })
}
