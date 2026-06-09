'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { FileSpreadsheet, Download } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { accountingClient, type AccountingFormat } from '@/lib/deToolsClients'

function firstOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10) }
function lastOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10) }

const FORMATS: Array<{ key: AccountingFormat; label: string; hint: string }> = [
  { key: 'datev_extf', label: 'DATEV (EXTF)', hint: 'Standard fuer Steuerberater / DATEV-Buchungsstapel' },
  { key: 'lexoffice_csv', label: 'lexoffice (CSV)', hint: 'Import-CSV fuer lexoffice' },
  { key: 'sevdesk_csv', label: 'sevDesk (CSV)', hint: 'Import-CSV fuer sevDesk' }
]

export default function AccountingPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [format, setFormat] = useState<AccountingFormat>('datev_extf')
  const [start, setStart] = useState(firstOfMonth())
  const [end, setEnd] = useState(lastOfMonth())
  const [allCustomers, setAllCustomers] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => {
    (async () => {
      const profile = await getCurrentUserProfile()
      if (!profile) { setAuthorized(false); return }
      setAuthorized(true)
      setCustomerId(profile.customer_id || '')
      setIsAdmin(String(profile.role || '').toLowerCase() === 'admin' || String(profile.role || '').toLowerCase() === 'super_admin')
    })()
  }, [])

  async function runExport() {
    setBusy(true); setError(''); setInfo('')
    try {
      const cid = allCustomers && isAdmin ? undefined : (customerId || undefined)
      if (!cid && !isAdmin) { setError('Kein Customer zugeordnet.'); setBusy(false); return }
      await accountingClient.exportDownload(format, start, end, cid)
      setInfo('Export erzeugt — der Download startet automatisch.')
    } catch (e: any) { setError(e?.message || 'Export fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <h1><FileSpreadsheet size={22} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Buchhaltungs-Export</h1>
        <p>Rechnungen als DATEV-, lexoffice- oder sevDesk-Datei exportieren — direkt fuer deinen Steuerberater.</p>
      </header>

      {authorized === false && <div className="adminNotice"><b>Anmeldung erforderlich.</b></div>}
      {error && <div className="adminAlert">{error}</div>}
      {info && <div className="adminAlertInfo">{info}</div>}

      {authorized && (
        <section className="adminCard">
          <h2>Export erstellen</h2>
          <div className="adminGrid2">
            <label className="adminLabel">Format
              <select className="adminInput" value={format} onChange={(e) => setFormat(e.target.value as AccountingFormat)}>
                {FORMATS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
            </label>
            <div />
            <label className="adminLabel">Zeitraum von<input className="adminInput" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
            <label className="adminLabel">Zeitraum bis<input className="adminInput" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
          </div>
          <p className="adminMuted">{FORMATS.find((f) => f.key === format)?.hint}</p>
          {isAdmin && (
            <label className="adminLabel" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={allCustomers} onChange={(e) => setAllCustomers(e.target.checked)} />
              <span style={{ justifyContent: 'flex-start' }}>Ueber alle Customer exportieren (nur Admin)</span>
            </label>
          )}
          <button type="button" className="adminBtn" onClick={runExport} disabled={busy || !start || !end}>
            <Download size={14} /> {busy ? 'Erzeuge …' : 'Export herunterladen'}
          </button>
          <p className="adminMuted">Hinweis: Aufbewahrungspflicht 10 Jahre (§ 147 AO). Der Export enthaelt alle Rechnungen im Zeitraum.</p>
        </section>
      )}
    </main>
  )
}
