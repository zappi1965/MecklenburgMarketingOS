// Analytics-Service: Peer-Benchmark, Cohort-Analyse, CLV-Segmente.
//
// Alle Funktionen sind reine Aggregat-Berechnungen ueber bestehende
// Tabellen (invoices, appointments, review_feedback, loyalty_*). Die
// Ergebnisse werden in Snapshot-Tabellen gespeichert, damit teure
// Berechnungen nicht bei jedem Request laufen.

const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

function percentile(sortedAsc, p) {
  if (!sortedAsc.length) return 0
  const idx = Math.min(sortedAsc.length - 1, Math.floor((p / 100) * sortedAsc.length))
  return sortedAsc[idx]
}

function median(sortedAsc) {
  if (!sortedAsc.length) return 0
  const m = Math.floor(sortedAsc.length / 2)
  return sortedAsc.length % 2 ? sortedAsc[m] : (sortedAsc[m - 1] + sortedAsc[m]) / 2
}

function regionKey(postalCode) {
  return String(postalCode || '').slice(0, 3) || null
}

// === Peer-Benchmark ===
//
// Vergleicht den Ziel-Customer mit allen anderen, die denselben
// industry-Tag und PLZ-Prefix haben.

async function computePeerBenchmark({ customer_id, period_start, period_end }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }

  const { data: me } = await supabase
    .from('customers')
    .select('id, industry, postal_code, name')
    .eq('id', customer_id)
    .maybeSingle()
  if (!me) { const e = new Error('Customer nicht gefunden'); e.status = 404; throw e }

  const region = regionKey(me.postal_code)
  let peerQuery = supabase.from('customers').select('id, industry, postal_code')
  if (me.industry) peerQuery = peerQuery.eq('industry', me.industry)
  if (region) peerQuery = peerQuery.like('postal_code', `${region}%`)
  const { data: peers } = await peerQuery.limit(500)

  // Mindestens 5 Peers (k-Anonymitaet) sonst kein sinnvoller Benchmark.
  if (!peers || peers.length < 5) {
    return {
      customer_id,
      period_start,
      period_end,
      industry: me.industry || null,
      region_key: region,
      peer_sample_size: peers?.length || 0,
      enough_peers: false
    }
  }

  const peerIds = peers.map((p) => p.id)
  const [invoicesRes, appointmentsRes, reviewsRes] = await Promise.all([
    supabase.from('invoices').select('customer_id, amount, total, issue_date').in('customer_id', peerIds).gte('issue_date', period_start).lte('issue_date', period_end),
    supabase.from('appointments').select('customer_id, start_time').in('customer_id', peerIds).gte('start_time', period_start).lte('start_time', period_end),
    supabase.from('review_feedback').select('customer_id, created_at').in('customer_id', peerIds).gte('created_at', period_start).lte('created_at', period_end)
  ])

  const revByCustomer = new Map()
  const apptByCustomer = new Map()
  const revwByCustomer = new Map()
  for (const i of invoicesRes.data || []) {
    revByCustomer.set(i.customer_id, (revByCustomer.get(i.customer_id) || 0) + Number(i.amount || i.total || 0))
  }
  for (const a of appointmentsRes.data || []) {
    apptByCustomer.set(a.customer_id, (apptByCustomer.get(a.customer_id) || 0) + 1)
  }
  for (const r of reviewsRes.data || []) {
    revwByCustomer.set(r.customer_id, (revwByCustomer.get(r.customer_id) || 0) + 1)
  }

  const revs = peerIds.map((id) => revByCustomer.get(id) || 0).sort((a, b) => a - b)
  const appts = peerIds.map((id) => apptByCustomer.get(id) || 0).sort((a, b) => a - b)
  const revws = peerIds.map((id) => revwByCustomer.get(id) || 0).sort((a, b) => a - b)

  const myRev = revByCustomer.get(customer_id) || 0
  const myAppts = apptByCustomer.get(customer_id) || 0
  const myRevws = revwByCustomer.get(customer_id) || 0

  // Rank-Percentile: wieviele Peers liegen UNTER mir.
  const below = revs.filter((v) => v < myRev).length
  const rankPercentile = Math.round((below / Math.max(1, revs.length)) * 100)

  const snap = {
    customer_id,
    period_start,
    period_end,
    industry: me.industry || null,
    region_key: region,
    customer_revenue: myRev,
    peer_revenue_median: median(revs),
    peer_revenue_p25: percentile(revs, 25),
    peer_revenue_p75: percentile(revs, 75),
    customer_appointments: myAppts,
    peer_appointments_median: Math.round(median(appts)),
    customer_reviews: myRevws,
    peer_reviews_median: Math.round(median(revws)),
    rank_percentile: rankPercentile,
    peer_sample_size: peers.length
  }

  const { data, error } = await supabase
    .from('peer_benchmark_snapshots')
    .upsert(snap, { onConflict: 'customer_id,period_start,period_end' })
    .select('*')
    .maybeSingle()
  if (error) throw error
  return { ...data, enough_peers: true }
}

// === Cohort-Analyse ===
//
// Gruppiert Endkunden nach erstem Auftauchen (per E-Mail aus review_feedback
// + loyalty_customers) in Monats-Cohorts und misst Retention pro Folgemonat.

function monthKey(date) {
  const d = new Date(date)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`
}

async function computeCohortAnalysis({ customer_id, source = 'loyalty_signup', months = 6 }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }

  const table = source === 'qr_campaign' ? 'loyalty_customers' : source === 'invoice_first' ? 'invoices' : 'loyalty_customers'
  const dateField = source === 'invoice_first' ? 'issue_date' : 'created_at'
  const idField = source === 'invoice_first' ? 'customer_email' : 'email'

  const { data: rows } = await supabase
    .from(table)
    .select(`${idField}, ${dateField}`)
    .eq('customer_id', customer_id)
    .order(dateField, { ascending: true })
    .limit(5000)

  // Erste Aktion pro E-Mail = Cohort-Eintritt.
  const firstSeenByEmail = new Map()
  const actionsByEmail = new Map()
  for (const r of rows || []) {
    const email = String(r[idField] || '').toLowerCase()
    if (!email) continue
    const month = monthKey(r[dateField])
    if (!firstSeenByEmail.has(email)) firstSeenByEmail.set(email, month)
    if (!actionsByEmail.has(email)) actionsByEmail.set(email, new Set())
    actionsByEmail.get(email).add(month)
  }

  // Gruppieren nach Cohort-Monat, Retention nach m+1, m+2, ...
  const cohorts = new Map()
  for (const [email, firstMonth] of firstSeenByEmail.entries()) {
    if (!cohorts.has(firstMonth)) cohorts.set(firstMonth, { members: new Set(), monthSets: new Map() })
    cohorts.get(firstMonth).members.add(email)
    const monthSet = actionsByEmail.get(email)
    for (const m of monthSet) {
      cohorts.get(firstMonth).monthSets.set(m, (cohorts.get(firstMonth).monthSets.get(m) || new Set()).add(email))
    }
  }

  const results = []
  for (const [cohortMonth, info] of cohorts.entries()) {
    const size = info.members.size
    if (size === 0) continue
    const retention = {}
    for (let i = 0; i <= months; i++) {
      const d = new Date(cohortMonth)
      d.setUTCMonth(d.getUTCMonth() + i)
      const mKey = monthKey(d)
      const active = info.monthSets.get(mKey) ? info.monthSets.get(mKey).size : 0
      retention[`m${i}`] = Math.round((active / size) * 100)
    }
    const snap = {
      customer_id,
      cohort_source: source,
      cohort_month: cohortMonth,
      cohort_size: size,
      retention
    }
    const { data } = await supabase
      .from('cohort_snapshots')
      .upsert(snap, { onConflict: 'customer_id,cohort_source,cohort_month' })
      .select('*')
      .maybeSingle()
    if (data) results.push(data)
  }
  return results
}

// === CLV pro Segment ===

const SEGMENT_DEFS = [
  { key: 'all',          label: 'Alle Endkunden' },
  { key: 'loyalty_vip',  label: 'Loyalty VIP (>=500 Punkte)' },
  { key: 'qr_only',      label: 'Nur QR-Scans' },
  { key: 'first_time',   label: 'Erstkunden' },
  { key: 'win_back',     label: 'Reaktivierungs-Kandidaten (60+ Tage inaktiv)' }
]

async function computeClvSegments({ customer_id }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }

  const { data: members } = await supabase
    .from('loyalty_customers')
    .select('id, email, points_balance, created_at, last_scan_at')
    .eq('customer_id', customer_id)
    .limit(10000)
  const { data: invoices } = await supabase
    .from('invoices')
    .select('customer_id, customer_email, amount, total, issue_date')
    .eq('customer_id', customer_id)
    .limit(20000)

  const revenueByEmail = new Map()
  for (const i of invoices || []) {
    const email = String(i.customer_email || '').toLowerCase()
    if (!email) continue
    revenueByEmail.set(email, (revenueByEmail.get(email) || 0) + Number(i.amount || i.total || 0))
  }

  const now = Date.now()
  const sixtyDaysAgo = new Date(now - 60 * 86_400_000)

  function pickSegment(member) {
    const sgs = []
    sgs.push('all')
    if ((member.points_balance || 0) >= 500) sgs.push('loyalty_vip')
    const email = String(member.email || '').toLowerCase()
    if (email && !revenueByEmail.has(email)) sgs.push('qr_only')
    const monthsActive = member.created_at ? (now - new Date(member.created_at)) / 2592_000_000 : 0
    if (monthsActive < 1) sgs.push('first_time')
    if (member.last_scan_at && new Date(member.last_scan_at) < sixtyDaysAgo) sgs.push('win_back')
    return sgs
  }

  const bySegment = new Map()
  for (const m of members || []) {
    const segs = pickSegment(m)
    const rev = revenueByEmail.get(String(m.email || '').toLowerCase()) || 0
    for (const s of segs) {
      if (!bySegment.has(s)) bySegment.set(s, { revenues: [], lifetimes: [] })
      const seg = bySegment.get(s)
      seg.revenues.push(rev)
      if (m.created_at) seg.lifetimes.push((now - new Date(m.created_at)) / 86_400_000)
    }
  }

  const results = []
  for (const def of SEGMENT_DEFS) {
    const seg = bySegment.get(def.key) || { revenues: [], lifetimes: [] }
    const sorted = [...seg.revenues].sort((a, b) => a - b)
    const total = sorted.reduce((s, v) => s + v, 0)
    const avg = sorted.length ? total / sorted.length : 0
    const med = median(sorted)
    const avgLifetime = seg.lifetimes.length ? Math.round(seg.lifetimes.reduce((s, v) => s + v, 0) / seg.lifetimes.length) : null
    const snap = {
      customer_id,
      segment_key: def.key,
      segment_label: def.label,
      member_count: sorted.length,
      avg_revenue_eur: Math.round(avg * 100) / 100,
      median_revenue_eur: Math.round(med * 100) / 100,
      total_revenue_eur: Math.round(total * 100) / 100,
      avg_lifetime_days: avgLifetime
    }
    const { data } = await supabase
      .from('clv_segments')
      .upsert(snap, { onConflict: 'customer_id,segment_key' })
      .select('*')
      .maybeSingle()
    if (data) results.push(data)
  }
  return results
}

module.exports = {
  computePeerBenchmark,
  computeCohortAnalysis,
  computeClvSegments,
  SEGMENT_DEFS,
  // Test helpers:
  _median: median,
  _percentile: percentile,
  _regionKey: regionKey,
  _monthKey: monthKey
}
