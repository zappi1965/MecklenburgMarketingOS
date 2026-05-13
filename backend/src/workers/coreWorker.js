
const { createClient } = require('@supabase/supabase-js')
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null

async function runRecurringBilling(){
  const today = new Date().toISOString().slice(0,10)
  const { data } = await supabase.from('recurring_billing_rules').select('*').eq('enabled', true).lte('next_run', today)
  for(const rule of data || []){
    await supabase.from('invoices').insert({
      customer_id: rule.customer_id,
      invoice_number: 'AUTO-' + Date.now(),
      service_type: 'Automatischer Rechnungslauf ' + (rule.package_name || ''),
      amount: rule.amount || 0,
      status: 'Offen'
    }).catch(()=>null)
    await supabase.from('notifications').insert({
      customer_id: rule.customer_id,
      title: 'Automatische Rechnung erstellt',
      message: 'Eine neue Rechnung wurde durch den Worker erzeugt.'
    }).catch(()=>null)
  }
}

async function runReviewFunnels(){
  const { data } = await supabase.from('appointments').select('*').eq('review_funnel_enabled', true)
  for(const appt of data || []){
    await supabase.from('notifications').insert({
      customer_id: appt.customer_id,
      title: 'Review Funnel bereit',
      message: 'Für einen Termin ist ein Review Reminder vorbereitet.'
    }).catch(()=>null)
  }
}

async function run(){
  if(!supabase){ console.log('Worker: Supabase ENV fehlt'); return }
  await runRecurringBilling()
  await runReviewFunnels()
  console.log('MMOS v20 worker tick', new Date().toISOString())
}
run()
setInterval(run, Number(process.env.WORKER_INTERVAL_MS || 300000))
