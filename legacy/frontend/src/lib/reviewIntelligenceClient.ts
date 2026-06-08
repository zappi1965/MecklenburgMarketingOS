
import { BROWSER_BACKEND_BASE } from './backendUrl'
import { getCurrentSession } from './authClient'

const API_BASE = BROWSER_BACKEND_BASE
async function request(path:string, options:RequestInit={}) {
  const session = await getCurrentSession()
  const auth = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
  const res = await fetch(`${API_BASE}/api/review-intelligence${path}`, {
    ...options,
    headers:{ 'Content-Type':'application/json', ...auth, ...(options.headers || {}) }
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
