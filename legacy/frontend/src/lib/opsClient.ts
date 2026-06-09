
import { BROWSER_BACKEND_BASE } from './backendUrl'

const API_BASE = BROWSER_BACKEND_BASE

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}/api/ops${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  })
  const data = await res.json()
  if (!res.ok || data.ok === false) throw new Error(data.error || 'MMOS Ops Fehler')
  return data
}

export const opsClient = {
  grantPackage: (body:any) => request('/packages/grant', { method:'POST', body:JSON.stringify(body) }),
  grantTool: (body:any) => request('/tools/grant', { method:'POST', body:JSON.stringify(body) }),
  createInvoicePdf: (body:any) => request('/invoices/create-pdf', { method:'POST', body:JSON.stringify(body) }),
  invoicePdf: (id:string) => request(`/invoices/${id}/pdf`),
  appointment: (id:string) => request(`/appointments/${id}`),
  pipelineLead: (body:any) => request('/pipeline/lead', { method:'POST', body:JSON.stringify(body) }),
  automation: (key:string, body:any={}) => request(`/automation/${key}`, { method:'POST', body:JSON.stringify(body) }),
  workflow: (key:string, body:any={}) => request(`/workflows/${key}`, { method:'POST', body:JSON.stringify(body) }),
  createQr: (body:any) => request('/qr-campaigns', { method:'POST', body:JSON.stringify(body) }),
  qrDetail: (id:string) => request(`/qr-campaigns/${id}`),
  revenue: (customerId:string) => request(`/customer/${customerId}/revenue`),
  successScore: (customerId:string) => request(`/success-score/${customerId}`),
  saveSuccessScoreConfig: (body:any) => request('/success-score/config', { method:'POST', body:JSON.stringify(body) }),
  advancedReport: (body:any) => request('/reports/advanced', { method:'POST', body:JSON.stringify(body) }),
  googleStatus: () => request('/integrations/google/status')
}

export function openBase64Pdf(base64:string) {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  const blob = new Blob([bytes], { type:'application/pdf' })
  window.open(URL.createObjectURL(blob), '_blank')
}

export function openQrWindow(campaign:any) {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`<html><body style="background:#0b1020;color:white;font-family:Arial;display:grid;place-items:center;min-height:100vh;"><div style="text-align:center"><h1>${campaign.name}</h1><div style="background:white;padding:20px;border-radius:18px">${campaign.qr_svg || `<img src="${campaign.qr_png_base64}" />`}</div><p>${campaign.public_url}</p><a href="${campaign.public_url}" target="_blank" style="color:#a78bfa">öffnen</a></div></body></html>`)
  w.document.close()
}
