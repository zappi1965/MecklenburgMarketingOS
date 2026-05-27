'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { AlertTriangle, AlertCircle, CheckCircle2, RefreshCw, Activity } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { opsAdminClient, type HealthSnapshot } from '@/lib/opsAdminClient'

export default function OpsCockpitPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState<'all' | 'red' | 'yellow'>('all')

  async function load() {
    setLoading(true); setError('')
    try {
      const r = await opsAdminClient.healthSnapshot()
      setSnapshot(r.snapshot)
    } catch (e: any) {
      setError(e?.message || 'Snapshot fehlgeschlagen.')
    } finally { setLoading(false) }
  }

  useEffect(() => {
    (async () => {
      const profile = await getCurrentUserProfile()
      if (!profile) { setAuthorized(false); setLoading(false); return }
      setAuthorized(true)
      await load()
    })()
  }, [])

  const filtered = (snapshot?.customers || []).filter((c) =>
    filter === 'all' ? true : c.status === filter
  )

  return (
    <main className="adminPage opsPage">
      <header className="adminHeader">
        <h1>Health-Cockpit</h1>
        <p>"Wo brennt's"-Sicht über alle Customer hinweg. Aggregiert aus Tickets, QR-Aktivität, Loyalty, Mahnstufen, Customer-Intelligence und Worker-Logs.</p>
      </header>

      {authorized === false && <div className="adminNotice"><b>Admin-Zugriff erforderlich.</b></div>}
      {error && <div className="adminAlert">{error}</div>}

      {authorized && (
        <>
          <section className="opsStatsRow">
            <button type="button" className={`opsStatBtn ${filter==='all'?'on':''}`} onClick={() => setFilter('all')}>
              <Activity size={16} /><div><strong>{snapshot?.summary.customers_total ?? '—'}</strong><span>Customer gesamt</span></div>
            </button>
            <button type="button" className={`opsStatBtn red ${filter==='red'?'on':''}`} onClick={() => setFilter('red')}>
              <AlertCircle size={16} /><div><strong>{snapshot?.summary.red ?? '—'}</strong><span>Kritisch (rot)</span></div>
            </button>
            <button type="button" className={`opsStatBtn yellow ${filter==='yellow'?'on':''}`} onClick={() => setFilter('yellow')}>
              <AlertTriangle size={16} /><div><strong>{snapshot?.summary.yellow ?? '—'}</strong><span>Warnung (gelb)</span></div>
            </button>
            <div className="opsStatBtn green static">
              <CheckCircle2 size={16} /><div><strong>{snapshot?.summary.green ?? '—'}</strong><span>OK (grün)</span></div>
            </div>
          </section>

          <section className="opsSummaryRow">
            <div><b>{snapshot?.summary.tickets_open_total ?? 0}</b> offene Tickets ({snapshot?.summary.tickets_stale_total ?? 0} davon &gt; 7 Tage)</div>
            <div><b>{snapshot?.summary.dunning_escalated_total ?? 0}</b> eskalierte Mahnungen</div>
            <div><b>{snapshot?.summary.worker_fails_24h ?? 0}</b> Worker-Fails (24h)</div>
            <button type="button" className="adminBtn small" onClick={load} disabled={loading || busy}><RefreshCw size={14} /> Neu laden</button>
          </section>

          {loading && <div className="adminMuted">Lade Snapshot …</div>}

          {!loading && filtered.length === 0 && (
            <section className="adminCard">
              <div className="adminMuted">{filter === 'all' ? 'Keine Customer.' : 'Kein Customer in dieser Kategorie. Glückwunsch.'}</div>
            </section>
          )}

          {!loading && filtered.length > 0 && (
            <section className="opsList">
              {filtered.map((c) => (
                <article key={c.customer.id} className={`opsCustomer status-${c.status}`}>
                  <div className="opsCustomerHead">
                    <div>
                      <strong>{c.customer.name}</strong>
                      <span className="adminMuted">{c.customer.package_name || '—'}</span>
                    </div>
                    <span className={`adminBadge ${c.status==='red'?'off':c.status==='yellow'?'':'on'}`}>{c.status.toUpperCase()}</span>
                  </div>
                  <div className="opsMetrics">
                    <span>{c.tickets_open} Tickets</span>
                    <span>{c.qr_campaigns} QR-Kampagnen{c.qr_inactive > 0 ? ` (${c.qr_inactive} inaktiv)` : ''}</span>
                    <span>{c.loyalty_members} Loyalty-Mitglieder</span>
                    {c.dunning_escalated > 0 && <span className="opsCritical">{c.dunning_escalated} Mahnung(en) eskaliert</span>}
                    {c.risk_score != null && <span>Risiko {c.risk_score}/100</span>}
                  </div>
                  {(c.criticals.length > 0 || c.warnings.length > 0) && (
                    <ul className="opsAlertList">
                      {c.criticals.map((a, i) => <li key={`c${i}`} className="opsCritical">{a.text}</li>)}
                      {c.warnings.map((a, i) => <li key={`w${i}`} className="opsWarn">{a.text}</li>)}
                    </ul>
                  )}
                </article>
              ))}
            </section>
          )}

          {snapshot?.worker_fails && snapshot.worker_fails.length > 0 && (
            <section className="adminCard">
              <h2>Fehlgeschlagene Worker-Runs (letzte 24h)</h2>
              <table className="adminTable">
                <thead><tr><th>Job</th><th>Status</th><th>Zeit</th><th>Message</th></tr></thead>
                <tbody>
                  {snapshot.worker_fails.map((w) => (
                    <tr key={w.id}>
                      <td><code>{w.job_name}</code></td>
                      <td><span className="adminBadge off">{w.status}</span></td>
                      <td>{new Date(w.finished_at).toLocaleString('de-DE')}</td>
                      <td className="adminMuted">{w.message || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </main>
  )
}
