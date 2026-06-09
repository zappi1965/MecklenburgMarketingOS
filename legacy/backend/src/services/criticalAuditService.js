async function writeCriticalAudit(supabase, {
  user = null,
  userRole = null,
  customer_id = null,
  action,
  entity_type,
  entity_id = null,
  before = null,
  after = null,
  req = null,
  severity = 'info'
} = {}) {
  if (!supabase || !action) return null
  const actorEmail = user?.email || user?.user_metadata?.email || null
  const actorId = user?.id || null
  const payload = {
    type: 'critical_action',
    title: `${entity_type || 'system'}: ${action}`,
    message: `${actorEmail || actorId || 'System'} hat ${action} ausgeführt.`,
    ref_table: entity_type || null,
    ref_id: entity_id || null,
    customer_id: customer_id || after?.customer_id || before?.customer_id || null,
    severity,
    actor_name: actorEmail || actorId || 'System',
    metadata: {
      actor_user_id: actorId,
      actor_email: actorEmail,
      actor_role: userRole || user?.role || null,
      action,
      entity_type,
      entity_id,
      before,
      after,
      ip_hash_source: String(req?.headers?.['x-forwarded-for'] || req?.ip || '').split(',')[0].trim() || null,
      user_agent: req?.headers?.['user-agent'] || null,
      created_at: new Date().toISOString()
    },
    created_at: new Date().toISOString()
  }
  try {
    const { data } = await supabase.from('activity_logs').insert(payload).select('*').maybeSingle()
    return data || payload
  } catch (_) {
    return null
  }
}

module.exports = { writeCriticalAudit }
