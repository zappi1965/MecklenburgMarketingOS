
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ''
async function request(path:string, options:RequestInit={}) {
  const res = await fetch(`${API_BASE}/api/revenue-dynamic-billing${path}`, {
    ...options,
    headers:{ 'Content-Type':'application/json', ...(options.headers || {}) }
  })
  const data = await res.json()
  if (!res.ok || data.ok === false) throw new Error(data.error || 'Revenue Dynamic Billing Fehler')
  return data
}
export const revenueDynamicBillingClient = {
  createForecast:(customerId:string, body:any={})=>request(`/forecast/${customerId}`,{method:'POST',body:JSON.stringify(body)}),
  forecasts:(customerId:string)=>request(`/forecasts/${customerId}`),
  calculateUsage:(customerId:string, body:any={})=>request(`/usage/${customerId}`,{method:'POST',body:JSON.stringify(body)}),
  usage:(customerId:string)=>request(`/usage/${customerId}`),
  recommendPackage:(customerId:string)=>request(`/recommend-package/${customerId}`,{method:'POST'}),
  recommendations:(customerId:string)=>request(`/recommendations/${customerId}`),
  createShareRule:(body:any)=>request('/revenue-share/rules',{method:'POST',body:JSON.stringify(body)}),
  shareRules:()=>request('/revenue-share/rules'),
  calculateShare:(customerId:string, body:any)=>request(`/revenue-share/calculate/${customerId}`,{method:'POST',body:JSON.stringify(body)}),
  shareEvents:(customerId:string)=>request(`/revenue-share/events/${customerId}`)
}
