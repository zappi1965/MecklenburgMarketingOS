
import { createClient } from '@supabase/supabase-js'
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || ''
export const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
export const supabase = hasSupabase ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!) : null
