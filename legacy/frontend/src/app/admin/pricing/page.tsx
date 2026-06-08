'use client'

import { useEffect, useState } from 'react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { pricingClient, type PricingRule, type PriceCalc } from '@/lib/adminToolsClients'

export const dynamic = 'force-dynamic'

const EMPTY_RULE: PricingRule = {
  name: 'Standard',
  scope: 'global',
  base_price_eur: 49,
  occupancy_threshold: 80,
  uplift_pct: 20,
  downlift_pct: 10,
  weekend_uplift_pct: 15,
  off_peak_downlift_pct: 25,
  enabled: true
}

export default function PricingPage() {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [rules, setRules] = useState<PricingRule[]>([])
  const [draft, setDraft] = useState<PricingRule>(EMPTY_RULE)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [calc, setCalc] = useState<PriceCalc | null>(null)
  const [calcInput, setCalcInput] = useState({ occupancy: 85, slot_time: '' })

  async function refresh(cid: string) {
    try {
      const r = await pricingClient.list(cid)
      setRules(r.rules || [])
    } catch (e: any) { setError(e?.message || 'Konnte nicht laden.') }
  }

  useEffect(() => {
    (async () => {
      const profile = await getCurrentUserProfile()
      if (!profile) { setAuthorized(false); setLoading(false); return }
      setAuthorized(true)
      setCustomerId(profile.customer_id || '')
      if (profile.customer_id) await refresh(profile.customer_id)
      setLoading(false)
    })()
  }, [])

  async function save() {
    setBusy(true); setError('')
    try {
      await pricingClient.upsert(customerId, draft)
      setDraft(EMPTY_RULE)
      await refresh(customerId)
    } catch (e: any) { setError(e?.message || 'Speichern fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function remove(id: string) {
    if (!confirm('Regel wirklich loeschen?')) return
    setBusy(true); setError('')
    try {
      await pricingClient.remove(customerId, id)
      await refresh(customerId)
    } catch (e: any) { setError(e?.message || 'Loeschen fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function preview() {
    setBusy(true); setError(''); setCalc(null)
    try {
      const r = await pricingClient.calculate(customerId, {
        occupancy: Number(calcInput.occupancy),
        slot_time: calcInput.slot_time || undefined
      })
      setCalc(r)
    } catch (e: any) { setError(e?.message || 'Berechnung fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <h1>Smart Pricing</h1>
        <p>Konfiguriere dynamische Preise basierend auf Auslastung, Wochenende und Off-Peak.</p>
      </header>

      {authorized === false && <div className="adminNotice"><b>Anmeldung erforderlich.</b></div>}
      {error && <div className="adminAlert">{error}</div>}

      {authorized && (
        <>
          <section className="adminCard">
            <h2>Neue Regel</h2>
            <div className="adminGrid2">
              <label className="adminLabel">Name<input className="adminInput" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
              <label className="adminLabel">Scope
                <select className="adminInput" value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value })}>
                  <option value="global">Global</option>
                  <option value="service">Pro Service</option>
                  <option value="category">Pro Kategorie</option>
                  <option value="slot">Pro Slot</option>
                </select>
              </label>
            </div>
            <div className="adminGrid2">
              <label className="adminLabel">Grundpreis (EUR)<input className="adminInput" type="number" step="0.01" value={draft.base_price_eur} onChange={(e) => setDraft({ ...draft, base_price_eur: Number(e.target.value) })} /></label>
              <label className="adminLabel">Auslastungs-Schwelle (%)<input className="adminInput" type="number" value={draft.occupancy_threshold || 0} onChange={(e) => setDraft({ ...draft, occupancy_threshold: Number(e.target.value) })} /></label>
            </div>
            <div className="adminGrid2">
              <label className="adminLabel">Uplift bei hoher Auslastung (%)<input className="adminInput" type="number" value={draft.uplift_pct || 0} onChange={(e) => setDraft({ ...draft, uplift_pct: Number(e.target.value) })} /></label>
              <label className="adminLabel">Rabatt bei niedriger Auslastung (%)<input className="adminInput" type="number" value={draft.downlift_pct || 0} onChange={(e) => setDraft({ ...draft, downlift_pct: Number(e.target.value) })} /></label>
            </div>
            <div className="adminGrid2">
              <label className="adminLabel">Wochenend-Aufschlag (%)<input className="adminInput" type="number" value={draft.weekend_uplift_pct || 0} onChange={(e) => setDraft({ ...draft, weekend_uplift_pct: Number(e.target.value) })} /></label>
              <label className="adminLabel">Off-Peak-Rabatt (%)<input className="adminInput" type="number" value={draft.off_peak_downlift_pct || 0} onChange={(e) => setDraft({ ...draft, off_peak_downlift_pct: Number(e.target.value) })} /></label>
            </div>
            <button type="button" className="adminBtn" onClick={save} disabled={busy || !draft.name}>{busy ? 'Speichere …' : 'Regel speichern'}</button>
          </section>

          <section className="adminCard">
            <h2>Preis-Vorschau</h2>
            <div className="adminGrid2">
              <label className="adminLabel">Auslastung (%)<input className="adminInput" type="number" value={calcInput.occupancy} onChange={(e) => setCalcInput({ ...calcInput, occupancy: Number(e.target.value) })} /></label>
              <label className="adminLabel">Slot-Zeit (ISO oder leer)<input className="adminInput" value={calcInput.slot_time} onChange={(e) => setCalcInput({ ...calcInput, slot_time: e.target.value })} placeholder="2026-05-30T19:30:00Z" /></label>
            </div>
            <button type="button" className="adminBtn" onClick={preview} disabled={busy}>Berechnen</button>
            {calc && (
              <div className="adminCalc">
                <div><b>Grundpreis:</b> {calc.base?.toFixed(2)} EUR</div>
                <div className="adminBigStat">{calc.final?.toFixed(2)} EUR</div>
                <ul className="adminMuted">
                  {calc.breakdown.map((b, i) => (
                    <li key={i}>{b.label}{b.value != null ? `: ${b.value}` : ''}{b.pct != null ? ` (${b.pct > 0 ? '+' : ''}${b.pct}%)` : ''}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="adminCard">
            <h2>Aktive Regeln ({rules.length})</h2>
            {loading && <div className="adminMuted">Lade …</div>}
            {!loading && rules.length === 0 && <div className="adminMuted">Noch keine Regeln.</div>}
            {!loading && rules.length > 0 && (
              <table className="adminTable">
                <thead><tr><th>Name</th><th>Scope</th><th>Grundpreis</th><th>Uplift</th><th>WE</th><th></th></tr></thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id || r.name}>
                      <td>{r.name}</td>
                      <td>{r.scope}{r.scope_value ? `:${r.scope_value}` : ''}</td>
                      <td>{Number(r.base_price_eur).toFixed(2)} EUR</td>
                      <td>{r.uplift_pct || 0}% / -{r.downlift_pct || 0}%</td>
                      <td>+{r.weekend_uplift_pct || 0}%</td>
                      <td>{r.id && <button type="button" className="adminBtn danger small" onClick={() => remove(r.id!)} disabled={busy}>Loeschen</button>}</td>
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
