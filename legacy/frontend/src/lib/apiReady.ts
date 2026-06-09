import { API_BASE } from './config'
import { apiRequest, providerToApiKey } from './apiRequest'
import { getCurrentSession } from './authClient'

async function authHeaders(): Promise<Record<string, string>> {
  try {
    const session = await getCurrentSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
  } catch {
    return {}
  }
}

async function systemRequest(path: string, options: any = {}) {
  return apiRequest(`${API_BASE}${path}`, {
    ...options,
    headers: { ...(await authHeaders()), ...(options.headers || {}) }
  })
}

export async function apiReadyHealth() {
  return systemRequest('/api/hardening/health')
}

export async function systemReady() {
  return systemRequest('/api/system/ready')
}

export async function systemStatus() {
  return systemRequest('/api/system/status')
}

export async function systemSchema() {
  return systemRequest('/api/system/schema')
}

export async function integrationStatus() {
  return systemRequest('/api/system/integration-status')
}

export async function systemSecurityCenter() {
  return systemRequest('/api/system/security-center', { timeoutMs: 15000 })
}

export async function googleHealth() {
  return systemRequest('/api/google/health')
}

export async function googleAuthUrl(customerId: string) {
  return systemRequest(`/api/google/auth-url/${customerId}`)
}

export async function startGoogleAuth(customerId: string) {
  const json = await googleAuthUrl(customerId)
  if (json?.data?.url) window.open(json.data.url, '_blank')
  return json
}

export async function syncGoogleProvider(provider: string, customerId: string, payload: any = {}) {
  const providerKey = providerToApiKey(provider)
  return systemRequest(`/api/google/sync/${providerKey}/${customerId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
    timeoutMs: 20000
  })
}

export { providerToApiKey }
