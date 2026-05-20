import { API_BASE } from './config'
import { apiRequest, providerToApiKey } from './apiRequest'

export async function apiReadyHealth() {
  return apiRequest(`${API_BASE}/api/hardening/health`)
}

export async function systemReady() {
  return apiRequest(`${API_BASE}/api/system/ready`)
}

export async function systemSchema() {
  return apiRequest(`${API_BASE}/api/system/schema`)
}

export async function googleHealth() {
  return apiRequest(`${API_BASE}/api/google/health`)
}

export async function googleAuthUrl(customerId: string) {
  return apiRequest(`${API_BASE}/api/google/auth-url/${customerId}`)
}

export async function startGoogleAuth(customerId: string) {
  const json = await googleAuthUrl(customerId)
  if (json?.data?.url) window.open(json.data.url, '_blank')
  return json
}

export async function syncGoogleProvider(provider: string, customerId: string, payload: any = {}) {
  const providerKey = providerToApiKey(provider)
  return apiRequest(`${API_BASE}/api/google/sync/${providerKey}/${customerId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
    timeoutMs: 20000
  })
}

export { providerToApiKey }
