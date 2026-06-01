async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

async function inspectMailComplianceTemplates(supabase, { customer_id = null } = {}) {
  if (!supabase) return { ok: false, error: 'Supabase nicht konfiguriert', issues: [] }
  let q = supabase.from('mail_templates').select('*').limit(500)
  if (customer_id) q = q.eq('customer_id', customer_id)
  let logs = supabase.from('mail_delivery_logs').select('*').limit(500)
  if (customer_id) logs = logs.eq('customer_id', customer_id)
  const [templates, delivery] = await Promise.all([safeQuery(q), safeQuery(logs)])
  const issues = []
  if (templates.error) issues.push({ severity: 'warning', issue: 'mail_templates_table_missing_or_unreadable', hint: templates.error.message })
  if (delivery.error) issues.push({ severity: 'warning', issue: 'mail_delivery_logs_table_missing_or_unreadable', hint: delivery.error.message })
  for (const t of (templates.data || [])) {
    if (!t.version && !t.version_number) issues.push({ severity: 'info', issue: 'template_missing_version', id: t.id, name: t.name || t.title })
    if (!t.legal_basis && !t.consent_category && !t.metadata?.legal_basis) issues.push({ severity: 'warning', issue: 'template_missing_legal_basis', id: t.id, name: t.name || t.title })
    if (!t.subject) issues.push({ severity: 'warning', issue: 'template_missing_subject', id: t.id })
  }
  return { ok: !issues.some((x) => x.severity === 'critical'), issues, counts: { templates: (templates.data || []).length, delivery_logs: (delivery.data || []).length } }
}

module.exports = { inspectMailComplianceTemplates }
