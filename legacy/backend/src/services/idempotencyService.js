function ttlDate(seconds = 86400) {
  return new Date(Date.now() + Number(seconds || 86400) * 1000).toISOString()
}

async function getOrCreateIdempotency(supabase, { key, scope = 'default', response = null, ttlSeconds = 86400 } = {}) {
  if (!supabase || !key) return { hit: false, record: null }
  const normalized = String(key).slice(0, 250)
  const { data: existing } = await supabase
    .from('idempotency_keys')
    .select('*')
    .eq('key', normalized)
    .eq('scope', scope)
    .maybeSingle()
  if (existing && existing.response) return { hit: true, record: existing }

  const payload = {
    key: normalized,
    scope,
    response,
    expires_at: ttlDate(ttlSeconds),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  const { data, error } = await supabase
    .from('idempotency_keys')
    .upsert(payload, { onConflict: 'key,scope' })
    .select('*')
    .maybeSingle()
  if (error) return { hit: false, record: null, error }
  return { hit: false, record: data }
}

async function storeIdempotencyResponse(supabase, { key, scope = 'default', response } = {}) {
  if (!supabase || !key) return null
  const { data } = await supabase
    .from('idempotency_keys')
    .update({ response, updated_at: new Date().toISOString() })
    .eq('key', String(key).slice(0, 250))
    .eq('scope', scope)
    .select('*')
    .maybeSingle()
  return data || null
}

module.exports = { getOrCreateIdempotency, storeIdempotencyResponse }
