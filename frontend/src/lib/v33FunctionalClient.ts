import { getCurrentSession } from './authClient'
const DEFAULT_PUBLIC_BACKEND_URL = 'https://mecklenburgmarketingos-production.up.railway.app'
const rawBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || ''
const directBackendFallback =
  process.env.NEXT_PUBLIC_ENABLE_DIRECT_BACKEND === 'true' ||
  process.env.NEXT_PUBLIC_ENABLE_DIRECT_BACKEND_FALLBACK === 'true'
const publicBackendFallbackEnabled =
  process.env.NEXT_PUBLIC_ENABLE_PUBLIC_BACKEND_FALLBACK === 'true'
const privateBackendFallbackEnabled =
  process.env.NEXT_PUBLIC_ENABLE_PRIVATE_BACKEND_FALLBACK === 'true'

function normalizeBase(url: string) {
  const value = String(url || '').trim().replace(/\/+$/, '')
  if (!value) return ''
  if (value.startsWith('http://') || value.startsWith('https://')) return value
  // V42.4: If Vercel env is pasted without protocol, fetch would hit the Next app relatively.
  return `https://${value}`
}

export const V33_API_BASE = normalizeBase(rawBackendUrl || DEFAULT_PUBLIC_BACKEND_URL)

function isSameOrigin(url: string) {
  if (!url || typeof window === 'undefined') return false
  try {
    return new URL(url).host === window.location.host
  } catch {
    return false
  }
}

function formatProxyAttempts(payload: any) {
  const attempts = Array.isArray(payload?.attempts) ? payload.attempts : []
  if (!attempts.length) return ''
  return ` · Versuche: ${attempts
    .map((a: any) => `${a.backendSource || 'Backend'} ${a.targetUrl || ''}: ${a.error || a.status || 'fehlgeschlagen'}`)
    .join(' | ')}`
}

async function authHeaders(initHeaders?: HeadersInit): Promise<Record<string, string>> {
  const current = new Headers(initHeaders || {})
  if (current.has('Authorization')) return {}
  try {
    const session = await getCurrentSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
  } catch {
    return {}
  }
}

function isPublicV33Path(path: string) {
  // Tresenmodus ist bewusst eine Mitarbeiter-/Dashboard-Funktion.
  // Obwohl die Backend-Route historisch unter /public/loyalty liegt,
  // muss hier ein eingeloggter Admin/Kunde mitgesendet werden.
  if (/^\/public\/loyalty\/[^/]+\/(counter-status|counter\/)/.test(path)) return false
  return (
    path.startsWith('/v42/health') ||
    path.startsWith('/public/loyalty/') ||
    path.startsWith('/public/reactivation/')
  )
}

function isAuthError(error: any) {
  const message = String(error?.message || error || '').toLowerCase()
  const status = Number(error?.status || 0)
  return status === 401 || message.includes('nicht authentifiziert') || message.includes('unauthenticated') || message.includes('invalid_session') || message.includes('mfa_required')
}

export async function ensureV33BackendAuthenticated() {
  const session = await getCurrentSession()
  if (!session?.access_token) throw new Error('Nicht authentifiziert: Bitte neu einloggen, bevor Live-Tools gespeichert werden.')
  return session.access_token
}

async function request(path: string, init: RequestInit = {}) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const targets: Array<{ url: string; label: string }> = []

  // V42.5: Use same-origin Vercel API proxy first:
  // Browser -> Vercel /api/v33-functional/... -> Railway Backend.
  // This avoids browser CORS/cross-origin fetch problems.
  targets.push({ url: `/api/v33-functional${normalizedPath}`, label: 'Next API Proxy' })

  // V103.8: same-origin Next API proxy is the default and only path for
  // authenticated/admin/MFA-like calls. Direct Railway fallback is opt-in and
  // public-only unless NEXT_PUBLIC_ENABLE_PRIVATE_BACKEND_FALLBACK=true.
  const publicPath = isPublicV33Path(normalizedPath)
  const allowDirectFallback = publicPath
    ? (directBackendFallback || publicBackendFallbackEnabled)
    : privateBackendFallbackEnabled
  if (V33_API_BASE && !isSameOrigin(V33_API_BASE) && allowDirectFallback) {
    targets.push({ url: `${V33_API_BASE}/api/v33-functional${normalizedPath}`, label: publicPath ? 'Public Backend Fallback' : 'Private Backend Fallback' })
  }

  let lastError: any = null

  for (const target of targets) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const authHeader = isPublicV33Path(normalizedPath) ? {} : await authHeaders(init.headers)
      let res: Response
      try {
        res = await fetch(target.url, {
          ...init,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(init.headers || {}),
            ...authHeader
          },
          cache: 'no-store'
        })
      } finally {
        clearTimeout(timeout)
      }

      const text = await res.text()

      // V42.4 HTML_RESPONSE_GUARD
      // Wrong backend URLs often return a Next/Vercel HTML 404 page.
      if (text.trim().startsWith('<!DOCTYPE html') || text.trim().startsWith('<html')) {
        const htmlError: any = new Error(`API lieferte HTML statt JSON. Prüfe Next API Proxy und BACKEND_URL. Aktueller Ziel-URL: ${target.url}`)
        htmlError.fromResponse = true
        throw htmlError
      }

      let payload: any = null
      try {
        payload = text ? JSON.parse(text) : null
      } catch {
        payload = { ok: false, error: text || res.statusText }
      }

      if (!res.ok || payload?.ok === false) {
        const message = payload?.error || payload?.message || `${res.status} ${res.statusText}`
        const hint = payload?.hint ? ` · ${payload.hint}` : ''
        const proxyAttempts = formatProxyAttempts(payload)
        const responseError: any = new Error(`${message}${hint}${proxyAttempts}`)
        responseError.fromResponse = true
        responseError.status = res.status
        throw responseError
      }

      return payload
    } catch (error: any) {
      lastError = error
      // Auth-Fehler nicht durch weitere Fallbacks kaschieren.
      // Sonst wirkt das Backend "verbunden", aber Live-Speicherung ist nicht authentifiziert.
      if (!isPublicV33Path(normalizedPath) && isAuthError(error)) throw error
    }
  }

  if (lastError?.fromResponse) throw lastError

  const attempted = targets.map((target) => target.label).join(' -> ')
  throw new Error(`Backend-Verbindung fehlgeschlagen (${attempted}). Originalfehler: ${lastError?.name === 'AbortError' ? 'Backend antwortet nicht innerhalb von 15 Sekunden' : (lastError?.message || 'fetch failed')}`)
}

export const v33FunctionalClient = {
  baseUrl: V33_API_BASE,
  request,

  listRecords: (resource: string, customerId?: string) =>
    request(`/records/${resource}${customerId ? `?customer_id=${customerId}` : ''}`),

  createRecord: (resource: string, payload: any) =>
    request(`/records/${resource}`, { method: 'POST', body: JSON.stringify(payload) }),

  updateRecord: (resource: string, localId: string, payload: any) =>
    request(`/records/${resource}/local/${localId}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  // V42.1 backward compatibility:
  // Older demo modules still call updateLocalRecord/createLocalRecord/deleteLocalRecord.
  // They map to the newer record helpers so Vercel typecheck no longer fails.
  updateLocalRecord: (resource: string, localId: string, payload: any) =>
    request(`/records/${resource}/local/${localId}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  createLocalRecord: (resource: string, payload: any) =>
    request(`/records/${resource}`, { method: 'POST', body: JSON.stringify(payload) }),

  deleteRecord: (resource: string, localId: string, customerId?: string) =>
    request(`/records/${resource}/local/${localId}${customerId ? `?customer_id=${customerId}` : ''}`, { method: 'DELETE' }),

  deleteLocalRecord: (resource: string, localId: string, customerId?: string) =>
    request(`/records/${resource}/local/${localId}${customerId ? `?customer_id=${customerId}` : ''}`, { method: 'DELETE' }),

  verifyStaffCode: (payload: any) =>
    request('/staff-codes/verify', { method: 'POST', body: JSON.stringify(payload) }),

  redeemReward: (localId: string, payload: any) =>
    request(`/rewards/${localId}/redeem`, { method: 'POST', body: JSON.stringify(payload) }),

  publicStatus: (slug: string) => request(`/public/loyalty/${slug}/status`),

  // V073: older quality-center code still calls publicLinkStatus. Keep alias for type/build compatibility.
  publicLinkStatus: (slug: string) => request(`/public/loyalty/${slug}/status`),

  publicScanStart: (slug: string) => request(`/public/loyalty/${slug}/scan-start`),

  publicCurrentQr: (slug: string) => request(`/public/loyalty/${slug}/current-qr`),

  publicCounterStatus: (slug: string) => request(`/public/loyalty/${slug}/counter-status`),

  publicCounterCodeLookup: (slug: string, payload: any) =>
    request(`/public/loyalty/${slug}/counter/code/lookup`, { method: 'POST', body: JSON.stringify(payload) }),

  publicCounterCodeRedeem: (slug: string, payload: any) =>
    request(`/public/loyalty/${slug}/counter/code/redeem`, { method: 'POST', body: JSON.stringify(payload) }),

  publicJoinOrScan: (slug: string, payload: any) =>
    request(`/public/loyalty/${slug}/join-or-scan`, { method: 'POST', body: JSON.stringify(payload) }),

  publicReview: (slug: string, payload: any) =>
    request(`/public/loyalty/${slug}/review`, { method: 'POST', body: JSON.stringify(payload) }),

  publicPasswordReset: (slug: string, payload: any) =>
    request(`/public/loyalty/${slug}/password-reset-request`, { method: 'POST', body: JSON.stringify(payload) }),

  publicMarketingConsentStatus: (slug: string, payload: any) =>
    request(`/public/loyalty/${slug}/marketing-consent/status`, { method: 'POST', body: JSON.stringify(payload) }),

  publicResendMarketingDoubleOptIn: (slug: string, payload: any) =>
    request(`/public/loyalty/${slug}/marketing-consent/resend-double-opt-in`, { method: 'POST', body: JSON.stringify(payload) }),

  publicWithdrawMarketingConsent: (slug: string, payload: any) =>
    request(`/public/loyalty/${slug}/marketing-consent/withdraw`, { method: 'POST', body: JSON.stringify(payload) }),

  publicConfirmMarketingConsent: (slug: string, token: string) =>
    request(`/public/loyalty/${slug}/marketing-consent/confirm?token=${encodeURIComponent(token)}`),

  publicRedeemReward: (slug: string, rewardId: string, payload: any) =>
    request(`/public/loyalty/${slug}/rewards/${rewardId}/redeem`, { method: 'POST', body: JSON.stringify(payload) }),

  publicReactivationStatus: (token: string) => request(`/public/reactivation/${encodeURIComponent(token)}/status`),

  publicReactivationRedeem: (token: string, payload: any) =>
    request(`/public/reactivation/${encodeURIComponent(token)}/redeem`, { method: 'POST', body: JSON.stringify(payload) }),

  reactivationMailDiagnostics: (customerId: string, qrCampaignId: string) =>
    request(`/customers/${encodeURIComponent(customerId)}/reactivation/${encodeURIComponent(qrCampaignId)}/mail-diagnostics`),

  pilotReadiness: (customerId: string) =>
    request(`/customers/${encodeURIComponent(customerId)}/pilot-readiness`),

  sendReactivationTestMail: (customerId: string, qrCampaignId: string, payload: any) =>
    request(`/customers/${encodeURIComponent(customerId)}/reactivation/${encodeURIComponent(qrCampaignId)}/test-mail`, { method: 'POST', body: JSON.stringify(payload) }),

  sendReactivationMails: (customerId: string, qrCampaignId: string, payload: any = {}) =>
    request(`/customers/${encodeURIComponent(customerId)}/reactivation/${encodeURIComponent(qrCampaignId)}/send-mails`, { method: 'POST', body: JSON.stringify(payload) }),

  sendReactivationReminders: (customerId: string, qrCampaignId: string, payload: any = {}) =>
    request(`/customers/${encodeURIComponent(customerId)}/reactivation/${encodeURIComponent(qrCampaignId)}/send-reminders`, { method: 'POST', body: JSON.stringify(payload) }),

  leads: (customerId: string) => request(`/leads/${customerId}`),

  provisionCustomer: (customerId: string, payload: any = {}) =>
    request(`/customers/${customerId}/provision`, { method: 'POST', body: JSON.stringify(payload) }),

  bootstrapCustomer: (customerId: string) => request(`/customers/${customerId}/bootstrap`),

  createQrCampaign: (customerId: string, payload: any) =>
    request(`/customers/${customerId}/qr-campaigns`, { method: 'POST', body: JSON.stringify(payload) }),

  listQrCampaigns: (customerId: string) => request(`/customers/${customerId}/qr-campaigns`),

  recalculateCustomer: (customerId: string) =>
    request(`/engine/${customerId}/recalculate`, { method: 'POST', body: JSON.stringify({}) }),

  engineReview: (customerId: string, payload: any) =>
    request(`/engine/${customerId}/review`, { method: 'POST', body: JSON.stringify(payload) }),

  runAutomation: (customerId: string, payload: any = {}) =>
    request(`/engine/${customerId}/automation/run`, { method: 'POST', body: JSON.stringify(payload) }),

  runMarketing: (customerId: string, payload: any = {}) =>
    request(`/engine/${customerId}/marketing/run`, { method: 'POST', body: JSON.stringify(payload) }),

  calculateBilling: (customerId: string) =>
    request(`/engine/${customerId}/billing/calculate`, { method: 'POST', body: JSON.stringify({}) }),

  redeemRewardEngine: (customerId: string, rewardId: string, payload: any) =>
    request(`/engine/${customerId}/rewards/${rewardId}/redeem`, { method: 'POST', body: JSON.stringify(payload) }),

  systemStatus: () => request('/v36/system-status'),
  qaReport: (customerId: string) => request(`/v36/${customerId}/qa-report`),
  runWorker: (customerId: string, payload: any = {}) =>
    request(`/v36/${customerId}/worker/run`, { method: 'POST', body: JSON.stringify(payload) }),
  resetTestData: (customerId: string) =>
    request(`/v36/${customerId}/reset-test-data`, { method: 'POST', body: JSON.stringify({}) }),

  getLoyaltySettings: (customerId: string) => request(`/v37/loyalty/${customerId}/settings`),
  saveLoyaltySettings: (customerId: string, payload: any) =>
    request(`/v37/loyalty/${customerId}/settings`, { method: 'POST', body: JSON.stringify(payload) }),
  saveV37Reward: (customerId: string, payload: any) =>
    request(`/v37/loyalty/${customerId}/rewards`, { method: 'POST', body: JSON.stringify(payload) }),
  createReferral: (customerId: string, payload: any) =>
    request(`/v37/loyalty/${customerId}/referral`, { method: 'POST', body: JSON.stringify(payload) }),
  applyBirthdayBonus: (customerId: string, payload: any) =>
    request(`/v37/loyalty/${customerId}/birthday-bonus`, { method: 'POST', body: JSON.stringify(payload) }),

  customer360: (customerId: string) => request(`/v38/${customerId}/customer-360`),
  simulateScan: (customerId: string, payload: any = {}) =>
    request(`/v38/${customerId}/simulate-scan`, { method: 'POST', body: JSON.stringify(payload) }),
  rewardHistory: (customerId: string) => request(`/v38/${customerId}/reward-history`),
  reviewLoyaltyAction: (customerId: string, payload: any) =>
    request(`/v38/${customerId}/review-loyalty-action`, { method: 'POST', body: JSON.stringify(payload) }),
  billingRevenue: (customerId: string) => request(`/v38/${customerId}/billing-revenue`),
  resetScope: (customerId: string, scope: string) =>
    request(`/v38/${customerId}/reset/${scope}`, { method: 'POST', body: JSON.stringify({}) }),
  qaChecklist: (customerId: string) => request(`/v38/${customerId}/qa-checklist`),

  schemaHealth: () => request('/v39/schema-health'),
  // V074: older Stability & Schema Guard code calls schemaStatus. Keep alias for type/build compatibility.
  schemaStatus: () => request('/v39/schema-health'),
  provisionSafe: (customerId: string, payload: any = {}) =>
    request(`/v39/${customerId}/provision-safe`, { method: 'POST', body: JSON.stringify(payload) }),

  contractTests: (customerId: string) => request(`/v40/${customerId}/contract-tests`),
  auditLog: (customerId: string) => request(`/v40/${customerId}/audit-log`),
  publicLinkHealth: (customerId: string) => request(`/v40/${customerId}/public-link-health`),

  deepModules: (customerId: string) => request(`/v41/${customerId}/deep-modules`),
  aiMessage: (customerId: string, payload: any) =>
    request(`/v41/${customerId}/ai-message`, { method: 'POST', body: JSON.stringify(payload) }),
  createMarketingEvent: (customerId: string, payload: any) =>
    request(`/v41/${customerId}/marketing-event`, { method: 'POST', body: JSON.stringify(payload) }),
  packageAction: (customerId: string, payload: any) =>
    request(`/v41/${customerId}/package-action`, { method: 'POST', body: JSON.stringify(payload) }),

  // V42
  health: () => request('/v42/health'),
  saveLoyaltyProgram: (customerId: string, payload: any) =>
    request(`/v42/${customerId}/loyalty-program`, { method: 'POST', body: JSON.stringify(payload) }),
  saveStaffAndRules: (customerId: string, payload: any) =>
    request(`/v42/${customerId}/customer-loyalty-settings`, { method: 'POST', body: JSON.stringify(payload) }),
  getCustomerLoyaltySettings: (customerId: string) =>
    request(`/v42/${customerId}/customer-loyalty-settings`),
  securityCenter: (customerId: string) => request(`/v42/${customerId}/security-center`),
  saveSecuritySettings: (customerId: string, payload: any) =>
    request(`/v42/${customerId}/security-settings`, { method: 'POST', body: JSON.stringify(payload) }),
  saveFinalSlugSettings: (qrCampaignId: string, payload: any) =>
    request(`/v42/qr-campaigns/${qrCampaignId}/final-slug-settings`, { method: 'POST', body: JSON.stringify(payload) }),
  savePackageMatrix: (customerId: string, payload: any) =>
    request(`/v42/${customerId}/package-matrix`, { method: 'POST', body: JSON.stringify(payload) }),
  getPackageMatrix: (customerId: string) => request(`/v42/${customerId}/package-matrix`),
  reviewsHub: (customerId: string) => request(`/v42/${customerId}/reviews-hub`),
  analyticsBilling: (customerId: string) => request(`/v42/${customerId}/analytics-billing`),
  packageRecommendations: (customerId: string) => request(`/v42/${customerId}/package-recommendations`)
}
