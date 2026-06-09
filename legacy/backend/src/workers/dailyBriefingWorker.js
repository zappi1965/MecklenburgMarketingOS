// Daily-Briefing-Worker: schreibt pro aktivem Customer eine kurze
// Tages-E-Mail mit den wichtigsten Daten von heute.
//
// Cron-Default: 07:00 lokale Zeit (DAILY_BRIEFING_CRON ueberschreibbar).
//
// Empfaenger: alle customer_users mit role IN (owner, admin) und
// (metadata->>'daily_briefing' IS NULL OR metadata->>'daily_briefing' != 'false').
//
// Versand: ueber den existierenden mailService.send. Solange kein
// Mail-Provider verdrahtet ist (Audit-Punkt U3), loggt der Worker die
// E-Mail in newsletter_deliveries als 'queued' fuer spaeteren Versand.

const cron = require('node-cron')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

const JOB_NAME = 'daily_briefing_worker'

async function logJob(supabase, status, message = null) {
  if (!supabase) return
  try {
    await supabase.from('job_runs').insert({
      job_name: JOB_NAME, status, message, finished_at: new Date().toISOString()
    })
  } catch (_) {}
}

function todayRange() {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const end = new Date(); end.setHours(23, 59, 59, 999)
  return { startIso: start.toISOString(), endIso: end.toISOString() }
}

async function collectForCustomer(supabase, customer_id) {
  const { startIso, endIso } = todayRange()

  const [todayAppointments, lowReviews, overdueInvoices, openTickets, recentLeads, intelScore] = await Promise.all([
    supabase
      .from('appointments').select('id, title, start_time, status')
      .eq('customer_id', customer_id).gte('start_time', startIso).lte('start_time', endIso)
      .order('start_time', { ascending: true }).limit(20),
    supabase
      .from('review_feedback').select('id, rating, created_at, feedback_text')
      .eq('customer_id', customer_id).lte('rating', 3).gt('rating', 0)
      .gte('created_at', new Date(Date.now() - 7 * 86400_000).toISOString())
      .order('created_at', { ascending: false }).limit(5),
    supabase
      .from('invoices').select('id, invoice_number, amount, due_date')
      .eq('customer_id', customer_id).lt('due_date', startIso).ilike('status', '%offen%')
      .order('due_date', { ascending: true }).limit(10),
    supabase
      .from('tickets').select('id, title, priority, created_at')
      .eq('customer_id', customer_id).neq('status', 'closed')
      .order('created_at', { ascending: false }).limit(5),
    supabase
      .from('pipeline_leads').select('id, title, stage, created_at')
      .eq('customer_id', customer_id)
      .gte('created_at', new Date(Date.now() - 86400_000).toISOString())
      .order('created_at', { ascending: false }).limit(5),
    supabase
      .from('customer_intelligence_scores').select('risk_score, upsell_score, client_success_score, updated_at')
      .eq('customer_id', customer_id).maybeSingle()
  ])

  return {
    appointments: todayAppointments.data || [],
    lowReviews: lowReviews.data || [],
    overdueInvoices: overdueInvoices.data || [],
    openTickets: openTickets.data || [],
    newLeads: recentLeads.data || [],
    intelligence: intelScore.data || null
  }
}

function renderEmail({ customer, data }) {
  const apptCount = data.appointments.length
  const reviewCount = data.lowReviews.length
  const overdueCount = data.overdueInvoices.length
  const ticketCount = data.openTickets.length
  const leadCount = data.newLeads.length
  const intel = data.intelligence

  const lines = []
  lines.push(`Guten Morgen ${customer?.name || ''},`)
  lines.push('')
  lines.push(`Heute auf einen Blick:`)
  lines.push(`- Termine heute: ${apptCount}`)
  lines.push(`- Negative Reviews (letzte 7 Tage): ${reviewCount}`)
  lines.push(`- Ueberfaellige Rechnungen: ${overdueCount}`)
  lines.push(`- Offene Tickets: ${ticketCount}`)
  lines.push(`- Neue Leads seit gestern: ${leadCount}`)
  if (intel) {
    lines.push('')
    lines.push(`Customer-Intelligence:`)
    lines.push(`- Risiko ${intel.risk_score}/100`)
    lines.push(`- Upsell ${intel.upsell_score}/100`)
    lines.push(`- Erfolg ${intel.client_success_score}/100`)
  }
  lines.push('')
  lines.push('Im MMOS-Dashboard sind alle Details verlinkt.')
  lines.push('')
  lines.push('— MMOS Daily Briefing')

  const text = lines.join('\n')
  const subject = `MMOS Daily Briefing — ${apptCount} Termine, ${ticketCount} Tickets, ${overdueCount} ueberfaellig`
  return { subject, text }
}

async function queueDelivery(supabase, { campaign_id, email, subject, body }) {
  try {
    await supabase.from('newsletter_deliveries').insert({
      campaign_id,
      email,
      status: 'queued',
      delivery_metadata: { subject, body, source: JOB_NAME }
    })
  } catch (_) {
    // Tabelle fehlt evtl. in alten Umgebungen — wir loggen still in console.
    console.log(`[dailyBriefingWorker] would send to ${email}: ${subject}`)
  }
}

async function runOnce() {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    console.log('[dailyBriefingWorker] Supabase nicht konfiguriert — uebersprungen.')
    return { skipped: true }
  }
  await logJob(supabase, 'running')
  try {
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name')
      .or('status.is.null,status.eq.active')
      .limit(500)

    // Eine Kampagne pro Lauf, damit deliveries gruppiert sind.
    const { data: campaign } = await supabase
      .from('newsletter_campaigns')
      .insert({
        subject: 'MMOS Daily Briefing',
        body: '(siehe einzelne Deliveries)',
        audience: 'admin',
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .select('id')
      .maybeSingle()

    let queued = 0
    for (const customer of customers || []) {
      const data = await collectForCustomer(supabase, customer.id)
      const { subject, text } = renderEmail({ customer, data })
      const { data: recipients } = await supabase
        .from('customer_users')
        .select('email, metadata')
        .eq('customer_id', customer.id)
        .in('role', ['owner', 'admin'])
        .eq('status', 'active')
      for (const r of recipients || []) {
        if (r.metadata?.daily_briefing === 'false') continue
        await queueDelivery(supabase, { campaign_id: campaign?.id, email: r.email, subject, body: text })
        queued += 1
      }
    }
    await logJob(supabase, 'completed', `queued=${queued}`)
    return { queued }
  } catch (error) {
    console.error('[dailyBriefingWorker] failed:', error?.message || error)
    await logJob(supabase, 'failed', error?.message || String(error))
    throw error
  }
}

function startCron() {
  const expr = process.env.DAILY_BRIEFING_CRON || '0 7 * * *'
  console.log(`[dailyBriefingWorker] cron registriert: ${expr}`)
  cron.schedule(expr, () => {
    runOnce().catch((e) => console.error('[dailyBriefingWorker] cron Fehler:', e?.message || e))
  })
}

if (require.main === module) {
  if (process.argv.includes('--cron')) {
    startCron()
  } else {
    runOnce().then((r) => {
      console.log('[dailyBriefingWorker] one-shot fertig:', JSON.stringify(r).slice(0, 200))
      process.exit(0)
    }).catch(() => process.exit(1))
  }
}

module.exports = { runOnce, startCron, renderEmail, collectForCustomer }
