'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { dunningClient, type DunningLevel } from '@/lib/adminToolsClients'

const EMPTY: DunningLevel = { level: 1, days_overdue: 7, fee_eur: 0, action: 'reminder', template: 'reminder_friendly', enabled: true }

export default function DunningPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [levels, setLevels] = useState<DunningLevel[]>([])
  const [draft, setDraft] = useState<DunningLevel>(EMPTY)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh(cid: string) {
    try {
      const r = await dunningClient.list(cid)
      setLevels(r.levels || [])
    } catch (e: any) { setError(e?.message || 'Konnte nicht laden.') }
  }

  useEffect(() => {
    (async () => {
      const profile = await getCurrentUserProfile()
      if (!profile) { setAuthorized(false); return }
      setAuthorized(true)
      setCustomerId(profile.customer_id || '')
      if (profile.customer_id) await refresh(profile.customer_id)
    })()
  }, [])

  async function seedDefaults() {
    if (!customerId) return
    setBusy(true); setError('')
    try {
      await dunningClient.ensureDefaults(customerId)
      setInfo('Default-Stufen angelegt.')
      await refresh(customerId)
    } catch (e: any) { setError(e?.message || 'Default-Setup fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function save() {
    setBusy(true); setError(''); setInfo('')
    try {
      await dunningClient.upsert(customerId, draft)
      setInfo(`Stufe ${draft.level} gespeichert.`)
      setDraft(EMPTY)
      await refresh(customerId)
    } catch (e: any) { setError(e?.message || 'Speichern fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function remove(level: number) {
    if (!confirm(`Stufe ${level} wirklich loeschen?`)) return
    setBusy(true)
    try {
      await dunningClient.remove(customerId, level)
      await refresh(customerId)
    } catch (e: any) { setError(e?.message || 'Loeschen fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function runNow() {
    setBusy(true); setError(''); setInfo('')
    try {
      const r = await dunningClient.runNow()
      setInfo(`Mahnlauf abgeschlossen: ${r.result?.queued ?? 0} neue Mahnungen eingestellt.`)
    } catch (e: any) { setError(e?.message || 'Mahnlauf fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <h1>Mahnstufen</h1>
        <p>Konfiguriere bis zu vier Mahnstufen mit Tagen-ueberfaellig, Gebuehren und Aktionstyp. Der Sweep-Job legt idempotente Mahnungen an, sobald eine Rechnung die Schwelle ueberschreitet.</p>
      </header>

      {authorized === false && <div className="adminNotice"><b>Anmeldung erforderlich.</b></div>}
      {error && <div className="adminAlert">{error}</div>}
      {info && <div className="adminAlertInfo">{info}</div>}

      {authorized && (
        <>
          <section className="adminCard">
            <h2>Aktionen</h2>
            <div className="adminActions">
              <button type="button" className="adminBtn" onClick={seedDefaults} disabled={busy || !customerId}>
                Default-Stufen anlegen (7/14/30/60 Tage)
              </button>
              <button type="button" className="adminBtn small" onClick={runNow} disabled={busy}>
                Mahnlauf jetzt starten
              </button>
            </div>
          </section>

          <section className="adminCard">
            <h2>Stufe anlegen / aktualisieren</h2>
            <div className="adminGrid2">
              <label className="adminLabel">Stufe (1-4)<input className="adminInput" type="number" min={1} max={9} value={draft.level} onChange={(e) => setDraft({ ...draft, level: Number(e.target.value) })} /></label>
              <label className="adminLabel">Tage ueberfaellig<input className="adminInput" type="number" min={0} value={draft.days_overdue} onChange={(e) => setDraft({ ...draft, days_overdue: Number(e.target.value) })} /></label>
            </div>
            <div className="adminGrid2">
              <label className="adminLabel">Gebuehr (EUR)<input className="adminInput" type="number" step="0.01" min={0} value={draft.fee_eur} onChange={(e) => setDraft({ ...draft, fee_eur: Number(e.target.value) })} /></label>
              <label className="adminLabel">Aktion
                <select className="adminInput" value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value })}>
                  <option value="reminder">Freundliche Erinnerung</option>
                  <option value="warning">Mahnung mit Frist</option>
                  <option value="escalation">Letzte Aufforderung</option>
                  <option value="inkasso">Inkasso-Uebergabe</option>
                </select>
              </label>
            </div>
            <label className="adminLabel">Template-Key (optional)<input className="adminInput" value={draft.template || ''} onChange={(e) => setDraft({ ...draft, template: e.target.value })} /></label>
            <button type="button" className="adminBtn" onClick={save} disabled={busy || !customerId}>{busy ? 'Speichere …' : 'Stufe speichern'}</button>
          </section>

          <section className="adminCard">
            <h2>Aktive Stufen ({levels.length})</h2>
            {levels.length === 0 && <div className="adminMuted">Noch keine Stufen — leg Defaults oben an.</div>}
            {levels.length > 0 && (
              <table className="adminTable">
                <thead><tr><th>Stufe</th><th>Tage</th><th>Gebuehr</th><th>Aktion</th><th>Template</th><th></th></tr></thead>
                <tbody>
                  {levels.map((l) => (
                    <tr key={l.id || l.level}>
                      <td>{l.level}</td>
                      <td>{l.days_overdue}</td>
                      <td>{Number(l.fee_eur).toFixed(2)} EUR</td>
                      <td>{l.action}</td>
                      <td>{l.template || '—'}</td>
                      <td><button type="button" className="adminBtn danger small" onClick={() => remove(l.level)} disabled={busy}>Loeschen</button></td>
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
