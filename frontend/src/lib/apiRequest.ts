export type ApiRequestOptions = RequestInit & {
  timeoutMs?: number
  expectJson?: boolean
  retries?: number
  retryDelayMs?: number
  diagnosticsLabel?: string
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

export function classifyApiError(error: any) {
  const message = String(error?.message || error || '').trim()
  const lower = message.toLowerCase()
  if (error?.name === 'AbortError' || lower.includes('zeit') || lower.includes('timeout')) return 'timeout'
  if (lower.includes('failed to fetch') || lower.includes('fetch failed') || lower.includes('network')) return 'network'
  if (lower.includes('401') || lower.includes('nicht angemeldet') || lower.includes('session') || lower.includes('unauthorized')) return 'auth'
  if (lower.includes('403') || lower.includes('keine berechtigung') || lower.includes('forbidden')) return 'permission'
  if (lower.includes('html statt json') || lower.includes('proxy')) return 'proxy'
  if (lower.includes('rate') || lower.includes('429')) return 'rate_limit'
  if (lower.includes('supabase') || lower.includes('schema') || lower.includes('tabelle')) return 'schema'
  return 'api'
}

export function describeApiError(error: any) {
  if (!error) return 'Unbekannter API-Fehler'
  if (error.name === 'AbortError') return 'Backend antwortet nicht innerhalb des Zeitlimits.'
  return error.message || String(error)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function shouldRetry(error: any) {
  const kind = classifyApiError(error)
  return kind === 'timeout' || kind === 'network' || kind === 'rate_limit' || kind === 'api'
}

function dispatchApiDiagnostic(detail: any) {
  try {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mmos:api-error', { detail }))
  } catch {}
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

async function apiRequestAttempt<T = any>(url: string, options: ApiRequestOptions = {}, attempt = 1): Promise<T> {
  const { timeoutMs = 15000, expectJson = true, retries, retryDelayMs, diagnosticsLabel, ...init } = options
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
      const e: any = new Error(`${payload?.error || payload?.message || `${res.status} ${res.statusText}`}${code}${hint}${missing}`)
      e.status = res.status
      e.payload = payload
      throw e
    }

    return payload as T
  } catch (error: any) {
    error.attempt = attempt
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export async function apiRequest<T = any>(url: string, options: ApiRequestOptions = {}): Promise<T> {
  const { retries = 1, retryDelayMs = 450, diagnosticsLabel } = options
  let lastError: any = null
  const attempts = Math.max(1, retries + 1)

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await apiRequestAttempt<T>(url, options, attempt)
    } catch (error: any) {
      lastError = error
      const finalAttempt = attempt >= attempts
      if (finalAttempt || !shouldRetry(error)) break
      await sleep(retryDelayMs * attempt)
    }
  }

  dispatchApiDiagnostic({
    label: diagnosticsLabel || 'API Request',
    url,
    method: options.method || 'GET',
    kind: classifyApiError(lastError),
    message: describeApiError(lastError),
    time: new Date().toISOString()
  })
  throw lastError
}
