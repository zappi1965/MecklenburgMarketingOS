import { apiRequest, type ApiRequestOptions } from './apiRequest'
import { getCurrentSession } from './authClient'

export async function authHeaders(): Promise<Record<string, string>> {
  const session = await getCurrentSession()
  if (!session?.access_token) {
    throw new Error('Nicht authentifiziert: Bitte mit einem echten Admin-/Kundenkonto anmelden. Lokale Demo-Rolle reicht für geschützte Backend-Tools nicht aus.')
  }
  return { Authorization: `Bearer ${session.access_token}` }
}

export async function authenticatedApiRequest<T = any>(url: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = { ...(options.headers || {}), ...(await authHeaders()) }
  return apiRequest<T>(url, { ...options, headers })
}

export async function authenticatedDownload(url: string, fallbackName = 'download.md') {
  const headers = await authHeaders()
  const res = await fetch(url, { headers, cache: 'no-store' })
  if (!res.ok) {
    let msg = `Download fehlgeschlagen (${res.status})`
    try {
      const payload = await res.json()
      msg = payload?.error || payload?.message || msg
    } catch {}
    throw new Error(msg)
  }
  const text = await res.text()
  const cd = res.headers.get('content-disposition') || ''
  const match = cd.match(/filename="?([^"]+)"?/)
  const name = match?.[1] || fallbackName
  const blob = new Blob([text], { type: res.headers.get('content-type') || 'text/plain;charset=utf-8' })
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(href), 2000)
}
