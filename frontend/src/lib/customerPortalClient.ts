
const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  ''

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}/api/customer-portal${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  })
  const data = await res.json()
  if (!res.ok || data.ok === false) throw new Error(data.error || 'Kundenportal Fehler')
  return data
}

export const customerPortalClient = {
  register: (body: any) => request('/register', { method: 'POST', body: JSON.stringify(body) }),
  registrations: () => request('/registrations'),
  approve: (id: string, body: any = {}) => request(`/approve/${id}`, { method: 'POST', body: JSON.stringify(body) }),
  packageRequest: (body: any) => request('/package-request', { method: 'POST', body: JSON.stringify(body) }),
}
