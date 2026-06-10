'use client'

import { useEffect, useState } from 'react'
import ToolAccessGate from '@/components/security/ToolAccessGate'
import { brancheBenchmarkClient, BenchmarkTarget } from '@/lib/brancheBenchmarkClient'

const METRICS = [
  { key: 'revenue', label: 'Umsatz' },
  { key: 'qr_scans', label: 'QR-Scans' },
  { key: 'loyalty_points_issued', label: 'Vergebene Punkte' },
  { key: 'reviews', label: 'Bewertungen' },
  { key: 'avg_rating', label: 'Ø Bewertung' },
  { key: 'appointments', label: 'Termine' },
  { key: 'leads', label: 'Leads' }
]

function defaultPeriod() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const end = new Date(now.getFullYear(), now.getMonth(), 0)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { period_start: iso(start), period_end: iso(end) }
}

export default function BenchmarkAdmin() {
  const [period, setPeriod] = useState(defaultPeriod())
  const [branch, setBranch] = useState('')
  const [targets, setTargets] = useState<Record<string, number>>({})
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function loadTargets(b: string) {
    if (!b.trim()) { setTargets({}); return }
    try {
      const res = await brancheBenchmarkClient.getTargets(b.trim().toLowerCase())
      const map: Record<string, number> = {}
      for (const t of res.targets || []) map[t.metric_key] = Number(t.target_value)
      setTargets(map)
    } catch (e: any) { setMsg(e?.message || 'Laden fehlgeschlagen.') }
  }

  useEffect(() => { void loadTargets(branch) }, [branch])

  async function saveTarget(metric_key: string) {
    if (!branch.trim()) { setMsg('Bitte zuerst eine Branche eingeben.'); return }
    setBusy(true); setMsg(null)
    try {
      await brancheBenchmarkClient.saveTarget({ branch: branch.trim().toLowerCase(), metric_key, target_value: Number(targets[metric_key] || 0) })
      setMsg('Zielwert gespeichert.')
    } catch (e: any) { setMsg(e?.message || 'Speichern fehlgeschlagen.') } finally { setBusy(false) }
  }

  async function compute() {
    setBusy(true); setMsg(null)
    try {
      const res = await brancheBenchmarkClient.compute(period)
      setMsg(`Aggregate berechnet: ${res.branches} Branchen, ${res.rows} Kennzahlen.`)
    } catch (e: any) { setMsg(e?.message || 'Berechnung fehlgeschlagen.') } finally { setBusy(false) }
  }

  return (
    <ToolAccessGate toolKey="branche_benchmark">
      <div className="adminPage">
        <header className="adminHeader">
          <h1>Branchen-Benchmark Report</h1>
          <p>Monatlicher, k-anonymer Vergleich der Kunden-KPIs gegen anonymisierte Peers derselben Branche (min. 5 Betriebe), mit Branchen-Zielwerten als Fallback.</p>
        </header>

        <section className="adminCard" style={{ display: 'grid', gap: 10, maxWidth: 520 }}>
          <h2>Zeitraum &amp; Aggregation</h2>
          <label><span>Periode Start</span><input className="input" type="date" value={period.period_start} onChange={(e) => setPeriod({ ...period, period_start: e.target.value })} /></label>
          <label><span>Periode Ende</span><input className="input" type="date" value={period.period_end} onChange={(e) => setPeriod({ ...period, period_end: e.target.value })} /></label>
          <button className="btn" onClick={compute} disabled={busy}>{busy ? 'Berechne…' : 'k-anonyme Aggregate berechnen'}</button>
        </section>

        <section className="adminCard" style={{ marginTop: 16, display: 'grid', gap: 10, maxWidth: 520 }}>
          <h2>Branchen-Zielwerte (Fallback)</h2>
          <label><span>Branche</span><input className="input" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="z. B. friseur" /></label>
          {branch.trim() ? METRICS.map((m) => (
            <div key={m.key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ minWidth: 160 }}>{m.label}</span>
              <input className="input" type="number" value={targets[m.key] ?? ''} onChange={(e) => setTargets({ ...targets, [m.key]: Number(e.target.value) })} />
              <button className="btn ghost" onClick={() => saveTarget(m.key)} disabled={busy}>Speichern</button>
            </div>
          )) : <p style={{ opacity: 0.7 }}>Branche eingeben, um Zielwerte zu pflegen.</p>}
        </section>

        {msg ? <p style={{ marginTop: 12, opacity: 0.85 }}>{msg}</p> : null}
        <p style={{ marginTop: 16, fontSize: 13, opacity: 0.7 }}>
          Fertige Reports erscheinen beim Kunden unter „Reports &amp; PDFs". Die Aggregation läuft serverseitig
          (Service-Role) — es werden nur anonyme Quantile gespeichert, keine identifizierbaren Peer-Daten.
        </p>
      </div>
    </ToolAccessGate>
  )
}
