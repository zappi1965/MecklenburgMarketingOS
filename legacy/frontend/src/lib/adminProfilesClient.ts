import { BROWSER_BACKEND_BASE } from './backendUrl'
import { supabaseAuth } from './authClient'
import { apiRequest } from './apiRequest'

const API_BASE = BROWSER_BACKEND_BASE

async function bearerHeader() {
  try {
    const { data } = await supabaseAuth.auth.getSession()
    const token = data.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

async function request(path: string, options: RequestInit = {}, setupToken = '') {
  const auth = await bearerHeader()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(auth as Record<string, string>),
    ...((options.headers || {}) as Record<string, string>)
  }
  if (setupToken) headers['x-admin-setup-token'] = setupToken
  return apiRequest(`${API_BASE}/api/admin-profiles${path}`, {
    ...options,
    headers,
    timeoutMs: 20000
  })
}

export const adminProfilesClient = {
  list: (setupToken = '') => request('/', {}, setupToken),
  create: (body: any) => request('/', { method: 'POST', body: JSON.stringify(body) }, body?.setup_token || ''),
  update: (id: string, body: any) => request(`/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) }, body?.setup_token || ''),
  setStatus: (id: string, status: string, setupToken = '') => request(`/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status, setup_token: setupToken }) }, setupToken)
}
