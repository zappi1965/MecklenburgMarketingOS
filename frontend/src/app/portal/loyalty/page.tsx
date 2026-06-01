'use client'

import { useEffect, useState } from 'react'
import { customerPortalClient } from '@/lib/customerPortalClient'

function Metric({ label, value }: any) {
  return <div className="statCard"><span>{label}</span><strong>{value ?? 0}</strong></div>
}

export default function Page() {
  const [data, setData] = useState<any>(null)
  const [msg, setMsg] = useState('')

  async function load() {
    setMsg('Lade Loyalty...')
    const result = await customerPortalClient.overview().catch((e:any) => ({ ok:false, error:e.message }))
    setData(result)
    setMsg(result.ok ? 'Loyalty geladen.' : result.error || 'Fehler')
  }

  useEffect(() => { void load() }, [])

  const m = data?.metrics || {}
  const metrics = ["Einwilligungen", "Kampagnen", "Reports", "Dokumente"]

  return (
    <main className="adminPage">
      <div className="pageHeader">
        <div>
          <p className="eyebrow">Kundenportal</p>
          <h1>Loyalty V1</h1>
          <p className="muted">Kundenseitige Sicht auf Loyalty-Status, Rewards und Kampagnenhinweise.</p>
        </div>
        <button className="btn secondary" onClick={load}>Aktualisieren</button>
      </div>

      {msg && <p className="sub">{msg}</p>}

      <section className="statsGrid">
        {metrics.map((x:string) => <Metric key={x} label={x} value={
          x === 'Reports' ? m.reports :
          x === 'Dokumente' ? m.documents :
          x === 'Einwilligungen' ? m.active_consents :
          x === 'Kampagnen' ? m.campaigns : 0
        }/>) }
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

      <div className="card">
        <h2>Hinweis zur V1</h2>
        <p className="sub">Diese Seite ist als sichere Kundenansicht vorbereitet. Bearbeiten, Freigeben, Teamverwaltung und Billing-Aktionen werden schrittweise nach Pilot-Erfahrung aktiviert.</p>
      </div>
    </main>
  )
}
