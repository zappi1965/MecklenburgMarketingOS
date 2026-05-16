
export const DEMO_SANDBOX_KEY = 'mmos_demo_sandbox_v18'

export function isDemoMode(role: string, cid?: string) {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('mmos_mode') === 'demo' || role === 'admin' || role === 'customer'
}

export function markDemoMode() {
  if (typeof window !== 'undefined') localStorage.setItem('mmos_mode', 'demo')
}

export function markLiveMode() {
  if (typeof window !== 'undefined') localStorage.setItem('mmos_mode', 'live')
}

export function clearDemoSandbox() {
  if (typeof window !== 'undefined') localStorage.removeItem(DEMO_SANDBOX_KEY)
}
