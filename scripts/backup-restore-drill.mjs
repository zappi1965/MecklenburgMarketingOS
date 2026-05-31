#!/usr/bin/env node
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
const out = process.env.BACKUP_DRILL_OUTPUT || `mmos-backup-drill-${new Date().toISOString().replace(/[:.]/g, '-')}.json`

const tables = [
  'customers',
  'customer_users',
  'user_profiles',
  'prospect_leads',
  'mini_audits',
  'generated_offers',
  'qr_campaigns',
  'customer_tool_access',
  'monthly_reports',
  'invoices',
  'customer_files',
  'sales_workflows',
  'sales_workflow_events',
  'sales_workflow_documents'
]

async function main() {
  if (!url || !key) {
    console.error('SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY fehlen.')
    process.exit(1)
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const snapshot = { exported_at: new Date().toISOString(), tables: {} }

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1000)
    snapshot.tables[table] = error
      ? { ok: false, error: error.message, rows: [] }
      : { ok: true, count: data.length, rows: data }
  }

  fs.writeFileSync(out, JSON.stringify(snapshot, null, 2))
  const parsed = JSON.parse(fs.readFileSync(out, 'utf8'))
  const restoreDryRunOk = Boolean(parsed.tables && parsed.tables.customers)

  const result = {
    ok: restoreDryRunOk,
    output: out,
    tables: Object.fromEntries(Object.entries(snapshot.tables).map(([k, v]) => [k, { ok: v.ok, count: v.count || 0, error: v.error || null }])),
    restore_mode: 'dry_run_parse_validation',
    checked_at: new Date().toISOString()
  }

  console.log(JSON.stringify(result, null, 2))
  process.exit(result.ok ? 0 : 1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
