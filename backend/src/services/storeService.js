// Generisches CRUD-Backend, damit der Frontend-Monolith nicht mehr
// direkt mit dem Anon-Supabase-Client schreiben muss (was wegen
// RLS-Lottery diverse Speichern-Buttons brach).
//
// Service ueberprueft pro Operation:
//   - Tabelle ist in ALLOWLIST (Whitelist, keine beliebigen Tabellen)
//   - Customer-Scope wo sinnvoll (req.user darf nur eigene Customer-Daten)
//   - Admin-only-Tabellen erfordern role IN (admin, super_admin)
//
// Antworten sind durchgaengig formatiert: { ok, data, count? } oder
// { ok:false, code, error }.

const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

// Pro Tabelle: scope = 'admin' (nur Admin) | 'customer' (Customer-Owner
// auch erlaubt, customer_id-Match). Im Zweifel 'admin'.
const ALLOWLIST = {
  // Branding + Landing
  landing_page_settings:           { scope: 'admin' },
  public_landing_pages:            { scope: 'admin' },

  // Loyalty
  qr_campaigns:                    { scope: 'customer' },
  loyalty_programs:                { scope: 'customer' },
  loyalty_rewards:                 { scope: 'customer' },
  loyalty_reward_rules:            { scope: 'customer' },
  loyalty_security_settings:       { scope: 'customer' },
  staff_codes:                     { scope: 'customer' },

  // CRM / Operations
  customer_notes:                  { scope: 'customer' },
  customer_files:                  { scope: 'customer' },
  customer_service_categories:     { scope: 'customer' },
  customer_seo_metrics:            { scope: 'customer' },
  review_funnel_stats:             { scope: 'customer' },
  invoices:                        { scope: 'customer' },
  review_feedback:                 { scope: 'customer' },
  social_posts:                    { scope: 'customer' },

  // Workflows / Automations
  workflow_rules:                  { scope: 'admin' },
  automations:                     { scope: 'admin' },

  // Sales / Lead-Funnel
  acquisition_campaigns:           { scope: 'customer' },
  prospect_leads:                  { scope: 'customer' },
  generated_offers:                { scope: 'customer' },
  generated_contracts:             { scope: 'customer' },
  mini_audits:                     { scope: 'customer' },
  google_business_audits:          { scope: 'customer' },
  competitor_benchmarks:           { scope: 'customer' },
  seo_snapshots:                   { scope: 'customer' },

  // Reporting / Approvals
  dunning_cases:                   { scope: 'customer' },
  customer_health_scores:          { scope: 'customer' },
  monthly_reports:                 { scope: 'customer' },
  onboarding_checklists:           { scope: 'customer' },
  approval_requests:               { scope: 'customer' },
  output_documents:                { scope: 'customer' },

  // Knowledge & Integrationen
  knowledge_articles:              { scope: 'admin' },
  integrations:                    { scope: 'customer' },

  // Booking-Engine
  booking_services:                { scope: 'customer' },
  booking_resources:               { scope: 'customer' },
  booking_resource_services:       { scope: 'admin' },
  booking_business_hours:          { scope: 'customer' },
  booking_blackouts:               { scope: 'customer' },
  booking_settings:                { scope: 'customer' },
  appointments:                    { scope: 'customer' }
}

const TABLES = Object.keys(ALLOWLIST)

function tableConfig(table) {
  return ALLOWLIST[String(table || '').toLowerCase()] || null
}

async function userHasCustomerAccess(supabase, user_id, customer_id) {
  if (!customer_id) return false
  try {
    const { data } = await supabase
      .from('customer_users')
      .select('id, role, status')
      .eq('auth_user_id', user_id)
      .eq('customer_id', String(customer_id))
      .eq('status', 'active')
      .maybeSingle()
    return Boolean(data)
  } catch (_) { return false }
}

function permissionError(message) {
  const e = new Error(message); e.status = 403; e.code = 'FORBIDDEN'; return e
}

function badRequest(message, code = 'BAD_REQUEST') {
  const e = new Error(message); e.status = 400; e.code = code; return e
}

function notFound(message) {
  const e = new Error(message); e.status = 404; e.code = 'NOT_FOUND'; return e
}

// Pruefung pro Operation. Wirft Fehler wenn nicht erlaubt.
async function authorize({ supabase, table, row, user, userRole }) {
  const cfg = tableConfig(table)
  if (!cfg) throw permissionError(`Tabelle '${table}' ist nicht erlaubt`)
  const isAdmin = userRole === 'admin'
  if (cfg.scope === 'admin' && !isAdmin) {
    throw permissionError(`Tabelle '${table}' erlaubt nur Admin-Zugriffe`)
  }
  if (cfg.scope === 'customer' && !isAdmin) {
    const customerId = row?.customer_id || row?.customerId
    if (!customerId) throw badRequest('customer_id im Payload fehlt')
    const ok = await userHasCustomerAccess(supabase, user.id, customerId)
    if (!ok) throw permissionError('Kein Zugriff auf diesen Customer')
  }
}

async function listRows({ table, query = {}, user, userRole }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase nicht konfiguriert')
  const cfg = tableConfig(table)
  if (!cfg) throw permissionError(`Tabelle '${table}' ist nicht erlaubt`)
  const isAdmin = userRole === 'admin'

  // Bei customer-scoped Tabellen MUSS ein customer_id-Filter dabei sein
  // (ausser bei Admin). Verhindert Datenexfiltration.
  if (cfg.scope === 'customer' && !isAdmin) {
    const cid = query.customer_id
    if (!cid) throw badRequest('customer_id Filter erforderlich')
    const ok = await userHasCustomerAccess(supabase, user.id, cid)
    if (!ok) throw permissionError('Kein Zugriff auf diesen Customer')
  }
  if (cfg.scope === 'admin' && !isAdmin) {
    throw permissionError(`Tabelle '${table}' erlaubt nur Admin-Zugriffe`)
  }

  const limit = Math.min(1000, Number(query.limit) || 200)
  let q = supabase.from(table).select('*').limit(limit)
  if (query.customer_id) q = q.eq('customer_id', String(query.customer_id))
  if (query.order_by) q = q.order(String(query.order_by), { ascending: query.order_dir !== 'desc' })
  const { data, error } = await q
  if (error) throw error
  return data || []
}

async function getRow({ table, id, user, userRole }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase nicht konfiguriert')
  const cfg = tableConfig(table)
  if (!cfg) throw permissionError(`Tabelle '${table}' ist nicht erlaubt`)
  if (!id) throw badRequest('id fehlt')
  const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) throw notFound('Datensatz nicht gefunden')
  if (cfg.scope === 'customer' && userRole !== 'admin') {
    const ok = await userHasCustomerAccess(supabase, user.id, data.customer_id)
    if (!ok) throw permissionError('Kein Zugriff auf diesen Customer')
  }
  return data
}

async function createRow({ table, row, user, userRole }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase nicht konfiguriert')
  await authorize({ supabase, table, row, user, userRole })
  const payload = { ...row, updated_at: new Date().toISOString() }
  // created_at nur setzen wenn nicht uebergeben — Supabase-Default sollte
  // greifen, manche Tabellen haben aber keinen Default.
  if (!payload.created_at) payload.created_at = new Date().toISOString()
  const { data, error } = await supabase.from(table).insert(payload).select('*').maybeSingle()
  if (error) throw error
  return data
}

async function updateRow({ table, id, row, user, userRole }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase nicht konfiguriert')
  if (!id) throw badRequest('id fehlt')

  // Pre-load: bei customer-scoped Tabellen pruefen, dass der Ziel-Datensatz
  // zum berechtigten Customer gehoert.
  const cfg = tableConfig(table)
  if (!cfg) throw permissionError(`Tabelle '${table}' ist nicht erlaubt`)
  if (cfg.scope === 'customer' && userRole !== 'admin') {
    const { data: existing } = await supabase.from(table).select('customer_id').eq('id', id).maybeSingle()
    if (!existing) throw notFound('Datensatz nicht gefunden')
    const ok = await userHasCustomerAccess(supabase, user.id, existing.customer_id)
    if (!ok) throw permissionError('Kein Zugriff auf diesen Customer')
    // Verhindere, dass der Caller den customer_id im Payload umbiegt.
    if (row && row.customer_id && String(row.customer_id) !== String(existing.customer_id)) {
      throw permissionError('customer_id darf nicht umgehaengt werden')
    }
  } else if (cfg.scope === 'admin' && userRole !== 'admin') {
    throw permissionError(`Tabelle '${table}' erlaubt nur Admin-Zugriffe`)
  }

  const patch = { ...row, updated_at: new Date().toISOString() }
  const { data, error } = await supabase.from(table).update(patch).eq('id', id).select('*').maybeSingle()
  if (error) throw error
  if (!data) throw notFound('Datensatz nicht gefunden')
  return data
}

async function deleteRow({ table, id, user, userRole }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase nicht konfiguriert')
  if (!id) throw badRequest('id fehlt')
  const cfg = tableConfig(table)
  if (!cfg) throw permissionError(`Tabelle '${table}' ist nicht erlaubt`)
  if (cfg.scope === 'customer' && userRole !== 'admin') {
    const { data: existing } = await supabase.from(table).select('customer_id').eq('id', id).maybeSingle()
    if (!existing) throw notFound('Datensatz nicht gefunden')
    const ok = await userHasCustomerAccess(supabase, user.id, existing.customer_id)
    if (!ok) throw permissionError('Kein Zugriff auf diesen Customer')
  } else if (cfg.scope === 'admin' && userRole !== 'admin') {
    throw permissionError(`Tabelle '${table}' erlaubt nur Admin-Zugriffe`)
  }
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
  return { ok: true }
}

module.exports = {
  ALLOWLIST,
  TABLES,
  tableConfig,
  listRows,
  getRow,
  createRow,
  updateRow,
  deleteRow,
  userHasCustomerAccess
}
