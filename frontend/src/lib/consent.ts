// DSGVO/TDDDG-Consent-Manager.
// § 25 TDDDG verlangt Opt-in vor jedem Setzen/Lesen nicht-zwingend-notwendiger
// Speicherzugriffe. Diese Datei ist die einzige Quelle für Consent-Status.

export type ConsentCategory = 'essential' | 'functional' | 'analytics' | 'marketing'

export type ConsentState = {
  version: number
  decidedAt: string | null
  essential: true
  functional: boolean
  analytics: boolean
  marketing: boolean
}

export const CONSENT_VERSION = 2
const COOKIE_NAME = 'mmos_consent_v1'
const COOKIE_MAX_AGE_DAYS = 365

const DEFAULT_STATE: ConsentState = {
  version: CONSENT_VERSION,
  decidedAt: null,
  essential: true,
  functional: false,
  analytics: false,
  marketing: false
}

type Listener = (state: ConsentState) => void
const listeners = new Set<Listener>()

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function readCookie(): string | null {
  if (!isBrowser()) return null
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE_NAME}=`))
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null
}

function writeCookie(value: string) {
  if (!isBrowser()) return
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`
}

export function getConsent(): ConsentState {
  if (!isBrowser()) return DEFAULT_STATE
  const raw = readCookie()
  if (!raw) return DEFAULT_STATE
  try {
    const parsed = JSON.parse(raw) as Partial<ConsentState>
    if (parsed.version !== CONSENT_VERSION) return DEFAULT_STATE
    return {
      version: CONSENT_VERSION,
      decidedAt: typeof parsed.decidedAt === 'string' ? parsed.decidedAt : null,
      essential: true,
      functional: Boolean(parsed.functional),
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing)
    }
  } catch {
    return DEFAULT_STATE
  }
}

export function hasDecided(): boolean {
  return Boolean(getConsent().decidedAt)
}

export function requireConsent(category: ConsentCategory): boolean {
  if (category === 'essential') return true
  return Boolean(getConsent()[category])
}

export function setConsent(partial: Partial<Pick<ConsentState, 'functional' | 'analytics' | 'marketing'>>) {
  const next: ConsentState = {
    ...getConsent(),
    ...partial,
    essential: true,
    version: CONSENT_VERSION,
    decidedAt: new Date().toISOString()
  }
  writeCookie(JSON.stringify(next))
  if (!next.functional || !next.analytics || !next.marketing) {
    purgeNonConsentedStorage(next)
  }
  for (const l of listeners) l(next)
  return next
}

export function acceptAll(): ConsentState {
  return setConsent({ functional: true, analytics: true, marketing: true })
}

export function acceptEssentialOnly(): ConsentState {
  return setConsent({ functional: false, analytics: false, marketing: false })
}

export function onConsentChange(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Storage-Keys, die einer bestimmten Consent-Kategorie zugeordnet sind.
// Wenn die Kategorie abgelehnt wird, werden die Keys entfernt.
const STORAGE_KEYS_BY_CATEGORY: Record<Exclude<ConsentCategory, 'essential'>, string[]> = {
  functional: ['mmos_device_id'],
  analytics: ['sentryReplaySession', 'sentryReplayPreviousSession', 'mmos_client_error_reporting'],
  marketing: []
}

function purgeNonConsentedStorage(state: ConsentState) {
  if (!isBrowser()) return
  try {
    for (const [cat, keys] of Object.entries(STORAGE_KEYS_BY_CATEGORY)) {
      const allowed = state[cat as Exclude<ConsentCategory, 'essential'>]
      if (allowed) continue
      for (const key of keys) {
        try { window.localStorage.removeItem(key) } catch {}
      }
    }
  } catch {}
}
