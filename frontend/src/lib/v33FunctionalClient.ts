
const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  ''

async function request(path: string, options: RequestInit = {}) {
  if (!API_BASE) {
    throw new Error('Backend URL fehlt. Setze NEXT_PUBLIC_BACKEND_URL oder NEXT_PUBLIC_API_URL.')
  }

  const res = await fetch(`${API_BASE}/api/v33-functional${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export const v33FunctionalClient = {
  listRecords: (resource: string, customerId?: string) =>
    request(`/records/${resource}${customerId ? `?customer_id=${customerId}` : ''}`),
  createRecord: (resource: string, payload: any) =>
    request(`/records/${resource}`, { method: 'POST', body: JSON.stringify(payload) }),
  updateLocalRecord: (resource: string, localId: string, payload: any) =>
    request(`/records/${resource}/local/${localId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteLocalRecord: (resource: string, localId: string, customerId?: string) =>
    request(`/records/${resource}/local/${localId}${customerId ? `?customer_id=${customerId}` : ''}`, { method: 'DELETE' }),
  verifyStaffCode: (payload: any) =>
    request('/staff-codes/verify', { method: 'POST', body: JSON.stringify(payload) }),
  redeemReward: (rewardLocalId: string, payload: any) =>
    request(`/rewards/${rewardLocalId}/redeem`, { method: 'POST', body: JSON.stringify(payload) }),
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
    request(`/v41/${customerId}/package-action`, { method: 'POST', body: JSON.stringify(payload) })
}
