const rawBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || ''
const localFallback = process.env.NEXT_PUBLIC_USE_LOCAL_API_FALLBACK === 'true'

function normalizeBase(url: string) {
  return String(url || '').replace(/\/+$/, '')
}

export const V33_API_BASE = normalizeBase(rawBackendUrl)

async function request(path: string, init: RequestInit = {}) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const targets = []

  if (V33_API_BASE) {
    targets.push(`${V33_API_BASE}/api/v33-functional${normalizedPath}`)
  }

  // Same-origin fallback is useful if Next rewrites/proxy are configured.
  // It also gives a clearer error than raw TypeError: fetch failed.
  if (!V33_API_BASE || localFallback) {
    targets.push(`/api/v33-functional${normalizedPath}`)
  }

  let lastError: any = null

  for (const url of targets) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init.headers || {})
        },
        cache: 'no-store'
      })

      const text = await res.text()
      let payload: any = null
      try {
        payload = text ? JSON.parse(text) : null
      } catch {
        payload = { ok: false, error: text || res.statusText }
      }

      if (!res.ok || payload?.ok === false) {
        const message = payload?.error || payload?.message || `${res.status} ${res.statusText}`
        const hint = payload?.hint ? ` · ${payload.hint}` : ''
        throw new Error(`${message}${hint}`)
      }

      return payload
    } catch (error: any) {
      lastError = error
    }
  }

  const baseHint = V33_API_BASE
    ? `Backend nicht erreichbar: ${V33_API_BASE}`
    : 'NEXT_PUBLIC_BACKEND_URL fehlt oder ist leer.'

  throw new Error(`${baseHint}. Originalfehler: ${lastError?.message || 'fetch failed'}`)
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

  publicJoinOrScan: (slug: string, payload: any) =>
    request(`/public/loyalty/${slug}/join-or-scan`, { method: 'POST', body: JSON.stringify(payload) }),

  publicReview: (slug: string, payload: any) =>
    request(`/public/loyalty/${slug}/review`, { method: 'POST', body: JSON.stringify(payload) }),

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
  resetDemoData: (customerId: string) =>
    request(`/v36/${customerId}/reset-demo-data`, { method: 'POST', body: JSON.stringify({}) }),

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
  savePackageMatrix: (customerId: string, payload: any) =>
    request(`/v42/${customerId}/package-matrix`, { method: 'POST', body: JSON.stringify(payload) }),
  getPackageMatrix: (customerId: string) => request(`/v42/${customerId}/package-matrix`),
  reviewsHub: (customerId: string) => request(`/v42/${customerId}/reviews-hub`),
  analyticsBilling: (customerId: string) => request(`/v42/${customerId}/analytics-billing`),
  packageRecommendations: (customerId: string) => request(`/v42/${customerId}/package-recommendations`)
}
