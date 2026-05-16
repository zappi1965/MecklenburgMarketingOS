
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
  const { data, error } = await supabaseAuth
    .from('user_profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle()
  if (error) return null
  return data
}
