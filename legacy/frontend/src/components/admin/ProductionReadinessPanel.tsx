'use client'

import { useEffect, useState } from 'react'
import { Activity, DatabaseBackup, RefreshCw, ShieldAlert, WalletCards } from 'lucide-react'
import { productionClient } from '@/lib/productionClient'
import { AdminOnly } from '@/components/security/RoleGate'
import { getCurrentSession } from '@/lib/authClient'

function euro(cents?: number) { return `${((Number(cents || 0)) / 100).toFixed(2)} €` }

function ProductionReadinessPanelContent() {
  const [status, setStatus] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [usage, setUsage] = useState<any>(null)
  const [backups, setBackups] = useState<any[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setBusy(true); setError('')
    const session = await getCurrentSession().catch(() => null)
    if (!session?.access_token) {
      setError('Bitte im Backoffice neu einloggen. Production-Daten werden erst mit gültiger Admin-Session geladen.')
      setBusy(false)
      return
    }
    try {
      const [s, l, u, b]: any = await Promise.all([
        productionClient.status(),
        productionClient.adminLogs({ limit: 80 }),
        productionClient.apiUsage({ limit: 300 }),
        productionClient.backupRuns()
      ])
      setStatus(s); setLogs(l.logs || []); setUsage(u); setBackups(b.runs || [])
    } catch (e: any) { setError(e?.message || 'Production-Daten konnten nicht geladen werden.') }
    finally { setBusy(false) }
  }

  useEffect(() => { void load() }, [])

  return (
    <main className="adminPage">
        <header className="adminHeader">
          <h1><Activity size={22} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Production Readiness</h1>
          <p>E2E, Monitoring, Error Tracking, Backups, API-Kosten und Admin-Protokolle an einem Ort.</p>
        </header>
        {error && <div className="adminAlert">{error}</div>}
        <div className="adminActions mobileStickyActions"><button className="adminBtn" onClick={load} disabled={busy}><RefreshCw size={14} /> {busy ? 'Lade …' : 'Neu laden'}</button></div>

        <section className="adminCard">
          <h2><ShieldAlert size={16} /> Systemstatus</h2>
          <div className="seoGrid">
            {Object.entries(status?.checks || {}).map(([key, value]) => (
              <div className="seoStat" key={key}><strong>{value ? 'OK' : 'FEHLT'}</strong><span>{key}</span></div>
            ))}
          </div>
        </section>

        <section className="adminCard">
          <h2><WalletCards size={16} /> API-Kosten heute / Zeitraum</h2>
          <table className="adminTable adminDesktopTable"><thead><tr><th>Provider</th><th>Calls</th><th>geschätzte Kosten</th></tr></thead><tbody>
            {Object.entries(usage?.totals || {}).map(([provider, row]: any) => <tr key={provider}><td>{provider}</td><td>{row.calls}</td><td>{euro(row.estimated_cost_cents)}</td></tr>)}
            {Object.keys(usage?.totals || {}).length === 0 && <tr><td colSpan={3}>Noch keine API-Kostenereignisse.</td></tr>}
          </tbody></table>
          <div className="adminMobileCardList">
            {Object.entries(usage?.totals || {}).map(([provider, row]: any) => (
              <article className="adminMobileDataCard" key={provider}>
                <div><span>Provider</span><strong>{provider}</strong></div>
                <div><span>Calls</span><strong>{row.calls}</strong></div>
                <div><span>Kosten</span><strong>{euro(row.estimated_cost_cents)}</strong></div>
              </article>
            ))}
            {Object.keys(usage?.totals || {}).length === 0 && <div className="adminMuted">Noch keine API-Kostenereignisse.</div>}
          </div>
        </section>

        <section className="adminCard">
          <h2><DatabaseBackup size={16} /> Backup-Runs</h2>
          <table className="adminTable adminDesktopTable"><thead><tr><th>Status</th><th>Typ</th><th>Pfad</th><th>Größe</th><th>Datum</th></tr></thead><tbody>
            {backups.map((b) => <tr key={b.id || b.created_at}><td>{b.status}</td><td>{b.backup_type}</td><td>{b.storage_path || '—'}</td><td>{b.size_bytes || '—'}</td><td>{String(b.created_at || '').slice(0, 19)}</td></tr>)}
            {backups.length === 0 && <tr><td colSpan={5}>Noch keine Backup-Runs protokolliert.</td></tr>}
          </tbody></table>
          <div className="adminMobileCardList">
            {backups.map((b) => (
              <article className="adminMobileDataCard" key={b.id || b.created_at}>
                <div><span>Status</span><strong>{b.status}</strong></div>
                <div><span>Typ</span><strong>{b.backup_type || '—'}</strong></div>
                <div><span>Datum</span><strong>{String(b.created_at || '').slice(0, 19)}</strong></div>
                <p>{b.storage_path || 'Kein Pfad hinterlegt'} · {b.size_bytes || '—'}</p>
              </article>
            ))}
            {backups.length === 0 && <div className="adminMuted">Noch keine Backup-Runs protokolliert.</div>}
          </div>
        </section>

        <section className="adminCard">
          <h2>Admin-Protokolle</h2>
          <table className="adminTable adminDesktopTable"><thead><tr><th>Zeit</th><th>Severity</th><th>Event</th><th>User</th><th>Route</th><th>Status</th></tr></thead><tbody>
            {logs.map((log) => <tr key={log.id || log.created_at}><td>{String(log.created_at || '').slice(0, 19)}</td><td>{log.severity}</td><td>{log.event_type}</td><td>{log.actor_email || log.actor_user_id || '—'}</td><td>{log.route || log.message || '—'}</td><td>{log.status_code || '—'}</td></tr>)}
            {logs.length === 0 && <tr><td colSpan={6}>Noch keine Protokolle.</td></tr>}
          </tbody></table>
          <div className="adminMobileCardList">
            {logs.map((log) => (
              <article className="adminMobileDataCard" key={log.id || log.created_at}>
                <div><span>Zeit</span><strong>{String(log.created_at || '').slice(0, 19)}</strong></div>
                <div><span>Severity</span><strong>{log.severity || '—'}</strong></div>
                <div><span>Status</span><strong>{log.status_code || '—'}</strong></div>
                <p><b>{log.event_type || 'Event'}</b><br />{log.actor_email || log.actor_user_id || '—'} · {log.route || log.message || '—'}</p>
              </article>
            ))}
            {logs.length === 0 && <div className="adminMuted">Noch keine Protokolle.</div>}
          </div>
        </section>
    </main>
  )
}


export default function ProductionReadinessPanel() {
  return <AdminOnly><ProductionReadinessPanelContent /></AdminOnly>
}
