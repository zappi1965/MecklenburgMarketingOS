async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

const SEVERITIES = ['low','medium','high','critical']
const STATUSES = ['open','investigating','waiting','resolved','closed']

async function listIncidents(supabase, { customer_id = null, status = null } = {}) {
  if (!supabase) return { ok: false, error: 'Supabase nicht konfiguriert', incidents: [] }
  let q = supabase.from('v33_functional_records').select('*').eq('resource', 'incidents').order('created_at', { ascending: false }).limit(500)
  if (customer_id) q = q.eq('customer_id', customer_id)
  const res = await safeQuery(q)
  if (res.error) return { ok: false, error: res.error.message, incidents: [] }
  let incidents = (res.data || []).map((r) => ({ id: r.local_id || r.id, record_id: r.id, customer_id: r.customer_id, ...(r.payload || {}), status: r.status || r.payload?.status || 'open', created_at: r.created_at, updated_at: r.updated_at }))
  if (status) incidents = incidents.filter((i) => i.status === status)
  return { ok: true, incidents, count: incidents.length }
}

async function upsertIncident(supabase, payload = {}) {
  if (!supabase) return { ok: false, error: 'Supabase nicht konfiguriert' }
  const id = payload.id || `inc_${Date.now()}_${Math.random().toString(16).slice(2)}`
  const now = new Date().toISOString()
  const incident = {
    id,
    customer_id: payload.customer_id || null,
    module: payload.module || 'system',
    severity: SEVERITIES.includes(payload.severity) ? payload.severity : 'medium',
    status: STATUSES.includes(payload.status) ? payload.status : 'open',
    title: payload.title || 'Incident',
    description: payload.description || '',
    root_cause: payload.root_cause || '',
    solution: payload.solution || '',
    notes: payload.notes || '',
    actor: payload.actor || 'Admin',
    updated_at: now
  }
  const row = {
    resource: 'incidents',
    local_id: id,
    customer_id: incident.customer_id,
    title: incident.title,
    status: incident.status,
    payload: incident,
    updated_at: now
  }
  const existing = await safeQuery(supabase.from('v33_functional_records').select('*').eq('resource','incidents').eq('local_id',id).maybeSingle())
  const saved = existing.data?.id
    ? await safeQuery(supabase.from('v33_functional_records').update(row).eq('id', existing.data.id).select('*').maybeSingle())
    : await safeQuery(supabase.from('v33_functional_records').insert({ ...row, created_at: now }).select('*').maybeSingle())
  if (saved.error) return { ok: false, error: saved.error.message }
  return { ok: true, incident: { ...incident, record_id: saved.data?.id } }
}

module.exports = { listIncidents, upsertIncident, SEVERITIES, STATUSES }
