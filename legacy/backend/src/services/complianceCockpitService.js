// DSGVO-Cockpit-Service.
//
// Aggregiert alle compliance-relevanten Daten in ein konsolidiertes
// Dashboard fuer Admins:
//   - data_processing_activities (Art. 30 Verzeichnis)
//   - data_processors (Auftragsverarbeiter inkl. Drittland)
//   - dsar_requests-Status (offen, in Bearbeitung, erledigt)
//   - security_events (letzte 30 Tage)
//   - MFA-Coverage (Anteil Admin-User mit aktivem 2FA)
//   - Newsletter-Consent-Status

const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

async function listProcessingActivities(customer_id) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return []
  let q = supabase.from('data_processing_activities').select('*').order('created_at', { ascending: false })
  if (customer_id) q = q.or(`customer_id.eq.${customer_id},customer_id.is.null`)
  const { data } = await q.limit(200)
  return data || []
}

async function upsertProcessingActivity({ id, ...payload }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase nicht konfiguriert')
  const update = { ...payload, updated_at: new Date().toISOString() }
  if (id) {
    const { data, error } = await supabase
      .from('data_processing_activities').update(update).eq('id', id).select('*').maybeSingle()
    if (error) throw error
    return data
  }
  const { data, error } = await supabase
    .from('data_processing_activities').insert(update).select('*').maybeSingle()
  if (error) throw error
  return data
}

async function listProcessors(customer_id) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return []
  let q = supabase.from('data_processors').select('*').order('name', { ascending: true })
  if (customer_id) q = q.or(`customer_id.eq.${customer_id},customer_id.is.null`)
  const { data } = await q.limit(200)
  return data || []
}

async function upsertProcessor({ id, ...payload }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase nicht konfiguriert')
  const update = { ...payload, updated_at: new Date().toISOString() }
  if (id) {
    const { data, error } = await supabase
      .from('data_processors').update(update).eq('id', id).select('*').maybeSingle()
    if (error) throw error
    return data
  }
  const { data, error } = await supabase
    .from('data_processors').insert(update).select('*').maybeSingle()
  if (error) throw error
  return data
}

async function snapshot({ customer_id }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString()

  const [
    activitiesRes,
    processorsRes,
    dsarOpenRes,
    dsarInProgressRes,
    dsarDoneRes,
    securityEventsRes,
    adminProfilesRes,
    consentStatsRes
  ] = await Promise.all([
    supabase.from('data_processing_activities').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('data_processors').select('id, country_code, scc_required').eq('status', 'active'),
    supabase.from('dsar_requests').select('id', { count: 'exact', head: true }).eq('status', 'Offen'),
    supabase.from('dsar_requests').select('id', { count: 'exact', head: true }).eq('status', 'In Bearbeitung'),
    supabase.from('dsar_requests').select('id', { count: 'exact', head: true }).eq('status', 'Erledigt'),
    supabase.from('security_events')
      .select('event_type, severity, created_at')
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('user_profiles')
      .select('id, mfa_enabled, role, status')
      .in('role', ['admin', 'super_admin'])
      .eq('status', 'active'),
    supabase.from('newsletter_subscribers')
      .select('id, status')
  ])

  const processors = processorsRes.data || []
  const securityEvents = securityEventsRes.data || []
  const adminProfiles = adminProfilesRes.data || []
  const consentStats = consentStatsRes.data || []

  const eventsBySeverity = securityEvents.reduce((acc, e) => {
    acc[e.severity || 'info'] = (acc[e.severity || 'info'] || 0) + 1
    return acc
  }, {})
  const eventsByType = {}
  for (const e of securityEvents) {
    eventsByType[e.event_type] = (eventsByType[e.event_type] || 0) + 1
  }

  const nonEuProcessors = processors.filter((p) =>
    p.country_code && !['DE', 'AT', 'CH', 'FR', 'IT', 'NL', 'BE', 'ES', 'PL', 'CZ', 'DK', 'SE', 'FI', 'IE', 'PT'].includes(String(p.country_code).toUpperCase())
  ).length
  const sccRequired = processors.filter((p) => p.scc_required).length

  const adminCount = adminProfiles.length
  const mfaCount = adminProfiles.filter((p) => p.mfa_enabled).length
  const mfaCoveragePct = adminCount > 0 ? Math.round((mfaCount / adminCount) * 100) : 0

  const consentActive = consentStats.filter((c) => c.status === 'active').length
  const consentPending = consentStats.filter((c) => c.status === 'pending').length
  const consentUnsubscribed = consentStats.filter((c) => c.status === 'unsubscribed').length

  return {
    generated_at: new Date().toISOString(),
    customer_id: customer_id || null,
    art30: {
      activities_active: activitiesRes.count || 0
    },
    processors: {
      total: processors.length,
      non_eu: nonEuProcessors,
      scc_required: sccRequired
    },
    dsar: {
      open: dsarOpenRes.count || 0,
      in_progress: dsarInProgressRes.count || 0,
      done: dsarDoneRes.count || 0
    },
    security: {
      events_last_30d: securityEvents.length,
      by_severity: eventsBySeverity,
      top_types: Object.entries(eventsByType)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type, count }))
    },
    mfa: {
      admins_total: adminCount,
      admins_enrolled: mfaCount,
      coverage_pct: mfaCoveragePct
    },
    consent: {
      newsletter_active: consentActive,
      newsletter_pending: consentPending,
      newsletter_unsubscribed: consentUnsubscribed
    },
    compliance_score: computeComplianceScore({
      activities: activitiesRes.count || 0,
      nonEuProcessors,
      sccRequired,
      mfaCoveragePct,
      openDsar: dsarOpenRes.count || 0
    })
  }
}

function computeComplianceScore({ activities, nonEuProcessors, sccRequired, mfaCoveragePct, openDsar }) {
  let score = 100
  if (activities < 3) score -= 15
  if (nonEuProcessors > sccRequired) score -= 20
  if (mfaCoveragePct < 50) score -= 25
  else if (mfaCoveragePct < 100) score -= 10
  if (openDsar > 5) score -= 10
  return Math.max(0, Math.min(100, score))
}

module.exports = {
  listProcessingActivities,
  upsertProcessingActivity,
  listProcessors,
  upsertProcessor,
  snapshot,
  computeComplianceScore
}
