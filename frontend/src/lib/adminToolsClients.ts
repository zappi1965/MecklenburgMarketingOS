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
  return apiRequest<T>(`${BROWSER_BACKEND_BASE}${path}`, {
    ...init,
    headers,
    timeoutMs: 30000
  })
}

export type ApiKey = {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  created_at?: string | null
  last_used_at?: string | null
  revoked_at?: string | null
  fullKey?: string
}

export const apiKeysClient = {
  scopes: () => call<{ ok: boolean; scopes: string[] }>('/api/api-keys/scopes'),
  list: (customer_id: string) =>
    call<{ ok: boolean; keys: ApiKey[] }>(`/api/api-keys/customer/${encodeURIComponent(customer_id)}`),
  create: (customer_id: string, name: string, scopes: string[]) =>
    call<{ ok: boolean; key: ApiKey }>(`/api/api-keys/customer/${encodeURIComponent(customer_id)}`, {
      method: 'POST',
      body: JSON.stringify({ name, scopes })
    }),
  revoke: (customer_id: string, id: string) =>
    call<{ ok: boolean; key: ApiKey }>(`/api/api-keys/customer/${encodeURIComponent(customer_id)}/${encodeURIComponent(id)}/revoke`, {
      method: 'POST'
    })
}

export type ProcessingActivity = {
  id?: string
  name: string
  purpose: string
  legal_basis: string
  data_categories: string[]
  data_subjects: string[]
  retention_period?: string | null
  processor?: string | null
  storage_location?: string | null
  toms: string[]
  status?: string
}

export type DataProcessor = {
  id?: string
  name: string
  purpose: string
  country_code?: string
  contract_signed_at?: string | null
  contract_url?: string | null
  dpa_version?: string | null
  scc_required: boolean
  status?: string
}

export const complianceClient = {
  listActivities: () => call<{ ok: boolean; activities: ProcessingActivity[] }>('/api/compliance/processing-activities'),
  upsertActivity: (a: ProcessingActivity) =>
    call<{ ok: boolean; activity: ProcessingActivity }>('/api/compliance/processing-activities', {
      method: 'POST',
      body: JSON.stringify(a)
    }),
  listProcessors: () => call<{ ok: boolean; processors: DataProcessor[] }>('/api/compliance/processors'),
  upsertProcessor: (p: DataProcessor) =>
    call<{ ok: boolean; processor: DataProcessor }>('/api/compliance/processors', {
      method: 'POST',
      body: JSON.stringify(p)
    })
}

export type PricingRule = {
  id?: string
  name: string
  scope: string
  scope_value?: string | null
  base_price_eur: number
  occupancy_threshold?: number | null
  uplift_pct?: number | null
  downlift_pct?: number | null
  weekend_uplift_pct?: number | null
  off_peak_downlift_pct?: number | null
  enabled?: boolean
}

export type PriceCalc = {
  base: number
  final: number
  factor?: number
  breakdown: Array<{ label: string; value?: number; pct?: number }>
}

export const pricingClient = {
  list: (customer_id: string) =>
    call<{ ok: boolean; rules: PricingRule[] }>(`/api/pricing/rules/${encodeURIComponent(customer_id)}`),
  upsert: (customer_id: string, rule: PricingRule) =>
    call<{ ok: boolean; rule: PricingRule }>(`/api/pricing/rules/${encodeURIComponent(customer_id)}`, {
      method: 'POST',
      body: JSON.stringify(rule)
    }),
  remove: (customer_id: string, id: string) =>
    call<{ ok: boolean }>(`/api/pricing/rules/${encodeURIComponent(customer_id)}/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    }),
  calculate: (customer_id: string, payload: { scope?: string; scope_value?: string; occupancy?: number; slot_time?: string }) =>
    call<{ ok: boolean } & PriceCalc>(`/api/pricing/calculate/${encodeURIComponent(customer_id)}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
}

export type GmbPost = {
  id?: string
  post_type: 'STANDARD' | 'EVENT' | 'OFFER' | 'ALERT'
  summary: string
  cta_label?: string
  cta_url?: string
  image_url?: string
  start_time?: string | null
  end_time?: string | null
  status?: string
  external_id?: string | null
  scheduled_at?: string | null
  published_at?: string | null
  error_message?: string | null
  created_at?: string | null
}

export const gmbClient = {
  list: (customer_id: string) =>
    call<{ ok: boolean; posts: GmbPost[] }>(`/api/gmb/posts/${encodeURIComponent(customer_id)}`),
  create: (customer_id: string, post: GmbPost) =>
    call<{ ok: boolean; post: GmbPost }>(`/api/gmb/posts/${encodeURIComponent(customer_id)}`, {
      method: 'POST',
      body: JSON.stringify(post)
    }),
  publish: (customer_id: string, id: string) =>
    call<{ ok: boolean; post: GmbPost }>(`/api/gmb/posts/${encodeURIComponent(customer_id)}/${encodeURIComponent(id)}/publish`, {
      method: 'POST'
    }),
  remove: (customer_id: string, id: string) =>
    call<{ ok: boolean }>(`/api/gmb/posts/${encodeURIComponent(customer_id)}/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    })
}

export type MailDraft = { subject: string; body: string }

export const aiMailClient = {
  draft: (customer_id: string, payload: { purpose: string; recipient: { email?: string; name?: string }; custom_note?: string }) =>
    call<{ ok: boolean; provider: string; draft: MailDraft; context: Record<string, any> }>(
      `/api/ai-crm-mail/draft/${encodeURIComponent(customer_id)}`,
      { method: 'POST', body: JSON.stringify(payload) }
    )
}
