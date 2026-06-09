const { cleanupQrScanTokens, migrateQrLegacyTargets } = require('./qrMaintenanceService')
const { inspectDataQualityRules } = require('./dataQualityRulesEngineService')
const { inspectDocumentIntegrity } = require('./documentIntegrityService')
const { inspectMailDeliveryGuard } = require('./mailDeliveryGuardService')
const { runProductionSmokeTest } = require('./productionSmokeTestService')

const registry = new Map()

function registerDefaultJobs(supabase) {
  registry.set('qr_token_cleanup', { key: 'qr_token_cleanup', label: 'QR Token Cleanup', interval_minutes: 60, run: () => cleanupQrScanTokens(supabase, { dry_run: false }) })
  registry.set('qr_legacy_target_migration_dry_run', { key: 'qr_legacy_target_migration_dry_run', label: 'QR Legacy Target Dry Run', interval_minutes: 1440, run: () => migrateQrLegacyTargets(supabase, { dry_run: true }) })
  registry.set('data_quality_check', { key: 'data_quality_check', label: 'Data Quality Check', interval_minutes: 1440, run: () => inspectDataQualityRules(supabase, {}) })
  registry.set('document_integrity_check', { key: 'document_integrity_check', label: 'Document Integrity Check', interval_minutes: 1440, run: () => inspectDocumentIntegrity(supabase, {}) })
  registry.set('mail_health_check', { key: 'mail_health_check', label: 'Mail Health Check', interval_minutes: 360, run: async () => inspectMailDeliveryGuard() })
  registry.set('production_smoke_test', { key: 'production_smoke_test', label: 'Production Smoke Test', interval_minutes: 1440, run: () => runProductionSmokeTest(supabase, {}) })
  return listJobs()
}

function listJobs() {
  return Array.from(registry.values()).map(({ run, ...job }) => job)
}

async function runJob(key) {
  const job = registry.get(key)
  if (!job) return { ok: false, error: `Job ${key} nicht gefunden` }
  const started = Date.now()
  try {
    const result = await job.run()
    return { ok: result?.ok !== false, key, label: job.label, duration_ms: Date.now() - started, result, finished_at: new Date().toISOString() }
  } catch (error) {
    return { ok: false, key, label: job.label, duration_ms: Date.now() - started, error: error.message || String(error), finished_at: new Date().toISOString() }
  }
}

async function runAllJobs() {
  const results = []
  for (const key of registry.keys()) results.push(await runJob(key))
  return { ok: results.every((r) => r.ok), results }
}

module.exports = { registerDefaultJobs, listJobs, runJob, runAllJobs }
