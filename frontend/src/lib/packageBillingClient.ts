
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ''

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}/api/package-billing${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  })
  const data = await res.json()
  if (!res.ok || data.ok === false) throw new Error(data.error || 'Package/Billing Fehler')
  return data
}

export const packageBillingClient = {
  catalog: () => request('/catalog'),
  customerTools: (customerId: string) => request(`/customer/${customerId}/tools`),
  requestPackage: (body: any) => request('/request', { method:'POST', body:JSON.stringify(body) }),
  grantPackage: (body: any) => request('/grant', { method:'POST', body:JSON.stringify(body) })
}

export const packageToolLabels: Record<string,string> = {
  dashboard:'Dashboard',
  invoices:'Rechnungen',
  tickets:'Tickets',
  booking:'Booking',
  integrations:'Integrationen',
  media_center:'Media Center',
  packages_billing:'Pakete & Billing',
  qr_campaigns:'QR Kampagnen',
  automations:'Automationen',
  reports:'Reports',
  seo_kpis:'SEO/KPI Daten',
  advanced_reports:'Advanced Reports',
  review_funnel:'Review Funnel',
  client_success:'Client Success',
  reviews:'Bewertungen',
  ai_insights:'AI Insights',
  loyalty:'Loyalty & Rewards',
  voice_crm:'Voice CRM'
}
