export function normalizeBackendUrl(value: string | undefined) {
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

const directBrowserBackendEnabled =
  process.env.NEXT_PUBLIC_ENABLE_DIRECT_BACKEND === 'true' ||
  process.env.NEXT_PUBLIC_USE_DIRECT_BACKEND === 'true'

export const BROWSER_BACKEND_BASE = directBrowserBackendEnabled
  ? normalizeBackendUrl(
      process.env.NEXT_PUBLIC_API_BASE ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        process.env.NEXT_PUBLIC_API_URL
    )
  : ''

export function backendApiUrl(apiPath: string) {
  const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`
  return `${BROWSER_BACKEND_BASE}${path}`
}
