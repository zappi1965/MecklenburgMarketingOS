import { NextRequest } from 'next/server'

export const DEFAULT_BACKEND_URL = 'https://mecklenburgmarketingos-production.up.railway.app'

type BackendCandidate = {
  source: string
  value: string | undefined
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
  const candidates: BackendCandidate[] = [
    { source: 'BACKEND_URL', value: process.env.BACKEND_URL },
    { source: 'NEXT_PUBLIC_BACKEND_URL', value: process.env.NEXT_PUBLIC_BACKEND_URL },
    { source: 'RAILWAY_BACKEND_URL', value: process.env.RAILWAY_BACKEND_URL },
    { source: 'DEFAULT_BACKEND_URL', value: DEFAULT_BACKEND_URL }
  ]

  const incomingHost = new URL(req.url).host
  let selfReference = ''

  for (const candidate of candidates) {
    const base = normalizeBackendBase(candidate.value)
    if (!base) continue

    const backendHost = new URL(base).host
    if (backendHost === incomingHost) {
      selfReference = `${candidate.source} zeigt auf die Frontend-Domain (${base})`
      continue
    }

    return {
      base,
      source: candidate.source,
      warning: selfReference || null
    }
  }

  return {
    base: normalizeBackendBase(DEFAULT_BACKEND_URL),
    source: 'DEFAULT_BACKEND_URL',
    warning: selfReference || 'Keine gueltige Backend-URL gefunden, nutze Default.'
  }
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
