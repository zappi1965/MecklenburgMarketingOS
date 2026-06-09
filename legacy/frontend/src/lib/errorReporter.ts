
'use client'

type ErrorMeta = Record<string, unknown>

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  }

  return { message: String(error) }
}

export function reportClientError(context: string, error: unknown, meta: ErrorMeta = {}) {
  const payload = {
    context,
    error: normalizeError(error),
    meta,
    created_at: new Date().toISOString()
  }

  if (process.env.NODE_ENV !== 'production') {
    console.warn('[MMOS client error]', payload)
  }

  if (typeof window !== 'undefined') {
    try {
      const key = 'mmos:client-error-log'
      const current = JSON.parse(window.localStorage.getItem(key) || '[]')
      const next = [payload, ...current].slice(0, 40)
      window.localStorage.setItem(key, JSON.stringify(next))
    } catch {
      // Error logging must never break the UI.
    }
  }

  return payload
}

export function reportServerError(context: string, error: unknown, meta: ErrorMeta = {}) {
  const payload = {
    context,
    error: normalizeError(error),
    meta,
    created_at: new Date().toISOString()
  }

  console.warn('[MMOS server error]', payload)
  return payload
}
