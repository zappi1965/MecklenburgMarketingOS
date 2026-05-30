'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { isActiveAdmin, isActiveCustomer } from '@/lib/routeAccessPolicy'

type GateMode = 'admin' | 'customer' | 'customer_or_admin'
function canEnter(mode: GateMode, profile: any) {
  if (mode === 'admin') return isActiveAdmin(profile)
  if (mode === 'customer') return isActiveCustomer(profile)
  return isActiveAdmin(profile) || isActiveCustomer(profile)
}
export default function RoleGate({ mode, children, fallbackTitle, fallbackText }: { mode: GateMode; children: ReactNode; fallbackTitle?: string; fallbackText?: string }) {
  const [profile, setProfile] = useState<any>(undefined)
  useEffect(() => { getCurrentUserProfile().then(setProfile).catch(() => setProfile(null)) }, [])
  if (profile === undefined) return <main className="adminPage"><section className="adminCard"><b>Zugriff wird geprüft …</b></section></main>
  if (!profile) return <main className="adminPage"><section className="adminCard"><h1>Anmeldung erforderlich</h1><p className="adminMuted">Bitte melden Sie sich an.</p><a className="adminBtn" href="/auth">Zur Anmeldung</a></section></main>
  if (!canEnter(mode, profile)) return <main className="adminPage"><section className="adminCard"><h1>{fallbackTitle || 'Kein Zugriff'}</h1><p className="adminMuted">{fallbackText || 'Dieser Bereich ist für Ihren Zugang nicht freigegeben.'}</p><a className="adminBtn" href="/dashboard">Zum Kundenbereich</a></section></main>
  return <>{children}</>
}
export function AdminOnly({ children }: { children: ReactNode }) {
  return <RoleGate mode="admin" fallbackTitle="Adminbereich geschützt" fallbackText="Dieser Bereich ist nur für interne Admin-Zugänge vorgesehen.">{children}</RoleGate>
}
export function CustomerOrAdminOnly({ children }: { children: ReactNode }) {
  return <RoleGate mode="customer_or_admin" fallbackTitle="Kundenbereich geschützt" fallbackText="Dieser Bereich ist nur für aktive Kunden- oder Admin-Zugänge freigegeben.">{children}</RoleGate>
}
