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

export type ComplianceSnapshot = {
  generated_at: string
  art30: { activities_active: number }
  processors: { total: number; non_eu: number; scc_required: number }
  dsar: { open: number; in_progress: number; done: number }
  security: { events_last_30d: number; by_severity: Record<string, number>; top_types: Array<{ type: string; count: number }> }
  mfa: { admins_total: number; admins_enrolled: number; coverage_pct: number }
  consent: { newsletter_active: number; newsletter_pending: number; newsletter_unsubscribed: number }
  compliance_score: number
}

export type PeerBenchmark = {
  customer_revenue: number
  peer_revenue_median: number
  peer_revenue_p25: number
  peer_revenue_p75: number
  rank_percentile: number
  peer_sample_size: number
  enough_peers: boolean
}

export type ClvSegment = {
  segment_key: string
  segment_label: string
  member_count: number
  avg_revenue_eur: number
  median_revenue_eur: number
  total_revenue_eur: number
  avg_lifetime_days: number | null
}

export type CohortSnapshot = {
  cohort_month: string
  cohort_size: number
  retention: Record<string, number>
}

export const insightsClient = {
  compliance: () => call<{ ok: boolean; snapshot: ComplianceSnapshot }>('/api/compliance/snapshot'),
  peerBenchmark: (customer_id: string, period_start: string, period_end: string) =>
    call<{ ok: boolean; snapshot: PeerBenchmark }>(`/api/analytics/peer-benchmark/${encodeURIComponent(customer_id)}`, {
      method: 'POST',
      body: JSON.stringify({ period_start, period_end })
    }),
  clv: (customer_id: string) =>
    call<{ ok: boolean; segments: ClvSegment[] }>(`/api/analytics/clv/${encodeURIComponent(customer_id)}`, {
      method: 'POST',
      body: JSON.stringify({})
    }),
  cohorts: (customer_id: string, source: string = 'loyalty_signup', months: number = 6) =>
    call<{ ok: boolean; cohorts: CohortSnapshot[] }>(`/api/analytics/cohorts/${encodeURIComponent(customer_id)}`, {
      method: 'POST',
      body: JSON.stringify({ source, months })
    })
}
