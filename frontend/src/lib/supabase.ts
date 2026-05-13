
import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || ''

export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
export const supabase = hasSupabase ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null as any
