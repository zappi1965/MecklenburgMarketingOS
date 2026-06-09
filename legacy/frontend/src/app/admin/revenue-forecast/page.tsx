'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { TrendingUp, RefreshCw, ArrowUpRight, Gauge } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { getAdminSelectedCustomerId, onAdminCustomerSelected } from '@/lib/adminCustomerSelection'
import { revenueDynamicBillingClient } from '@/lib/revenueDynamicBillingClient'

function money(n?: any) { return n == null || isNaN(Number(n)) ? '—' : `${Number(n).toFixed(2)} €` }

export default function RevenueForecastPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [forecasts, setForecasts] = useState<any[]>([])
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [usage, setUsage] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function load(cid: string) {
    setLoading(true); setError('')
    try {
      const [f, r, u] = await Promise.all([
        revenueDynamicBillingClient.forecasts(cid).catch(() => ({ forecasts: [] })),
        revenueDynamicBillingClient.recommendations(cid).catch(() => ({ recommendations: [] })),
        revenueDynamicBillingClient.usage(cid).catch(() => ({ usage: [] }))
      ])
      setForecasts((f as any).forecasts || [])
      setRecommendations((r as any).recommendations || [])
      setUsage((u as any).usage || [])
    } catch (e: any) { setError(e?.message || 'Konnte Daten nicht laden.') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const p = await getCurrentUserProfile()
      if (!mounted) return
      if (!p) { setAuthorized(false); setLoading(false); return }
      const role = String(p.role || '').toLowerCase()
      const admin = role === 'admin' || role === 'super_admin'
      setIsAdmin(admin)
      setAuthorized(true)
      const cid = p.customer_id || (admin ? getAdminSelectedCustomerId() : '') || ''
      setCustomerId(cid)
      if (cid) await load(cid); else setLoading(false)
    })()
    const off = onAdminCustomerSelected((cid) => {
      setCustomerId(cid)
      if (cid) void load(cid)
    })
    return () => { mounted = false; off() }
  }, [])

  async function run(fn: () => Promise<any>, msg: string) {
    setBusy(true); setError(''); setInfo('')
    try { await fn(); setInfo(msg); await load(customerId) }
    catch (e: any) { setError(e?.message || 'Aktion fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  const latest = forecasts[0]
  const forecastNums = latest ? Object.entries(latest).filter(([k, v]) => typeof v === 'number' && !/id$/i.test(k)) : []

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <h1><TrendingUp size={22} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Umsatz-Prognose &amp; Paket-Empfehlung</h1>
        <p>MRR-/Umsatz-Forecast, nutzungsbasierte Abrechnung und automatische Upgrade-Empfehlungen pro Kunde.</p>
      </header>

      {authorized === false && <div className="adminNotice"><b>Anmeldung erforderlich.</b></div>}
      {authorized && !customerId && <section className="adminCard"><p className="adminMuted">{isAdmin ? 'Bitte oben in der Backoffice-Kundensuche einen Kunden wählen.' : 'Dein Konto ist mit keinem Customer verknuepft.'}</p></section>}
      {error && <div className="adminAlert">{error}</div>}
      {info && <div className="adminAlertInfo">{info}</div>}

      {authorized && customerId && (
        <>
          <section className="adminCard">
            <div className="adminActions">
              <button type="button" className="adminBtn" onClick={() => run(() => revenueDynamicBillingClient.createForecast(customerId), 'Forecast erzeugt.')} disabled={busy}><TrendingUp size={14} /> Forecast erzeugen</button>
              <button type="button" className="adminBtn small" onClick={() => run(() => revenueDynamicBillingClient.calculateUsage(customerId), 'Nutzung berechnet.')} disabled={busy}><Gauge size={14} /> Nutzung berechnen</button>
              <button type="button" className="adminBtn small" onClick={() => run(() => revenueDynamicBillingClient.recommendPackage(customerId), 'Empfehlung erstellt.')} disabled={busy}><ArrowUpRight size={14} /> Paket empfehlen</button>
              <span className="adminTabSpacer" />
              <button type="button" className="adminBtn small" onClick={() => load(customerId)} disabled={loading}><RefreshCw size={14} /> Neu laden</button>
            </div>
          </section>

          {latest && forecastNums.length > 0 && (
            <section className="adminCard">
              <h2>Letzter Forecast</h2>
              <div className="seoGrid">
                {forecastNums.slice(0, 8).map(([k, v]) => (
                  <div className="seoStat" key={k}>
                    <strong>{/eur|amount|mrr|revenue|umsatz/i.test(k) ? money(v) : Math.round(Number(v) * 100) / 100}</strong>
                    <span>{k.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="adminCard">
            <h2>Paket-Empfehlungen ({recommendations.length})</h2>
            {loading && <div className="adminMuted">Lade …</div>}
            {!loading && recommendations.length === 0 && <div className="adminMuted">Noch keine Empfehlungen — klick „Paket empfehlen".</div>}
            {recommendations.length > 0 && (
              <table className="adminTable">
                <thead><tr><th>Empfehlung</th><th>Begruendung</th><th>Datum</th></tr></thead>
                <tbody>
                  {recommendations.map((r, i) => (
                    <tr key={r.id || i}>
                      <td>{r.recommended_package || r.package || r.recommendation_type || '—'}</td>
                      <td>{(r.reason || r.rationale || '').slice(0, 100) || '—'}</td>
                      <td>{(r.created_at || '').slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="adminCard">
            <h2>Nutzungs-Abrechnung ({usage.length})</h2>
            {usage.length === 0 && <div className="adminMuted">Keine Nutzungsdaten.</div>}
            {usage.length > 0 && (
              <table className="adminTable">
                <thead><tr><th>Zeitraum</th><th>Betrag</th></tr></thead>
                <tbody>
                  {usage.map((u, i) => (
                    <tr key={u.id || i}>
                      <td>{(u.period_start || '').slice(0, 10)}{u.period_end ? ` – ${String(u.period_end).slice(0, 10)}` : ''}</td>
                      <td>{money(u.total_eur ?? u.amount ?? u.total)}</td>
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
