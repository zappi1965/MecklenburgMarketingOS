async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

function boolEnv(name) {
  return String(process.env[name] || '').toLowerCase() === 'true'
}

function presentEnv(name) {
  return Boolean(String(process.env[name] || '').trim())
}

function item(key, label, ok, hint = '', external = false) {
  return { key, label, ok: Boolean(ok), hint, external_verification: Boolean(external) }
}

async function checkMigration0099(supabase) {
  if (!supabase) return { ok: false, hint: 'Supabase nicht konfiguriert.' }
  try {
    const tracked = await safeQuery(supabase.from('schema_migrations_mmos').select('*').ilike('version', '%0099%').limit(1))
    if (!tracked.error && (tracked.data || []).length) return { ok: true, hint: '0099 in schema_migrations_mmos gefunden.' }
  } catch (_) {}
  return { ok: boolEnv('MMOS_MIGRATION_0099_CONFIRMED'), hint: boolEnv('MMOS_MIGRATION_0099_CONFIRMED') ? 'Per ENV bestätigt.' : 'Migration 0099 ausführen oder MMOS_MIGRATION_0099_CONFIRMED=true setzen.' }
}

async function final99ActivationReadiness(supabase, { customer_id = null } = {}) {
  const migration = await checkMigration0099(supabase)
  const checks = [
    item('deployment_current', 'Aktueller Fullbuild ist live deployed', boolEnv('MMOS_FINAL_99_DEPLOYED'), 'Nach Live-Deploy MMOS_FINAL_99_DEPLOYED=true setzen.', true),
    item('migration_0099', 'Supabase Index-Migration 0099 ausgeführt', migration.ok, migration.hint, true),
    item('smoke_live_green', 'Production Smoke Test live grün', boolEnv('MMOS_LIVE_SMOKE_GREEN'), 'Final Hardening Center Smoke Test ausführen und MMOS_LIVE_SMOKE_GREEN=true setzen.', true),
    item('tenant_live_green', 'Tenant Isolation Audit live grün', boolEnv('MMOS_TENANT_AUDIT_GREEN'), 'Tenant Isolation live prüfen und MMOS_TENANT_AUDIT_GREEN=true setzen.', true),
    item('webhook_secrets', 'Webhook Secrets gesetzt', presentEnv('STRIPE_WEBHOOK_SECRET') || presentEnv('RESEND_WEBHOOK_SECRET') || boolEnv('MMOS_NO_WEBHOOKS_USED'), 'Genutzte Provider brauchen *_WEBHOOK_SECRET. Falls keine Webhooks genutzt werden: MMOS_NO_WEBHOOKS_USED=true.', true),
    item('mail_domain_verified', 'Mail Domain SPF/DKIM/DMARC verifiziert', boolEnv('MMOS_MAIL_DOMAIN_VERIFIED'), 'Provider-Domain verifizieren und MMOS_MAIL_DOMAIN_VERIFIED=true setzen.', true),
    item('gotenberg_live', 'Gotenberg/PDF live getestet', boolEnv('MMOS_GOTENBERG_LIVE_GREEN') || (presentEnv('GOTENBERG_URL') && boolEnv('MMOS_PDF_LIVE_GREEN')), 'PDF live erzeugen und MMOS_GOTENBERG_LIVE_GREEN=true oder MMOS_PDF_LIVE_GREEN=true setzen.', true),
    item('restore_test', 'Restore-Test in Testumgebung erfolgreich', boolEnv('MMOS_RESTORE_TEST_GREEN'), 'Restore-Test durchführen und MMOS_RESTORE_TEST_GREEN=true setzen.', true),
    item('playwright_e2e', 'Playwright E2E gegen Preview/Production grün', boolEnv('MMOS_PLAYWRIGHT_E2E_GREEN'), 'E2E laufen lassen und MMOS_PLAYWRIGHT_E2E_GREEN=true setzen.', true),
    item('legal_review', 'Anwaltliche Prüfung abgeschlossen', boolEnv('MMOS_LEGAL_REVIEW_DONE'), 'Verträge/AVV/Datenschutz/AGB prüfen lassen und MMOS_LEGAL_REVIEW_DONE=true setzen.', true)
  ]

  const missing = checks.filter((c) => !c.ok)
  const score = Math.round((checks.length - missing.length) / checks.length * 100)
  return {
    ok: missing.length === 0,
    score,
    customer_id,
    checks,
    missing,
    status: missing.length === 0 ? '99_ready' : 'external_verification_pending',
    recommendation: missing.length === 0
      ? 'System ist aus operativer Sicht 99/100 bereit. Weiterhin Monitoring laufen lassen.'
      : 'Die offenen Punkte sind Live-/Provider-/Rechtsnachweise. Code-seitig sind die Guards vorhanden.'
  }
}

async function recordFinal99Verification(supabase, { key, status = 'green', note = '', actor = 'Admin' } = {}) {
  if (!supabase || !key) return { ok: false, error: 'Supabase/key fehlt' }
  const payload = {
    type: 'final_99_verification',
    title: `99/100 Nachweis: ${key}`,
    message: note || `Status ${status}`,
    severity: status === 'green' ? 'success' : 'warning',
    actor_name: actor,
    metadata: { key, status, note, actor, verified_at: new Date().toISOString() },
    created_at: new Date().toISOString()
  }
  try {
    const { data, error } = await supabase.from('activity_logs').insert(payload).select('*').maybeSingle()
    if (error) return { ok: false, error: error.message }
    return { ok: true, verification: data || payload }
  } catch (error) {
    return { ok: false, error: error.message || String(error) }
  }
}

module.exports = { final99ActivationReadiness, recordFinal99Verification }
