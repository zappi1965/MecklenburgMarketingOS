async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

const CUSTOMER_SCOPED_TABLES = [
  'qr_campaigns','loyalty_programs','loyalty_rewards','loyalty_transactions','review_feedback',
  'customer_tool_access','invoices','customer_files','output_documents','prospect_leads',
  'generated_offers','generated_contracts','booking_slots','appointments','tickets',
  'activity_logs','v33_functional_records'
]

async function inspectTenantIsolation(supabase) {
  if (!supabase) return { ok: false, error: 'Supabase nicht konfiguriert', checks: [] }
  const checks = []
  for (const table of CUSTOMER_SCOPED_TABLES) {
    const res = await safeQuery(supabase.from(table).select('*').limit(50))
    const check = { table, exists: !res.error, ok: false, error: res.error ? res.error.message : null, missing_customer_id_rows: 0, sample_ids: [] }
    if (!res.error) {
      const rows = res.data || []
      check.missing_customer_id_rows = rows.filter((r) => !r.customer_id).length
      check.sample_ids = rows.filter((r) => !r.customer_id).map((r) => r.id).slice(0, 10)
      check.ok = check.missing_customer_id_rows === 0
    }
    checks.push(check)
  }
  const failed = checks.filter((c) => !c.ok)
  return { ok: failed.length === 0, failed, checks, recommendation: failed.length ? 'customer_id Pflicht und RLS/Scope-Checks je Tabelle prüfen.' : 'Customer-Scoped Tabellen wirken isoliert.' }
}

module.exports = { inspectTenantIsolation, CUSTOMER_SCOPED_TABLES }
