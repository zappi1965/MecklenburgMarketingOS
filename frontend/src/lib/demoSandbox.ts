export const DEMO_SANDBOX_KEY = 'mmos_demo_sandbox_v18'
export const DEMO_MODE_KEY = 'mmos_mode'

export function isDemoFeatureEnabled() {
  const raw = String(process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE || '').trim().toLowerCase()
  const envEnabled = ['true', '1', 'yes', 'on', 'enabled'].includes(raw)
  if (envEnabled) return true
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  return params.has('demo') || localStorage.getItem(DEMO_MODE_KEY) === 'demo'
}

export function isDemoMode(_role?: string, _cid?: string) {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  return localStorage.getItem(DEMO_MODE_KEY) === 'demo' || params.has('demo')
}

export function markDemoMode() {
  if (typeof window !== 'undefined') localStorage.setItem(DEMO_MODE_KEY, 'demo')
}

export function markLiveMode() {
  if (typeof window !== 'undefined') localStorage.setItem(DEMO_MODE_KEY, 'live')
}

export function clearDemoMode() {
  if (typeof window !== 'undefined') localStorage.removeItem(DEMO_MODE_KEY)
}

export function clearDemoSandbox() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DEMO_SANDBOX_KEY)
    localStorage.removeItem(DEMO_MODE_KEY)
  }
}
