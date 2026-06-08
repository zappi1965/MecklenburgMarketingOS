const { getSupabaseAdmin } = require('../lib/supabaseAdmin')
const { registerJobHandler, runOneJob } = require('../services/jobQueueService')
const { renderAndStoreDocument } = require('../services/documentEngineV2Service')

const supabase = getSupabaseAdmin()
const workerId = `job-worker-${process.pid}`
const intervalMs = Number(process.env.JOB_WORKER_INTERVAL_MS || 5000)
const once = process.argv.includes('--once')

function fakeAdminReq(job) {
  return {
    user: { id: job.actor_user_id || 'system', email: 'system@mecklenburgmarketing.de' },
    userRole: 'admin',
    userStatus: 'active',
    userProfile: { role: 'admin', status: 'active', customer_id: job.customer_id || null }
  }
}

registerJobHandler('document_engine_v2.render', async (job) => {
  return renderAndStoreDocument(supabase, fakeAdminReq(job), job.payload || {})
})

async function tick() {
  if (!supabase) throw new Error('Supabase nicht konfiguriert')
  const result = await runOneJob(supabase, workerId)
  if (result) console.log('[jobWorker]', result.id, result.type, result.status)
  return result
}

async function main() {
  if (once) {
    await tick()
    return
  }
  console.log(`[jobWorker] started ${workerId}, interval=${intervalMs}ms`)
  setInterval(() => tick().catch((e) => console.error('[jobWorker]', e.message)), intervalMs)
}

main().catch((e) => { console.error(e); process.exit(1) })
