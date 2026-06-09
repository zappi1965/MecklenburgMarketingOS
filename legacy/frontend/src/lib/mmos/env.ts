export function cleanEnvValue(value: unknown): string | null {
  const cleaned = String(value ?? '').trim()

  if (!cleaned) return null

  const lowered = cleaned.toLowerCase()

  if (
    lowered === 'null' ||
    lowered === 'undefined' ||
    lowered === 'false' ||
    lowered === 'none'
  ) {
    return null
  }

  return cleaned
}

export function getOptionalEnv(keys: string[]): string | null {
  for (const key of keys) {
    const value = cleanEnvValue(process.env[key])
    if (value) return value
  }

  return null
}

export function getRequiredEnv(keys: string[], label = keys.join(' oder ')): string {
  const value = getOptionalEnv(keys)

  if (!value) {
    throw new Error(`MMOS_ENV_MISSING: ${label}`)
  }

  return value
}

export function getOptionalAbsoluteUrl(keys: string[]): string | null {
  const value = getOptionalEnv(keys)

  if (!value) return null

  try {
    const url = new URL(value)
    return url.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

export function getPublicAppUrl(): string {
  const vercelUrl = getOptionalEnv(['VERCEL_URL'])

  if (vercelUrl && !vercelUrl.startsWith('http')) {
    return `https://${vercelUrl}`.replace(/\/$/, '')
  }

  return (
    getOptionalAbsoluteUrl([
      'NEXT_PUBLIC_APP_URL',
      'PUBLIC_APP_URL',
      'FRONTEND_URL',
      'VERCEL_URL'
    ]) ?? 'http://localhost:3000'
  )
}

export function getGotenbergUrl(): string | null {
  return getOptionalAbsoluteUrl(['GOTENBERG_URL'])
}

export function isLiveProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}
