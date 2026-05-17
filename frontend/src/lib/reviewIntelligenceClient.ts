
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ''
async function request(path:string, options:RequestInit={}) {
  const res = await fetch(`${API_BASE}/api/review-intelligence${path}`, {
    ...options,
    headers:{ 'Content-Type':'application/json', ...(options.headers || {}) }
  })
  const data = await res.json()
  if (!res.ok || data.ok === false) throw new Error(data.error || 'Review Intelligence Fehler')
  return data
}
export const reviewIntelligenceClient = {
  analyzeReview:(reviewId:string)=>request(`/analyze-review/${reviewId}`,{method:'POST'}),
  analyzeCustomer:(customerId:string)=>request(`/analyze-customer/${customerId}`,{method:'POST'}),
  rebuildProfile:(customerId:string)=>request(`/rebuild-profile/${customerId}`,{method:'POST'}),
  profile:(customerId:string)=>request(`/profile/${customerId}`),
  items:(customerId:string)=>request(`/items/${customerId}`),
  topics:()=>request('/topics'),
  createTopic:(body:any)=>request('/topics',{method:'POST',body:JSON.stringify(body)}),
  templates:(customerId?:string)=>request(`/templates${customerId?`/${customerId}`:''}`),
  createTemplate:(body:any)=>request('/templates',{method:'POST',body:JSON.stringify(body)})
}
