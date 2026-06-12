// Wartungs-Reminder-Worker.
// Cron-Default: taeglich 05:30 UTC (MAINTENANCE_CHECK_CRON ueberschreibbar).
//
// Modi:
//   node src/workers/maintenanceCheckWorker.js        # one-shot
//   node src/workers/maintenanceCheckWorker.js --cron # daemon

const cron = require('node-cron')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')
const { runAllChecks } = require('../services/maintenanceCheckService')

const JOB_NAME = 'maintenance_check_worker'

async function logJob(supabase, status, message = null) {
  if (!supabase) return
  try {
    await supabase.from('job_runs').insert({
      job_name: JOB_NAME, status, message, finished_at: new Date().toISOString()
    })
  } catch (_) {}
}

async function runOnce() {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    console.log('[maintenanceCheckWorker] Supabase nicht konfiguriert.')
    return { skipped: true }
  }
  await logJob(supabase, 'running')
  try {
    const r = await runAllChecks()
    // Abgelaufene Deals auf 'expired' setzen (für korrekte Admin-Listen).
    let dealsExpired = 0
    try {
      const { DealCampaignService } = require('../services/dealCampaignService')
      const sweep = await new DealCampaignService(supabase).sweepExpired()
      dealsExpired = sweep?.expired || 0
    } catch (_) {}
    console.log(`[maintenanceCheckWorker] processed=${r.processed} fired=${r.fired_total} deals_expired=${dealsExpired}`)
    await logJob(supabase, 'completed', `processed=${r.processed} fired=${r.fired_total} deals_expired=${dealsExpired}`)
    return { ...r, deals_expired: dealsExpired }
  } catch (e) {
    console.error('[maintenanceCheckWorker]', e?.message || e)
    await logJob(supabase, 'failed', e?.message || String(e))
    throw e
  }
}

function startCron() {
  const expr = process.env.MAINTENANCE_CHECK_CRON || '30 5 * * *'
  console.log(`[maintenanceCheckWorker] cron registriert: ${expr}`)
  cron.schedule(expr, () => {
    runOnce().catch((e) => console.error('[maintenanceCheckWorker] cron Fehler:', e?.message || e))
  })
}

if (require.main === module) {
  if (process.argv.includes('--cron')) {
    startCron()
  } else {
    runOnce().then((r) => {
      console.log('[maintenanceCheckWorker] one-shot fertig:', JSON.stringify(r).slice(0, 300))
      process.exit(0)
    }).catch(() => process.exit(1))
  }
}

module.exports = { runOnce, startCron }
