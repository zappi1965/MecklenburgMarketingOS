'use client'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { storeClient } from '@/lib/storeClient'
import { canAccessTool, accessStatus } from '@/lib/toolAccess'
import { isActiveAdmin, isActiveCustomer } from '@/lib/routeAccessPolicy'

let cachedProfile: any = undefined
let pendingProfile: Promise<any> | null = null
const rulesMemoryCache = new Map<string, any[]>()

function readSessionJson(key: string) {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return undefined
    const parsed = JSON.parse(raw)
    if (!parsed?.expiresAt || parsed.expiresAt < Date.now()) return undefined
    return parsed.value
  } catch { return undefined }
}

function writeSessionJson(key: string, value: any, ttlMs = 1000 * 60 * 10) {
  if (typeof window === 'undefined') return
  try { sessionStorage.setItem(key, JSON.stringify({ value, expiresAt: Date.now() + ttlMs })) } catch {}
}

async function loadProfileOnce() {
  if (cachedProfile !== undefined) return cachedProfile
  const stored = readSessionJson('mmos_profile_cache_v1')
  if (stored !== undefined) { cachedProfile = stored; return cachedProfile }
  if (!pendingProfile) {
    pendingProfile = getCurrentUserProfile()
      .then((profile) => { cachedProfile = profile || null; writeSessionJson('mmos_profile_cache_v1', cachedProfile); return cachedProfile })
      .catch(() => { cachedProfile = null; return null })
      .finally(() => { pendingProfile = null })
  }
  return pendingProfile
}

async function loadRulesOnce(customerId: string) {
  const cacheKey = `mmos_tool_access_cache_v1:${customerId}`
  if (rulesMemoryCache.has(customerId)) return rulesMemoryCache.get(customerId) || []
  const stored = readSessionJson(cacheKey)
  if (stored !== undefined) { rulesMemoryCache.set(customerId, stored || []); return stored || [] }

  const [classic, v47] = await Promise.all([
    storeClient.list('customer_tool_access', { customer_id: customerId, limit: 200 }).then((r: any) => r.data || []).catch(() => []),
    storeClient.list('v47_tool_access_rules', { customer_id: customerId, limit: 200 }).then((r: any) => r.data || []).catch(() => [])
  ])
  const rules = [...(classic || []), ...(v47 || [])]
  rulesMemoryCache.set(customerId, rules)
  writeSessionJson(cacheKey, rules)
  return rules
}

export function clearToolAccessCache(customerId?: string) {
  if (customerId) rulesMemoryCache.delete(customerId)
  else rulesMemoryCache.clear()
  if (typeof window === 'undefined') return
  try {
    if (customerId) sessionStorage.removeItem(`mmos_tool_access_cache_v1:${customerId}`)
    else Object.keys(sessionStorage).filter((key) => key.startsWith('mmos_tool_access_cache_v1:')).forEach((key) => sessionStorage.removeItem(key))
  } catch {}
}

export default function ToolAccessGate({ toolKey, children, upgradeText }: { toolKey: string; children: ReactNode; upgradeText?: string }) {
  const [profile, setProfile] = useState<any>(() => cachedProfile !== undefined ? cachedProfile : readSessionJson('mmos_profile_cache_v1'))
  const [rules, setRules] = useState<any[]>([])
  const [loadedRules, setLoadedRules] = useState(false)

  useEffect(() => {
    if (profile !== undefined) return
    let active = true
    loadProfileOnce().then((next) => { if (active) setProfile(next) })
    return () => { active = false }
  }, [profile])

  useEffect(() => {
    if (profile === undefined) return
    if (!profile || isActiveAdmin(profile) || !profile.customer_id) { setLoadedRules(true); return }
    let active = true
    loadRulesOnce(profile.customer_id).then((nextRules) => {
      if (!active) return
      setRules(nextRules)
      setLoadedRules(true)
    })
    return () => { active = false }
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
