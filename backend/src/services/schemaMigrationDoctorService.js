const REQUIRED = {
  customers: ['id'],
  qr_campaigns: ['id','customer_id','slug','active','metadata'],
  loyalty_programs: ['id','customer_id','slug','qr_campaign_id','points_per_scan','active','metadata'],
  loyalty_rewards: ['id','customer_id'],
  loyalty_transactions: ['id','customer_id','loyalty_customer_id','action','points','metadata'],
  review_feedback: ['id','customer_id','rating','metadata'],
  customer_tool_access: ['id','customer_id','tool_key','enabled'],
  invoices: ['id','customer_id'],
  customer_files: ['id','customer_id'],
  activity_logs: ['id']
}

async function inspectSchemaMigrationDoctor(supabase) {
  if (!supabase) return { ok: false, error: 'Supabase nicht konfiguriert', checks: [] }
  const checks = []
  for (const [table, columns] of Object.entries(REQUIRED)) {
    const result = { table, ok: false, columns: {}, missing_columns: [], hint: null }
    try {
      const q = await supabase.from(table).select(columns.join(',')).limit(1)
      if (!q.error) {
        result.ok = true
        for (const c of columns) result.columns[c] = true
      } else {
        result.hint = q.error.message
        const fallback = await supabase.from(table).select('*').limit(1)
        if (!fallback.error && Array.isArray(fallback.data)) {
          const keys = new Set(Object.keys(fallback.data[0] || {}))
          for (const c of columns) {
            result.columns[c] = keys.has(c)
            if (!keys.has(c)) result.missing_columns.push(c)
          }
          result.ok = result.missing_columns.length === 0
        }
      }
    } catch (error) {
      result.hint = error.message || String(error)
    }
    checks.push(result)
  }
  const failed = checks.filter((c) => !c.ok)
  return {
    ok: failed.length === 0,
    failed,
    checks,
    recommendation: failed.length ? 'Fehlende Migration/Spalten prüfen. Besonders 0095-0098 und finale Production-Hardening-Migrationen.' : 'Schema wirkt bereit.'
  }
}

module.exports = { inspectSchemaMigrationDoctor, REQUIRED_SCHEMA_TABLES: REQUIRED }
