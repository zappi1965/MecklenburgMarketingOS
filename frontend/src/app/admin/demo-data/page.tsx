'use client'

import { useEffect, useState } from 'react'
import {
  allV45Tables,
  clearLocalDemoData,
  currentModeLabel,
  demoCounts,
  upsertLocalDemoData
} from '@/lib/v44FunctionalToolsClient'
import { getV45DemoRows } from '@/lib/v45DemoData'

export default function DemoDataPage() {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [notice, setNotice] = useState('')

  async function reload() {
    setCounts(await demoCounts())
  }

  useEffect(() => { void reload() }, [])

  async function seed() {
    await upsertLocalDemoData()
    setNotice('Demo-Daten wurden lokal aufgefuellt.')
    await reload()
  }

  async function clearDemo() {
    clearLocalDemoData()
    setNotice('Lokale Demo-Daten wurden entfernt. Supabase-Demo-Daten bleiben unveraendert.')
    await reload()
  }

  return (
    <>
      <div className="adminPageHeader">
        <div>
          <p className="eyebrow">V45 Demo-Daten</p>
          <h1>Demo-Umgebung auffuellen & pruefen</h1>
          <p>
            Aktueller Modus: <strong>{currentModeLabel()}</strong>. Diese Seite stellt sicher,
            dass die neuen Kundentools in der Demo-Umgebung mit Demo-Daten gefuellt sind.
          </p>
        </div>
        <div className="row gap">
          <button className="btn" onClick={seed}>Demo-Daten auffuellen</button>
          <button className="btn secondary" onClick={clearDemo}>Lokale Demo-Daten entfernen</button>
        </div>
      </div>

      {notice && <section className="adminCard"><p>{notice}</p></section>}

      <section className="adminCard">
        <h2>Tabellenstatus</h2>
        <div className="adminTableWrap">
          <table className="adminTable">
            <thead>
              <tr>
                <th>Tabelle</th>
                <th>Demo-Vorlage</th>
                <th>Aktuell geladen</th>
              </tr>
            </thead>
            <tbody>
              {allV45Tables.map((table) => (
                <tr key={table}>
                  <td>{table}</td>
                  <td>{getV45DemoRows(table).length}</td>
                  <td>{counts[table] || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="adminCard">
        <h2>Neue Demo-Tools</h2>
        <ul>
          <li><a href="/analytics/listings">Listings / Branchenbuch</a></li>
          <li><a href="/booking/utilization">Termin- & Auslastungssystem</a></li>
          <li><a href="/inbox">Nachrichten-Zentrale</a></li>
          <li><a href="/payments-vouchers">Zahlungen & Gutscheine</a></li>
          <li><a href="/referrals">Empfehlungsprogramm</a></li>
          <li><a href="/r/DEMO-HANSE">Demo Empfehlungslink</a></li>
          <li><a href="/pay/pay_demo_kuestenblick_001">Demo Zahlungslink</a></li>
        </ul>
      </section>
    </>
  )
}
