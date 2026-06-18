// Datenspeicherungs-Worker (Aufbewahrungsfristen / DSGVO Art. 5 Abs. 1 lit. e).
//
// Loescht oder anonymisiert Datensaetze, deren gesetzliche oder
// betriebliche Aufbewahrungsfrist abgelaufen ist.
//
// Modi:
//   - cron     Standard, registriert sich selbst (woechtlich So. 03:00 UTC).
//   - one-shot Lauf einmal ausfuehren und beenden.
//
// CLI:
//   node src/workers/retentionWorker.js          # one-shot
//   node src/workers/retentionWorker.js --cron   # daemon mit Cron

const cron = require('node-cron')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

const RUN_NAME = 'retention_worker'

// Hard-coded retention rules.  keepDays is the minimum age of rows to delete.
// An optional `where` string is appended as an extra filter (raw Supabase
// filter chained with .filter() — kept deliberately simple).
const RETENTION_RULES = [
  { table: 'security_events', column: 'created_at', keepDays: 730 },                                           // 2 years
  { table: 'job_runs',        column: 'created_at', keepDays: 90 },
  { table: 'job_queue',       column: 'created_at', keepDays: 90, whereColumn: 'status', whereIn: ['completed', 'failed'] },
  { table: 'activity_logs',   column: 'created_at', keepDays: 365 }
]

// Consent table to purge withdrawn / expired records.
const CONSENT_TABLE = 'marketing_consents'
const CONSENT_KEEP_DAYS = 730 // 2 years

async function safeJobLog(supabase, status, message = null) {
  if (!supabase) return
  try {
    await supabase.from('job_runs').insert({
      job_name: RUN_NAME,
      status,
      message,
      finished_at: new Date().toISOString()
    })
  } catch (_) {
    // job_runs is optional; do not let logging block the worker.
  }
}

async function logSecurityEvent(supabase, params) {
  if (!supabase) return
  try {
    await supabase.from('security_events').insert({
      customer_id: params.customer_id || null,
      actor_type: 'worker',
      actor_id: RUN_NAME,
      event_type: params.event_type,
      severity: params.severity || 'info',
      title: params.title,
      description: params.description || null,
      metadata: params.metadata || {}
    })
  } catch (_) {
    // Audit log must not fail the retention run.
  }
}

// Returns an ISO timestamp for `now minus keepDays days`.
function cutoffIso(keepDays) {
  return new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000).toISOString()
}

// Probe whether a table exists by attempting a lightweight query.
async function tableExists(supabase, table) {
  try {
    const { error } = await supabase.from(table).select('id').limit(1).maybeSingle()
    // A "relation does not exist" PostgREST error has code 42P01 or message contains "does not exist"
    if (error && (error.code === '42P01' || String(error.message || '').includes('does not exist'))) {
      return false
    }
    return true
  } catch (_) {
    return false
  }
}

// Apply one retention rule.  Returns the number of rows deleted (or -1 on error).
async function applyRule(supabase, rule) {
  const { table, column, keepDays, whereColumn, whereIn } = rule
  try {
    const cutoff = cutoffIso(keepDays)
    let query = supabase.from(table).delete().lt(column, cutoff)
    if (whereColumn && whereIn && whereIn.length > 0) {
      query = query.in(whereColumn, whereIn)
    }
    const { error, count } = await query
    if (error) {
      // Table likely does not exist — skip silently.
      if (error.code === '42P01' || String(error.message || '').includes('does not exist')) {
        console.log(`[retentionWorker] Tabelle nicht vorhanden, uebersprungen: ${table}`)
        return 0
      }
      throw error
    }
    const deleted = count ?? -1
    console.log(`[retentionWorker] ${table}: ${deleted >= 0 ? deleted : '?'} Zeilen geloescht (aelter als ${keepDays} Tage).`)
    return deleted
  } catch (error) {
    console.error(`[retentionWorker] Fehler bei Tabelle ${table}:`, error?.message || error)
    return -1
  }
}

// Purge withdrawn / long-expired consent records.
async function purgeExpiredConsents(supabase) {
  try {
    const exists = await tableExists(supabase, CONSENT_TABLE)
    if (!exists) {
      console.log(`[retentionWorker] Consent-Tabelle (${CONSENT_TABLE}) nicht vorhanden — uebersprungen.`)
      return 0
    }
    const cutoff = cutoffIso(CONSENT_KEEP_DAYS)
    const { error, count } = await supabase
      .from(CONSENT_TABLE)
      .delete()
      .eq('consent_given', false)
      .lt('updated_at', cutoff)
    if (error) throw error
    const deleted = count ?? -1
    console.log(`[retentionWorker] ${CONSENT_TABLE} (widerrufen): ${deleted >= 0 ? deleted : '?'} Zeilen geloescht.`)
    return deleted
  } catch (error) {
    console.error(`[retentionWorker] Fehler beim Bereinigen der Einwilligungen:`, error?.message || error)
    return -1
  }
}

async function runOnce() {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    console.log('[retentionWorker] Supabase nicht konfiguriert — uebersprungen.')
    return { skipped: true }
  }

  await safeJobLog(supabase, 'running')
  try {
    const summary = {}

    for (const rule of RETENTION_RULES) {
      summary[rule.table] = await applyRule(supabase, rule)
    }

    summary[CONSENT_TABLE + '_expired'] = await purgeExpiredConsents(supabase)

    const totalDeleted = Object.values(summary).reduce((acc, v) => (v > 0 ? acc + v : acc), 0)
    console.log(`[retentionWorker] Lauf abgeschlossen. Gesamt geloescht: ${totalDeleted}.`)

    await logSecurityEvent(supabase, {
      event_type: 'retention.run_completed',
      severity: 'info',
      title: 'Aufbewahrungsfristen-Lauf abgeschlossen',
      description: `Gesamt geloescht: ${totalDeleted} Zeilen.`,
      metadata: { summary }
    })

    await safeJobLog(supabase, 'completed', `total_deleted=${totalDeleted}`)
    return { totalDeleted, summary }
  } catch (error) {
    console.error('[retentionWorker] Lauf fehlgeschlagen:', error?.message || error)
    await safeJobLog(supabase, 'failed', error?.message || String(error))
    throw error
  }
}

function startCron() {
  const expression = process.env.RETENTION_WORKER_CRON || '0 3 * * 0'
  console.log(`[retentionWorker] cron registriert: ${expression}`)
  cron.schedule(expression, () => {
    runOnce().catch((e) => console.error('[retentionWorker] cron-Lauf Fehler:', e?.message || e))
  })
}

if (require.main === module) {
  const useCron = process.argv.includes('--cron')
  if (useCron) {
    startCron()
    // Keep the process alive; cron schedules will fire periodically.
  } else {
    runOnce()
      .then((r) => {
        console.log('[retentionWorker] one-shot fertig:', JSON.stringify(r))
        process.exit(0)
      })
      .catch(() => process.exit(1))
  }
}

module.exports = { runOnce, startCron }
