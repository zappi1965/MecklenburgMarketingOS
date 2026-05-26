// Dublettensuche im CRM mit Confidence-Score + Merge-Workflow.
//
// Strategie:
//   - Normalisiere name, email, phone, postal_code zu Vergleichs-Keys.
//   - Cluster nach (postal_code, name_prefix) — verhindert O(n^2) Vergleich.
//   - In jedem Cluster: Levenshtein auf normalisierte Namen.
//   - Score-Komponenten: name (40%), email (30%), phone (15%), postal (15%).
//
// Merge: alle FK-Spalten der referenzierenden Tabellen werden auf die
// primary_id umgebogen, danach werden die merge_ids geloescht.

const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // diacritics
    .replace(/[^a-z0-9]+/g, '')
}

function normalizePhone(s) {
  return String(s || '').replace(/[^\d]/g, '')
}

function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const prev = new Array(b.length + 1)
  const cur = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j]
  }
  return cur[b.length]
}

function similarity(a, b) {
  if (!a && !b) return 1
  if (!a || !b) return 0
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(a, b) / maxLen
}

function pairScore(c1, c2) {
  const nameSim = similarity(normalizeText(c1.name), normalizeText(c2.name))
  const emailSim = c1.email && c2.email && c1.email.toLowerCase() === c2.email.toLowerCase() ? 1 : 0
  const phoneSim = c1.phone && c2.phone && normalizePhone(c1.phone) === normalizePhone(c2.phone) ? 1 : 0
  const postalSim = c1.postal_code && c2.postal_code && c1.postal_code === c2.postal_code ? 1 : 0
  return Math.round((nameSim * 0.4 + emailSim * 0.3 + phoneSim * 0.15 + postalSim * 0.15) * 100) / 100
}

async function findDuplicates({ threshold = 0.8, limit = 500 } = {}) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }

  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, name, email, phone, postal_code, city, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error

  // Cluster nach (postal_code, ersten 2 Zeichen des normalisierten Namens).
  const buckets = new Map()
  for (const c of customers || []) {
    const key = `${c.postal_code || ''}|${normalizeText(c.name).slice(0, 2)}`
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(c)
  }

  // Innerhalb jedes Buckets paarweise vergleichen, Cluster bilden.
  const clusters = []
  for (const bucket of buckets.values()) {
    if (bucket.length < 2) continue
    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const score = pairScore(bucket[i], bucket[j])
        if (score >= threshold) {
          clusters.push({
            confidence: score,
            members: [bucket[i], bucket[j]]
          })
        }
      }
    }
  }
  // Sortierung: hoechste Confidence zuerst.
  clusters.sort((a, b) => b.confidence - a.confidence)
  return clusters
}

// Tabellen, deren customer_id-Spalte beim Merge umgebogen wird. Falls eine
// Tabelle in einer Umgebung nicht existiert, wird der Fehler still ignoriert.
const FK_TABLES = [
  'invoices',
  'appointments',
  'tickets',
  'loyalty_customers',
  'loyalty_transactions',
  'qr_campaigns',
  'review_feedback',
  'customer_files',
  'pipeline_leads',
  'customer_subscriptions',
  'customer_tool_access',
  'customer_tool_usage',
  'customer_timeline_events',
  'customer_intelligence_scores',
  'customer_monthly_report_snapshots',
  'newsletter_subscribers',
  'newsletter_campaigns',
  'vouchers',
  'referrals',
  'customer_referral_codes',
  'customer_users',
  'security_events',
  'tse_transactions',
  'dsar_requests'
]

async function mergeDuplicates({ primary_id, merge_ids, actor_id }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }
  if (!primary_id || !Array.isArray(merge_ids) || merge_ids.length === 0) {
    const e = new Error('primary_id und merge_ids[] sind Pflicht'); e.status = 400; throw e
  }
  if (merge_ids.includes(primary_id)) {
    const e = new Error('primary_id darf nicht in merge_ids stehen'); e.status = 400; throw e
  }

  // Audit-Snapshot vor dem Merge.
  const { data: snapshot } = await supabase
    .from('customers')
    .select('*')
    .in('id', [primary_id, ...merge_ids])

  const results = []
  for (const tbl of FK_TABLES) {
    try {
      const { count, error: updErr } = await supabase
        .from(tbl)
        .update({ customer_id: primary_id })
        .in('customer_id', merge_ids)
        .select('id', { count: 'exact', head: true })
      if (updErr) {
        // Tabelle existiert nicht in dieser Umgebung — skip.
        if (String(updErr.message || '').toLowerCase().includes('does not exist')) continue
        throw updErr
      }
      results.push({ table: tbl, updated: count || 0 })
    } catch (_) {
      // Tolerant fortsetzen — alle anderen Tabellen sollen umgebogen werden.
    }
  }

  // Sekundaere Customer-Datensaetze loeschen.
  const { error: delErr } = await supabase.from('customers').delete().in('id', merge_ids)
  if (delErr) throw delErr

  // Audit-Log.
  try {
    await supabase.from('security_events').insert({
      actor_type: 'user',
      actor_id: actor_id || null,
      event_type: 'customer.merged',
      severity: 'warning',
      title: 'Kundendatensaetze zusammengefuehrt',
      description: `${merge_ids.length} Datensatz/Datensaetze wurden in ${primary_id} gemerged.`,
      metadata: { primary_id, merge_ids, fk_updates: results, snapshot }
    })
  } catch (_) {}

  return { primary_id, merged: merge_ids, fk_updates: results }
}

module.exports = {
  findDuplicates,
  mergeDuplicates,
  pairScore,
  // Test helpers:
  _normalizeText: normalizeText,
  _normalizePhone: normalizePhone,
  _levenshtein: levenshtein,
  _similarity: similarity,
  FK_TABLES
}
