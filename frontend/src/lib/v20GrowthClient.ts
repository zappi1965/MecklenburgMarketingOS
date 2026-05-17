
import { BROWSER_BACKEND_BASE } from './backendUrl'

const API_BASE = BROWSER_BACKEND_BASE

async function request(path: string, options: RequestInit = {}) {
  const isForm = options.body instanceof FormData
  const res = await fetch(`${API_BASE}/api/v20-growth${path}`, {
    ...options,
    headers: isForm ? (options.headers || {}) : { 'Content-Type': 'application/json', ...(options.headers || {}) }
  })
  const data = await res.json()
  if (!res.ok || data.ok === false) throw new Error(data.error || 'MMOS Growth Feature Fehler')
  return data
}

export const v20GrowthClient = {
  generateInsights: (body:any) => request('/ai-insights/generate', { method:'POST', body:JSON.stringify(body) }),
  insights: (customerId:string) => request(`/ai-insights/${customerId}`),
  reviewSource: (body:any) => request('/reviews/source', { method:'POST', body:JSON.stringify(body) }),
  reviewFeedback: (body:any) => request('/reviews/feedback', { method:'POST', body:JSON.stringify(body) }),
  reviews: (customerId:string) => request(`/reviews/${customerId}`),
  createLoyaltyProgram: (body:any) => request('/loyalty/program', { method:'POST', body:JSON.stringify(body) }),
  linkLoyaltyQr: (body:any) => request('/loyalty/link-qr', { method:'POST', body:JSON.stringify(body) }),
  loyaltyProgram: (id:string) => request(`/loyalty/program/${id}`),
  loyaltyByQr: (qrCampaignId:string) => request(`/loyalty/by-qr/${qrCampaignId}`),
  loyaltyJoinOrScan: (slug:string, body:any) => request(`/public/loyalty/${slug}/join-or-scan`, { method:'POST', body:JSON.stringify(body) }),
  createReward: (body:any) => request('/loyalty/rewards', { method:'POST', body:JSON.stringify(body) }),
  updateReward: (id:string, body:any) => request(`/loyalty/rewards/${id}`, { method:'PATCH', body:JSON.stringify(body) }),
  rewardsForProgram: (programId:string) => request(`/loyalty/rewards/program/${programId}`),
  rewardRuleTemplates: () => request('/loyalty/reward-rule-templates'),
  checkReward: (id:string, body:any) => request(`/loyalty/rewards/${id}/check`, { method:'POST', body:JSON.stringify(body) }),
  createStaffCode: (body:any) => request('/loyalty/staff-codes', { method:'POST', body:JSON.stringify(body) }),
  updateStaffCode: (id:string, body:any) => request(`/loyalty/staff-codes/${id}`, { method:'PATCH', body:JSON.stringify(body) }),
  staffCodesForProgram: (programId:string) => request(`/loyalty/staff-codes/program/${programId}`),
  confirmRedemption: (id:string, body:any) => request(`/loyalty/redemptions/${id}/confirm`, { method:'POST', body:JSON.stringify(body) }),
  redeemReward: (body:any) => request('/loyalty/redeem', { method:'POST', body:JSON.stringify(body) }),
  createVoiceNote: (formData:FormData) => request('/voice-notes', { method:'POST', body:formData }),
  voiceNotes: (customerId:string) => request(`/voice-notes/${customerId}`)
}
