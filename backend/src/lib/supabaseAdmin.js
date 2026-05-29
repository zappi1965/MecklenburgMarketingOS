const { createClient } = require('@supabase/supabase-js')
const WebSocket = require('ws')

let cachedClient = null

function getSupabaseAdmin() {
  if (cachedClient) return cachedClient

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) return null

  cachedClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    realtime: {
      transport: WebSocket
    }
  })

  return cachedClient
}

module.exports = { getSupabaseAdmin }
