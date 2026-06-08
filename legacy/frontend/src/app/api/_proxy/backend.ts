import { NextRequest } from 'next/server'

export const DEFAULT_BACKEND_URL = 'https://mecklenburgmarketingos-production.up.railway.app'

type BackendCandidate = {
  source: string
  value: string | undefined
}

export type ResolvedBackend = {
  base: string
  source: string
  warning: string | null
}

export function normalizeBackendBase(value: string | undefined) {
  const raw = String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\/+$/, '')

  if (!raw) return ''

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`

  try {
    return new URL(withProtocol).origin
  } catch {
    return ''
  }
}

export function resolveBackendBase(req: NextRequest) {
  return resolveBackendCandidates(req)[0]
}

function isBrowserOnlyOrPrivateHost(hostname: string) {
  const host = hostname.toLowerCase()
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.railway.internal')
  )
}

export function resolveBackendCandidates(req: NextRequest): ResolvedBackend[] {
  const candidates: BackendCandidate[] = [
    { source: 'BACKEND_URL', value: process.env.BACKEND_URL },
    { source: 'NEXT_PUBLIC_BACKEND_URL', value: process.env.NEXT_PUBLIC_BACKEND_URL },
    { source: 'RAILWAY_BACKEND_URL', value: process.env.RAILWAY_BACKEND_URL },
    { source: 'DEFAULT_BACKEND_URL', value: DEFAULT_BACKEND_URL }
  ]

  const incomingHost = new URL(req.url).host
  let selfReference = ''
  const resolved: ResolvedBackend[] = []
  const seen = new Set<string>()

  for (const candidate of candidates) {
    const base = normalizeBackendBase(candidate.value)
    if (!base) continue

    const backendUrl = new URL(base)
    const backendHost = backendUrl.host
    if (backendHost === incomingHost) {
      selfReference = `${candidate.source} zeigt auf die Frontend-Domain (${base})`
      continue
    }

    if (isBrowserOnlyOrPrivateHost(backendUrl.hostname)) {
      selfReference = `${candidate.source} ist von Vercel nicht oeffentlich erreichbar (${base})`
      continue
    }

    if (seen.has(base)) continue
    seen.add(base)
    resolved.push({
      base,
      source: candidate.source,
      warning: selfReference || null
    })
  }

  const fallback = normalizeBackendBase(DEFAULT_BACKEND_URL)
  if (!seen.has(fallback)) {
    resolved.push({
      base: fallback,
      source: 'DEFAULT_BACKEND_URL',
      warning: selfReference || 'Keine gueltige Backend-URL gefunden, nutze Default.'
    })
  }

  return resolved
}

export function cleanProxyHeaders(req: NextRequest) {
  const headers = new Headers(req.headers)
  headers.delete('host')
  headers.delete('connection')
  headers.delete('content-length')
  headers.delete('accept-encoding')
  headers.delete('x-forwarded-host')
  headers.delete('x-forwarded-proto')
  headers.delete('x-forwarded-port')
  return headers
}

export function isHtmlResponse(text: string) {
  const trimmed = text.trim().toLowerCase()
  return trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html')
}

export function proxyErrorMessage(error: any) {
  const main = error?.message || String(error || 'fetch failed')
  const cause = error?.cause?.message || error?.cause?.code
  return cause ? `${main}: ${cause}` : main
}
