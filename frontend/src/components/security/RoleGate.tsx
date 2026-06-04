'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { isActiveAdmin, isActiveCustomer } from '@/lib/routeAccessPolicy'
import { isDemoMode } from '@/lib/environmentMode'

type GateMode = 'admin' | 'customer' | 'customer_or_admin'

function localProfileFallback() {
  // V103.8: localStorage role fallback is demo-only.
  if (typeof window === 'undefined' || !isDemoMode()) return undefined
  try {
    const storedRole = String(localStorage.getItem('mmos_role') || '').toLowerCase()
    const storedCustomer = localStorage.getItem('mmos_customer_id') || ''
    if (storedRole === 'admin') {
      return { role: 'admin', status: 'active', customer_id: storedCustomer || null, display_name: 'Admin', source: 'local_profile_fallback' }
    }
    if (storedRole === 'customer' && storedCustomer) {
      return { role: 'customer', status: 'active', customer_id: storedCustomer, display_name: 'Kunde', source: 'local_profile_fallback' }
    }
  } catch {}
  return undefined
}

let cachedProfile: any = undefined
let pendingProfile: Promise<any> | null = null

function canEnter(mode: GateMode, profile: any) {
  if (mode === 'admin') return isActiveAdmin(profile)
  if (mode === 'customer') return isActiveCustomer(profile)
  return isActiveAdmin(profile) || isActiveCustomer(profile)
}

function readProfileCache() {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = sessionStorage.getItem('mmos_profile_cache_v1')
    if (!raw) return undefined
    const parsed = JSON.parse(raw)
    if (!parsed?.expiresAt || parsed.expiresAt < Date.now()) return undefined
    return parsed.profile ?? null
  } catch {
    return undefined
  }
}

function writeProfileCache(profile: any) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem('mmos_profile_cache_v1', JSON.stringify({
      profile,
      expiresAt: Date.now() + 1000 * 60 * 10
    }))
  } catch {}
}

async function loadProfileOnce() {
  if (cachedProfile !== undefined) return cachedProfile
  const stored = readProfileCache()
  if (stored !== undefined) {
    cachedProfile = stored
    return cachedProfile
  }
  if (!pendingProfile) {
    pendingProfile = getCurrentUserProfile()
      .then((profile) => {
        cachedProfile = profile || null
        writeProfileCache(cachedProfile)
        return cachedProfile
      })
      .catch(() => {
        const fallback = localProfileFallback()
        cachedProfile = fallback !== undefined ? fallback : null
        if (fallback !== undefined) writeProfileCache(fallback)
        return cachedProfile
      })
      .finally(() => {
        pendingProfile = null
      })
  }
  return pendingProfile
}

export default function RoleGate({
  mode,
  children,
  fallbackTitle,
  fallbackText
}: {
  mode: GateMode
  children: ReactNode
  fallbackTitle?: string
  fallbackText?: string
}) {
  const [profile, setProfile] = useState<any>(() => cachedProfile !== undefined ? cachedProfile : (readProfileCache() ?? localProfileFallback()))

  useEffect(() => {
    if (profile !== undefined) return
    let active = true
    loadProfileOnce().then((next) => {
      if (active) setProfile(next)
    })
    return () => { active = false }
  }, [profile])

  if (profile === undefined) {
    return (
      <main className="adminPage">
        <section className="adminCard">
          <b>Zugriff wird einmalig geprüft …</b>
          <p className="adminMuted">Danach bleiben Backoffice-Tools ohne erneute Anfrage geöffnet.</p>
        </section>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="adminPage">
        <section className="adminCard">
          <h1>Anmeldung erforderlich</h1>
          <p className="adminMuted">Bitte melden Sie sich an.</p>
          <a className="adminBtn" href="/auth">Zur Anmeldung</a>
        </section>
      </main>
    )
  }

  if (!canEnter(mode, profile)) {
    return (
      <main className="adminPage">
        <section className="adminCard">
          <h1>{fallbackTitle || 'Kein Zugriff'}</h1>
          <p className="adminMuted">{fallbackText || 'Dieser Bereich ist für Ihren Zugang nicht freigegeben.'}</p>
          <a className="adminBtn" href="/dashboard">Zum Kundenbereich</a>
        </section>
      </main>
    )
  }

  return <>{children}</>
}

export function clearRoleGateProfileCache() {
  cachedProfile = undefined
  pendingProfile = null
  try { sessionStorage.removeItem('mmos_profile_cache_v1') } catch {}
}

export function AdminOnly({ children }: { children: ReactNode }) {
  return <RoleGate mode="admin" fallbackTitle="Backoffice geschützt" fallbackText="Dieser Bereich ist nur für interne Admin-Zugänge vorgesehen.">{children}</RoleGate>
}

export function CustomerOrAdminOnly({ children }: { children: ReactNode }) {
  return <RoleGate mode="customer_or_admin" fallbackTitle="Kundenbereich geschützt" fallbackText="Dieser Bereich ist nur für aktive Kunden- oder Admin-Zugänge freigegeben.">{children}</RoleGate>
}
