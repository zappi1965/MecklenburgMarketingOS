
'use client'

export type EnvironmentMode = 'demo' | 'live'

export const PRIMARY_DEMO_MODE_KEY = 'mmos_mode'
export const LEGACY_DEMO_BOOL_KEY = 'mmos_demo_mode'
export const DEMO_SANDBOX_KEY = 'mmos_demo_sandbox_v18'

export function isDemoFeatureEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === 'true'
}

function hasWindow() {
  return typeof window !== 'undefined'
}

export function readEnvironmentMode(): EnvironmentMode {
  if (!hasWindow()) return 'live'

  try {
    const params = new URLSearchParams(window.location.search)
    const primary = window.localStorage.getItem(PRIMARY_DEMO_MODE_KEY)
    const legacy = window.localStorage.getItem(LEGACY_DEMO_BOOL_KEY)

    if (params.get('live') === '1' || params.get('mode') === 'live') return 'live'
    if (params.has('demo') || params.get('mode') === 'demo') return 'demo'
    if (primary === 'demo' || legacy === 'true') return 'demo'

    return 'live'
  } catch {
    return 'live'
  }
}

export function isDemoMode() {
  return isDemoFeatureEnabled() && readEnvironmentMode() === 'demo'
}

export function isLiveMode() {
  return !isDemoMode()
}

export function getEnvironmentMode(): EnvironmentMode {
  return isDemoMode() ? 'demo' : 'live'
}

export function markDemoMode() {
  if (!hasWindow() || !isDemoFeatureEnabled()) return
  window.localStorage.setItem(PRIMARY_DEMO_MODE_KEY, 'demo')
  window.localStorage.setItem(LEGACY_DEMO_BOOL_KEY, 'true')
}

export function markLiveMode() {
  if (!hasWindow()) return
  window.localStorage.setItem(PRIMARY_DEMO_MODE_KEY, 'live')
  window.localStorage.setItem(LEGACY_DEMO_BOOL_KEY, 'false')
}

export function clearEnvironmentMode() {
  if (!hasWindow()) return
  window.localStorage.removeItem(PRIMARY_DEMO_MODE_KEY)
  window.localStorage.removeItem(LEGACY_DEMO_BOOL_KEY)
}

export function clearDemoSandbox() {
  if (!hasWindow()) return
  window.localStorage.removeItem(DEMO_SANDBOX_KEY)
  clearEnvironmentMode()
}

export function environmentModeLabel() {
  return isDemoMode() ? 'Demo-Umgebung' : 'Live-Umgebung'
}

export function isDemoRecord(row: any) {
  return Boolean(row?.is_demo) || String(row?.name || row?.title || row?.customer_name || '').toUpperCase().startsWith('DEMO')
}

export function shouldIncludeDemoRecord(row: any) {
  return isDemoMode() ? isDemoRecord(row) : !isDemoRecord(row)
}

export function applyEnvironmentModeToPayload<T extends Record<string, any>>(payload: T): T & { is_demo: boolean } {
  return { ...payload, is_demo: payload.is_demo ?? isDemoMode() }
}
