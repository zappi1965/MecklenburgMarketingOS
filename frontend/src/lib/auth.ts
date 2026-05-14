
import { createClient } from '@supabase/supabase-js'

export const hasSupabaseAuth = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const authClient = hasSupabaseAuth
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  : null

export async function signInWithPassword(email: string, password: string) {
  if (!authClient) throw new Error('Supabase Auth ist nicht konfiguriert.')
  return authClient.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  if (!authClient) return
  return authClient.auth.signOut()
}

export async function getSession() {
  if (!authClient) return null
  const { data } = await authClient.auth.getSession()
  return data.session
}
