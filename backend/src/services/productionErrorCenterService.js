async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

async function inspectProductionErrors(supabase, { customer_id = null, limit = 100 } = {}) {
  if (!supabase) return { ok: false, error: 'Supabase nicht konfiguriert', errors: [] }
  let logs = supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(Number(limit || 100))
  if (customer_id) logs = logs.eq('customer_id', customer_id)
  const res = await safeQuery(logs)
  if (res.error) return { ok: false, error: res.error.message, errors: [] }
  const rows = (res.data || []).filter((r) => {
    const s = String(r.severity || r.status || r.type || '').toLowerCase()
    const txt = `${r.title || ''} ${r.message || ''}`.toLowerCase()
    return ['error','critical','failed','warning'].includes(s) || txt.includes('error') || txt.includes('failed') || txt.includes('fehl')
  })
  return {
    ok: rows.filter((r) => ['error','critical','failed'].includes(String(r.severity || r.status || '').toLowerCase())).length === 0,
    errors: rows,
    count: rows.length,
    checked_at: new Date().toISOString()
  }
}

module.exports = { inspectProductionErrors }
