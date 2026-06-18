// Art. 33/34 DSGVO: Datenpannen-Benachrichtigungs-SLA-Monitor.
// Prüft täglich ob offene Datenpannen die 72h-Meldepflicht an die DPA überschreiten.
//
// Cron: täglich 06:00 UTC (ENV: BREACH_ALERT_WORKER_CRON)

const cron = require('node-cron')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

const RUN_NAME = 'breach_alert_worker'
const DPA_SLA_HOURS = 72
const ALERT_THRESHOLD_HOURS = 48

async function safeJobLog(supabase, status, message = null) {
  if (!supabase) return
  try {
    await supabase.from('job_runs').insert({
      job_name: RUN_NAME,
      status,
      message,
      finished_at: new Date().toISOString()
    })
  } catch (_) {}
}

async function logSecurityEvent(supabase, params) {
  if (!supabase) return
  try {
    await supabase.from('security_events').insert({
      customer_id: params.customer_id || null,
      actor_type: 'worker',
      actor_id: RUN_NAME,
      event_type: params.event_type,
      severity: params.severity || 'warning',
      title: params.title,
      description: params.description || null,
      metadata: params.metadata || {}
    })
  } catch (_) {}
}

async function runOnce() {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    console.log('[breachAlertWorker] Supabase nicht konfiguriert — übersprungen.')
    return { skipped: true }
  }

  await safeJobLog(supabase, 'running')
  const results = { alerted: 0, overdue: 0, errors: 0 }

  try {
    const { data: table, error: tableError } = await supabase
      .from('breach_notifications')
      .select('id')
      .limit(1)
    if (tableError?.code === '42P01') {
      console.log('[breachAlertWorker] Tabelle breach_notifications existiert noch nicht — übersprungen.')
      await safeJobLog(supabase, 'completed', 'table_missing')
      return { skipped: true, reason: 'table_missing' }
    }

    const alertThreshold = new Date(Date.now() - ALERT_THRESHOLD_HOURS * 3600 * 1000).toISOString()
    const slaThreshold = new Date(Date.now() - DPA_SLA_HOURS * 3600 * 1000).toISOString()

    const { data: breaches, error } = await supabase
      .from('breach_notifications')
      .select('id, customer_id, title, discovered_at, dpa_notified_at, status, severity')
      .is('dpa_notified_at', null)
      .in('status', ['open'])
      .lte('discovered_at', alertThreshold)
      .order('discovered_at', { ascending: true })
      .limit(100)

    if (error) throw error

    for (const breach of (breaches || [])) {
      try {
        const discoveredMs = Date.parse(breach.discovered_at)
        const ageHours = (Date.now() - discoveredMs) / 3600000
        const isOverdue = ageHours >= DPA_SLA_HOURS

        if (isOverdue) {
          results.overdue++
          console.error(`[breachAlertWorker] ÜBERFÄLLIG (${Math.round(ageHours)}h): ${breach.id} — "${breach.title}"`)
          await logSecurityEvent(supabase, {
            customer_id: breach.customer_id,
            event_type: 'breach.dpa_notification_overdue',
            severity: 'critical',
            title: 'Datenpanne: DPA-Meldepflicht überschritten',
            description: `Datenpanne "${breach.title}" wurde vor ${Math.round(ageHours)}h entdeckt. Die 72h-Meldepflicht (Art. 33 DSGVO) an die DPA ist abgelaufen.`,
            metadata: { breach_id: breach.id, age_hours: Math.round(ageHours) }
          })
        } else {
          results.alerted++
          const remainingHours = Math.round(DPA_SLA_HOURS - ageHours)
          console.warn(`[breachAlertWorker] WARNUNG (noch ${remainingHours}h): ${breach.id} — "${breach.title}"`)
          await logSecurityEvent(supabase, {
            customer_id: breach.customer_id,
            event_type: 'breach.dpa_notification_due_soon',
            severity: 'warning',
            title: 'Datenpanne: DPA-Meldung fällig in < 24h',
            description: `Datenpanne "${breach.title}" erfordert DPA-Meldung in ~${remainingHours}h. Bitte jetzt handeln.`,
            metadata: { breach_id: breach.id, age_hours: Math.round(ageHours), remaining_hours: remainingHours }
          })
        }
      } catch (rowError) {
        results.errors++
        console.error(`[breachAlertWorker] Fehler bei Breach ${breach.id}:`, rowError?.message)
      }
    }

    const summary = `alerted=${results.alerted} overdue=${results.overdue} errors=${results.errors}`
    await safeJobLog(supabase, 'completed', summary)
    console.log(`[breachAlertWorker] Lauf abgeschlossen: ${summary}`)
    return results
  } catch (err) {
    console.error('[breachAlertWorker] Lauf fehlgeschlagen:', err?.message || err)
    await safeJobLog(supabase, 'failed', err?.message || String(err))
    throw err
  }
}

function startCron() {
  const expression = process.env.BREACH_ALERT_WORKER_CRON || '0 6 * * *'
  console.log(`[breachAlertWorker] cron registriert: ${expression}`)
  cron.schedule(expression, () => {
    runOnce().catch((e) => console.error('[breachAlertWorker] cron-Lauf Fehler:', e?.message || e))
  })
}

if (require.main === module) {
  runOnce()
    .then((r) => { console.log('[breachAlertWorker] one-shot fertig:', JSON.stringify(r)); process.exit(0) })
    .catch(() => process.exit(1))
}

module.exports = { runOnce, startCron }
