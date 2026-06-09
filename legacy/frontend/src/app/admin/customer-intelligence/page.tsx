'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { BrainCircuit, RefreshCw, FileText } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { customerIntelligenceClient } from '@/lib/customerIntelligenceClient'

type ToolUsage = { tool_key?: string; usage_count?: number; last_used_at?: string }
type Snapshot = { id: string; period_start?: string; period_end?: string; pdf_url?: string; created_at?: string }

const SCORE_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'health_score', label: 'Health-Score' },
  { key: 'risk_score', label: 'Risiko-Score' },
  { key: 'upsell_score', label: 'Upsell-Score' },
  { key: 'engagement_score', label: 'Engagement' },
  { key: 'churn_risk', label: 'Churn-Risiko' }
]

export default function CustomerIntelligencePage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [intel, setIntel] = useState<any>(null)
  const [usage, setUsage] = useState<ToolUsage[]>([])
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function load(cid: string) {
    setLoading(true); setError('')
    try {
      const [s, u, snaps] = await Promise.all([
        customerIntelligenceClient.score(cid).catch(() => ({ intelligence: null })),
        customerIntelligenceClient.toolUsage(cid).catch(() => ({ usage: [] })),
        customerIntelligenceClient.monthlySnapshots(cid).catch(() => ({ snapshots: [] }))
      ])
      setIntel((s as any).intelligence || null)
      setUsage((u as any).usage || [])
      setSnapshots((snaps as any).snapshots || [])
    } catch (e: any) { setError(e?.message || 'Konnte Daten nicht laden.') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    (async () => {
      const p = await getCurrentUserProfile()
      if (!p) { setAuthorized(false); setLoading(false); return }
      setAuthorized(true)
      const cid = p.customer_id || ''
      setCustomerId(cid)
      if (cid) await load(cid); else setLoading(false)
    })()
  }, [])

  async function recalc() {
    setBusy(true); setError(''); setInfo('')
    try {
      const r = await customerIntelligenceClient.calculate(customerId)
      setIntel((r as any).intelligence || null)
      setInfo('Scores neu berechnet.')
    } catch (e: any) { setError(e?.message || 'Berechnung fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function makeReport() {
    setBusy(true); setError(''); setInfo('')
    try {
      await customerIntelligenceClient.monthlySnapshot(customerId, { create_pdf: true })
      setInfo('Monatsreport erzeugt.')
      await load(customerId)
    } catch (e: any) { setError(e?.message || 'Report fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  const scoreEntries = intel ? SCORE_FIELDS.filter((f) => intel[f.key] != null) : []

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <h1><BrainCircuit size={22} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Customer Intelligence</h1>
        <p>Health-, Risiko- und Upsell-Scores, Tool-Nutzung und Monatsreports — aus den verknuepften Modulen berechnet.</p>
      </header>

      {authorized === false && <div className="adminNotice"><b>Anmeldung erforderlich.</b></div>}
      {authorized && !customerId && <section className="adminCard"><p className="adminMuted">Dein Konto ist mit keinem Customer verknuepft.</p></section>}
      {error && <div className="adminAlert">{error}</div>}
      {info && <div className="adminAlertInfo">{info}</div>}

      {authorized && customerId && (
        <>
          <section className="adminCard">
            <div className="adminActions">
              <h2 style={{ margin: 0 }}>Scores</h2>
              <span className="adminTabSpacer" />
              <button type="button" className="adminBtn small" onClick={recalc} disabled={busy}><RefreshCw size={14} /> Neu berechnen</button>
            </div>
            {loading && <div className="adminMuted">Lade …</div>}
            {!loading && !intel && <div className="adminMuted">Noch keine Scores berechnet — klick „Neu berechnen".</div>}
            {!loading && intel && (
              <div className="seoGrid">
                {scoreEntries.length > 0 ? scoreEntries.map((f) => (
                  <div className="seoStat" key={f.key}><strong>{Math.round(Number(intel[f.key]))}</strong><span>{f.label}</span></div>
                )) : (
                  <div className="adminMuted">Datensatz vorhanden, aber keine bekannten Score-Felder. Rohdaten: <code>{JSON.stringify(intel).slice(0, 200)}</code></div>
                )}
              </div>
            )}
          </section>

          <section className="adminCard">
            <h2>Tool-Nutzung</h2>
            {usage.length === 0 && <div className="adminMuted">Keine Nutzungsdaten erfasst.</div>}
            {usage.length > 0 && (
              <table className="adminTable">
                <thead><tr><th>Tool</th><th>Nutzungen</th><th>Zuletzt</th></tr></thead>
                <tbody>
                  {usage.map((u, i) => (
                    <tr key={i}><td>{u.tool_key || '—'}</td><td>{u.usage_count ?? 0}</td><td>{(u.last_used_at || '').slice(0, 10) || '—'}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="adminCard">
            <div className="adminActions">
              <h2 style={{ margin: 0 }}>Monatsreports</h2>
              <span className="adminTabSpacer" />
              <button type="button" className="adminBtn small" onClick={makeReport} disabled={busy}><FileText size={14} /> Report erzeugen</button>
            </div>
            {snapshots.length === 0 && <div className="adminMuted">Noch keine Reports.</div>}
            {snapshots.length > 0 && (
              <table className="adminTable">
                <thead><tr><th>Zeitraum</th><th>Erstellt</th><th>PDF</th></tr></thead>
                <tbody>
                  {snapshots.map((s) => (
                    <tr key={s.id}>
                      <td>{(s.period_start || '').slice(0, 10)} – {(s.period_end || '').slice(0, 10)}</td>
                      <td>{(s.created_at || '').slice(0, 10)}</td>
                      <td>{s.pdf_url ? <a className="adminBtn small" href={s.pdf_url} target="_blank" rel="noopener noreferrer">Öffnen</a> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </main>
  )
}
