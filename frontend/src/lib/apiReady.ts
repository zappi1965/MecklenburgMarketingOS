
import { API_BASE } from './config'

export async function apiReadyHealth() {
  if (!API_BASE) return { ok: false, error: 'NEXT_PUBLIC_API_BASE fehlt' }
  const r = await fetch(`${API_BASE}/api/hardening/health`)
  return r.json()
}

export async function googleAuthUrl(customerId: string) {
  const r = await fetch(`${API_BASE}/api/google/auth-url/${customerId}`)
  return r.json()
}

export async function startGoogleAuth(customerId: string) {
  const json = await googleAuthUrl(customerId)
  if (json?.data?.url) window.open(json.data.url, '_blank')
  return json
}

export async function syncGoogleProvider(provider: string, customerId: string, payload: any = {}) {
  const r = await fetch(`${API_BASE}/api/google/sync/${provider}/${customerId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return r.json()
}
