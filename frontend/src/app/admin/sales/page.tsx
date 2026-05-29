'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Target, SearchCheck, ListFilter, FilePlus, FileSignature, RefreshCw } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { businessToolsClient } from '@/lib/businessToolsClient'
import { storeClient } from '@/lib/storeClient'

type Tab = 'audit' | 'leads' | 'offers' | 'contracts'
const TABS: Array<{ key: Tab; label: string; icon: any }> = [
  { key: 'audit', label: 'Google-Audit', icon: SearchCheck },
  { key: 'leads', label: 'Lead-Suche', icon: ListFilter },
  { key: 'offers', label: 'Angebote', icon: FilePlus },
  { key: 'contracts', label: 'Vertraege', icon: FileSignature }
]

function money(n?: any) { return n == null || isNaN(Number(n)) ? '—' : `${Number(n).toFixed(2)} €` }

export default function SalesToolsPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [tab, setTab] = useState<Tab>('audit')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  // Audit
  const [aName, setAName] = useState('')
  const [aCity, setACity] = useState('')
  const [audit, setAudit] = useState<any>(null)

  // Leads
  const [lBranch, setLBranch] = useState('')
  const [lCity, setLCity] = useState('')
  const [leads, setLeads] = useState<any[]>([])

  // Offers / Contracts
  const [offers, setOffers] = useState<any[]>([])
  const [contracts, setContracts] = useState<any[]>([])
  const [oTitle, setOTitle] = useState('')
  const [oPackage, setOPackage] = useState('')
  const [oPrice, setOPrice] = useState(0)
  const [cTitle, setCTitle] = useState('')
  const [cParty, setCParty] = useState('')

  useEffect(() => {
    (async () => {
      const p = await getCurrentUserProfile()
      if (!p) { setAuthorized(false); return }
      setAuthorized(true)
      setCustomerId(p.customer_id || '')
    })()
  }, [])

  function flash(m: string) { setInfo(m); setTimeout(() => setInfo(''), 4000) }

  async function loadDocs() {
    if (!customerId) return
    try {
      const [o, c] = await Promise.all([
        storeClient.list('generated_offers', { customer_id: customerId, limit: 50, order_by: 'created_at', order_dir: 'desc' }).catch(() => ({ data: [] })),
        storeClient.list('generated_contracts', { customer_id: customerId, limit: 50, order_by: 'created_at', order_dir: 'desc' }).catch(() => ({ data: [] }))
      ])
      setOffers((o as any).data || [])
      setContracts((c as any).data || [])
    } catch (_) {}
  }
  useEffect(() => { if (authorized && (tab === 'offers' || tab === 'contracts')) loadDocs() /* eslint-disable-line */ }, [tab, authorized, customerId])

  async function runAudit() {
    setBusy(true); setError(''); setAudit(null)
    try {
      const r: any = await businessToolsClient.googleBusinessAudit({ business_name: aName.trim(), city: aCity.trim() })
      setAudit(r.audit || r)
    } catch (e: any) { setError(e?.message || 'Audit fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function runLeads() {
    setBusy(true); setError(''); setLeads([])
    try {
      const r: any = await businessToolsClient.leadSearch({ branch: lBranch.trim(), city: lCity.trim() })
      setLeads(r.leads || [])
      if ((r.leads || []).length === 0) flash('Keine Leads gefunden (oder GOOGLE_PLACES_API_KEY fehlt im Backend).')
    } catch (e: any) { setError(e?.message || 'Lead-Suche fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function createOffer() {
    if (!customerId || !oTitle.trim()) return
    setBusy(true); setError('')
    try {
      await storeClient.create('generated_offers', { customer_id: customerId, title: oTitle.trim(), package_name: oPackage.trim() || null, monthly_price: Number(oPrice) || 0, status: 'draft' })
      setOTitle(''); setOPackage(''); setOPrice(0); flash('Angebot angelegt.'); await loadDocs()
    } catch (e: any) { setError(e?.message || 'Anlegen fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function createContract() {
    if (!customerId || !cTitle.trim()) return
    setBusy(true); setError('')
    try {
      await storeClient.create('generated_contracts', { customer_id: customerId, title: cTitle.trim(), party_name: cParty.trim() || null, status: 'draft' })
      setCTitle(''); setCParty(''); flash('Vertrag angelegt.'); await loadDocs()
    } catch (e: any) { setError(e?.message || 'Anlegen fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <h1><Target size={22} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Sales-Werkzeuge</h1>
        <p>Google-Business-Audit, Lead-Suche sowie Angebots- und Vertrags-Verwaltung — der Akquise-Funnel an einem Ort.</p>
      </header>

      {authorized === false && <div className="adminNotice"><b>Anmeldung erforderlich.</b></div>}
      {error && <div className="adminAlert">{error}</div>}
      {info && <div className="adminAlertInfo">{info}</div>}

      {authorized && (
        <>
          <nav className="adminTabs" aria-label="Sales-Bereiche">
            {TABS.map((t) => {
              const Icon = t.icon
              return (
                <button key={t.key} type="button" className={tab === t.key ? 'adminTab active' : 'adminTab'}
                  aria-current={tab === t.key ? 'page' : undefined} onClick={() => setTab(t.key)}>
                  <Icon size={14} /> {t.label}
                </button>
              )
            })}
          </nav>

          {tab === 'audit' && (
            <section className="adminCard">
              <h2>Google-Business-Audit</h2>
              <div className="adminGrid2">
                <label className="adminLabel">Betriebsname<input className="adminInput" value={aName} onChange={(e) => setAName(e.target.value)} placeholder="z.B. Friseur Müller" /></label>
                <label className="adminLabel">Ort<input className="adminInput" value={aCity} onChange={(e) => setACity(e.target.value)} placeholder="z.B. Schwerin" /></label>
              </div>
              <button type="button" className="adminBtn" onClick={runAudit} disabled={busy || !aName.trim() || !aCity.trim()}><SearchCheck size={14} /> {busy ? 'Prüfe …' : 'Audit starten'}</button>
              <p className="adminMuted">Nutzt Live-Daten über Google Places (GOOGLE_PLACES_API_KEY im Backend).</p>
              {audit && (
                <div className="adminCard" style={{ marginTop: 12 }}>
                  <div className="seoGrid">
                    <div className="seoStat"><strong>{audit.score ?? '—'}</strong><span>/100 Score</span></div>
                  </div>
                  {audit.summary && <p>{audit.summary}</p>}
                  {Array.isArray(audit.findings) && audit.findings.length > 0 && (
                    <ul className="adminMuted" style={{ paddingLeft: 16 }}>{audit.findings.map((f: any, i: number) => <li key={i}>{typeof f === 'string' ? f : f.label || JSON.stringify(f)}</li>)}</ul>
                  )}
                </div>
              )}
            </section>
          )}

          {tab === 'leads' && (
            <section className="adminCard">
              <h2>Lead-Suche</h2>
              <div className="adminGrid2">
                <label className="adminLabel">Branche<input className="adminInput" value={lBranch} onChange={(e) => setLBranch(e.target.value)} placeholder="z.B. Friseur" /></label>
                <label className="adminLabel">Ort<input className="adminInput" value={lCity} onChange={(e) => setLCity(e.target.value)} placeholder="z.B. Rostock" /></label>
              </div>
              <button type="button" className="adminBtn" onClick={runLeads} disabled={busy || !lBranch.trim() || !lCity.trim()}><ListFilter size={14} /> {busy ? 'Suche …' : 'Leads suchen'}</button>
              {leads.length > 0 && (
                <table className="adminTable" style={{ marginTop: 12 }}>
                  <thead><tr><th>Name</th><th>Branche</th><th>Ort</th><th>Bewertung</th><th>Google</th></tr></thead>
                  <tbody>
                    {leads.map((l, i) => (
                      <tr key={i}>
                        <td>{l.name || '—'}</td>
                        <td>{l.branch || '—'}</td>
                        <td>{l.city || '—'}</td>
                        <td>{l.rating != null ? `${l.rating}★ (${l.reviews ?? 0})` : '—'}</td>
                        <td>{l.google_url ? <a className="adminBtn small" href={l.google_url} target="_blank" rel="noopener noreferrer">Öffnen</a> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          )}

          {tab === 'offers' && (
            <>
              {!customerId && <section className="adminCard"><p className="adminMuted">Kein Customer verknüpft — Angebote können nicht gespeichert werden.</p></section>}
              <section className="adminCard">
                <h2>Angebot anlegen</h2>
                <div className="adminGrid2">
                  <label className="adminLabel">Titel<input className="adminInput" value={oTitle} onChange={(e) => setOTitle(e.target.value)} placeholder="z.B. Growth-Paket für Salon X" /></label>
                  <label className="adminLabel">Paket<input className="adminInput" value={oPackage} onChange={(e) => setOPackage(e.target.value)} placeholder="z.B. Growth" /></label>
                  <label className="adminLabel">Monatspreis (EUR)<input className="adminInput" type="number" min={0} step={1} value={oPrice} onChange={(e) => setOPrice(Number(e.target.value))} /></label>
                </div>
                <button type="button" className="adminBtn" onClick={createOffer} disabled={busy || !oTitle.trim() || !customerId}><FilePlus size={14} /> Angebot anlegen</button>
              </section>
              <section className="adminCard">
                <div className="adminActions"><h2 style={{ margin: 0 }}>Angebote ({offers.length})</h2><span className="adminTabSpacer" /><button type="button" className="adminBtn small" onClick={loadDocs} disabled={busy}><RefreshCw size={14} /> Neu laden</button></div>
                {offers.length === 0 && <div className="adminMuted">Noch keine Angebote.</div>}
                {offers.length > 0 && (
                  <table className="adminTable">
                    <thead><tr><th>Titel</th><th>Paket</th><th>Preis</th><th>Status</th><th>Datum</th></tr></thead>
                    <tbody>{offers.map((o) => (<tr key={o.id}><td>{o.title || '—'}</td><td>{o.package_name || '—'}</td><td>{money(o.monthly_price)}</td><td>{o.status || '—'}</td><td>{(o.created_at || '').slice(0, 10)}</td></tr>))}</tbody>
                  </table>
                )}
              </section>
            </>
          )}

          {tab === 'contracts' && (
            <>
              {!customerId && <section className="adminCard"><p className="adminMuted">Kein Customer verknüpft — Verträge können nicht gespeichert werden.</p></section>}
              <section className="adminCard">
                <h2>Vertrag anlegen</h2>
                <div className="adminGrid2">
                  <label className="adminLabel">Titel<input className="adminInput" value={cTitle} onChange={(e) => setCTitle(e.target.value)} placeholder="z.B. Dienstleistungsvertrag Growth" /></label>
                  <label className="adminLabel">Vertragspartner<input className="adminInput" value={cParty} onChange={(e) => setCParty(e.target.value)} placeholder="z.B. Salon X GmbH" /></label>
                </div>
                <button type="button" className="adminBtn" onClick={createContract} disabled={busy || !cTitle.trim() || !customerId}><FileSignature size={14} /> Vertrag anlegen</button>
                <p className="adminMuted">Hinweis: AVV-/DSGVO-Klauseln vor Versand anwaltlich prüfen lassen.</p>
              </section>
              <section className="adminCard">
                <div className="adminActions"><h2 style={{ margin: 0 }}>Verträge ({contracts.length})</h2><span className="adminTabSpacer" /><button type="button" className="adminBtn small" onClick={loadDocs} disabled={busy}><RefreshCw size={14} /> Neu laden</button></div>
                {contracts.length === 0 && <div className="adminMuted">Noch keine Verträge.</div>}
                {contracts.length > 0 && (
                  <table className="adminTable">
                    <thead><tr><th>Titel</th><th>Partner</th><th>Status</th><th>Datum</th></tr></thead>
                    <tbody>{contracts.map((c) => (<tr key={c.id}><td>{c.title || '—'}</td><td>{c.party_name || c.customer_name || '—'}</td><td>{c.status || '—'}</td><td>{(c.created_at || '').slice(0, 10)}</td></tr>))}</tbody>
                  </table>
                )}
              </section>
            </>
          )}
        </>
      )}
    </main>
  )
}
