
const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  ''

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}/api/enterprise${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  })
  const data = await res.json()
  if (!res.ok || data.ok === false) throw new Error(data.error || 'Enterprise API Fehler')
  return data
}

export const enterpriseClient = {
  overview: () => request('/overview'),
  runPreset: (preset: string, body: any = {}) => request(`/run-preset/${preset}`, { method: 'POST', body: JSON.stringify(body) }),
  planBackup: (body: any = {}) => request('/backup', { method: 'POST', body: JSON.stringify(body) }),
  setFeatureFlag: (body: any) => request('/feature-flags', { method: 'POST', body: JSON.stringify(body) }),
  logEvent: (body: any) => request('/events', { method: 'POST', body: JSON.stringify(body) })
}
