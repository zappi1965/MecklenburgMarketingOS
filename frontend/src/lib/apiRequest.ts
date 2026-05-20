export type ApiRequestOptions = RequestInit & {
  timeoutMs?: number
  expectJson?: boolean
}

export function providerToApiKey(provider: string) {
  const key = String(provider || '').trim().toLowerCase()
  const map: Record<string, string> = {
    'google business profile': 'google-business',
    'google business': 'google-business',
    'business profile': 'google-business',
    gbp: 'google-business',
    'google search console': 'search-console',
    'search console': 'search-console',
    gsc: 'search-console',
    'google analytics': 'analytics',
    'google analytics 4': 'analytics',
    ga4: 'analytics',
    analytics: 'analytics',
    'meta business suite': 'meta',
    meta: 'meta'
  }
  return map[key] || key.replace(/\s+/g, '-').replace(/_+/g, '-')
}

export function describeApiError(error: any) {
  if (!error) return 'Unbekannter API-Fehler'
  if (error.name === 'AbortError') return 'Backend antwortet nicht innerhalb des Zeitlimits.'
  return error.message || String(error)
}

export async function apiRequest<T = any>(url: string, options: ApiRequestOptions = {}): Promise<T> {
  const { timeoutMs = 15000, expectJson = true, ...init } = options
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(expectJson ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers || {})
      },
      cache: init.cache || 'no-store'
    })

    const text = await res.text()
    const trimmed = text.trim()
    if (trimmed.startsWith('<!DOCTYPE html') || trimmed.startsWith('<html')) {
      throw new Error(`API lieferte HTML statt JSON. Prüfe Proxy/Route: ${url}`)
    }

    let payload: any = null
    try {
      payload = text ? JSON.parse(text) : null
    } catch {
      payload = { ok: false, error: text || res.statusText }
    }

    if (!res.ok || payload?.ok === false) {
      const hint = payload?.hint ? ` · ${payload.hint}` : ''
      const missing = Array.isArray(payload?.missing_env) && payload.missing_env.length
        ? ` · Fehlende ENV: ${payload.missing_env.join(', ')}`
        : ''
      throw new Error(`${payload?.error || payload?.message || `${res.status} ${res.statusText}`}${hint}${missing}`)
    }

    return payload as T
  } finally {
    clearTimeout(timeout)
  }
}
