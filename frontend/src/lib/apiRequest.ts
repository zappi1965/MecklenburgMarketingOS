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

async function resolveAuthHeader(existingHeaders: HeadersInit | undefined): Promise<Record<string, string>> {
  const current = new Headers(existingHeaders || {})
  if (current.has('Authorization')) return {}

  try {
    const mod = await import('./authClient')
    const session = await mod.getCurrentSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
  } catch {
    return {}
  }
}

function mergeHeaders(expectJson: boolean, initHeaders: HeadersInit | undefined, authHeader: Record<string, string>) {
  return {
    ...(expectJson ? { 'Content-Type': 'application/json' } : {}),
    ...(initHeaders || {}),
    ...authHeader
  }
}

export async function apiRequest<T = any>(url: string, options: ApiRequestOptions = {}): Promise<T> {
  const { timeoutMs = 15000, expectJson = true, ...init } = options
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const authHeader = await resolveAuthHeader(init.headers)

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: mergeHeaders(expectJson, init.headers, authHeader),
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
      const code = payload?.code ? ` [${payload.code}]` : ''
      throw new Error(`${payload?.error || payload?.message || `${res.status} ${res.statusText}`}${code}${hint}${missing}`)
    }

    return payload as T
  } finally {
    clearTimeout(timeout)
  }
}
