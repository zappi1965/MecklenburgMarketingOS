'use client'

import { useEffect, useState } from 'react'
import { customerPortalClient } from '@/lib/customerPortalClient'

function Metric({ label, value }: any) {
  return <div className="statCard"><span>{label}</span><strong>{value ?? 0}</strong></div>
}

export default function PortalBackofficePage() {
  const [data, setData] = useState<any>(null)
  const [msg, setMsg] = useState('')

  async function load() {
    setMsg('Lade Kunden-Backoffice...')
    const result = await customerPortalClient.overview().catch((e:any) => ({ ok:false, error:e.message }))
    setData(result)
    setMsg(result.ok ? 'Kunden-Backoffice geladen.' : result.error || 'Fehler')
  }

  useEffect(() => { void load() }, [])

  const m = data?.metrics || {}
  return (
    <main className="adminPage">
      <div className="pageHeader">
        <div>
          <p className="eyebrow">Kundenbereich</p>
          <h1>{data?.customer?.name || 'Kunden-Backoffice'}</h1>
          <p className="muted">V1: Freigegebene Reports, Einwilligungen, Kampagnenstatus und naechste Aktionen. Verwaltung bleibt kontrolliert und kundenbezogen.</p>
        </div>
        <button className="btn secondary" onClick={load}>Aktualisieren</button>
      </div>

      {msg && <p className="sub">{msg}</p>}

      <section className="statsGrid">
        <Metric label="Reports" value={m.reports}/>
        <Metric label="Dokumente" value={m.documents}/>
        <Metric label="Einwilligungen" value={m.active_consents}/>
        <Metric label="Kampagnen" value={m.campaigns}/>
      </section>

      <section className="adminCardsGrid">
        <a className="adminCard" href="/portal/reports" style={{ textDecoration:'none', color:'inherit' }}>
          <p className="eyebrow">Reports</p><h2>Reports & PDFs</h2><p>Freigegebene Monatsreports, Audits und Dokumente herunterladen.</p><span className="btn secondary">Öffnen</span>
        </a>
        <a className="adminCard" href="/portal/consents" style={{ textDecoration:'none', color:'inherit' }}>
          <p className="eyebrow">Consent</p><h2>Einwilligungen</h2><p>Double-Opt-in, Widerrufe und Reminder-Status kontrollieren.</p><span className="btn secondary">Öffnen</span>
        </a>
        <a className="adminCard" href="/marketing/consent-center" style={{ textDecoration:'none', color:'inherit' }}>
          <p className="eyebrow">Endkunde</p><h2>Consent Center</h2><p>Endkunden-Link fuer Status, erneutes Double-Opt-in und Widerruf.</p><span className="btn secondary">Öffnen</span>
        </a>
        <article className="adminCard">
          <p className="eyebrow">Nächste Ausbaustufe</p>
          <h2>Self-Service Verwaltung</h2>
          <p>QR-Kampagnen, Rewards, Teammitglieder und Billing werden bewusst erst nach Pilot-Erfahrung als Kunden-Self-Service ausgebaut.</p>
        </article>
      </section>

      <section className="grid2">
        <div className="card">
          <h2>Aktuelle Kampagnen</h2>
          {(data?.latest_campaigns || []).slice(0, 6).map((c:any) => (
            <div className="item" key={c.id}><div><b>{c.title}</b><div className="sub">{c.resource} · {c.status}</div></div></div>
          ))}
          {!(data?.latest_campaigns || []).length && <p className="sub">Noch keine Kampagnen freigegeben.</p>}
        </div>
        <div className="card">
          <h2>Aktuelle Dokumente</h2>
          {(data?.latest_documents || []).slice(0, 6).map((d:any) => (
            <div className="item" key={d.id}><div><b>{d.title || d.name}</b><div className="sub">{d.status || d.type} · {String(d.created_at || '').slice(0,10)}</div></div></div>
          ))}
          {!(data?.latest_documents || []).length && <p className="sub">Noch keine Dokumente freigegeben.</p>}
        </div>
      </section>
    </main>
  )
}
