'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck, RefreshCw } from 'lucide-react'
import { getCurrentSession } from '@/lib/authClient'

async function loadHealth() {
  const session = await getCurrentSession()
  const res = await fetch('/api/security-core/health', {
    headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    cache: 'no-store'
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(payload?.error || 'Healthcheck fehlgeschlagen')
  return payload
}

export default function SecurityCorePanel() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function refresh() {
    setLoading(true); setError('')
    try { setData(await loadHealth()) }
    catch (e: any) { setError(e?.message || 'Fehler') }
    finally { setLoading(false) }
  }

  useEffect(() => { void refresh() }, [])

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <h1><ShieldCheck size={22} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Security Core</h1>
        <p>Tenant-Isolation, Migration Guard, Buckets und ENV-Bereitschaft.</p>
      </header>
      {error && <div className="adminAlert">{error}</div>}
      <section className="adminCard">
        <div className="adminActions">
          <h2 style={{ margin: 0 }}>Systemstatus</h2>
          <span className="adminTabSpacer" />
          <button className="adminBtn small" onClick={refresh} disabled={loading}><RefreshCw size={14} /> Neu prüfen</button>
        </div>
        {!data && <p className="adminMuted">Lade …</p>}
        {data && (
          <div className="adminGrid2">
            <div>
              <h3>Tabellen</h3>
              {Object.entries(data.tables || {}).map(([key, value]) => <p key={key}>{value ? '✅' : '❌'} {key}</p>)}
            </div>
            <div>
              <h3>Buckets / ENV</h3>
              {Object.entries(data.buckets || {}).map(([key, value]) => <p key={key}>{value ? '✅' : '❌'} Bucket: {key}</p>)}
              {Object.entries(data.env || {}).map(([key, value]) => <p key={key}>{value ? '✅' : '⚠️'} {key}</p>)}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
