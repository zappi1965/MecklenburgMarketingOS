import { createClient } from '@supabase/supabase-js'
import { BROWSER_BACKEND_BASE } from './backendUrl'

export const API_BASE = BROWSER_BACKEND_BASE
export const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
export const supabase = hasSupabase ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!) : null
