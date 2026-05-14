
const cron = require('node-cron')
const { createClient } = require('@supabase/supabase-js')
const MailService = require('../services/mailService')
const ApiSyncService = require('../services/apiSyncService')

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null

const mail = new MailService()
const apiSync = supabase ? new ApiSyncService(supabase) : null

async function safeQuery(label, queryPromise) {
  try {
    const result = await queryPromise
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
  await safeQuery(
    'recordJob',
    supabase.from('job_runs').insert({
      job_name: name,
      status,
      message,
      finished_at: new Date().toISOString()
    })
  )
}

async function safeJob(name, fn) {
  try {
    await recordJob(name, 'running')
    await fn()
    await recordJob(name, 'completed')
  } catch (e) {
    console.error(`[WORKER:${name}]`, e.message || e)
    await recordJob(name, 'failed', e.message || String(e))
  }
}

async function mailJobs() {
  const { data } = await safeQuery(
    'mailJobs.select',
    supabase.from('mail_jobs').select('*').eq('status', 'pending').limit(25)
  )

  for (const job of data || []) {
    try {
      await mail.send({ to: job.to_email, subject: job.subject, html: job.html })
      await safeQuery(
        'mailJobs.sent',
        supabase.from('mail_jobs')
          .update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null })
          .eq('id', job.id)
      )
    } catch (e) {
      await safeQuery(
        'mailJobs.failed',
        supabase.from('mail_jobs')
          .update({ status: 'failed', last_error: e.message || String(e) })
          .eq('id', job.id)
      )
    }
  }
}

async function apiSyncJobs() {
  if (!apiSync) return

  const { data } = await safeQuery(
    'apiSyncJobs.select',
    supabase.from('api_sync_jobs').select('*').eq('status', 'pending').limit(25)
  )

  for (const job of data || []) {
    try {
      let result = null

      if (job.provider === 'google_business') {
        result = await apiSync.syncGoogleBusiness(job.customer_id)
      }

      if (job.provider === 'search_console') {
        result = await apiSync.syncSearchConsole(job.customer_id, job.payload?.site_url)
      }

      if (job.provider === 'analytics') {
        result = await apiSync.syncAnalytics(job.customer_id, job.payload?.property_id)
      }

      await safeQuery(
        'apiSyncJobs.completed',
        supabase.from('api_sync_jobs')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString(),
            last_error: null,
            payload: { ...(job.payload || {}), result }
          })
          .eq('id', job.id)
      )
    } catch (e) {
      await safeQuery(
        'apiSyncJobs.failed',
        supabase.from('api_sync_jobs')
          .update({ status: 'failed', last_error: e.message || String(e) })
          .eq('id', job.id)
      )
    }
  }
}

async function invoiceReminders() {
  const { data } = await safeQuery(
    'invoiceReminders.select',
    supabase.from('invoices').select('*').eq('status', 'Offen').limit(25)
  )

  for (const inv of data || []) {
    const existing = await safeQuery(
      'invoiceReminders.exists',
      supabase.from('notifications')
        .select('id')
        .eq('customer_id', inv.customer_id)
        .eq('type', 'invoice_reminder')
        .ilike('message', `%${inv.invoice_number || inv.id}%`)
        .maybeSingle()
    )

    if (existing.data) continue

    await safeQuery(
      'invoiceReminders.insert',
      supabase.from('notifications').insert({
        customer_id: inv.customer_id,
        title: 'Offene Rechnung',
        message: `Rechnung ${inv.invoice_number || inv.id} ist offen.`,
        type: 'invoice_reminder',
        actor_name: 'System'
      })
    )
  }
}

async function packageRequests() {
  const { data } = await safeQuery(
    'packageRequests.select',
    supabase.from('package_requests').select('*').eq('status', 'Angefragt').limit(50)
  )

  for (const r of data || []) {
    const existing = await safeQuery(
      'packageRequests.exists',
      supabase.from('notifications')
        .select('id')
        .eq('customer_id', r.customer_id)
        .eq('type', 'package_request')
        .ilike('message', `%${r.package_name}%`)
        .maybeSingle()
    )

    if (existing.data) continue

    await safeQuery(
      'packageRequests.insert',
      supabase.from('notifications').insert({
        customer_id: r.customer_id,
        title: 'Offene Paketanfrage',
        message: `Paket ${r.package_name} wartet auf Freigabe.`,
        type: 'package_request',
        actor_name: 'System'
      })
    )
  }
}

async function tick() {
  if (!supabase) {
    console.log('MMOS API-ready worker: Supabase ENV fehlt')
    return
  }

  await safeJob('mail_jobs', mailJobs)
  await safeJob('api_sync_jobs', apiSyncJobs)
  await safeJob('invoice_reminders', invoiceReminders)
  await safeJob('package_requests', packageRequests)

  console.log('MMOS API-ready worker tick', new Date().toISOString())
}

tick().catch((e) => {
  console.error('[WORKER:startup]', e.message || e)
})

cron.schedule(process.env.WORKER_CRON || '*/5 * * * *', () => {
  tick().catch((e) => console.error('[WORKER:cron]', e.message || e))
})
