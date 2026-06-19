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

// In-memory fallback for immediate reads after saveConsent() — the HttpOnly
// cookie cannot be read by JS, so we keep the last saved state here until
// the next page load (when the server can read the cookie directly).
let _inmemoryState: ConsentState | null = null

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

// Reads the consent cookie value. Because the cookie is now HttpOnly (set via
// the /api/consent route), document.cookie can no longer see it in the browser.
// We fall back to the in-memory copy that saveConsent() populates immediately.
function readCookieFallback(): string | null {
  if (!isBrowser()) return null
  // Legacy: if the cookie was previously written as a non-HttpOnly cookie by an
  // older version of this code it will still be visible here until it expires.
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE_NAME}=`))
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null
}

export function getConsent(): ConsentState {
  // 1. Prefer the in-memory copy (available immediately after saveConsent()).
  if (_inmemoryState) return _inmemoryState
  // 2. Fall back to a legacy non-HttpOnly cookie if still present.
  if (!isBrowser()) return DEFAULT_STATE
  const raw = readCookieFallback()
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

  // Keep an in-memory copy immediately so getConsent() returns the right value
  // before the next page reload (the HttpOnly cookie is not readable by JS).
  _inmemoryState = next

  // Persist as an HttpOnly, Secure, SameSite=Strict cookie via the API route.
  if (isBrowser()) {
    fetch('/api/consent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ categories: next })
    }).catch(() => {
      // Non-fatal: in-memory copy is still usable for the current session.
    })
  }

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
