'use client'

import { useEffect, useState } from 'react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { complianceClient, type ProcessingActivity, type DataProcessor } from '@/lib/adminToolsClients'

export const dynamic = 'force-dynamic'

const EMPTY_ACTIVITY: ProcessingActivity = {
  name: '', purpose: '', legal_basis: 'Art. 6 Abs. 1 lit. b DSGVO',
  data_categories: [], data_subjects: ['Endkunden'], toms: []
}
const EMPTY_PROCESSOR: DataProcessor = {
  name: '', purpose: '', country_code: 'DE', scc_required: false
}

export default function CompliancePage() {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [activities, setActivities] = useState<ProcessingActivity[]>([])
  const [processors, setProcessors] = useState<DataProcessor[]>([])
  const [act, setAct] = useState<ProcessingActivity>(EMPTY_ACTIVITY)
  const [proc, setProc] = useState<DataProcessor>(EMPTY_PROCESSOR)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh() {
    try {
      const [a, p] = await Promise.all([complianceClient.listActivities(), complianceClient.listProcessors()])
      setActivities(a.activities || [])
      setProcessors(p.processors || [])
    } catch (e: any) { setError(e?.message || 'Konnte nicht laden.') }
  }

  useEffect(() => {
    (async () => {
      const profile = await getCurrentUserProfile()
      if (!profile) { setAuthorized(false); setLoading(false); return }
      setAuthorized(true)
      await refresh()
      setLoading(false)
    })()
  }, [])

  async function saveActivity() {
    setBusy(true); setError('')
    try {
      await complianceClient.upsertActivity(act)
      setAct(EMPTY_ACTIVITY)
      await refresh()
    } catch (e: any) { setError(e?.message || 'Speichern fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function saveProcessor() {
    setBusy(true); setError('')
    try {
      await complianceClient.upsertProcessor(proc)
      setProc(EMPTY_PROCESSOR)
      await refresh()
    } catch (e: any) { setError(e?.message || 'Speichern fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <h1>Compliance &amp; DSGVO-Cockpit</h1>
        <p>Verfahrensverzeichnis nach Art. 30 DSGVO und Liste der Auftragsverarbeiter. Verknuepft mit dem Score auf <a href="/admin/insights">/admin/insights</a>.</p>
      </header>

      {authorized === false && <div className="adminNotice"><b>Admin-Zugriff erforderlich.</b></div>}
      {error && <div className="adminAlert">{error}</div>}

      {authorized && (
        <>
          <section className="adminCard">
            <h2>Verarbeitungstaetigkeit anlegen / aktualisieren</h2>
            <div className="adminGrid2">
              <label className="adminLabel">Name<input className="adminInput" value={act.name} onChange={(e) => setAct({ ...act, name: e.target.value })} /></label>
              <label className="adminLabel">Rechtsgrundlage
                <select className="adminInput" value={act.legal_basis} onChange={(e) => setAct({ ...act, legal_basis: e.target.value })}>
                  <option>Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)</option>
                  <option>Art. 6 Abs. 1 lit. b DSGVO (Vertrag)</option>
                  <option>Art. 6 Abs. 1 lit. c DSGVO (rechtliche Verpflichtung)</option>
                  <option>Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse)</option>
                </select>
              </label>
            </div>
            <label className="adminLabel">Zweck<textarea className="adminInput" rows={2} value={act.purpose} onChange={(e) => setAct({ ...act, purpose: e.target.value })} /></label>
            <div className="adminGrid2">
              <label className="adminLabel">Datenkategorien (komma-getrennt)
                <input className="adminInput" value={act.data_categories.join(', ')} onChange={(e) => setAct({ ...act, data_categories: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
              </label>
              <label className="adminLabel">Aufbewahrungsfrist<input className="adminInput" value={act.retention_period || ''} onChange={(e) => setAct({ ...act, retention_period: e.target.value })} /></label>
            </div>
            <button type="button" className="adminBtn" onClick={saveActivity} disabled={busy || !act.name || !act.purpose}>
              {busy ? 'Speichere …' : 'Speichern'}
            </button>
          </section>

          <section className="adminCard">
            <h2>Verarbeitungstaetigkeiten ({activities.length})</h2>
            {loading && <div className="adminMuted">Lade …</div>}
            {!loading && activities.length === 0 && <div className="adminMuted">Noch keine Eintraege.</div>}
            {!loading && activities.length > 0 && (
              <table className="adminTable">
                <thead><tr><th>Name</th><th>Rechtsgrundlage</th><th>Zweck</th><th>Aufbewahrung</th></tr></thead>
                <tbody>
                  {activities.map((a) => (
                    <tr key={a.id || a.name}>
                      <td>{a.name}</td>
                      <td>{a.legal_basis}</td>
                      <td>{a.purpose?.slice(0, 60)}…</td>
                      <td>{a.retention_period || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="adminCard">
            <h2>Auftragsverarbeiter anlegen</h2>
            <div className="adminGrid2">
              <label className="adminLabel">Name<input className="adminInput" value={proc.name} onChange={(e) => setProc({ ...proc, name: e.target.value })} /></label>
              <label className="adminLabel">Land (ISO-Code)<input className="adminInput" maxLength={2} value={proc.country_code} onChange={(e) => setProc({ ...proc, country_code: e.target.value.toUpperCase() })} /></label>
            </div>
            <label className="adminLabel">Zweck<input className="adminInput" value={proc.purpose} onChange={(e) => setProc({ ...proc, purpose: e.target.value })} /></label>
            <div className="adminGrid2">
              <label className="adminLabel">Vertrag unterzeichnet am<input className="adminInput" type="date" value={proc.contract_signed_at || ''} onChange={(e) => setProc({ ...proc, contract_signed_at: e.target.value })} /></label>
              <label className="adminLabel">SCC erforderlich (Non-EU)
                <input type="checkbox" checked={proc.scc_required} onChange={(e) => setProc({ ...proc, scc_required: e.target.checked })} />
              </label>
            </div>
            <button type="button" className="adminBtn" onClick={saveProcessor} disabled={busy || !proc.name}>
              {busy ? 'Speichere …' : 'Speichern'}
            </button>
          </section>

          <section className="adminCard">
            <h2>Auftragsverarbeiter ({processors.length})</h2>
            {processors.length === 0 && <div className="adminMuted">Noch keine Eintraege.</div>}
            {processors.length > 0 && (
              <table className="adminTable">
                <thead><tr><th>Name</th><th>Land</th><th>Zweck</th><th>Vertrag</th><th>SCC</th></tr></thead>
                <tbody>
                  {processors.map((p) => (
                    <tr key={p.id || p.name}>
                      <td>{p.name}</td>
                      <td>{p.country_code || '—'}</td>
                      <td>{p.purpose?.slice(0, 50)}</td>
                      <td>{p.contract_signed_at || '—'}</td>
                      <td>{p.scc_required ? 'ja' : 'nein'}</td>
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
