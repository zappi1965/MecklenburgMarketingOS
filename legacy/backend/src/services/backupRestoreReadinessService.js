async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

async function inspectBackupRestoreReadiness(supabase) {
  const env = {
    supabase_project: Boolean(process.env.SUPABASE_URL),
    backup_confirmed: String(process.env.MMOS_BACKUP_CONFIGURED || '').toLowerCase() === 'true',
    restore_test_confirmed: String(process.env.MMOS_RESTORE_TEST_GREEN || '').toLowerCase() === 'true',
    rto_minutes: Number(process.env.MMOS_RTO_MINUTES || 240),
    rpo_minutes: Number(process.env.MMOS_RPO_MINUTES || 1440)
  }
  let lastRestore = null
  if (supabase) {
    const res = await safeQuery(supabase.from('activity_logs').select('*').eq('type', 'restore_test').order('created_at', { ascending: false }).limit(1).maybeSingle())
    lastRestore = res.data || null
  }
  const checks = [
    { key: 'supabase_configured', ok: env.supabase_project, hint: 'SUPABASE_URL gesetzt.' },
    { key: 'backup_configured', ok: env.backup_confirmed, hint: 'MMOS_BACKUP_CONFIGURED=true nach Backup-Konfiguration setzen.' },
    { key: 'restore_test', ok: env.restore_test_confirmed || Boolean(lastRestore), hint: 'Restore-Test durchführen und protokollieren.' },
    { key: 'rto_defined', ok: env.rto_minutes > 0, hint: `RTO: ${env.rto_minutes} Minuten` },
    { key: 'rpo_defined', ok: env.rpo_minutes > 0, hint: `RPO: ${env.rpo_minutes} Minuten` }
  ]
  return { ok: checks.every((c) => c.ok), checks, last_restore_test: lastRestore, policy: env }
}

async function recordRestoreTest(supabase, { status = 'green', note = '', actor = 'Admin' } = {}) {
  if (!supabase) return { ok: false, error: 'Supabase nicht konfiguriert' }
  const row = {
    type: 'restore_test',
    title: `Restore-Test: ${status}`,
    message: note || 'Restore-Test protokolliert.',
    severity: status === 'green' ? 'success' : 'warning',
    actor_name: actor,
    metadata: { status, note, actor, tested_at: new Date().toISOString() },
    created_at: new Date().toISOString()
  }
  const saved = await safeQuery(supabase.from('activity_logs').insert(row).select('*').maybeSingle())
  if (saved.error) return { ok: false, error: saved.error.message }
  return { ok: true, restore_test: saved.data || row }
}

module.exports = { inspectBackupRestoreReadiness, recordRestoreTest }
