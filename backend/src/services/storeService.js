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
  user_profiles:                   { scope: 'admin' },
  customer_users:                  { scope: 'admin' },
  customer_invites:                { scope: 'admin' },
  customer_registrations:          { scope: 'admin' },
  oauth_tokens:                    { scope: 'admin' },

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
  ticket_messages:                 { scope: 'customer' },
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
  dsar_requests:                   { scope: 'customer' },
  loyalty_member_security_scores:  { scope: 'customer' },

  // Knowledge & Integrationen
  knowledge_articles:              { scope: 'admin' },
  api_usage_cache:                 { scope: 'admin' },
  data_integrity_checks:           { scope: 'admin' },
  security_events:                 { scope: 'admin' },
  activity_logs:                   { scope: 'admin' },
  integrations:                    { scope: 'customer' },

  // Monolith-CRUD (useStore) — customer-scoped Datensaetze
  tickets:                         { scope: 'customer' },
  offers:                          { scope: 'customer' },
  customer_clients:                { scope: 'customer' },
  notifications:                   { scope: 'customer' },
  package_requests:                { scope: 'customer' },
  client_success_events:           { scope: 'customer' },
  loyalty_customers:               { scope: 'customer' },
  loyalty_transactions:            { scope: 'customer' },
  loyalty_reward_redemptions:      { scope: 'customer' },
  // Monolith-CRUD — admin-scoped (Stammdaten/Billing/Demo)
  customers:                       { scope: 'admin' },
  customer_subscriptions:          { scope: 'admin' },
  customer_tool_access:            { scope: 'admin' },
  workflow_runs:                   { scope: 'admin' },
  demo_customers:                  { scope: 'admin' },
  demo_invoices:                   { scope: 'admin' },
  demo_contracts:                  { scope: 'admin' },
  demo_notes:                      { scope: 'admin' },
  demo_appointments:               { scope: 'admin' },
  demo_files:                      { scope: 'admin' },
  demo_notifications:              { scope: 'admin' },
  demo_workflow_runs:              { scope: 'admin' },
  demo_qr_campaigns:               { scope: 'admin' },
  demo_mail_jobs:                  { scope: 'admin' },

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

function isMissingColumnError(error, columnNames = []) {
  const msg = String(error?.message || error?.details || error?.hint || '').toLowerCase()
  const code = String(error?.code || '').toUpperCase()
  if (code === 'PGRST204') return columnNames.some((c) => msg.includes(String(c).toLowerCase())) || columnNames.length === 0
  if (!msg.includes('column') && !msg.includes('schema cache') && !msg.includes('could not find')) return false
  return columnNames.some((c) => msg.includes(String(c).toLowerCase()))
}

async function insertWithTimestampRetry(supabase, table, payload) {
  let result = await supabase.from(table).insert(payload).select('*').maybeSingle()
  if (!result.error) return result
  if (isMissingColumnError(result.error, ['updated_at', 'created_at'])) {
    const fallback = { ...payload }
    delete fallback.updated_at
    delete fallback.created_at
    result = await supabase.from(table).insert(fallback).select('*').maybeSingle()
  }
  return result
}

async function updateWithTimestampRetry(supabase, table, id, patch) {
  let result = await supabase.from(table).update(patch).eq('id', id).select('*').maybeSingle()
  if (!result.error) return result
  if (isMissingColumnError(result.error, ['updated_at'])) {
    const fallback = { ...patch }
    delete fallback.updated_at
    result = await supabase.from(table).update(fallback).eq('id', id).select('*').maybeSingle()
  }
  return result
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
  const { data, error } = await insertWithTimestampRetry(supabase, table, payload)
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
  const { data, error } = await updateWithTimestampRetry(supabase, table, id, patch)
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
