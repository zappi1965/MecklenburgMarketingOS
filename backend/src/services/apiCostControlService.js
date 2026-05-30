const { recordAdminLog } = require('./adminLogService')

function nowIso() { return new Date().toISOString() }
function dayStartIso() { const d = new Date(); d.setHours(0,0,0,0); return d.toISOString() }
function monthStartIso() { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d.toISOString() }
function cents(n, fallback = 0) { const v = Number(n); return Number.isFinite(v) ? Math.max(0, Math.round(v)) : fallback }

const DEFAULT_ESTIMATES = {
  google_places_text_search: cents(process.env.GOOGLE_PLACES_TEXT_SEARCH_ESTIMATED_CENTS, 3),
  google_places_details: cents(process.env.GOOGLE_PLACES_DETAILS_ESTIMATED_CENTS, 5),
  gotenberg_render_pdf: cents(process.env.GOTENBERG_RENDER_PDF_ESTIMATED_CENTS, 1)
}

function isEnabled() {
  return process.env.API_COST_CONTROL_ENABLED !== 'false'
}

function failOpen() {
  return process.env.API_COST_FAIL_OPEN !== 'false'
}

function providerLimit(provider, period) {
  const p = String(provider || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_')
  const key = `${p}_${period}_LIMIT_CENTS`
  const global = `API_COST_${period}_LIMIT_CENTS`
  return cents(process.env[key], cents(process.env[global], 0))
}

async function sumCostSince(supabase, { provider, since }) {
  if (!supabase) return 0
  const { data, error } = await supabase
    .from('api_usage_events')
    .select('estimated_cost_cents')
    .eq('provider', provider)
    .gte('created_at', since)
    .limit(50000)
  if (error) throw error
  return (data || []).reduce((sum, row) => sum + cents(row.estimated_cost_cents), 0)
}

async function enforceApiBudget({ supabase, provider, feature, estimated_cost_cents, actor_user_id, customer_id }) {
  if (!isEnabled()) return { ok: true, skipped: true }
  const cost = cents(estimated_cost_cents, DEFAULT_ESTIMATES[feature] || 1)
  try {
    const dayLimit = providerLimit(provider, 'DAILY')
    const monthLimit = providerLimit(provider, 'MONTHLY')
    const dayUsed = dayLimit ? await sumCostSince(supabase, { provider, since: dayStartIso() }) : 0
    const monthUsed = monthLimit ? await sumCostSince(supabase, { provider, since: monthStartIso() }) : 0
    if (dayLimit && dayUsed + cost > dayLimit) {
      const err = new Error(`API-Tagesbudget fuer ${provider} erreicht.`)
      err.status = 429; err.code = 'API_DAILY_BUDGET_EXCEEDED'; err.hint = 'Budget erhoehen oder morgen erneut versuchen.'
      throw err
    }
    if (monthLimit && monthUsed + cost > monthLimit) {
      const err = new Error(`API-Monatsbudget fuer ${provider} erreicht.`)
      err.status = 429; err.code = 'API_MONTHLY_BUDGET_EXCEEDED'; err.hint = 'Monatsbudget erhoehen oder Abfragen reduzieren.'
      throw err
    }
    return { ok: true, provider, feature, estimated_cost_cents: cost, day_used_cents: dayUsed, month_used_cents: monthUsed, day_limit_cents: dayLimit, month_limit_cents: monthLimit }
  } catch (error) {
    if (error.code?.includes('BUDGET')) throw error
    if (failOpen()) return { ok: true, warning: error.message, fail_open: true }
    throw error
  }
}

async function recordApiUsageEvent(supabase, payload = {}) {
  if (!isEnabled() || !supabase) return null
  const row = {
    provider: payload.provider || 'unknown',
    feature: payload.feature || 'unknown',
    endpoint: payload.endpoint || null,
    customer_id: payload.customer_id || null,
    actor_user_id: payload.actor_user_id || null,
    estimated_cost_cents: cents(payload.estimated_cost_cents, DEFAULT_ESTIMATES[payload.feature] || 1),
    units: Number(payload.units || 1),
    success: payload.success !== false,
    status_code: payload.status_code || null,
    metadata: payload.metadata || {},
    created_at: payload.created_at || nowIso()
  }
  try {
    const { data, error } = await supabase.from('api_usage_events').insert(row).select('*').maybeSingle()
    if (error) throw error
    return data
  } catch (error) {
    await recordAdminLog(supabase, { event_type: 'api_usage_log_failed', severity: 'warning', message: error.message, metadata: row })
    return null
  }
}

async function apiUsageSummary(supabase, query = {}) {
  if (!supabase) return { events: [], totals: {} }
  const since = query.since || dayStartIso()
  let q = supabase.from('api_usage_events').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(Math.min(1000, Number(query.limit) || 250))
  if (query.provider) q = q.eq('provider', String(query.provider))
  const { data, error } = await q
  if (error) throw error
  const totals = {}
  for (const row of data || []) {
    const key = row.provider || 'unknown'
    if (!totals[key]) totals[key] = { calls: 0, estimated_cost_cents: 0 }
    totals[key].calls += 1
    totals[key].estimated_cost_cents += cents(row.estimated_cost_cents)
  }
  return { events: data || [], totals, since }
}

module.exports = { enforceApiBudget, recordApiUsageEvent, apiUsageSummary, DEFAULT_ESTIMATES }
