import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { apiRequest } from './apiRequest'
import { isDemoMode } from './environmentMode'

// Supabase darf beim Modul-Load NICHT crashen, wenn ENV fehlt
// (Vercel-Pre-Render ohne NEXT_PUBLIC_SUPABASE_URL).
// Stattdessen liefern wir einen Stub-Client, der bei jedem Call
// einen klaren "supabase_not_configured"-Fehler bzw. leere Daten
// zurueckgibt. Sobald die ENV gesetzt ist, laeuft alles normal.

function createStubClient(): SupabaseClient {
  const noConfig = { message: 'Supabase nicht konfiguriert (NEXT_PUBLIC_SUPABASE_URL fehlt)' }
  const emptyAuth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    signOut: async () => ({ error: null }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: noConfig }),
    signUp: async () => ({ data: { user: null, session: null }, error: noConfig }),
    resetPasswordForEmail: async () => ({ data: null, error: noConfig }),
    updateUser: async () => ({ data: { user: null }, error: noConfig }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  }
  const fromChain: any = {
    select: () => fromChain,
    insert: () => fromChain,
    update: () => fromChain,
    upsert: () => fromChain,
    delete: () => fromChain,
    eq: () => fromChain,
    ilike: () => fromChain,
    order: () => fromChain,
    limit: () => fromChain,
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: null, error: null }),
    then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve)
  }
  return {
    auth: emptyAuth,
    from: () => fromChain
  } as unknown as SupabaseClient
}

function buildAuthClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return createStubClient()
  try {
    return createClient(url, key)
  } catch {
    return createStubClient()
  }
}

export const supabaseAuth = buildAuthClient()

function browserProfileFallback(session: any) {
  // Fallback wenn Backend nicht erreichbar (Railway Cold Start, Timeout).
  // Supabase-Session (session?.user) bestätigt Authentizität — localStorage-Rolle
  // wurde beim Login via Backend gesetzt. Alle echten Datenzugriffe bleiben
  // durch Backend-Auth (Bearer Token) geschützt.
  if (typeof window === 'undefined' || !session?.user) return null
  try {
    const storedRole = String(localStorage.getItem('mmos_role') || '').toLowerCase()
    const storedCustomer = localStorage.getItem('mmos_customer_id') || ''
    const email = session.user.email || ''
    if (storedRole === 'admin') {
      return {
        id: session.user.id,
        email,
        display_name: email || 'Admin',
        role: 'admin',
        status: 'active',
        customer_id: storedCustomer || null,
        source: 'browser_fallback'
      }
    }
    if (storedRole === 'customer' && storedCustomer) {
      return {
        id: session.user.id,
        email,
        display_name: email || 'Kunde',
        role: 'customer',
        status: 'active',
        customer_id: storedCustomer,
        source: 'browser_fallback'
      }
    }
  } catch {}
  return null
}


export async function getCurrentSession() {
  const { data } = await supabaseAuth.auth.getSession()
  return data.session
}

function normalizeProfileResponse(payload: any) {
  const profile = payload?.profile || null
  if (!profile) return null
  const role = String(profile.role || '').toLowerCase()
  const status = String(profile.status || 'active').toLowerCase()
  if (role === 'admin' && status === 'active') return profile
  if (role !== 'admin' && status !== 'active') return null
  return profile
}

async function getProfileViaBackend(accessToken: string) {
  // V103.8: Auth/profile checks stay same-origin by default to avoid CORS and
  // preview-domain drift. Direct auth backend is only a deliberate debug escape hatch.
  const base = process.env.NEXT_PUBLIC_ENABLE_DIRECT_AUTH_BACKEND === 'true'
    ? String(process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '')
    : ''
  return apiRequest(`${base}/api/auth/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    timeoutMs: 15000
  })
}

// V42.23.2 AUTH GUARD FIX
// Source of truth for roles is the Railway backend using Supabase Service Role.
// The browser anon client may be blocked by RLS and must not decide that an
// existing admin is a customer just because it cannot read user_profiles.
export async function getCurrentUserProfile() {
  const session = await getCurrentSession()
  if (!session?.user || !session.access_token) return null

  try {
    const payload = await getProfileViaBackend(session.access_token)
    return normalizeProfileResponse(payload)
  } catch (error) {
    console.warn('[MMOS auth] Backend profile lookup failed, falling back to anon Supabase lookup.', error)
  }

  const browserFallback = browserProfileFallback(session)
  if (browserFallback) return browserFallback

  if (!isDemoMode() && process.env.NODE_ENV === 'production') return null

  // Best-effort fallback for local/offline development / explicit demo only.
  let profile:any = null
  const { data: byId } = await supabaseAuth
    .from('user_profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle()
  profile = byId

  if (!profile && session.user.email) {
    const { data: byEmail } = await supabaseAuth
      .from('user_profiles')
      .select('*')
      .ilike('email', session.user.email.toLowerCase())
      .maybeSingle()
    profile = byEmail
  }

  return normalizeProfileResponse({ profile })
}

export async function getCurrentUserProfilePayload() {
  const session = await getCurrentSession()
  if (!session?.user || !session.access_token) return { ok: false, profile: null, error: 'Keine aktive Session.' }
  try {
    return await getProfileViaBackend(session.access_token)
  } catch (error:any) {
    return { ok: false, profile: null, error: error?.message || String(error) }
  }
}
