// Client fuer den SEO-Autopilot (Milestone 1): Brand-DNA, Keywords und
// Artikel generieren, speichern und freigeben. Admin-only.

import { BROWSER_BACKEND_BASE } from './backendUrl'
import { apiRequest } from './apiRequest'
import { getCurrentSession } from './authClient'

async function authHeaders(): Promise<Record<string, string>> {
  const session = await getCurrentSession()
  if (!session?.access_token) throw new Error('Nicht angemeldet.')
  return { Authorization: `Bearer ${session.access_token}` }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = { 'content-type': 'application/json', ...(init.headers || {}), ...(await authHeaders()) }
  return apiRequest<T>(`${BROWSER_BACKEND_BASE}${path}`, { ...init, headers, timeoutMs: 60000 })
}

export type SeoBrandProfile = {
  id?: string
  customer_id?: string
  website_url?: string | null
  audience?: string | null
  tone?: string | null
  topics?: string[]
  value_props?: string[]
  language?: string
  provider?: string | null
}

export type SeoKeyword = {
  id?: string
  customer_id?: string
  keyword: string
  intent: 'local' | 'informational' | 'transactional'
  priority: number
  status?: string
  search_volume?: number | null
  difficulty?: number | null
  cpc?: number | null
  data_provider?: string | null
}

export type SeoArticleMetric = {
  article_id: string
  metric_date?: string
  impressions: number
  clicks: number
  position?: number | null
  ctr?: number | null
  source?: string
}

export type SeoArticle = {
  id: string
  customer_id: string
  keyword?: string
  title: string
  slug?: string
  meta_description?: string
  body_markdown: string
  internal_link_ideas?: string[]
  language?: string
  status: 'draft' | 'approved' | 'published'
  provider?: string
  model?: string
  published_url?: string | null
  cover_image_url?: string | null
  created_at?: string
  updated_at?: string
  approved_at?: string | null
  published_at?: string | null
}

export const seoAutopilotClient = {
  // Brand-DNA
  generateBrandProfile: (params: { customer_id: string; website_url?: string; notes?: string; language?: string }) =>
    call<{ ok: boolean; provider: string; profile: SeoBrandProfile }>(`/api/seo-autopilot/brand-profile/generate`, {
      method: 'POST', body: JSON.stringify(params)
    }),
  saveBrandProfile: (profile: SeoBrandProfile & { customer_id: string }) =>
    call<{ ok: boolean; profile: SeoBrandProfile }>(`/api/seo-autopilot/brand-profile`, {
      method: 'POST', body: JSON.stringify(profile)
    }),
  getBrandProfile: (customer_id: string) =>
    call<{ ok: boolean; profile: SeoBrandProfile | null }>(`/api/seo-autopilot/brand-profile?customer_id=${encodeURIComponent(customer_id)}`),

  // Keywords
  generateKeywords: (params: { customer_id: string; count?: number; language?: string }) =>
    call<{ ok: boolean; provider: string; data_provider: string; keywords: SeoKeyword[] }>(`/api/seo-autopilot/keywords/generate`, {
      method: 'POST', body: JSON.stringify(params)
    }),
  saveKeywords: (customer_id: string, keywords: SeoKeyword[]) =>
    call<{ ok: boolean; keywords: SeoKeyword[] }>(`/api/seo-autopilot/keywords`, {
      method: 'POST', body: JSON.stringify({ customer_id, keywords })
    }),
  listKeywords: (customer_id: string) =>
    call<{ ok: boolean; keywords: SeoKeyword[] }>(`/api/seo-autopilot/keywords?customer_id=${encodeURIComponent(customer_id)}`),

  // Artikel
  generateArticle: (params: { customer_id: string; keyword: string; language?: string }) =>
    call<{ ok: boolean; provider: string; article: SeoArticle }>(`/api/seo-autopilot/articles/generate`, {
      method: 'POST', body: JSON.stringify(params)
    }),
  listArticles: (customer_id: string) =>
    call<{ ok: boolean; articles: SeoArticle[] }>(`/api/seo-autopilot/articles?customer_id=${encodeURIComponent(customer_id)}`),
  updateArticle: (id: string, patch: Partial<Pick<SeoArticle, 'title' | 'meta_description' | 'body_markdown' | 'status'>>) =>
    call<{ ok: boolean; article: SeoArticle }>(`/api/seo-autopilot/articles/${encodeURIComponent(id)}`, {
      method: 'PATCH', body: JSON.stringify(patch)
    }),
  deleteArticle: (id: string) =>
    call<{ ok: boolean }>(`/api/seo-autopilot/articles/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  publishArticle: (id: string) =>
    call<{ ok: boolean; article: SeoArticle; target_type: string }>(`/api/seo-autopilot/articles/${encodeURIComponent(id)}/publish`, { method: 'POST' }),
  generateCover: (id: string) =>
    call<{ ok: boolean; provider: string; article: SeoArticle }>(`/api/seo-autopilot/articles/${encodeURIComponent(id)}/cover`, { method: 'POST' }),
  unpublishArticle: (id: string) =>
    call<{ ok: boolean; article: SeoArticle }>(`/api/seo-autopilot/articles/${encodeURIComponent(id)}/unpublish`, { method: 'POST' }),

  // Schedule (M3)
  getSchedule: (customer_id: string) =>
    call<{ ok: boolean; schedule: SeoSchedule | null }>(`/api/seo-autopilot/schedule?customer_id=${encodeURIComponent(customer_id)}`),
  saveSchedule: (schedule: SeoSchedule & { customer_id: string }) =>
    call<{ ok: boolean; schedule: SeoSchedule }>(`/api/seo-autopilot/schedule`, { method: 'POST', body: JSON.stringify(schedule) }),

  // Performance-Analytics
  refreshMetrics: (customer_id: string) =>
    call<{ ok: boolean; updated: number; date: string }>(`/api/seo-autopilot/metrics/refresh`, { method: 'POST', body: JSON.stringify({ customer_id }) }),
  listMetrics: (customer_id: string) =>
    call<{ ok: boolean; articles: Array<SeoArticle & { metric: SeoArticleMetric | null }>; totals: { impressions: number; clicks: number } }>(
      `/api/seo-autopilot/metrics?customer_id=${encodeURIComponent(customer_id)}`)
}

export type SeoTargetConfig = {
  language?: string
  // WordPress
  wp_url?: string
  wp_user?: string
  wp_app_password?: string
  wp_app_password_set?: boolean
  // Shopify
  shopify_shop?: string
  shopify_blog_id?: string
  shopify_access_token?: string
  shopify_access_token_set?: boolean
  // Webflow
  webflow_collection_id?: string
  webflow_site_url?: string
  webflow_body_field?: string
  webflow_api_token?: string
  webflow_api_token_set?: boolean
}

export type SeoSchedule = {
  id?: string
  customer_id?: string
  enabled: boolean
  cadence: 'daily' | 'weekly'
  auto_publish: boolean
  target_type?: 'in_app' | 'wordpress' | 'shopify' | 'webflow'
  target_config?: SeoTargetConfig
  next_run_at?: string | null
  last_run_at?: string | null
}
