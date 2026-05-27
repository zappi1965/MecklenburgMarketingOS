// Admin Health-Cockpit-Service.
//
// Aggregiert ueber alle Customer hinweg den "Wo brennt's"-Status:
//   - offene Tickets (insbesondere alte)
//   - inaktive Slug-Pages (kein Scan seit X Tagen)
//   - stagnierende Loyalty-Programme (keine neuen Mitglieder seit X)
//   - eskalierte Mahnungen (>= Stufe 3)
//   - fehlgeschlagene Worker-Runs (job_runs.status = 'failed')
//   - hohe Risk-Scores (>=70 aus customer_intelligence_scores)
//
// Liefert pro Customer einen einheitlichen Ampel-Status:
//   green   < 1 Warning, kein Critical
//   yellow  >= 1 Warning, kein Critical
//   red     >= 1 Critical
//
// Verwendung im /admin/ops-Dashboard sowie als Datenquelle fuer den
// taeglichen Briefing-Worker.

const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

const DEFAULTS = {
  ticketStaleDays: 7,
  slugInactiveDays: 30,
  loyaltyStagnationDays: 30,
  workerFailLookbackHours: 24,
  highRiskScore: 70
}

function daysAgo(days) {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 3_600_000).toISOString()
}

function statusFor(warnings, criticals) {
  if (criticals > 0) return 'red'
  if (warnings > 0) return 'yellow'
  return 'green'
}

async function collectSnapshot({ now = new Date(), thresholds = {} } = {}) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }

  const cfg = { ...DEFAULTS, ...thresholds }

  // 1. Customer-Liste (aktiv).
  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, name, status, package_name, created_at')
    .or('status.is.null,status.eq.active')
    .limit(1000)
  if (error) throw error
  const customerIds = (customers || []).map((c) => c.id)
  if (customerIds.length === 0) {
    return { generated_at: new Date().toISOString(), summary: {}, customers: [] }
  }

  // 2. Parallele Aggregat-Queries.
  const ticketStaleDate = daysAgo(cfg.ticketStaleDays)
  const slugInactiveDate = daysAgo(cfg.slugInactiveDays)
  const loyaltyStagnationDate = daysAgo(cfg.loyaltyStagnationDays)
  const workerLookback = hoursAgo(cfg.workerFailLookbackHours)

  const [
    ticketsRes,
    qrCampaignsRes,
    loyaltyMembersRes,
    dunningRes,
    workerFailsRes,
    intelRes
  ] = await Promise.all([
    supabase.from('tickets').select('id, customer_id, status, created_at').in('customer_id', customerIds).neq('status', 'closed'),
    supabase.from('qr_campaigns').select('id, customer_id, slug, last_scan_at, updated_at').in('customer_id', customerIds),
    supabase.from('loyalty_customers').select('id, customer_id, created_at').in('customer_id', customerIds),
    supabase.from('dunning_runs').select('id, customer_id, level, status, created_at').in('customer_id', customerIds).gte('level', 3),
    supabase.from('job_runs').select('id, job_name, status, finished_at, message').eq('status', 'failed').gte('finished_at', workerLookback).limit(100),
    supabase.from('customer_intelligence_scores').select('customer_id, risk_score, upsell_score, updated_at').in('customer_id', customerIds).gte('risk_score', cfg.highRiskScore)
  ])

  const byCustomer = new Map()
  for (const c of customers) {
    byCustomer.set(c.id, {
      customer: c,
      tickets_open: 0,
      tickets_stale: 0,
      qr_campaigns: 0,
      qr_inactive: 0,
      loyalty_members: 0,
      loyalty_new_recent: 0,
      dunning_escalated: 0,
      risk_score: null,
      upsell_score: null,
      warnings: [],
      criticals: []
    })
  }

  for (const t of ticketsRes.data || []) {
    const row = byCustomer.get(t.customer_id); if (!row) continue
    row.tickets_open++
    if (t.created_at && t.created_at < ticketStaleDate) {
      row.tickets_stale++
    }
  }

  for (const q of qrCampaignsRes.data || []) {
    const row = byCustomer.get(q.customer_id); if (!row) continue
    row.qr_campaigns++
    const lastTouch = q.last_scan_at || q.updated_at
    if (lastTouch && lastTouch < slugInactiveDate) row.qr_inactive++
  }

  for (const m of loyaltyMembersRes.data || []) {
    const row = byCustomer.get(m.customer_id); if (!row) continue
    row.loyalty_members++
    if (m.created_at && m.created_at >= loyaltyStagnationDate) row.loyalty_new_recent++
  }

  for (const d of dunningRes.data || []) {
    const row = byCustomer.get(d.customer_id); if (!row) continue
    row.dunning_escalated++
  }

  for (const i of intelRes.data || []) {
    const row = byCustomer.get(i.customer_id); if (!row) continue
    row.risk_score = i.risk_score
    row.upsell_score = i.upsell_score
  }

  // Warnings + Criticals pro Customer ableiten.
  for (const row of byCustomer.values()) {
    if (row.tickets_stale > 0) row.warnings.push({ key: 'tickets_stale', count: row.tickets_stale, text: `${row.tickets_stale} Ticket(s) seit > ${cfg.ticketStaleDays} Tagen offen` })
    if (row.qr_campaigns > 0 && row.loyalty_members === 0) row.warnings.push({ key: 'loyalty_empty', text: 'QR-Kampagne aktiv, aber 0 Loyalty-Mitglieder' })
    if (row.qr_campaigns > 0 && row.qr_inactive === row.qr_campaigns) row.warnings.push({ key: 'qr_all_inactive', count: row.qr_inactive, text: `Alle ${row.qr_inactive} QR-Kampagne(n) seit > ${cfg.slugInactiveDays} Tagen ohne Scan` })
    if (row.loyalty_members > 0 && row.loyalty_new_recent === 0) row.warnings.push({ key: 'loyalty_stagnation', text: `Kein neues Loyalty-Mitglied seit > ${cfg.loyaltyStagnationDays} Tagen` })
    if (row.dunning_escalated > 0) row.criticals.push({ key: 'dunning_escalated', count: row.dunning_escalated, text: `${row.dunning_escalated} eskalierte Mahnung(en) (Stufe >= 3)` })
    if (row.risk_score != null && row.risk_score >= 85) row.criticals.push({ key: 'risk_critical', text: `Risiko-Score ${row.risk_score}/100` })
    else if (row.risk_score != null && row.risk_score >= cfg.highRiskScore) row.warnings.push({ key: 'risk_high', text: `Risiko-Score ${row.risk_score}/100` })
    row.status = statusFor(row.warnings.length, row.criticals.length)
  }

  const list = Array.from(byCustomer.values())
  const workerFails = workerFailsRes.data || []

  const summary = {
    customers_total: list.length,
    green: list.filter((r) => r.status === 'green').length,
    yellow: list.filter((r) => r.status === 'yellow').length,
    red: list.filter((r) => r.status === 'red').length,
    tickets_open_total: list.reduce((s, r) => s + r.tickets_open, 0),
    tickets_stale_total: list.reduce((s, r) => s + r.tickets_stale, 0),
    dunning_escalated_total: list.reduce((s, r) => s + r.dunning_escalated, 0),
    worker_fails_24h: workerFails.length
  }

  return {
    generated_at: now.toISOString(),
    thresholds: cfg,
    summary,
    customers: list.sort((a, b) => {
      const rank = { red: 0, yellow: 1, green: 2 }
      return rank[a.status] - rank[b.status]
    }),
    worker_fails: workerFails.slice(0, 20)
  }
}

async function persistSnapshot({ scope = 'all_customers', payload, generated_by = null } = {}) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return null
  try {
    const { data } = await supabase
      .from('ops_health_snapshots')
      .insert({ scope, payload, generated_by })
      .select('id, snapshot_at')
      .maybeSingle()
    return data
  } catch (_) { return null }
}

module.exports = { collectSnapshot, persistSnapshot, DEFAULTS, statusFor }
