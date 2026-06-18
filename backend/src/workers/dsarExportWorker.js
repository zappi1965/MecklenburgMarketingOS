// DSGVO-Auskunfts-Worker (Art. 15 DSGVO).
//
// Verarbeitet offene Datenexport-Anfragen aus public.dsar_requests.
// Fuer jede Anfrage werden personenbezogene Daten gesammelt, als JSON in
// Supabase Storage hochgeladen und ein signierter Download-Link erzeugt.
//
// Modi:
//   - cron     Standard, registriert sich selbst (taeglich 05:00 UTC).
//   - one-shot Lauf einmal ausfuehren und beenden.
//
// CLI:
//   node src/workers/dsarExportWorker.js          # one-shot
//   node src/workers/dsarExportWorker.js --cron   # daemon mit Cron

const cron = require('node-cron')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

const RUN_NAME = 'dsar_export_worker'
const EXPORT_BUCKET = 'gdpr-exports'
const SIGNED_URL_TTL_SECONDS = 7 * 24 * 3600 // 7 days

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
    // Audit log must not fail the export.
  }
}

// Returns open export DSAR requests created within the last 30 days.
async function loadPendingExports(supabase) {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('dsar_requests')
    .select('id, customer_id, subject_email, status, type, metadata, created_at')
    .eq('type', 'export')
    .in('status', ['Offen', 'In Bearbeitung'])
    .gte('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(200)
  if (error) throw error
  return data || []
}

// Find the auth user id for an email via user_profiles.
async function findAuthUserId(supabase, email) {
  const norm = String(email || '').toLowerCase().trim()
  if (!norm) return null
  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .ilike('email', norm)
      .maybeSingle()
    if (profile?.id) return profile.id
  } catch (_) {}
  try {
    const list = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
    const found = list?.data?.users?.find((u) => String(u.email || '').toLowerCase() === norm)
    return found?.id || null
  } catch (_) {
    return null
  }
}

// Collect all personal data for a given email / auth user id.
async function collectPersonalData(supabase, email, authUserId) {
  const result = {}

  // user_profiles
  try {
    const { data } = await supabase
      .from('user_profiles')
      .select('email, display_name, role, created_at, last_login_at')
      .ilike('email', email)
      .maybeSingle()
    result.user_profile = data || null
  } catch (_) {
    result.user_profile = null
  }

  // loyalty_members (try both table names)
  result.loyalty = null
  for (const table of ['loyalty_members', 'loyalty_customer_members']) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('email, points, joined_at')
        .ilike('email', email)
        .maybeSingle()
      if (!error) {
        result.loyalty = data || null
        break
      }
    } catch (_) {
      // Table may not exist in every environment; try the next one.
    }
  }

  // customer_registrations
  try {
    const { data } = await supabase
      .from('customer_registrations')
      .select('email, contact_person, phone, created_at')
      .ilike('email', email)
    result.customer_registrations = data || []
  } catch (_) {
    result.customer_registrations = []
  }

  // security_events (only if we have an auth user id)
  if (authUserId) {
    try {
      const { data } = await supabase
        .from('security_events')
        .select('event_type, created_at, metadata')
        .eq('actor_id', authUserId)
        .order('created_at', { ascending: false })
        .limit(500)
      result.security_events = data || []
    } catch (_) {
      result.security_events = []
    }
  } else {
    result.security_events = []
  }

  return result
}

// Ensure the export bucket exists (creates it as private if missing).
async function ensureBucket(supabase) {
  try {
    const { data: buckets } = await supabase.storage.listBuckets()
    const exists = (buckets || []).some((b) => b.name === EXPORT_BUCKET)
    if (!exists) {
      await supabase.storage.createBucket(EXPORT_BUCKET, { public: false })
    }
  } catch (_) {
    // If we cannot list/create buckets the upload will surface the real error.
  }
}

async function executeExport(supabase, dsarRow) {
  const email = String(dsarRow.subject_email || '').toLowerCase().trim()
  const authUserId = await findAuthUserId(supabase, email)

  const personalData = await collectPersonalData(supabase, email, authUserId)
  const exportPayload = {
    dsar_request_id: dsarRow.id,
    subject_email: email,
    exported_at: new Date().toISOString(),
    data: personalData
  }

  const jsonString = JSON.stringify(exportPayload, null, 2)
  const filePath = `exports/${dsarRow.id}.json`
  const fileBuffer = Buffer.from(jsonString, 'utf-8')

  await ensureBucket(supabase)

  const { error: uploadError } = await supabase.storage
    .from(EXPORT_BUCKET)
    .upload(filePath, fileBuffer, {
      contentType: 'application/json',
      upsert: true
    })
  if (uploadError) throw uploadError

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(EXPORT_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS)
  if (signedUrlError) throw signedUrlError
  const signedUrl = signedUrlData?.signedUrl || signedUrlData?.signedURL || null

  const completedAt = new Date().toISOString()
  await supabase
    .from('dsar_requests')
    .update({
      export_url: signedUrl,
      status: 'Erledigt',
      completed_at: completedAt,
      updated_at: completedAt,
      metadata: {
        ...(dsarRow.metadata || {}),
        executed_at: completedAt,
        executed_by: RUN_NAME,
        export_path: filePath
      }
    })
    .eq('id', dsarRow.id)

  await logSecurityEvent(supabase, {
    customer_id: dsarRow.customer_id,
    event_type: 'dsar.export_executed',
    severity: 'info',
    title: 'DSGVO-Datenexport ausgefuehrt',
    description: `Datenexport fuer ${email} erstellt und in Storage abgelegt.`,
    metadata: { dsar_request_id: dsarRow.id, export_path: filePath }
  })

  return { id: dsarRow.id, exportPath: filePath, signedUrl }
}

async function runOnce() {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    console.log('[dsarExportWorker] Supabase nicht konfiguriert — uebersprungen.')
    return { skipped: true }
  }

  await safeJobLog(supabase, 'running')
  try {
    const pending = await loadPendingExports(supabase)
    console.log(`[dsarExportWorker] ${pending.length} offene Export-Anfrage(n).`)
    const results = []
    for (const row of pending) {
      try {
        const result = await executeExport(supabase, row)
        results.push(result)
        console.log(`[dsarExportWorker] erledigt: ${row.id}`)
      } catch (error) {
        console.error(`[dsarExportWorker] Fehler bei ${row.id}:`, error?.message || error)
        await logSecurityEvent(supabase, {
          customer_id: row.customer_id,
          event_type: 'dsar.export_failed',
          severity: 'error',
          title: 'DSGVO-Datenexport fehlgeschlagen',
          description: error?.message || String(error),
          metadata: { dsar_request_id: row.id }
        })
        results.push({ id: row.id, error: error?.message || String(error) })
      }
    }
    await safeJobLog(supabase, 'completed', `processed=${results.length}`)
    return { processed: results.length, results }
  } catch (error) {
    console.error('[dsarExportWorker] Lauf fehlgeschlagen:', error?.message || error)
    await safeJobLog(supabase, 'failed', error?.message || String(error))
    throw error
  }
}

function startCron() {
  const expression = process.env.DSAR_EXPORT_WORKER_CRON || '0 5 * * *'
  console.log(`[dsarExportWorker] cron registriert: ${expression}`)
  cron.schedule(expression, () => {
    runOnce().catch((e) => console.error('[dsarExportWorker] cron-Lauf Fehler:', e?.message || e))
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
        console.log('[dsarExportWorker] one-shot fertig:', JSON.stringify(r))
        process.exit(0)
      })
      .catch(() => process.exit(1))
  }
}

module.exports = { runOnce, startCron, executeExport }
