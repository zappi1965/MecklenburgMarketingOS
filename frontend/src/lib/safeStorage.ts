import { requireConsent, type ConsentCategory } from './consent'

export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

type StorageOptions = { category?: ConsentCategory }

export function safeLocalStorageGet<T>(key: string, fallback: T, options: StorageOptions = {}): T {
  if (typeof window === 'undefined') return fallback
  const category = options.category || 'essential'
  if (!requireConsent(category)) return fallback
  try {
    return safeJsonParse<T>(window.localStorage.getItem(key), fallback)
  } catch {
    return fallback
  }
}

export function safeLocalStorageSet(key: string, value: any, options: StorageOptions = {}): boolean {
  if (typeof window === 'undefined') return false
  const category = options.category || 'essential'
  if (!requireConsent(category)) return false
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function safeLocalStorageText(key: string, fallback = '', options: StorageOptions = {}): string {
  if (typeof window === 'undefined') return fallback
  const category = options.category || 'essential'
  if (!requireConsent(category)) return fallback
  try {
    return window.localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

export function safeLocalStorageRemove(key: string): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.removeItem(key) } catch {}
}
