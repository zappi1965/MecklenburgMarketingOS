'use client'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { storeClient } from '@/lib/storeClient'
import { canAccessTool, accessStatus } from '@/lib/toolAccess'
import { isActiveAdmin, isActiveCustomer } from '@/lib/routeAccessPolicy'
export default function ToolAccessGate({ toolKey, children, upgradeText }: { toolKey: string; children: ReactNode; upgradeText?: string }) {
  const [profile, setProfile] = useState<any>(undefined)
  const [rules, setRules] = useState<any[]>([])
  const [loadedRules, setLoadedRules] = useState(false)
  useEffect(() => { getCurrentUserProfile().then(setProfile).catch(() => setProfile(null)) }, [])
  useEffect(() => {
    if (!profile || isActiveAdmin(profile) || !profile.customer_id) { setLoadedRules(true); return }
    Promise.all([
      storeClient.list('customer_tool_access', { customer_id: profile.customer_id, limit: 200 }).then((r: any) => r.data || []).catch(() => []),
      storeClient.list('v47_tool_access_rules', { customer_id: profile.customer_id, limit: 200 }).then((r: any) => r.data || []).catch(() => [])
    ]).then(([classic, v47]) => { setRules([...(classic || []), ...(v47 || [])]); setLoadedRules(true) })
  }, [profile])
  const allowed = useMemo(() => {
    if (!profile) return false
    if (isActiveAdmin(profile)) return true
    if (!isActiveCustomer(profile)) return false
    return canAccessTool(profile, toolKey, rules)
  }, [profile, rules, toolKey])
  if (profile === undefined || !loadedRules) return <div className="adminCard"><p className="adminMuted">Zugriff wird geprüft …</p></div>
  if (!profile) return <div className="adminCard"><h2>Anmeldung erforderlich</h2><a className="adminBtn" href="/auth">Zur Anmeldung</a></div>
  if (!allowed) return <div className="adminCard"><h2>Tool nicht freigeschaltet</h2><p className="adminMuted">{upgradeText || `Dieses Tool ist für Ihren Zugang aktuell nicht freigegeben. Status: ${accessStatus(profile, toolKey, rules)}.`}</p></div>
  return <>{children}</>
}
