// Public-API-Key-Service.
//
// Keys werden mit dem Prefix "mmos_<env>_" generiert, anschliessend in
// public.api_keys mit gehashtem Body gespeichert. Der Klartext wird NUR
// einmal beim Erzeugen zurueckgeliefert.
//
// Scopes:
//   read:*         Lesen
//   write:invoices, write:loyalty, write:bookings  Schreiben
//   admin:*        alle Admin-Operationen (vorsichtig vergeben)

const crypto = require('crypto')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

const VALID_SCOPES = [
  'read:invoices', 'write:invoices',
  'read:loyalty', 'write:loyalty',
  'read:appointments', 'write:appointments',
  'read:reviews', 'write:reviews',
  'read:customers', 'write:customers',
  'read:reports'
]

function envPrefix() {
  const env = process.env.NODE_ENV === 'production' ? 'live' : 'test'
  return `mmos_${env}`
}

function generateKey() {
  const body = crypto.randomBytes(24).toString('base64url')
  const fullKey = `${envPrefix()}_${body}`
  const prefix = fullKey.slice(0, 12)
  return { fullKey, prefix }
}

function hashKey(fullKey) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = crypto.scryptSync(fullKey, salt, 32).toString('hex')
  return `${salt}:${derived}`
}

function verifyKeyHash(fullKey, stored) {
  if (!stored || !stored.includes(':')) return false
  const [salt, expected] = stored.split(':')
  const derived = crypto.scryptSync(fullKey, salt, 32).toString('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(derived), Buffer.from(expected))
  } catch {
    return false
  }
}

async function createKey({ customer_id, name, scopes = [], created_by }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }
  if (!customer_id || !name) { const e = new Error('customer_id und name Pflicht'); e.status = 400; throw e }
  const cleanScopes = (scopes || []).filter((s) => VALID_SCOPES.includes(s))
  const { fullKey, prefix } = generateKey()
  const key_hash = hashKey(fullKey)
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      customer_id,
      name: String(name).slice(0, 100),
      key_prefix: prefix,
      key_hash,
      scopes: cleanScopes,
      metadata: { created_by: created_by || null }
    })
    .select('id, customer_id, name, key_prefix, scopes, created_at')
    .maybeSingle()
  if (error) throw error
  return { ...data, fullKey }
}

async function listKeys(customer_id) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, scopes, created_at, last_used_at, revoked_at')
    .eq('customer_id', customer_id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

async function revokeKey({ id, customer_id }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }
  const { data, error } = await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('customer_id', customer_id)
    .select('id, revoked_at')
    .maybeSingle()
  if (error) throw error
  return data
}

// Resolve einen vollen Key zu einem Customer + Scopes. Liefert null,
// wenn der Key unbekannt oder revoked ist.
async function resolveKey(fullKey) {
  if (typeof fullKey !== 'string' || fullKey.length < 12) return null
  const supabase = getSupabaseAdmin()
  if (!supabase) return null
  const prefix = fullKey.slice(0, 12)
  const { data } = await supabase
    .from('api_keys')
    .select('id, customer_id, key_hash, scopes, revoked_at')
    .eq('key_prefix', prefix)
    .maybeSingle()
  if (!data || data.revoked_at) return null
  if (!verifyKeyHash(fullKey, data.key_hash)) return null
  // Async last_used_at-Update — Fehler ignorieren.
  supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id).then(() => {}).catch(() => {})
  return { id: data.id, customer_id: data.customer_id, scopes: data.scopes || [] }
}

function hasScope(scopes, required) {
  if (!Array.isArray(scopes)) return false
  return scopes.includes(required)
}

module.exports = {
  createKey,
  listKeys,
  revokeKey,
  resolveKey,
  hasScope,
  VALID_SCOPES,
  // Test helpers:
  _generateKey: generateKey,
  _hashKey: hashKey,
  _verifyKeyHash: verifyKeyHash
}
