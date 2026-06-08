async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

async function inspectAuditOfferConsistency(supabase, { customer_id = null } = {}) {
  if (!supabase) return { ok: false, error: 'Supabase nicht konfiguriert', issues: [] }
  const table = (name) => {
    let q = supabase.from(name).select('*').limit(1000)
    if (customer_id) q = q.eq('customer_id', customer_id)
    return safeQuery(q)
  }
  const [audits, offers, docs] = await Promise.all([table('mini_audits'), table('generated_offers'), table('sales_workflow_documents')])
  const issues = []
  const offerRows = offers.data || []
  for (const audit of (audits.data || [])) {
    const linked = offerRows.some((o) => String(o.audit_id || o.mini_audit_id || o.metadata?.audit_id || '') === String(audit.id) || (audit.customer_id && String(o.customer_id) === String(audit.customer_id)))
    if (!linked) issues.push({ severity: 'warning', issue: 'audit_without_offer', audit_id: audit.id, customer_id: audit.customer_id })
    if (!audit.customer_id) issues.push({ severity: 'critical', issue: 'audit_missing_customer_id', audit_id: audit.id })
  }
  for (const offer of offerRows) {
    if (!offer.customer_id) issues.push({ severity: 'critical', issue: 'offer_missing_customer_id', offer_id: offer.id })
    if (!offer.package_name && !offer.package_key && !offer.plan) issues.push({ severity: 'warning', issue: 'offer_missing_package', offer_id: offer.id })
  }
  return { ok: !issues.some((i) => i.severity === 'critical'), issues, counts: { audits: (audits.data || []).length, offers: offerRows.length, workflow_documents: (docs.data || []).length } }
}

module.exports = { inspectAuditOfferConsistency }
