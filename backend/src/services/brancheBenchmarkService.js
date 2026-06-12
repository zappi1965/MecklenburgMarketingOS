// Branchen-Benchmark-Report (k-anonym).
//
// Vergleicht die KPIs eines Kunden gegen eine anonymisierte Peer-Gruppe
// derselben Branche. Strikte k-Anonymität: min-N = 5 Peers NACH Self-Exclusion,
// sonst Fallback auf konfigurierbare Branchen-Zielwerte. Es werden nur
// Quantile/Durchschnitte verarbeitet — niemals identifizierbare Peer-Rohdaten.
//
// Quelle: customer_monthly_report_snapshots. Aggregate/Reports: siehe Migration 0122.
// Exportierte Pure-Funktionen sind ohne Supabase testbar.

const MIN_PEERS = 5

// Metriken, die verglichen werden (Schlüssel = Spalte in den Monats-Snapshots).
const METRICS = [
  { key: 'revenue', label: 'Umsatz', higherIsBetter: true },
  { key: 'qr_scans', label: 'QR-Scans', higherIsBetter: true },
  { key: 'loyalty_points_issued', label: 'Vergebene Punkte', higherIsBetter: true },
  { key: 'reviews', label: 'Bewertungen', higherIsBetter: true },
  { key: 'avg_rating', label: 'Ø Bewertung', higherIsBetter: true },
  { key: 'appointments', label: 'Termine', higherIsBetter: true },
  { key: 'leads', label: 'Leads', higherIsBetter: true }
]

function normalizeBranch(value) {
  return String(value || '').trim().toLowerCase() || null
}

function percentile(sortedAsc, p) {
  if (sortedAsc.length === 0) return null
  if (sortedAsc.length === 1) return sortedAsc[0]
  const idx = (sortedAsc.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sortedAsc[lo]
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (idx - lo)
}

// Reine Quantil-Berechnung über eine Werteliste.
function quantiles(values = []) {
  const nums = values.map(Number).filter((n) => Number.isFinite(n))
  const sorted = [...nums].sort((a, b) => a - b)
  if (sorted.length === 0) return { count: 0, p25: null, median: null, p75: null, avg: null }
  const sum = sorted.reduce((a, b) => a + b, 0)
  return {
    count: sorted.length,
    p25: percentile(sorted, 0.25),
    median: percentile(sorted, 0.5),
    p75: percentile(sorted, 0.75),
    avg: Math.round((sum / sorted.length) * 100) / 100
  }
}

// k-Anon-Entscheidung: genug Peers -> 'peers', sonst 'targets'.
function decideSource(peerCount, minPeers = MIN_PEERS) {
  return Number(peerCount || 0) >= minPeers ? 'peers' : 'targets'
}

// Baut die Vergleichszeile für eine Metrik (rein, ohne Supabase).
// peerValues = Werte der Peers OHNE den Kunden selbst.
function buildMetricComparison({ metric, ownValue, peerValues = [], target = null, minPeers = MIN_PEERS }) {
  const q = quantiles(peerValues)
  const source = decideSource(q.count, minPeers)
  if (source === 'peers') {
    let position = 'mittel'
    if (q.median != null && ownValue != null) {
      if (ownValue >= q.p75) position = 'top'
      else if (ownValue <= q.p25) position = 'unten'
    }
    return {
      metric: metric.key,
      label: metric.label,
      own_value: ownValue ?? null,
      source: 'peers',
      suppressed: false,
      peer_count: q.count,
      peer_p25: q.p25,
      peer_median: q.median,
      peer_p75: q.p75,
      position
    }
  }
  // Fallback auf Zielwerte.
  if (target == null) {
    return { metric: metric.key, label: metric.label, own_value: ownValue ?? null, source: 'none', suppressed: true, peer_count: q.count, note: 'nicht genug Vergleichsdaten' }
  }
  return {
    metric: metric.key,
    label: metric.label,
    own_value: ownValue ?? null,
    source: 'targets',
    suppressed: true,
    peer_count: q.count,
    target_value: target,
    position: ownValue != null && target != null ? (ownValue >= target ? 'über Ziel' : 'unter Ziel') : 'mittel'
  }
}

function renderReportHtml({ branchLabel, period, comparison, usedFallback }) {
  const rows = comparison.map((c) => {
    const peer = c.source === 'peers'
      ? `Median ${c.peer_median ?? '–'} (Ø-Band ${c.peer_p25 ?? '–'}–${c.peer_p75 ?? '–'}), n=${c.peer_count}`
      : c.source === 'targets'
        ? `Branchen-Zielwert ${c.target_value}`
        : 'nicht genug Vergleichsdaten'
    return `<tr><td>${c.label}</td><td style="text-align:right">${c.own_value ?? '–'}</td><td>${peer}</td><td>${c.position || '–'}</td></tr>`
  }).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:32px}
    h1{margin:0 0 4px} .sub{color:#555;margin:0 0 20px}
    table{border-collapse:collapse;width:100%} th,td{border:1px solid #ddd;padding:8px;font-size:13px;text-align:left}
    th{background:#f5f5f5} .note{margin-top:16px;color:#777;font-size:12px}
  </style></head><body>
    <h1>Branchen-Benchmark</h1>
    <p class="sub">Branche: ${branchLabel || '–'} · Zeitraum: ${period.start} bis ${period.end}</p>
    <table><thead><tr><th>Kennzahl</th><th>Dein Wert</th><th>Vergleich</th><th>Einordnung</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <p class="note">Alle Vergleichswerte sind anonymisiert (k-anonym, min. ${MIN_PEERS} vergleichbare Betriebe).${usedFallback ? ' Für einzelne Kennzahlen wurden Branchen-Zielwerte genutzt, da zu wenige vergleichbare Betriebe vorlagen.' : ''} Kein einzelner Betrieb ist identifizierbar.</p>
  </body></html>`
}

class BrancheBenchmarkService {
  constructor(supabase, deps = {}) {
    this.supabase = supabase
    this.documentEngine = deps.documentEngine || null // renderAndStoreDocument(supabase, req, input)
  }

  // Holt alle Monats-Snapshots der Periode + Branche je Kunde.
  async _snapshotsForPeriod(period) {
    const { data: snaps } = await this.supabase
      .from('customer_monthly_report_snapshots')
      .select('customer_id, period_start, period_end, revenue, qr_scans, loyalty_points_issued, reviews, avg_rating, appointments, leads')
      .eq('period_start', period.start)
      .eq('period_end', period.end)
      .limit(5000)
    const rows = snaps || []
    const ids = [...new Set(rows.map((r) => r.customer_id))]
    const branchById = {}
    if (ids.length) {
      const { data: custs } = await this.supabase.from('customers').select('id, branch').in('id', ids)
      for (const c of custs || []) branchById[c.id] = normalizeBranch(c.branch)
    }
    return rows.map((r) => ({ ...r, branch: branchById[r.customer_id] || null }))
  }

  // Berechnet k-anonyme Aggregate je Branche/Metrik und speichert sie.
  async computeAggregates(period) {
    const rows = await this._snapshotsForPeriod(period)
    const byBranch = {}
    for (const r of rows) {
      if (!r.branch) continue
      byBranch[r.branch] = byBranch[r.branch] || []
      byBranch[r.branch].push(r)
    }
    const written = []
    for (const [branch, list] of Object.entries(byBranch)) {
      for (const metric of METRICS) {
        const values = list.map((r) => Number(r[metric.key])).filter((n) => Number.isFinite(n))
        const q = quantiles(values)
        const suppressed = q.count < MIN_PEERS
        const payload = {
          branch, period_start: period.start, period_end: period.end, metric_key: metric.key,
          peer_count: q.count, p25: q.p25, median: q.median, p75: q.p75, avg: q.avg,
          is_suppressed: suppressed, source: suppressed ? 'targets' : 'peers', computed_at: new Date().toISOString()
        }
        await this.supabase.from('branche_benchmark_aggregates').upsert(payload, { onConflict: 'branch,period_start,period_end,metric_key' })
        written.push(payload)
      }
    }
    return { branches: Object.keys(byBranch).length, rows: written.length }
  }

  async _targetsFor(branch) {
    const { data } = await this.supabase.from('branche_benchmark_targets').select('metric_key, target_value').eq('branch', branch)
    const map = {}
    for (const t of data || []) map[t.metric_key] = Number(t.target_value)
    return map
  }

  // Erzeugt den Report für einen Kunden (mit Self-Exclusion).
  async generateReport(req, { customer_id, period }) {
    const cust = await this.supabase.from('customers').select('id, name, branch').eq('id', customer_id).maybeSingle()
    const branch = normalizeBranch(cust?.data?.branch)
    const own = await this.supabase
      .from('customer_monthly_report_snapshots')
      .select('*')
      .eq('customer_id', customer_id)
      .eq('period_start', period.start)
      .eq('period_end', period.end)
      .maybeSingle()
    const ownRow = own?.data || {}

    const allRows = branch ? (await this._snapshotsForPeriod(period)).filter((r) => r.branch === branch) : []
    const targets = branch ? await this._targetsFor(branch) : {}

    let usedFallback = false
    let peerCountForReport = 0
    const comparison = METRICS.map((metric) => {
      const peerValues = allRows
        .filter((r) => r.customer_id !== customer_id)
        .map((r) => Number(r[metric.key]))
        .filter((n) => Number.isFinite(n))
      peerCountForReport = Math.max(peerCountForReport, peerValues.length)
      const row = buildMetricComparison({ metric, ownValue: Number(ownRow[metric.key] ?? null), peerValues, target: targets[metric.key] ?? null })
      if (row.source !== 'peers') usedFallback = true
      return row
    })

    const html = renderReportHtml({ branchLabel: cust?.data?.branch, period, comparison, usedFallback })

    let pdf_url = null
    let output_document_id = null
    if (this.documentEngine) {
      try {
        const doc = await this.documentEngine(this.supabase, req, {
          customer_id,
          html,
          title: `Branchen-Benchmark ${period.start}`,
          document_type: 'benchmark_report',
          idempotency_key: `benchmark:${customer_id}:${period.start}`
        })
        pdf_url = doc?.signed_url || doc?.url || null
        output_document_id = doc?.document_id || doc?.customer_file_id || null
      } catch (e) {
        // PDF-Renderer evtl. nicht konfiguriert -> Report trotzdem mit Daten speichern.
      }
    }

    const reportRow = {
      customer_id, period_start: period.start, period_end: period.end, branch: cust?.data?.branch || null,
      comparison, peer_count: peerCountForReport, used_fallback: usedFallback,
      output_document_id, pdf_url, status: 'generated'
    }
    const saved = await this.supabase
      .from('branche_benchmark_reports')
      .upsert(reportRow, { onConflict: 'customer_id,period_start,period_end' })
      .select('*')
      .maybeSingle()
    return saved?.data || reportRow
  }

  async listReports(customer_id) {
    const { data } = await this.supabase
      .from('branche_benchmark_reports')
      .select('*')
      .eq('customer_id', customer_id)
      .order('created_at', { ascending: false })
      .limit(50)
    return data || []
  }

  async getTargets(branch) {
    const q = this.supabase.from('branche_benchmark_targets').select('*')
    const { data } = branch ? await q.eq('branch', branch) : await q.limit(500)
    return data || []
  }

  async upsertTarget({ branch, metric_key, target_value, updated_by }) {
    const { data, error } = await this.supabase
      .from('branche_benchmark_targets')
      .upsert({ branch: normalizeBranch(branch), metric_key, target_value: Number(target_value) || 0, updated_by, updated_at: new Date().toISOString() }, { onConflict: 'branch,metric_key' })
      .select('*')
      .maybeSingle()
    if (error) throw error
    return data
  }
}

module.exports = {
  BrancheBenchmarkService,
  MIN_PEERS,
  METRICS,
  normalizeBranch,
  quantiles,
  decideSource,
  buildMetricComparison,
  renderReportHtml
}
