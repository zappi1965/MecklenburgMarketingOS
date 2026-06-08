'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { noShowClient, type RiskScore } from '@/lib/adminToolsClients'

function reasonLabel(key: string) {
  const map: Record<string, string> = {
    past_no_shows: 'Vergangene No-Shows',
    no_history: 'Keine Historie',
    loyal_customer: 'Treuer Kunde',
    far_advance_booking: 'Sehr weit im Voraus gebucht',
    last_minute_booking: 'Last-Minute-Buchung',
    weekend_morning_slot: 'Wochenend-Vormittag',
    new_customer: 'Neuer Kunde'
  }
  return map[key] || key
}

function strategyLabel(s: string) {
  const map: Record<string, string> = {
    standard: 'Standard-Erinnerung (24h vorher)',
    high_touch: 'Doppelte Erinnerung (24h + 2h)',
    confirm_required: 'Bestaetigung Pflicht (24h + 4h)'
  }
  return map[s] || s
}

export default function NoShowPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [scores, setScores] = useState<RiskScore[]>([])
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh(cid: string) {
    try {
      const r = await noShowClient.highRisk(cid)
      setScores(r.scores || [])
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

  async function runScan() {
    setBusy(true); setError(''); setInfo('')
    try {
      const r = await noShowClient.scan()
      setInfo(`Scan abgeschlossen: ${r.result?.processed ?? 0} Termine bewertet.`)
      if (customerId) await refresh(customerId)
    } catch (e: any) { setError(e?.message || 'Scan fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <h1>No-Show-Risiko</h1>
        <p>Liste der Termine mit mittlerem oder hohem No-Show-Risiko. Pro Termin wird eine angepasste Erinnerungs-Strategie empfohlen.</p>
      </header>

      {authorized === false && <div className="adminNotice"><b>Anmeldung erforderlich.</b></div>}
      {error && <div className="adminAlert">{error}</div>}
      {info && <div className="adminAlertInfo">{info}</div>}

      {authorized && (
        <>
          <section className="adminCard">
            <h2>Aktionen</h2>
            <button type="button" className="adminBtn" onClick={runScan} disabled={busy}>
              {busy ? 'Scanne …' : 'Alle Termine der naechsten 14 Tage neu bewerten'}
            </button>
            <p className="adminMuted">Der Scan laeuft im Worker auch automatisch im Hintergrund.</p>
          </section>

          <section className="adminCard">
            <h2>Risiko-Termine ({scores.length})</h2>
            {scores.length === 0 && <div className="adminMuted">Aktuell keine Mittel- oder Hochrisiko-Termine. (Oder noch nie gescannt.)</div>}
            {scores.length > 0 && (
              <ul className="adminCardList">
                {scores.map((s) => (
                  <li key={s.appointment_id} className="adminCardListItem">
                    <div className="adminCardListMain">
                      <div className="adminCardListHead">
                        <b>Termin {s.appointment_id.slice(0, 8)}…</b>
                        <span className={`adminBadge ${s.risk_level === 'high' ? 'off' : ''}`}>{s.risk_level} ({s.risk_score}/100)</span>
                      </div>
                      <div className="adminMuted">Strategie: {strategyLabel(s.reminder_strategy)}</div>
                      <ul className="adminReasonList">
                        {(s.reasons || []).map((r, i) => (
                          <li key={i}>
                            {reasonLabel(r.key)}
                            {r.weight ? <em className="adminMuted"> · Gewicht {r.weight > 0 ? '+' : ''}{r.weight}</em> : null}
                          </li>
                        ))}
                      </ul>
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
