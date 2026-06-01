const LIFECYCLE_STATES = [
  'lead',
  'angebot_erstellt',
  'vertrag_gesendet',
  'vertrag_angenommen',
  'onboarding',
  'pilot',
  'live',
  'pausiert',
  'gekuendigt',
  'archiviert'
]

async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

async function setCustomerLifecycleStatus(supabase, { customer_id, status, note = '', actor = 'Admin' } = {}) {
  if (!supabase || !customer_id || !status) return { ok: false, error: 'customer_id/status fehlt' }
  if (!LIFECYCLE_STATES.includes(status)) return { ok: false, error: 'Ungültiger Lifecycle-Status', allowed: LIFECYCLE_STATES }
  const now = new Date().toISOString()
  const customer = await safeQuery(supabase.from('customers').select('*').eq('id', customer_id).maybeSingle())
  if (!customer.data) return { ok: false, error: 'Kunde nicht gefunden' }
  const metadata = { ...(customer.data.metadata || {}), lifecycle_status: status, lifecycle_note: note, lifecycle_updated_at: now, lifecycle_actor: actor }
  const saved = await safeQuery(supabase.from('customers').update({ lifecycle_status: status, status: status === 'archiviert' ? 'archived' : customer.data.status, metadata, updated_at: now }).eq('id', customer_id).select('*').maybeSingle())
  await safeQuery(supabase.from('activity_logs').insert({
    customer_id,
    type: 'customer_lifecycle',
    title: `Lifecycle: ${status}`,
    message: note || `Kundenstatus auf ${status} gesetzt.`,
    severity: 'info',
    actor_name: actor,
    metadata: { before: customer.data.lifecycle_status || customer.data.metadata?.lifecycle_status || null, after: status, note, actor },
    created_at: now
  }))
  if (saved.error) return { ok: false, error: saved.error.message }
  return { ok: true, customer: saved.data, states: LIFECYCLE_STATES }
}

async function getCustomerLifecycleStatus(supabase, { customer_id } = {}) {
  if (!supabase || !customer_id) return { ok: false, error: 'customer_id fehlt' }
  const customer = await safeQuery(supabase.from('customers').select('*').eq('id', customer_id).maybeSingle())
  const logs = await safeQuery(supabase.from('activity_logs').select('*').eq('customer_id', customer_id).eq('type', 'customer_lifecycle').order('created_at', { ascending: false }).limit(50))
  return {
    ok: Boolean(customer.data),
    customer: customer.data || null,
    status: customer.data?.lifecycle_status || customer.data?.metadata?.lifecycle_status || customer.data?.status || 'lead',
    states: LIFECYCLE_STATES,
    history: logs.data || []
  }
}

module.exports = { LIFECYCLE_STATES, setCustomerLifecycleStatus, getCustomerLifecycleStatus }
