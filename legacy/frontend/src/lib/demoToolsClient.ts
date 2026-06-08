import { BROWSER_BACKEND_BASE } from './backendUrl'

const API_BASE = BROWSER_BACKEND_BASE

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}/api/demo-tools${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  })
  const data = await res.json()
  if (!res.ok || data.ok === false) throw new Error(data.error || 'Demo Tool Fehler')
  return data
}

export const demoToolsClient = {
  state: () => request('/state'),
  workflow: (key: string, body: any = {}) => request(`/workflow/${key}`, { method: 'POST', body: JSON.stringify(body) }),
  createInvoice: (body: any = {}) => request('/invoice', { method: 'POST', body: JSON.stringify(body) }),
  createQrCampaign: (body: any = {}) => request('/qr-campaign', { method: 'POST', body: JSON.stringify(body) }),
  getQrCampaign: (id: string) => request(`/qr-campaign/${id}`),
  testMail: (body: any = {}) => request('/mail/test', { method: 'POST', body: JSON.stringify(body) }),
  reset: () => request('/reset', { method: 'DELETE' })
}

export function openPdfBase64(base64: string) {
  const blob = new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

export function openQrCampaign(campaign: any) {
  const html = `
    <html>
      <head><title>${campaign.name}</title></head>
      <body style="font-family:Arial;background:#0b1020;color:white;display:grid;place-items:center;min-height:100vh;">
        <div style="text-align:center;max-width:640px;">
          <h1>${campaign.name}</h1>
          <div style="background:white;padding:20px;border-radius:20px;display:inline-block;">
            ${campaign.qr_svg || `<img src="${campaign.qr_png_base64}" style="width:320px;height:320px;" />`}
          </div>
          <p>${campaign.public_url}</p>
          <a style="color:#a78bfa" href="${campaign.public_url}" target="_blank">Review-Link öffnen</a>
        </div>
      </body>
    </html>`
  const w = window.open('', '_blank')
  if (w) {
    w.document.write(html)
    w.document.close()
  }
}
