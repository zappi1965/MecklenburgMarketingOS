const { final99ActivationReadiness } = require('./final99ActivationService')
const { inspectMailDomainReadiness } = require('./mailDomainLiveReadinessService')
const { inspectCustomerSupportDiagnostics } = require('./supportDiagnosticsService')
const { inspectBillingConsistency } = require('./billingConsistencyGuardService')
const { calculateRetentionIntelligence } = require('./retentionIntelligenceSuiteService')
const { inspectCustomerGoLiveChecklist } = require('./customerGoLiveChecklistService')
const { inspectBackupRestoreReadiness } = require('./backupRestoreReadinessService')

async function safe(fn, fallback) {
  try { return await fn() } catch (error) { return { ok:false, error: error.message || String(error), ...(fallback || {}) } }
}

function statusOf(result) {
  if (!result) return 'unknown'
  if (result.ok === true) return 'green'
  if (result.score >= 80) return 'yellow'
  return 'red'
}

function moduleItem(key, label, result, href, weight = 1) {
  const status = statusOf(result)
  return { key, label, status, ok: status === 'green', href, weight, result }
}

async function goLiveCockpitOverview(supabase, { customer_id = null } = {}) {
  const [activation, mail, support, billing, retention, customerGoLive, backup] = await Promise.all([
    safe(() => final99ActivationReadiness(supabase, { customer_id }), { score: 0, checks: [] }),
    safe(() => inspectMailDomainReadiness({ domain: process.env.MAIL_DOMAIN || 'mecklenburgmarketing.de' }), { checks: [] }),
    customer_id ? safe(() => inspectCustomerSupportDiagnostics(supabase, { customer_id }), { recommendations: [] }) : Promise.resolve({ ok:false, skipped:true, hint:'customer_id fehlt' }),
    customer_id ? safe(() => inspectBillingConsistency(supabase, { customer_id }), { issues: [] }) : Promise.resolve({ ok:false, skipped:true, hint:'customer_id fehlt' }),
    customer_id ? safe(() => calculateRetentionIntelligence(supabase, { customer_id, persist:false }), { metrics: {} }) : Promise.resolve({ ok:false, skipped:true, hint:'customer_id fehlt' }),
    customer_id ? safe(() => inspectCustomerGoLiveChecklist(supabase, { customer_id }), { checks: [] }) : Promise.resolve({ ok:false, skipped:true, hint:'customer_id fehlt' }),
    safe(() => inspectBackupRestoreReadiness(supabase), { checks: [] })
  ])

  const modules = [
    moduleItem('activation', '99/100 Activation Readiness', activation, '/admin/production/final-hardening', 2),
    moduleItem('mail', 'Mail-Domain & Consent', mail, '/admin/production/mail-domain', 2),
    moduleItem('customer_go_live', 'Kunden-Go-Live', customerGoLive, '/admin/production/customer-readiness', 2),
    moduleItem('support', 'Support-Diagnose', support, '/admin/production/support-diagnostics', 1),
    moduleItem('billing', 'Billing Consistency', billing, '/admin/production/support-diagnostics', 1),
    moduleItem('retention', 'Retention Intelligence', retention, '/admin/retention/intelligence', 1),
    moduleItem('backup', 'Backup & Restore', backup, '/admin/production/backup-restore', 1)
  ]
  const weighted = modules.reduce((acc, m) => acc + (m.ok ? 100 : m.status === 'yellow' ? 65 : 25) * m.weight, 0)
  const max = modules.reduce((acc, m) => acc + 100 * m.weight, 0)
  const score = Math.round(weighted / max * 100)
  const blockers = []
  for (const m of modules) {
    if (m.status === 'red') blockers.push({ module: m.key, label: m.label, href: m.href, hint: m.result?.error || m.result?.hint || m.result?.recommendation || 'Bitte Modul prüfen.' })
  }
  const next_steps = [
    ...(mail.ok ? [] : [{ title: 'Mail-Domain prüfen', href: '/admin/production/mail-domain', priority: 'high' }]),
    ...(activation.ok ? [] : [{ title: 'Final Hardening/99 Readiness prüfen', href: '/admin/production/final-hardening', priority: 'high' }]),
    ...(customer_id ? [] : [{ title: 'Kundenkontext auswählen', href: '/admin', priority: 'high' }]),
    ...(retention?.metrics?.reactivation_candidates ? [{ title: 'Reaktivierungskandidaten prüfen', href: '/admin/retention/intelligence', priority: 'medium' }] : []),
    ...(billing?.issues?.length ? [{ title: 'Billing-Hinweise lösen', href: '/admin/production/support-diagnostics', priority: 'medium' }] : [])
  ]

  return {
    ok: score >= 85 && blockers.length === 0,
    customer_id,
    score,
    status: score >= 90 ? 'pilot_ready' : score >= 75 ? 'almost_ready' : 'not_ready',
    modules,
    blockers,
    next_steps,
    generated_at: new Date().toISOString()
  }
}

module.exports = { goLiveCockpitOverview }
