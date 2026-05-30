function nowIso() { return new Date().toISOString() }

function safeJson(value) {
  if (value == null) return {}
  try { return JSON.parse(JSON.stringify(value)) } catch (_) { return { value: String(value).slice(0, 1000) } }
}

function redact(value) {
  const input = safeJson(value)
  const secretKeys = /(password|token|secret|api[_-]?key|authorization|cookie|staff[_-]?code|service[_-]?role)/i
  function walk(obj) {
    if (!obj || typeof obj !== 'object') return obj
    if (Array.isArray(obj)) return obj.slice(0, 50).map(walk)
    const out = {}
    for (const [key, val] of Object.entries(obj)) {
      if (secretKeys.test(key)) out[key] = '[REDACTED]'
      else if (typeof val === 'string' && val.length > 2000) out[key] = `${val.slice(0, 2000)}...[TRUNCATED]`
      else out[key] = walk(val)
    }
    return out
  }
  return walk(input)
}

async function recordAdminLog(supabase, payload = {}) {
  if (!supabase) return null
  const row = {
    event_type: payload.event_type || payload.type || 'admin_event',
    severity: payload.severity || 'info',
    actor_user_id: payload.actor_user_id || payload.user_id || null,
    actor_email: payload.actor_email || null,
    actor_role: payload.actor_role || null,
    customer_id: payload.customer_id || null,
    route: payload.route || null,
    method: payload.method || null,
    status_code: payload.status_code || null,
    ip_hash: payload.ip_hash || null,
    user_agent: payload.user_agent ? String(payload.user_agent).slice(0, 500) : null,
    message: payload.message ? String(payload.message).slice(0, 1000) : null,
    metadata: redact(payload.metadata || {}),
    created_at: payload.created_at || nowIso()
  }
  try {
    const { data, error } = await supabase.from('admin_audit_logs').insert(row).select('*').maybeSingle()
    if (error) throw error
    return data
  } catch (error) {
    // Logging darf nie den Hauptprozess blockieren.
    console.warn('[adminLogService] log failed', error?.message || String(error))
    return null
  }
}

async function listAdminLogs(supabase, query = {}) {
  if (!supabase) return []
  const limit = Math.min(500, Number(query.limit) || 100)
  let q = supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(limit)
  if (query.customer_id) q = q.eq('customer_id', String(query.customer_id))
  if (query.severity) q = q.eq('severity', String(query.severity))
  if (query.event_type) q = q.eq('event_type', String(query.event_type))
  const { data, error } = await q
  if (error) throw error
  return data || []
}

module.exports = { recordAdminLog, listAdminLogs, redact }
