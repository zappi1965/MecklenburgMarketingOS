
const cron = require('node-cron')
const { createClient } = require('@supabase/supabase-js')
const MailService = require('../services/mailService')
const ApiSyncService = require('../services/apiSyncService')

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null

const mail = new MailService()
const apiSync = supabase ? new ApiSyncService(supabase) : null

async function runInvoiceReminders() {
  const { data } = await supabase.from('invoices').select('*').eq('status','Offen').limit(25)
  for (const inv of data || []) {
    await supabase.from('notifications').insert({
      customer_id: inv.customer_id,
      title: 'Offene Rechnung',
      message: `Rechnung ${inv.invoice_number || inv.id} ist offen.`,
      type: 'invoice_reminder',
      actor_name: 'System'
    }).catch(()=>null)
  }
}

async function runApiSyncs() {
  const { data: integrations } = await supabase.from('integrations').select('*').eq('status','Verbunden').limit(50)
  for (const i of integrations || []) {
    const name = String(i.name || '').toLowerCase()
    if (name.includes('google business')) await apiSync.syncGoogleBusiness(i.customer_id)
    if (name.includes('search console')) await apiSync.syncSearchConsole(i.customer_id)
    if (name.includes('analytics')) await apiSync.syncAnalytics(i.customer_id)
  }
}

async function runPackageNotifications() {
  const { data } = await supabase.from('package_requests').select('*').eq('status','Angefragt')
  for (const r of data || []) {
    await supabase.from('notifications').insert({
      customer_id: r.customer_id,
      title: 'Offene Paketanfrage',
      message: `Paket ${r.package_name} wartet auf Freigabe.`,
      type: 'package_request',
      actor_name: 'System'
    }).catch(()=>null)
  }
}

async function tick() {
  if (!supabase) {
    console.log('MMOS worker: Supabase ENV fehlt')
    return
  }
  await runInvoiceReminders()
  await runPackageNotifications()
  await runApiSyncs()
  console.log('MMOS production worker tick', new Date().toISOString())
}

tick()
cron.schedule(process.env.WORKER_CRON || '*/5 * * * *', tick)
