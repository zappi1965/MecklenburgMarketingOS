
const cron = require('node-cron')
const { createClient } = require('@supabase/supabase-js')

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null

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
