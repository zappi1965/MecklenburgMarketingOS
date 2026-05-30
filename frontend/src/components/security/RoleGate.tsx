'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { isActiveAdmin, isActiveCustomer } from '@/lib/routeAccessPolicy'

type GateMode = 'admin' | 'customer' | 'customer_or_admin'

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
        cachedProfile = null
        return null
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
  const [profile, setProfile] = useState<any>(() => cachedProfile !== undefined ? cachedProfile : readProfileCache())

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
