import { createClient } from '@supabase/supabase-js'
import { BROWSER_BACKEND_BASE } from './backendUrl'
import { apiRequest } from './apiRequest'

export const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

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
  return apiRequest(`${BROWSER_BACKEND_BASE}/api/auth/me`, {
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

  // Best-effort fallback for local/offline development only.
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
