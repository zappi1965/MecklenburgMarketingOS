export const DEMO_SANDBOX_KEY = 'mmos_demo_sandbox_v18'
export const DEMO_MODE_KEY = 'mmos_mode'

export function isDemoFeatureEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === 'true'
}

export function isDemoMode(_role?: string, _cid?: string) {
  if (!isDemoFeatureEnabled()) return false
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  return localStorage.getItem(DEMO_MODE_KEY) === 'demo' || params.has('demo')
}

export function markDemoMode() {
  if (typeof window !== 'undefined' && isDemoFeatureEnabled()) localStorage.setItem(DEMO_MODE_KEY, 'demo')
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
