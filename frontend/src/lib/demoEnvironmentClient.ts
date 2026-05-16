const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ''

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}/api/demo-environment${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  })
  const data = await res.json()
  if (!res.ok || data.ok === false) throw new Error(data.error || 'Demo Environment Fehler')
  return data
}

export const demoEnvironmentClient = {
  dashboard: () => request('/dashboard'),
  check: () => request('/check', { method: 'POST' }),
  customerId: () => request('/customer-id')
}
