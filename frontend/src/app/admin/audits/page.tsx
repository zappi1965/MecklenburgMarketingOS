'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Search, FileSearch, RefreshCw, ChevronRight } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { opsAdminClient, type OnboardingAudit } from '@/lib/opsAdminClient'

export default function AuditsPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [audits, setAudits] = useState<OnboardingAudit[]>([])
  const [selected, setSelected] = useState<OnboardingAudit | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const r = await opsAdminClient.listAudits()
      setAudits(r.audits || [])
    } catch (e: any) { setError(e?.message || 'Konnte nicht laden.') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    (async () => {
      const profile = await getCurrentUserProfile()
      if (!profile) { setAuthorized(false); setLoading(false); return }
      setAuthorized(true)
      if (profile.customer_id) setCustomerId(profile.customer_id)
      await load()
    })()
  }, [])

  async function startAudit() {
    if (!customerId) { setError('customer_id fehlt'); return }
    setBusy(true); setError(''); setInfo('')
    try {
      const r = await opsAdminClient.startAudit(customerId, targetUrl || undefined)
      setInfo(`Audit gestartet (${r.audit?.id.slice(0, 8)}…). Lade nach 5 Sekunden Detail.`)
      setTargetUrl('')
      await new Promise((res) => setTimeout(res, 5000))
      await load()
      if (r.audit?.id) {
        try {
          const det = await opsAdminClient.getAudit(r.audit.id)
          setSelected(det.audit)
        } catch {}
      }
    } catch (e: any) { setError(e?.message || 'Audit-Start fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function viewDetail(id: string) {
    try {
      const r = await opsAdminClient.getAudit(id)
      setSelected(r.audit)
    } catch (e: any) { setError(e?.message) }
  }

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <h1><FileSearch size={22} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Auto-Onboarding-Audit</h1>
        <p>Asynchroner Multi-Check: Adress-/Geo-Validierung, SEO-Snapshot, Wettbewerber-Scan, DSGVO-Basisprüfung, Loyalty-Bereitschaft, Branding. Ergebnis als Score + Findings.</p>
      </header>

      {authorized === false && <div className="adminNotice"><b>Admin-Zugriff erforderlich.</b></div>}
      {error && <div className="adminAlert">{error}</div>}
      {info && <div className="adminAlertInfo">{info}</div>}

      {authorized && (
        <>
          <section className="adminCard">
            <h2>Neuen Audit starten</h2>
            <div className="adminGrid2">
              <label className="adminLabel">Customer-ID
                <input className="adminInput" value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="UUID des Customers" />
              </label>
              <label className="adminLabel">Ziel-URL (optional, für Wettbewerber-Scan)
                <input className="adminInput" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="https://beispiel.de" />
              </label>
            </div>
            <button type="button" className="adminBtn" onClick={startAudit} disabled={busy || !customerId}>
              <Search size={14} /> {busy ? 'Startet …' : 'Audit starten'}
            </button>
          </section>

          {selected && (
            <section className="adminCard adminHighlight">
              <h2>Audit-Detail · Score {selected.score ?? '—'}/100</h2>
              <div className="adminMuted">Status: {selected.status} · gestartet {new Date(selected.created_at).toLocaleString('de-DE')}</div>
              {selected.findings && selected.findings.length > 0 && (
                <>
                  <h3 style={{ marginTop: 12 }}>Findings</h3>
                  <ul className="adminCardList">
                    {selected.findings.map((f, i) => (
                      <li key={i} className="adminCardListItem">
                        <div className="adminCardListMain">
                          <div className="adminCardListHead">
                            <b>{f.title}</b>
                            <span className={`adminBadge ${f.severity==='critical'?'off':f.severity==='warning'?'':'on'}`}>{f.severity}</span>
                          </div>
                          <p>{f.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <details style={{ marginTop: 12 }}>
                <summary className="adminMuted">Check-Details (JSON)</summary>
                <pre className="adminCode">{JSON.stringify(selected.checks, null, 2)}</pre>
              </details>
            </section>
          )}

          <section className="adminCard">
            <h2>Letzte Audits</h2>
            {loading && <div className="adminMuted">Lade …</div>}
            {!loading && audits.length === 0 && <div className="adminMuted">Noch keine Audits.</div>}
            {!loading && audits.length > 0 && (
              <table className="adminTable">
                <thead><tr><th>ID</th><th>Customer</th><th>Status</th><th>Score</th><th>Erstellt</th><th></th></tr></thead>
                <tbody>
                  {audits.map((a) => (
                    <tr key={a.id}>
                      <td><code>{a.id.slice(0, 8)}…</code></td>
                      <td><code>{a.customer_id?.slice(0, 8)}…</code></td>
                      <td><span className={`adminBadge ${a.status==='done'?'on':a.status==='failed'?'off':''}`}>{a.status}</span></td>
                      <td>{a.score ?? '—'}</td>
                      <td>{new Date(a.created_at).toLocaleString('de-DE')}</td>
                      <td>
                        <button type="button" className="adminBtn small" onClick={() => viewDetail(a.id)}>
                          Detail <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button type="button" className="adminBtn small" onClick={load} style={{ marginTop: 10 }}>
              <RefreshCw size={12} /> Neu laden
            </button>
          </section>
        </>
      )}
    </main>
  )
}
