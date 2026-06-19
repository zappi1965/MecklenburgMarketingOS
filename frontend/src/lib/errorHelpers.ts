
export function readableError(error: any) {
  if (!error) return 'Unbekannter Fehler'
  if (typeof error === 'string') return error
  if (error.message) return error.message
  if (error.error) return error.error
  return 'Aktion fehlgeschlagen'
}

export function assertClientEnv() {
  const missing: string[] = []
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return missing
}
