
const cron = require('node-cron')
const { createClient } = require('@supabase/supabase-js')
const MailService = require('../services/mailService')
const ApiSyncService = require('../services/apiSyncService')

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null

const mail = new MailService()
const apiSync = supabase ? new ApiSyncService(supabase) : null

async function recordJob(name, status, message = null) {
  if (!supabase) return
  await supabase.from('job_runs').insert({
    job_name: name,
    status,
    message,
    finished_at: new Date().toISOString()
  }).catch(() => null)
}

async function safeJob(name, fn) {
  try {
    await recordJob(name, 'running')
    await fn()
    await recordJob(name, 'completed')
  } catch (e) {
    console.error(`[WORKER:${name}]`, e)
    await recordJob(name, 'failed', e.message)
  }
}

async function invoiceReminders() {
  const { data } = await supabase.from('invoices').select('*').eq('status', 'Offen').limit(25)
  for (const inv of data || []) {
    const existing = await supabase.from('notifications')
      .select('id')
      .eq('customer_id', inv.customer_id)
      .eq('type', 'invoice_reminder')
      .ilike('message', `%${inv.invoice_number || inv.id}%`)
      .maybeSingle()
    if (existing.data) continue

    await supabase.from('notifications').insert({
      customer_id: inv.customer_id,
      title: 'Offene Rechnung',
      message: `Rechnung ${inv.invoice_number || inv.id} ist offen.`,
      type: 'invoice_reminder',
      actor_name: 'System'
    }).catch(() => null)
  }
}

async function packageRequests() {
  const { data } = await supabase.from('package_requests').select('*').eq('status', 'Angefragt')
  for (const r of data || []) {
    const existing = await supabase.from('notifications')
      .select('id')
      .eq('customer_id', r.customer_id)
      .eq('type', 'package_request')
      .ilike('message', `%${r.package_name}%`)
      .maybeSingle()
    if (existing.data) continue

    await supabase.from('notifications').insert({
      customer_id: r.customer_id,
      title: 'Offene Paketanfrage',
      message: `Paket ${r.package_name} wartet auf Freigabe.`,
      type: 'package_request',
      actor_name: 'System'
    }).catch(() => null)
  }
}

async function apiSyncs() {
  const { data } = await supabase.from('integrations').select('*').eq('status', 'Verbunden').limit(50)
  for (const i of data || []) {
    const name = String(i.name || '').toLowerCase()
    if (name.includes('google business')) await apiSync.syncGoogleBusiness(i.customer_id)
    if (name.includes('search console')) await apiSync.syncSearchConsole(i.customer_id)
    if (name.includes('analytics')) await apiSync.syncAnalytics(i.customer_id)
  }
}

async function tick() {
  if (!supabase) {
    console.log('MMOS hardened worker: Supabase ENV fehlt')
    return
  }
  await safeJob('invoice_reminders', invoiceReminders)
  await safeJob('package_requests', packageRequests)
  await safeJob('api_syncs', apiSyncs)
  console.log('MMOS hardened worker tick', new Date().toISOString())
}

tick()
cron.schedule(process.env.WORKER_CRON || '*/5 * * * *', tick)
