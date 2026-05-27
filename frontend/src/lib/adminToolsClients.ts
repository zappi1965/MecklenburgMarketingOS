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

// === Dunning ===
export type DunningLevel = {
  id?: string
  level: number
  days_overdue: number
  fee_eur: number
  action: string
  template?: string | null
  enabled?: boolean
}

export const dunningClient = {
  list: (customer_id: string) =>
    call<{ ok: boolean; levels: DunningLevel[] }>(`/api/dunning/levels/${encodeURIComponent(customer_id)}`),
  ensureDefaults: (customer_id: string) =>
    call<{ ok: boolean; levels: DunningLevel[] }>(`/api/dunning/levels/${encodeURIComponent(customer_id)}/defaults`, { method: 'POST' }),
  upsert: (customer_id: string, level: DunningLevel) =>
    call<{ ok: boolean; level: DunningLevel }>(`/api/dunning/levels/${encodeURIComponent(customer_id)}`, {
      method: 'POST',
      body: JSON.stringify(level)
    }),
  remove: (customer_id: string, level: number) =>
    call<{ ok: boolean }>(`/api/dunning/levels/${encodeURIComponent(customer_id)}/${level}`, { method: 'DELETE' }),
  runNow: () => call<{ ok: boolean; result: any }>('/api/dunning/run-now', { method: 'POST' })
}

// === Review Widget ===
export type ReviewWidget = {
  id?: string
  slug: string
  show_count: number
  min_rating: number
  theme: { primary?: string; background?: string; text?: string }
  active?: boolean
}

export const widgetClient = {
  list: (customer_id: string) =>
    call<{ ok: boolean; widgets: ReviewWidget[] }>(`/api/review-widget/customer/${encodeURIComponent(customer_id)}`),
  create: (customer_id: string, w: ReviewWidget) =>
    call<{ ok: boolean; widget: ReviewWidget }>(`/api/review-widget/customer/${encodeURIComponent(customer_id)}`, {
      method: 'POST',
      body: JSON.stringify(w)
    }),
  update: (customer_id: string, id: string, patch: Partial<ReviewWidget>) =>
    call<{ ok: boolean; widget: ReviewWidget }>(`/api/review-widget/customer/${encodeURIComponent(customer_id)}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch)
    })
}

// === Newsletter ===
export type Subscriber = {
  id: string
  email: string
  status: string
  created_at?: string | null
  confirmed_at?: string | null
}

export type NewsletterCampaign = {
  id?: string
  subject?: string
  body?: string
  status?: string
  created_at?: string | null
  sent_at?: string | null
}

export const newsletterClient = {
  listSubscribers: (customer_id: string, status?: string) => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : ''
    return call<{ ok: boolean; subscribers: Subscriber[] }>(`/api/newsletter/subscribers/${encodeURIComponent(customer_id)}${qs}`)
  },
  createCampaign: (customer_id: string, subject: string, body: string, audience = 'active') =>
    call<{ ok: boolean; campaign: NewsletterCampaign }>('/api/newsletter/campaigns', {
      method: 'POST',
      body: JSON.stringify({ customer_id, subject, body, audience })
    }),
  send: (campaign_id: string) =>
    call<{ ok: boolean; result: any }>(`/api/newsletter/campaigns/${encodeURIComponent(campaign_id)}/send`, { method: 'POST' })
}

// === No-Show Risk ===
export type RiskScore = {
  appointment_id: string
  risk_score: number
  risk_level: 'low' | 'medium' | 'high'
  reasons: Array<{ key: string; value?: number; weight?: number }>
  reminder_strategy: string
}

export const noShowClient = {
  highRisk: (customer_id: string) =>
    call<{ ok: boolean; scores: RiskScore[] }>(`/api/no-show/high-risk/${encodeURIComponent(customer_id)}`),
  scan: () => call<{ ok: boolean; result: any }>('/api/no-show/scan', { method: 'POST' }),
  calculate: (appointment_id: string) =>
    call<{ ok: boolean; score: RiskScore }>(`/api/no-show/calculate/${encodeURIComponent(appointment_id)}`, { method: 'POST' })
}

// === Security / MFA ===
export type MfaEnrollResponse = { otpauth: string; secret: string }

export const securityClient = {
  enroll: () => call<{ ok: boolean } & MfaEnrollResponse>('/api/security/mfa/enroll', { method: 'POST' }),
  activate: (code: string) =>
    call<{ ok: boolean; backupCodes: string[] }>('/api/security/mfa/activate', {
      method: 'POST',
      body: JSON.stringify({ code })
    }),
  verify: (code: string) =>
    call<{ ok: boolean; reason?: string; via?: string }>('/api/security/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ code })
    }),
  disable: (code: string) =>
    call<{ ok: boolean }>('/api/security/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ code })
    })
}

// === Onboarding ===
export type OnboardingStatus = {
  customer?: { id: string; name?: string; metadata?: any } | null
  steps: Record<string, any>
  all_steps: string[]
}

export const onboardingClient = {
  status: (customer_id: string) =>
    call<{ ok: boolean } & OnboardingStatus>(`/api/onboarding/status/${encodeURIComponent(customer_id)}`),
  brand: (customer_id: string, payload: { brand_name?: string; brand_primary?: string; brand_secondary?: string; brand_voice?: string }) =>
    call<{ ok: boolean }>(`/api/onboarding/brand/${encodeURIComponent(customer_id)}`, { method: 'POST', body: JSON.stringify(payload) }),
  qr: (customer_id: string, payload: { title?: string; headline?: string; slug?: string }) =>
    call<{ ok: boolean; campaign: { id: string; slug: string } }>(`/api/onboarding/qr/${encodeURIComponent(customer_id)}`, { method: 'POST', body: JSON.stringify(payload) }),
  loyalty: (customer_id: string, payload: { program_name?: string; reward_title?: string; reward_points?: number }) =>
    call<{ ok: boolean; loyalty_program_id?: string }>(`/api/onboarding/loyalty/${encodeURIComponent(customer_id)}`, { method: 'POST', body: JSON.stringify(payload) }),
  samples: (customer_id: string) =>
    call<{ ok: boolean }>(`/api/onboarding/samples/${encodeURIComponent(customer_id)}`, { method: 'POST' }),
  complete: (customer_id: string) =>
    call<{ ok: boolean }>(`/api/onboarding/complete/${encodeURIComponent(customer_id)}`, { method: 'POST' })
}

// === Loyalty-Staff-Scan ===
export type LoyaltyMemberSnapshot = {
  id: string
  customer_id: string
  display_name?: string | null
  email?: string | null
  points_balance: number
  tier?: string | null
  last_scan_at?: string | null
}

export type LoyaltyScanResult = {
  ok: boolean
  skipped?: boolean
  reason?: string
  member: LoyaltyMemberSnapshot & { points_added: number }
  transaction?: { id: string; points: number; created_at: string }
  staff_code_used?: boolean
}

export const loyaltyScanClient = {
  lookup: (customer_id: string, qr_payload: string) =>
    call<{ ok: boolean; member: LoyaltyMemberSnapshot }>(`/api/loyalty/lookup-member/${encodeURIComponent(customer_id)}`, {
      method: 'POST',
      body: JSON.stringify({ qr_payload })
    }),
  scan: (customer_id: string, payload: { qr_payload: string; points?: number; qr_campaign_id?: string; staff_code?: string; idempotency_key?: string }) =>
    call<LoyaltyScanResult>(`/api/loyalty/staff-scan/${encodeURIComponent(customer_id)}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
}
