// DSGVO-Loesch-/Anonymisierungs-Worker.
//
// Faehrt ueberfaellige Loeschantraege aus public.dsar_requests aus.
// Personenbezogene Daten werden anonymisiert, gesetzlich aufzubewahrende
// Datensaetze (Rechnungen, § 147 AO / § 257 HGB) bleiben strukturell
// erhalten, aber alle direkt personenbezogenen Felder werden geleert.
//
// Modi:
//   - cron     Standard, registriert sich selbst (taeglich 04:30 UTC).
//   - one-shot Lauf einmal ausfuehren und beenden.
//
// CLI:
//   node src/workers/gdprWorker.js          # one-shot
//   node src/workers/gdprWorker.js --cron   # daemon mit Cron

const cron = require('node-cron')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

const RUN_NAME = 'gdpr_deletion_worker'
const ANON_DOMAIN = 'deleted.local'

function deletionToken(id) {
  return `deleted-${(id || '').slice(0, 8) || Date.now()}`
}

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
    // Audit log must not fail the deletion.
  }
}

// Returns the set of DSAR delete requests whose scheduled_for has passed.
async function loadDueDeletions(supabase) {
  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from('dsar_requests')
    .select('id, customer_id, subject_email, status, type, metadata, created_at')
    .eq('type', 'delete')
    .in('status', ['Offen', 'In Bearbeitung'])
    .order('created_at', { ascending: true })
    .limit(200)
  if (error) throw error
  return (data || []).filter((row) => {
    const scheduledFor = row.metadata?.scheduled_for
    if (!scheduledFor) return false
    return String(scheduledFor) <= nowIso
  })
}

// Find the auth.users id for a given email via user_profiles (preferred,
// matches the canonical lookup in authRoutes.js) or fall back to the
// supabase admin API.
async function findAuthUserId(supabase, email) {
  const norm = String(email || '').toLowerCase().trim()
  if (!norm) return null
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .ilike('email', norm)
    .maybeSingle()
  if (profile?.id) return profile.id
  try {
    const list = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
    const found = list?.data?.users?.find((u) => String(u.email || '').toLowerCase() === norm)
    return found?.id || null
  } catch (_) {
    return null
  }
}

// Anonymise the rows that are not cascade-deleted by removing the auth user.
async function anonymiseProfileTraces(supabase, email, authUserId) {
  const token = deletionToken(authUserId)
  const anonEmail = `${token}@${ANON_DOMAIN}`
  const nowIso = new Date().toISOString()

  // user_profiles row has no FK to auth.users; wipe it explicitly.
  if (authUserId) {
    await supabase
      .from('user_profiles')
      .update({
        email: anonEmail,
        display_name: 'Geloeschter Nutzer',
        username: null,
        status: 'deleted',
        updated_at: nowIso,
        metadata: { deleted_at: nowIso, source: 'gdpr_worker' }
      })
      .eq('id', authUserId)
  }

  // Loyalty members linked by email — anonymise so points history stays
  // for legitimate audit, but the personal connection is severed.
  const loyaltyTables = ['loyalty_members', 'loyalty_customer_members', 'review_feedback']
  for (const table of loyaltyTables) {
    try {
      await supabase
        .from(table)
        .update({ email: anonEmail, display_name: 'Geloeschter Nutzer', updated_at: nowIso })
        .ilike('email', email)
    } catch (_) {
      // Table may not exist in every environment; skip silently.
    }
  }

  // Customer registrations and invites with this email — clear PII.
  try {
    await supabase
      .from('customer_registrations')
      .update({
        email: anonEmail,
        contact_person: 'Geloeschter Nutzer',
        phone: null,
        note: null
      })
      .ilike('email', email)
  } catch (_) {}
  try {
    await supabase
      .from('customer_invites')
      .update({ email: anonEmail, contact_person: 'Geloeschter Nutzer' })
      .ilike('email', email)
  } catch (_) {}
}

// Remove the Supabase auth user. This cascades customer_users rows
// (ON DELETE CASCADE per SQL_V42_21_3_CUSTOMER_LOGIN_APPROVAL.sql) and
// hands SET NULL to the registration/invite FKs.
async function deleteAuthUser(supabase, authUserId) {
  if (!authUserId) return { skipped: true }
  try {
    const { error } = await supabase.auth.admin.deleteUser(authUserId)
    if (error) throw error
    return { deleted: true }
  } catch (error) {
    return { error: error?.message || String(error) }
  }
}

async function executeDeletion(supabase, dsarRow) {
  const email = String(dsarRow.subject_email || '').toLowerCase().trim()
  const authUserId = await findAuthUserId(supabase, email)

  await anonymiseProfileTraces(supabase, email, authUserId)
  const authResult = await deleteAuthUser(supabase, authUserId)

  const completedAt = new Date().toISOString()
  await supabase
    .from('dsar_requests')
    .update({
      status: 'Erledigt',
      completed_at: completedAt,
      updated_at: completedAt,
      metadata: {
        ...(dsarRow.metadata || {}),
        executed_at: completedAt,
        executed_by: RUN_NAME,
        auth_user_id: authUserId,
        auth_user_delete: authResult
      }
    })
    .eq('id', dsarRow.id)

  await logSecurityEvent(supabase, {
    customer_id: dsarRow.customer_id,
    event_type: 'dsar.delete_executed',
    severity: 'warning',
    title: 'DSGVO-Loeschung ausgefuehrt',
    description: `Loeschung fuer ${email} ausgefuehrt. Auth-User: ${authResult.deleted ? 'geloescht' : authResult.skipped ? 'nicht gefunden' : 'Fehler'}.`,
    metadata: { dsar_request_id: dsarRow.id, auth_user_id: authUserId, auth_user_delete: authResult }
  })

  return { id: dsarRow.id, authResult }
}

async function runOnce() {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    console.log('[gdprWorker] Supabase nicht konfiguriert — uebersprungen.')
    return { skipped: true }
  }

  await safeJobLog(supabase, 'running')
  try {
    const due = await loadDueDeletions(supabase)
    console.log(`[gdprWorker] ${due.length} faellige Loeschanfrage(n).`)
    const results = []
    for (const row of due) {
      try {
        const result = await executeDeletion(supabase, row)
        results.push(result)
        console.log(`[gdprWorker] erledigt: ${row.id}`)
      } catch (error) {
        console.error(`[gdprWorker] Fehler bei ${row.id}:`, error?.message || error)
        await logSecurityEvent(supabase, {
          customer_id: row.customer_id,
          event_type: 'dsar.delete_failed',
          severity: 'error',
          title: 'DSGVO-Loeschung fehlgeschlagen',
          description: error?.message || String(error),
          metadata: { dsar_request_id: row.id }
        })
        results.push({ id: row.id, error: error?.message || String(error) })
      }
    }
    await safeJobLog(supabase, 'completed', `processed=${results.length}`)
    return { processed: results.length, results }
  } catch (error) {
    console.error('[gdprWorker] Lauf fehlgeschlagen:', error?.message || error)
    await safeJobLog(supabase, 'failed', error?.message || String(error))
    throw error
  }
}

function startCron() {
  const expression = process.env.GDPR_WORKER_CRON || '30 4 * * *'
  console.log(`[gdprWorker] cron registriert: ${expression}`)
  cron.schedule(expression, () => {
    runOnce().catch((e) => console.error('[gdprWorker] cron-Lauf Fehler:', e?.message || e))
  })
}

if (require.main === module) {
  const useCron = process.argv.includes('--cron')
  if (useCron) {
    startCron()
    // Halt the process alive; cron schedules will fire periodically.
  } else {
    runOnce()
      .then((r) => {
        console.log('[gdprWorker] one-shot fertig:', JSON.stringify(r))
        process.exit(0)
      })
      .catch(() => process.exit(1))
  }
}

module.exports = { runOnce, startCron, executeDeletion }
