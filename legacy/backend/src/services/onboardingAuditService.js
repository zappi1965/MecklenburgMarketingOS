// Auto-Onboarding-Audit-Service.
//
// Wenn ein neuer Customer angelegt wird (oder via Admin-Tool gestartet),
// laeuft asynchron ein Multi-Check:
//   1. Adress-/Geo-Validierung (validationService)
//   2. SEO-Snapshot anlegen (Platzhalter, Provider-API folgt)
//   3. Wettbewerber-Scan (Platzhalter, Google-Places-API)
//   4. DSGVO-Basisprüfung (Verfahrensverzeichnis vorhanden?)
//   5. Loyalty-Bereitschaft (Programm + erstes Reward?)
//   6. Branding-Vollstaendigkeit (Logo, Farben, Hero-Text?)
//
// Ergebnis als JSON in onboarding_audits + optional PDF via pdfService.
//
// Mock-Modus: Wenn keine externen API-Keys, werden die ersten 3 Checks
// als "skipped" markiert und Score nur aus den internen Checks (4-6)
// berechnet.

const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

async function startAudit({ customer_id, target_url, initiated_by }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }
  if (!customer_id) { const e = new Error('customer_id Pflicht'); e.status = 400; throw e }

  const { data, error } = await supabase
    .from('onboarding_audits')
    .insert({
      customer_id,
      target_url: target_url || null,
      initiated_by: initiated_by || null,
      status: 'pending'
    })
    .select('id, status, created_at')
    .maybeSingle()
  if (error) throw error
  // Async-Start (nicht awaiten — der HTTP-Caller bekommt sofort die ID).
  setImmediate(() => { runAudit(data.id).catch((e) => console.error('[audit]', e?.message)) })
  return data
}

async function runAudit(audit_id) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return

  await supabase
    .from('onboarding_audits')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', audit_id)

  const { data: audit } = await supabase
    .from('onboarding_audits').select('*').eq('id', audit_id).maybeSingle()
  if (!audit) return

  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, email, address, postal_code, city, country_code, vat_id, metadata')
    .eq('id', audit.customer_id)
    .maybeSingle()

  const checks = {}
  const findings = []

  // 1. Adress-/Geo-Validierung
  try {
    const { validateAndStoreCustomer } = require('./validationService')
    const r = await validateAndStoreCustomer(audit.customer_id)
    checks.address = {
      ok: (r.address_quality_score || 0) >= 50,
      score: r.address_quality_score,
      coords: r.geo_lat && r.geo_lng ? { lat: r.geo_lat, lng: r.geo_lng } : null,
      email_verified: r.email_verified
    }
    if (!checks.address.ok) findings.push({
      severity: 'warning',
      title: 'Adress-Daten unvollstaendig',
      detail: `Adress-Score ${r.address_quality_score || 0}/100. Pruefe Strasse, PLZ und Stadt.`
    })
  } catch (e) {
    checks.address = { ok: false, error: e?.message }
  }

  // 2. SEO-Snapshot — Mock wenn kein externer Provider
  checks.seo = { ok: false, mock: true, note: 'Externer SEO-Provider (Search Console / SISTRIX) noch nicht angebunden.' }
  findings.push({
    severity: 'info',
    title: 'SEO-Daten noch leer',
    detail: 'Search-Console oder SISTRIX anbinden, um echte Sichtbarkeits-Daten zu sehen.'
  })

  // 3. Wettbewerber-Scan
  checks.competitors = { ok: false, mock: true, note: 'Google-Places-API erforderlich (GOOGLE_PLACES_API_KEY).' }

  // 4. DSGVO-Basisprüfung
  const { count: dpaCount } = await supabase
    .from('data_processing_activities')
    .select('id', { count: 'exact', head: true })
    .or(`customer_id.eq.${audit.customer_id},customer_id.is.null`)
    .eq('status', 'active')
  const { count: dpCount } = await supabase
    .from('data_processors')
    .select('id', { count: 'exact', head: true })
    .or(`customer_id.eq.${audit.customer_id},customer_id.is.null`)
    .eq('status', 'active')
  checks.compliance = {
    ok: (dpaCount || 0) >= 1 && (dpCount || 0) >= 1,
    processing_activities: dpaCount || 0,
    data_processors: dpCount || 0
  }
  if (!checks.compliance.ok) findings.push({
    severity: 'warning',
    title: 'DSGVO-Verzeichnis unvollstaendig',
    detail: `${dpaCount || 0} Verarbeitungstaetigkeiten, ${dpCount || 0} Auftragsverarbeiter. Mindestens je 1 empfohlen.`
  })

  // 5. Loyalty-Bereitschaft
  const { count: programCount } = await supabase
    .from('loyalty_programs').select('id', { count: 'exact', head: true }).eq('customer_id', audit.customer_id)
  const { count: rewardCount } = await supabase
    .from('loyalty_rewards').select('id', { count: 'exact', head: true }).eq('customer_id', audit.customer_id).eq('active', true)
  checks.loyalty = {
    ok: (programCount || 0) > 0 && (rewardCount || 0) > 0,
    programs: programCount || 0,
    active_rewards: rewardCount || 0
  }
  if (!checks.loyalty.ok) findings.push({
    severity: 'warning',
    title: 'Loyalty noch nicht einsatzbereit',
    detail: 'Mindestens ein Loyalty-Programm + ein aktives Reward sollten existieren.'
  })

  // 6. Branding-Vollstaendigkeit
  const md = customer?.metadata || {}
  const branding = {
    name: Boolean(customer?.name),
    logo: Boolean(md.brand_logo_url),
    colors: Boolean(md.brand_primary && md.brand_secondary),
    voice: Boolean(md.brand_voice)
  }
  const brandingOk = branding.name && branding.colors
  checks.branding = { ok: brandingOk, ...branding }
  if (!brandingOk) findings.push({
    severity: 'warning',
    title: 'Branding unvollstaendig',
    detail: 'Markenname, Primaerfarben und Logo sollten gesetzt sein. Onboarding-Wizard erledigt das in 1 Minute.'
  })

  // Score-Berechnung
  const checkResults = Object.values(checks).filter((c) => c && typeof c.ok === 'boolean' && !c.mock)
  const passed = checkResults.filter((c) => c.ok).length
  const total = checkResults.length || 1
  const score = Math.round((passed / total) * 100)

  // Persistieren
  await supabase
    .from('onboarding_audits')
    .update({
      status: 'done',
      score,
      checks,
      findings,
      finished_at: new Date().toISOString()
    })
    .eq('id', audit_id)

  return { id: audit_id, score, findings_count: findings.length }
}

async function getAudit({ id }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return null
  const { data } = await supabase.from('onboarding_audits').select('*').eq('id', id).maybeSingle()
  return data
}

async function listAudits({ customer_id } = {}) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return []
  let q = supabase.from('onboarding_audits').select('id, customer_id, score, status, created_at, finished_at, target_url').order('created_at', { ascending: false }).limit(100)
  if (customer_id) q = q.eq('customer_id', customer_id)
  const { data } = await q
  return data || []
}

module.exports = { startAudit, runAudit, getAudit, listAudits }
