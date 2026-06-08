import { BROWSER_BACKEND_BASE } from './backendUrl'

const API_BASE = BROWSER_BACKEND_BASE
async function request(path:string, options:RequestInit={}) {
  const res = await fetch(`${API_BASE}/api/advanced-loyalty${path}`, {
    ...options,
    headers:{ 'Content-Type':'application/json', ...(options.headers || {}) }
  })
  const data = await res.json()
  if (!res.ok || data.ok === false) throw new Error(data.error || 'Advanced Loyalty Fehler')
  return data
}
export const advancedLoyaltyClient = {
  ensureDefaults:(programId:string)=>request(`/program/${programId}/defaults`,{method:'POST'}),
  rebuild:(programId:string)=>request(`/program/${programId}/rebuild`,{method:'POST'}),
  overview:(programId:string)=>request(`/program/${programId}/overview`),
  segments:(programId:string)=>request(`/segments/${programId}`),
  createSegment:(body:any)=>request('/segments',{method:'POST',body:JSON.stringify(body)}),
  updateSegment:(id:string,body:any)=>request(`/segments/${id}`,{method:'PATCH',body:JSON.stringify(body)}),
  tiers:(programId:string)=>request(`/tiers/${programId}`),
  createTier:(body:any)=>request('/tiers',{method:'POST',body:JSON.stringify(body)}),
  updateTier:(id:string,body:any)=>request(`/tiers/${id}`,{method:'PATCH',body:JSON.stringify(body)}),
  pointRules:(programId:string)=>request(`/point-rules/${programId}`),
  createPointRule:(body:any)=>request('/point-rules',{method:'POST',body:JSON.stringify(body)}),
  calculatePoints:(body:any)=>request('/calculate-points',{method:'POST',body:JSON.stringify(body)}),
  smartActions:(programId:string)=>request(`/smart-actions/${programId}`),
  createSmartAction:(body:any)=>request('/smart-actions',{method:'POST',body:JSON.stringify(body)}),
  createMarketingFromSegment:(segmentId:string,body:any)=>request(`/segments/${segmentId}/create-marketing-campaign`,{method:'POST',body:JSON.stringify(body)})
}
