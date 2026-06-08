const cron = require('node-cron')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

const supabase = getSupabaseAdmin()

async function run() {
  if (!supabase) return console.log('Security audit: Supabase ENV fehlt')
  const { data: failedJobs } = await supabase.from('job_runs').select('id').eq('status','failed').limit(1000)
  await supabase.from('security_audit_logs').insert({
    actor_name: 'System',
    action: 'daily_security_audit',
    entity_type: 'system',
    metadata: { failed_jobs: failedJobs?.length || 0, timestamp: new Date().toISOString() }
  }).catch(console.error)
  console.log('Security audit completed', new Date().toISOString())
}

run()
cron.schedule(process.env.SECURITY_AUDIT_CRON || '0 3 * * *', run)
