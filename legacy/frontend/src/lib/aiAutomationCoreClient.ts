
import { BROWSER_BACKEND_BASE } from './backendUrl'

const API_BASE = BROWSER_BACKEND_BASE
async function request(path:string, options:RequestInit={}) {
  const res = await fetch(`${API_BASE}/api/ai-automation-core${path}`, { ...options, headers:{ 'Content-Type':'application/json', ...(options.headers||{}) } })
  const data = await res.json()
  if (!res.ok || data.ok === false) throw new Error(data.error || 'AI Automation Core Fehler')
  return data
}
export const aiAutomationCoreClient = {
  calculateHealth:(customerId:string)=>request(`/health/${customerId}/calculate`,{method:'POST'}),
  health:(customerId:string)=>request(`/health/${customerId}`),
  generateAssistant:(customerId:string)=>request(`/assistant/${customerId}/generate`,{method:'POST'}),
  assistantMessages:(customerId:string)=>request(`/assistant/${customerId}`),
  updateMessage:(id:string,body:any)=>request(`/assistant/messages/${id}`,{method:'PATCH',body:JSON.stringify(body)}),
  runAutomations:(customerId:string,body:any={})=>request(`/automations/run/${customerId}`,{method:'POST',body:JSON.stringify(body)}),
  automationRules:()=>request('/automations/rules'),
  createAutomationRule:(body:any)=>request('/automations/rules',{method:'POST',body:JSON.stringify(body)}),
  updateAutomationRule:(id:string,body:any)=>request(`/automations/rules/${id}`,{method:'PATCH',body:JSON.stringify(body)}),
  automationRuns:(customerId:string)=>request(`/automations/runs/${customerId}`),
  createMarketingCampaign:(body:any)=>request('/marketing/campaigns',{method:'POST',body:JSON.stringify(body)}),
  marketingCampaigns:(customerId:string)=>request(`/marketing/campaigns/${customerId}`),
  updateMarketingCampaign:(id:string,body:any)=>request(`/marketing/campaigns/${id}`,{method:'PATCH',body:JSON.stringify(body)})
}
