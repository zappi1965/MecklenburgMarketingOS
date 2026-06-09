// Automation-Worker: faehrt die AutomationEngine im Cron-Takt (alle 15 min).
//
// Modi:
//   node src/workers/automationWorker.js           # one-shot
//   node src/workers/automationWorker.js --cron    # daemon
//
// Setzt voraus, dass das Backend mit SUPABASE-ENV laeuft. Ohne ENV
// endet der one-shot sauber mit "uebersprungen".

const cron = require('node-cron')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')
const { AutomationEngine } = require('../services/automationEngine')

const JOB_NAME = 'automation_engine_worker'

async function logJob(supabase, status, message = null) {
  if (!supabase) return
  try {
    await supabase.from('job_runs').insert({
      job_name: JOB_NAME,
      status,
      message,
      finished_at: new Date().toISOString()
    })
  } catch (_) {
    // job_runs ist optional und darf den Worker nicht blocken.
  }
}

async function runOnce() {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    console.log('[automationWorker] Supabase nicht konfiguriert — uebersprungen.')
    return { skipped: true }
  }
  await logJob(supabase, 'running')
  try {
    const engine = new AutomationEngine(supabase)
    const result = await engine.runAll()
    const counts = Object.entries(result.runs)
      .map(([k, v]) => `${k}=${v?.processed ?? (v?.skipped ? 'skipped' : 'err')}`)
      .join(' ')
    console.log(`[automationWorker] ${counts}`)
    await logJob(supabase, 'completed', counts)
    return result
  } catch (error) {
    console.error('[automationWorker] Fehler:', error?.message || error)
    await logJob(supabase, 'failed', error?.message || String(error))
    throw error
  }
}

function startCron() {
  const expression = process.env.AUTOMATION_WORKER_CRON || '*/15 * * * *'
  console.log(`[automationWorker] cron registriert: ${expression}`)
  cron.schedule(expression, () => {
    runOnce().catch((e) => console.error('[automationWorker] cron-Lauf Fehler:', e?.message || e))
  })
}

if (require.main === module) {
  if (process.argv.includes('--cron')) {
    startCron()
  } else {
    runOnce()
      .then((r) => {
        console.log('[automationWorker] one-shot fertig:', JSON.stringify(r).slice(0, 800))
        process.exit(0)
      })
      .catch(() => process.exit(1))
  }
}

module.exports = { runOnce, startCron }
