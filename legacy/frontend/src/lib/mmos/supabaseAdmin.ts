import { createClient } from '@supabase/supabase-js'
import { getRequiredEnv } from './env'

export function createSupabaseAdminClient() {
  const supabaseUrl = getRequiredEnv(
    ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'],
    'SUPABASE_URL oder NEXT_PUBLIC_SUPABASE_URL'
  )

  const serviceRoleKey = getRequiredEnv(
    ['SUPABASE_SERVICE_ROLE_KEY'],
    'SUPABASE_SERVICE_ROLE_KEY'
  )

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}
