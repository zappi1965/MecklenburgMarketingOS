
const cron = require('node-cron')
const { createClient } = require('@supabase/supabase-js')

let MailService
let ApiSyncService
try { MailService = require('../services/mailService') } catch { MailService = class { async send(){ return null } } }
try { ApiSyncService = require('../services/apiSyncService') } catch { ApiSyncService = class {} }

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null

const mail = new MailService()
const apiSync = supabase ? new ApiSyncService(supabase) : null

async function safeQuery(label, promise) {
  try {
    const result = await promise
    if (result && result.error) {
      console.error(`[SUPABASE:${label}]`, result.error.message || result.error)
      return { data: null, error: result.error }
    }
    return result || { data: null, error: null }
  } catch (error) {
    console.error(`[SUPABASE:${label}]`, error.message || error)
    return { data: null, error }
  }
}

async function recordJob(name, status, message = null) {
  if (!supabase) return
  await safeQuery('recordJob', supabase.from('job_runs').insert({
    job_name: name,
    status,
    message,
    finished_at: new Date().toISOString()
  }))
}

async function safeJob(name, fn) {
  try {
    await recordJob(name, 'running')
    await fn()
    await recordJob(name, 'completed')
  } catch (error) {
    console.error(`[WORKER:${name}]`, error.message || error)
    await recordJob(name, 'failed', error.message || String(error))
  }
}

async function mailJobs() {
  if (!supabase) return
  const { data } = await safeQuery('mailJobs.select', supabase.from('mail_jobs').select('*').eq('status', 'pending').limit(25))
  for (const job of data || []) {
    try {
      if (mail.send) await mail.send({ to: job.to_email, subject: job.subject, html: job.html })
      await safeQuery('mailJobs.sent', supabase.from('mail_jobs').update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null }).eq('id', job.id))
    } catch (error) {
      await safeQuery('mailJobs.failed', supabase.from('mail_jobs').update({ status: 'failed', last_error: error.message || String(error) }).eq('id', job.id))
    }
  }
}

async function apiSyncJobs() {
  if (!supabase || !apiSync) return
  const { data } = await safeQuery('apiSyncJobs.select', supabase.from('api_sync_jobs').select('*').eq('status', 'pending').limit(25))
  for (const job of data || []) {
    try {
      let result = null
      if (job.provider === 'google_business' && apiSync.syncGoogleBusiness) result = await apiSync.syncGoogleBusiness(job.customer_id)
      if (job.provider === 'search_console' && apiSync.syncSearchConsole) result = await apiSync.syncSearchConsole(job.customer_id, job.payload?.site_url)
      if (job.provider === 'analytics' && apiSync.syncAnalytics) result = await apiSync.syncAnalytics(job.customer_id, job.payload?.property_id)
      await safeQuery('apiSyncJobs.completed', supabase.from('api_sync_jobs').update({ status: 'completed', processed_at: new Date().toISOString(), last_error: null, payload: { ...(job.payload || {}), result } }).eq('id', job.id))
    } catch (error) {
      await safeQuery('apiSyncJobs.failed', supabase.from('api_sync_jobs').update({ status: 'failed', last_error: error.message || String(error) }).eq('id', job.id))
    }
  }
}

async function invoiceReminders() {
  if (!supabase) return
  const { data } = await safeQuery('invoiceReminders.select', supabase.from('invoices').select('*').eq('status', 'Offen').limit(25))
  for (const inv of data || []) {
    const existing = await safeQuery('invoiceReminders.exists', supabase.from('notifications').select('id').eq('customer_id', inv.customer_id).eq('type', 'invoice_reminder').ilike('message', `%${inv.invoice_number || inv.id}%`).maybeSingle())
    if (existing.data) continue
    await safeQuery('invoiceReminders.insert', supabase.from('notifications').insert({ customer_id: inv.customer_id, title: 'Offene Rechnung', message: `Rechnung ${inv.invoice_number || inv.id} ist offen.`, type: 'invoice_reminder', actor_name: 'System' }))
  }
}

async function packageRequests() {
  if (!supabase) return
  const { data } = await safeQuery('packageRequests.select', supabase.from('package_requests').select('*').eq('status', 'Angefragt').limit(50))
  for (const request of data || []) {
    const existing = await safeQuery('packageRequests.exists', supabase.from('notifications').select('id').eq('customer_id', request.customer_id).eq('type', 'package_request').ilike('message', `%${request.package_name}%`).maybeSingle())
    if (existing.data) continue
    await safeQuery('packageRequests.insert', supabase.from('notifications').insert({ customer_id: request.customer_id, title: 'Offene Paketanfrage', message: `Paket ${request.package_name} wartet auf Freigabe.`, type: 'package_request', actor_name: 'System' }))
  }
}

async function tick() {
  if (!supabase) {
    console.log('MMOS worker: Supabase ENV fehlt')
    return
  }
  await safeJob('mail_jobs', mailJobs)
  await safeJob('api_sync_jobs', apiSyncJobs)
  await safeJob('invoice_reminders', invoiceReminders)
  await safeJob('package_requests', packageRequests)
  console.log('MMOS worker tick OK', new Date().toISOString())
}

tick().catch((error) => console.error('[WORKER:startup]', error.message || error))
cron.schedule(process.env.WORKER_CRON || '*/5 * * * *', () => tick().catch((error) => console.error('[WORKER:cron]', error.message || error)))
