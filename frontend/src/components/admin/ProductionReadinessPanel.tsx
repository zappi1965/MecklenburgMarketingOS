'use client'

import { useEffect, useState } from 'react'
import { Activity, DatabaseBackup, RefreshCw, ShieldAlert, WalletCards } from 'lucide-react'
import { productionClient } from '@/lib/productionClient'

function euro(cents?: number) { return `${((Number(cents || 0)) / 100).toFixed(2)} €` }

export default function ProductionReadinessPanel() {
  const [status, setStatus] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [usage, setUsage] = useState<any>(null)
  const [backups, setBackups] = useState<any[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setBusy(true); setError('')
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
        <div className="adminActions"><button className="adminBtn" onClick={load} disabled={busy}><RefreshCw size={14} /> {busy ? 'Lade …' : 'Neu laden'}</button></div>

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
          <table className="adminTable"><thead><tr><th>Provider</th><th>Calls</th><th>geschätzte Kosten</th></tr></thead><tbody>
            {Object.entries(usage?.totals || {}).map(([provider, row]: any) => <tr key={provider}><td>{provider}</td><td>{row.calls}</td><td>{euro(row.estimated_cost_cents)}</td></tr>)}
            {Object.keys(usage?.totals || {}).length === 0 && <tr><td colSpan={3}>Noch keine API-Kostenereignisse.</td></tr>}
          </tbody></table>
        </section>

        <section className="adminCard">
          <h2><DatabaseBackup size={16} /> Backup-Runs</h2>
          <table className="adminTable"><thead><tr><th>Status</th><th>Typ</th><th>Pfad</th><th>Größe</th><th>Datum</th></tr></thead><tbody>
            {backups.map((b) => <tr key={b.id || b.created_at}><td>{b.status}</td><td>{b.backup_type}</td><td>{b.storage_path || '—'}</td><td>{b.size_bytes || '—'}</td><td>{String(b.created_at || '').slice(0, 19)}</td></tr>)}
            {backups.length === 0 && <tr><td colSpan={5}>Noch keine Backup-Runs protokolliert.</td></tr>}
          </tbody></table>
        </section>

        <section className="adminCard">
          <h2>Admin-Protokolle</h2>
          <table className="adminTable"><thead><tr><th>Zeit</th><th>Severity</th><th>Event</th><th>User</th><th>Route</th><th>Status</th></tr></thead><tbody>
            {logs.map((log) => <tr key={log.id || log.created_at}><td>{String(log.created_at || '').slice(0, 19)}</td><td>{log.severity}</td><td>{log.event_type}</td><td>{log.actor_email || log.actor_user_id || '—'}</td><td>{log.route || log.message || '—'}</td><td>{log.status_code || '—'}</td></tr>)}
            {logs.length === 0 && <tr><td colSpan={6}>Noch keine Protokolle.</td></tr>}
          </tbody></table>
        </section>
    </main>
  )
}
