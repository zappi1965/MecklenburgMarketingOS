'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { CreditCard, Link2, RefreshCw, Save, TrendingUp } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { getAdminSelectedCustomerId, onAdminCustomerSelected } from '@/lib/adminCustomerSelection'
import { posClient, type PosSummary, type PosTransaction } from '@/lib/deToolsClients'

function money(n?: number, cur = 'EUR') { return n == null ? '—' : `${Number(n).toFixed(2)} ${cur}` }

function statusBadge(s?: string) {
  const v = String(s || '').toLowerCase()
  if (['paid', 'success', 'successful', 'completed'].includes(v)) return 'on'
  if (['failed', 'declined', 'error', 'refunded'].includes(v)) return 'off'
  return ''
}

function linkedLabel(t: PosTransaction) {
  const link = t.metadata?.mmos_link
  if (!link) return '—'
  const parts = [
    link.qr_campaign_id ? 'QR' : '',
    link.appointment_id ? 'Termin' : '',
    link.loyalty_customer_id ? 'Loyalty' : '',
    link.lead_id ? 'Lead' : ''
  ].filter(Boolean)
  return parts.join(' · ') || 'verknüpft'
}

export default function PosPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [tx, setTx] = useState<PosTransaction[]>([])
  const [summary, setSummary] = useState<PosSummary | null>(null)
  const [sumupConfig, setSumupConfig] = useState<any>(null)
  const [accessToken, setAccessToken] = useState('')
  const [merchantCode, setMerchantCode] = useState('')
  const [syncLimit, setSyncLimit] = useState(100)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [linkingId, setLinkingId] = useState('')
  const [linkNote, setLinkNote] = useState('')

  async function load(cid: string) {
    setLoading(true); setError(''); setInfo('')
    try {
      const [transactions, sum, status] = await Promise.all([
        posClient.listTransactions(cid, { limit: 100 }),
        posClient.summary(cid, 90).catch(() => null),
        posClient.sumupStatus(cid).catch(() => null)
      ])
      setTx(transactions.transactions || [])
      setSummary(sum?.summary || null)
      setSumupConfig(status?.config || null)
      if (status?.config?.merchant_code) setMerchantCode(status.config.merchant_code)
    } catch (e: any) { setError(e?.message || 'Transaktionen konnten nicht geladen werden.') }
    finally { setLoading(false) }
  }

  async function connectSumUp() {
    if (!customerId) return setError('Bitte Kundenkontext wählen.')
    if (!accessToken.trim()) return setError('Bitte SumUp Access Token eintragen.')
    setBusy(true); setError(''); setInfo('SumUp Verbindung wird gespeichert...')
    try {
      const result = await posClient.sumupConnect(customerId, { access_token: accessToken, merchant_code: merchantCode })
      if (!result.ok) throw new Error(result.error || 'SumUp Verbindung fehlgeschlagen.')
      setAccessToken('')
      setInfo('SumUp Umsatzdaten-Anbindung wurde gespeichert.')
      await load(customerId)
    } catch (e:any) { setError(e?.message || 'SumUp Verbindung konnte nicht gespeichert werden.') }
    finally { setBusy(false) }
  }

  async function syncSumUp() {
    if (!customerId) return setError('Bitte Kundenkontext wählen.')
    setBusy(true); setError(''); setInfo('SumUp Transaktionen werden synchronisiert...')
    try {
      const result = await posClient.sumupSync(customerId, { limit: syncLimit })
      if (!result.ok) throw new Error(result.error || 'SumUp Sync fehlgeschlagen.')
      setInfo(`SumUp Sync abgeschlossen: ${result.fetched || 0} abgerufen, ${result.inserted || 0} neu, ${result.updated || 0} aktualisiert.`)
      await load(customerId)
    } catch (e:any) { setError(e?.message || 'SumUp Sync fehlgeschlagen. Prüfe Token, Merchant Code und SumUp API-Zugriff.') }
    finally { setBusy(false) }
  }

  async function linkTransaction(transaction: PosTransaction) {
    if (!customerId) return
    setBusy(true); setError(''); setInfo('')
    try {
      const result = await posClient.linkTransaction(transaction.id, { customer_id: customerId, note: linkNote || 'Manuell geprüft', qr_campaign_id: '', appointment_id: '', loyalty_customer_id: '', lead_id: '' })
      if (!result.ok) throw new Error(result.error || 'Zuordnung fehlgeschlagen.')
      setInfo('Transaktion wurde als manuell geprüft/verknüpft markiert.')
      setLinkingId('')
      setLinkNote('')
      await load(customerId)
    } catch (e:any) { setError(e?.message || 'Zuordnung fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const profile = await getCurrentUserProfile()
      if (!mounted) return
      if (!profile) { setAuthorized(false); setLoading(false); return }
      const role = String(profile.role || '').toLowerCase()
      const admin = role === 'admin' || role === 'super_admin'
      setIsAdmin(admin)
      setAuthorized(true)
      const cid = profile.customer_id || (admin ? getAdminSelectedCustomerId() : '') || ''
      setCustomerId(cid)
      if (cid) await load(cid); else setLoading(false)
    })()
    const off = onAdminCustomerSelected((cid) => {
      setCustomerId(cid)
      if (cid) void load(cid)
    })
    return () => { mounted = false; off() }
  }, [])

  const total = tx.filter((t) => statusBadge(t.status) === 'on').reduce((s, t) => s + (Number(t.amount) || 0), 0)
  const daily = useMemo(() => summary?.daily || [], [summary])

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <h1><CreditCard size={22} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Umsatz & Zahlungen</h1>
        <p>
          Kassen-Anbindung fuer SumUp V1: Transaktionen abrufen, Umsatzentwicklung anzeigen und Zahlungen optional MMOS-Kontexten zuordnen.
          MMOS ersetzt dabei kein Kassensystem.
        </p>
      </header>

      {authorized === false && <div className="adminNotice"><b>Anmeldung erforderlich.</b></div>}
      {authorized && !customerId && <section className="adminCard"><p className="adminMuted">{isAdmin ? 'Bitte oben in der Backoffice-Kundensuche einen Kunden wählen.' : 'Dein Konto ist mit keinem Customer verknuepft.'}</p></section>}
      {error && <div className="adminAlert">{error}</div>}
      {info && <div className="adminAlertInfo">{info}</div>}

      {authorized && customerId && (
        <>
          <section className="adminCardsGrid">
            <article className="adminCard">
              <p className="eyebrow">Heute</p>
              <div className="adminMetric">{money(summary?.today_revenue || 0)}</div>
              <p className="adminMuted">erfolgreiche Zahlungen heute</p>
            </article>
            <article className="adminCard">
              <p className="eyebrow">Monat</p>
              <div className="adminMetric">{money(summary?.month_revenue || 0)}</div>
              <p className="adminMuted">erfolgreiche Zahlungen seit Monatsbeginn</p>
            </article>
            <article className="adminCard">
              <p className="eyebrow">90 Tage</p>
              <div className="adminMetric">{money(summary?.total_revenue || total)}</div>
              <p className="adminMuted">{summary?.successful_count || 0} erfolgreiche Transaktionen</p>
            </article>
            <article className="adminCard">
              <p className="eyebrow">Ø Bon</p>
              <div className="adminMetric">{money(summary?.avg_transaction || 0)}</div>
              <p className="adminMuted">Durchschnitt pro erfolgreicher Zahlung</p>
            </article>
          </section>

          <section className="adminCard">
            <div className="adminActions">
              <div>
                <h2 style={{ margin: 0 }}><Link2 size={18} style={{ verticalAlign:'middle', marginRight:6 }} /> SumUp verbinden</h2>
                <p className="adminMuted">V1 liest nur Umsatzdaten. Keine Zahlungsstarts, keine Kassenersetzung.</p>
              </div>
              <span className={`adminBadge ${sumupConfig?.connected ? 'on' : ''}`}>{sumupConfig?.connected ? 'verbunden' : 'nicht verbunden'}</span>
            </div>
            <div className="adminFormGrid">
              <input className="adminInput" type="password" value={accessToken} onChange={e=>setAccessToken(e.target.value)} placeholder="SumUp Access Token" />
              <input className="adminInput" value={merchantCode} onChange={e=>setMerchantCode(e.target.value)} placeholder="Merchant Code optional" />
              <button className="adminBtn" onClick={connectSumUp} disabled={busy}><Save size={14}/> Verbindung speichern</button>
            </div>
            <p className="adminMuted">Quelle: {sumupConfig?.source || '—'} · Token: {sumupConfig?.token_preview || 'nicht gespeichert'} · Merchant: {sumupConfig?.merchant_code || '—'}</p>
          </section>

          <section className="adminCard">
            <div className="adminActions">
              <div>
                <h2 style={{ margin: 0 }}><TrendingUp size={18} style={{ verticalAlign:'middle', marginRight:6 }} /> Umsatz-Sync</h2>
                <p className="adminMuted">Transaktionen von SumUp abrufen und in MMOS speichern.</p>
              </div>
              <span className="adminTabSpacer" />
              <input className="adminInput" style={{ maxWidth: 120 }} type="number" min={1} max={500} value={syncLimit} onChange={e=>setSyncLimit(Number(e.target.value || 100))} />
              <button type="button" className="adminBtn small" onClick={syncSumUp} disabled={busy || loading}><RefreshCw size={14} /> SumUp synchronisieren</button>
              <button type="button" className="adminBtn small secondary" onClick={() => load(customerId)} disabled={loading}><RefreshCw size={14} /> Neu laden</button>
            </div>
            {daily.length > 0 && (
              <div className="adminMiniChart">
                {daily.slice(-14).map((d) => {
                  const max = Math.max(...daily.map((x) => x.amount), 1)
                  return <div key={d.date} title={`${d.date}: ${money(d.amount)}`} style={{ height: `${Math.max(8, Math.round((d.amount / max) * 90))}%` }} />
                })}
              </div>
            )}
          </section>

          <section className="adminCard">
            <div className="adminActions">
              <h2 style={{ margin: 0 }}>Transaktionen ({tx.length})</h2>
              <span className="adminTabSpacer" />
            </div>
            {!loading && tx.length > 0 && <p className="adminMuted">Summe erfolgreicher Zahlungen in Liste: <strong>{money(total)}</strong></p>}
            {loading && <div className="adminMuted">Lade …</div>}
            {!loading && tx.length === 0 && <div className="adminMuted">Noch keine POS-Transaktionen. Verbinde SumUp und synchronisiere Umsatzdaten.</div>}
            {!loading && tx.length > 0 && (
              <table className="adminTable">
                <thead><tr><th>Zeit</th><th>Anbieter</th><th>Referenz</th><th>Betrag</th><th>Status</th><th>Zuordnung</th><th>Aktion</th></tr></thead>
                <tbody>
                  {tx.map((t) => (
                    <tr key={t.id}>
                      <td>{t.transaction_time ? new Date(t.transaction_time).toLocaleString('de-DE') : '—'}</td>
                      <td>{t.provider || '—'}</td>
                      <td>{t.metadata?.reference || t.provider_transaction_id || t.id.slice(0, 8)}</td>
                      <td>{money(t.amount, t.currency || 'EUR')}</td>
                      <td><span className={`adminBadge ${statusBadge(t.status)}`}>{t.status || '—'}</span></td>
                      <td>{linkedLabel(t)}</td>
                      <td>
                        {linkingId === t.id ? (
                          <div className="adminActions">
                            <input className="adminInput" value={linkNote} onChange={e=>setLinkNote(e.target.value)} placeholder="Notiz" />
                            <button className="adminBtn small" onClick={() => linkTransaction(t)} disabled={busy}>Speichern</button>
                          </div>
                        ) : (
                          <button className="adminBtn small secondary" onClick={() => setLinkingId(t.id)}>zuordnen</button>
                        )}
                      </td>
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
