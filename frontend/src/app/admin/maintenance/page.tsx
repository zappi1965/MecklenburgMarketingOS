'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Wrench, RefreshCw, X, ExternalLink } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { opsAdminClient, type MaintenanceAlert } from '@/lib/opsAdminClient'

function severityClass(s: string) {
  if (s === 'critical') return 'off'
  if (s === 'warning') return ''
  return 'on'
}

export default function MaintenancePage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [filter, setFilter] = useState<string>('')

  async function load() {
    setLoading(true); setError('')
    try {
      const r = await opsAdminClient.listAlerts({ severity: filter || undefined })
      setAlerts(r.alerts || [])
    } catch (e: any) { setError(e?.message || 'Konnte nicht laden.') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    (async () => {
      const profile = await getCurrentUserProfile()
      if (!profile) { setAuthorized(false); setLoading(false); return }
      setAuthorized(true)
      await load()
    })()
  }, [])

  useEffect(() => { if (authorized) load() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [filter])

  async function runChecks() {
    setBusy(true); setError(''); setInfo('')
    try {
      const r = await opsAdminClient.runMaintenanceChecks()
      setInfo(`Scan abgeschlossen: ${r.result?.processed ?? 0} Customer, ${r.result?.fired_total ?? 0} Befunde.`)
      await load()
    } catch (e: any) { setError(e?.message || 'Scan fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function dismiss(id: string) {
    setBusy(true)
    try {
      await opsAdminClient.dismissAlert(id)
      await load()
    } catch (e: any) { setError(e?.message || 'Dismiss fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <h1><Wrench size={22} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Wartungs-Reminder</h1>
        <p>Automatisierter Tages-Scan über alle Customer: Logo fehlt, Loyalty leer, MFA inaktiv, DSGVO-Verzeichnis leer, abgelaufene Angebote etc. Mit Direkt-Links zum Fixen.</p>
      </header>

      {authorized === false && <div className="adminNotice"><b>Admin-Zugriff erforderlich.</b></div>}
      {error && <div className="adminAlert">{error}</div>}
      {info && <div className="adminAlertInfo">{info}</div>}

      {authorized && (
        <>
          <section className="adminCard">
            <div className="adminActions">
              <button type="button" className="adminBtn" onClick={runChecks} disabled={busy}>
                <RefreshCw size={14} /> {busy ? 'Scanne …' : 'Jetzt scannen'}
              </button>
              <div className="adminChips">
                {[
                  { v: '', label: 'Alle' },
                  { v: 'critical', label: 'Kritisch' },
                  { v: 'warning', label: 'Warnung' },
                  { v: 'info', label: 'Info' }
                ].map((s) => (
                  <button key={s.v} type="button" className={filter === s.v ? 'adminChip on' : 'adminChip'} onClick={() => setFilter(s.v)}>{s.label}</button>
                ))}
              </div>
            </div>
            <p className="adminMuted">Worker läuft täglich 05:30 UTC automatisch. Manueller Scan jederzeit möglich.</p>
          </section>

          <section className="adminCard">
            <h2>Offene Alerts ({alerts.length})</h2>
            {loading && <div className="adminMuted">Lade …</div>}
            {!loading && alerts.length === 0 && <div className="adminMuted">Keine offenen Wartungs-Hinweise — alles in Ordnung.</div>}
            {!loading && alerts.length > 0 && (
              <ul className="adminCardList">
                {alerts.map((a) => (
                  <li key={a.id} className="adminCardListItem">
                    <div className="adminCardListMain">
                      <div className="adminCardListHead">
                        <b>{a.title}</b>
                        <span className={`adminBadge ${severityClass(a.severity)}`}>{a.severity}</span>
                      </div>
                      <div className="adminMuted">Customer: <code>{a.customer_id?.slice(0, 8)}…</code> · {a.category} · {new Date(a.detected_at).toLocaleString('de-DE')}</div>
                      {a.description && <p>{a.description}</p>}
                    </div>
                    <div className="adminActions">
                      {a.fix_url && (
                        <a className="adminBtn small" href={a.fix_url}>
                          <ExternalLink size={12} /> Fixen
                        </a>
                      )}
                      <button type="button" className="adminBtn small" onClick={() => dismiss(a.id)} disabled={busy}>
                        <X size={12} /> Verwerfen
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  )
}
