
async function safeSelect(supabase, table, queryBuilder) {
  try {
    let q = supabase.from(table).select('*')
    if (queryBuilder) q = queryBuilder(q)
    const { data, error } = await q
    if (error) return []
    return data || []
  } catch (_) {
    return []
  }
}

async function safeInsert(supabase, table, payload) {
  try {
    const { data, error } = await supabase.from(table).insert(payload).select('*').single()
    if (error) return null
    return data
  } catch (_) {
    return null
  }
}

async function safeUpsert(supabase, table, payload, options) {
  try {
    const { data, error } = await supabase.from(table).upsert(payload, options || {}).select('*').single()
    if (error) return null
    return data
  } catch (_) {
    return null
  }
}

module.exports = { safeSelect, safeInsert, safeUpsert }
