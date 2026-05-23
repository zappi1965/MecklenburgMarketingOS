
import { createClient } from '@supabase/supabase-js'

export const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function getCurrentSession() {
  const { data } = await supabaseAuth.auth.getSession()
  return data.session
}

export async function getCurrentUserProfile() {
  const session = await getCurrentSession()
  if (!session?.user) return null
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

  if (!profile) return null
  const role = String(profile.role || '').toLowerCase()
  const status = String(profile.status || 'active').toLowerCase()
  if (role === 'admin' && status === 'active') return profile
  if (role !== 'admin' && status !== 'active') return null
  return profile
}
