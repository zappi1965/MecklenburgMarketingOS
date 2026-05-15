
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ''
async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}/api/customer-intelligence${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } })
  const data = await res.json()
  if (!res.ok || data.ok === false) throw new Error(data.error || 'Customer Intelligence Fehler')
  return data
}
export const customerIntelligenceClient = {
  event: (body:any) => request('/event', { method:'POST', body:JSON.stringify(body) }),
  timeline: (customerId:string, limit=100) => request(`/timeline/${customerId}?limit=${limit}`),
  trackTool: (body:any) => request('/track-tool', { method:'POST', body:JSON.stringify(body) }),
  toolUsage: (customerId:string) => request(`/tool-usage/${customerId}`),
  calculate: (customerId:string) => request(`/calculate/${customerId}`, { method:'POST' }),
  score: (customerId:string) => request(`/score/${customerId}`),
  createInvoiceFromAppointment: (appointmentId:string, body:any={}) => request(`/booking/${appointmentId}/create-invoice`, { method:'POST', body:JSON.stringify(body) }),
  createReviewWarning: (reviewId:string) => request(`/reviews/${reviewId}/create-warning`, { method:'POST' }),
  createQrUpsellLead: (qrCampaignId:string) => request(`/qr/${qrCampaignId}/create-upsell-lead`, { method:'POST' }),
  monthlySnapshot: (customerId:string, body:any={}) => request(`/monthly-snapshot/${customerId}`, { method:'POST', body:JSON.stringify(body) }),
  monthlySnapshots: (customerId:string) => request(`/monthly-snapshots/${customerId}`)
}
