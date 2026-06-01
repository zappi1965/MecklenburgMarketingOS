'use client'

import { useEffect, useState } from 'react'
import { FileText, MailCheck, Megaphone, RefreshCw, ShieldCheck } from 'lucide-react'
import { customerPortalClient } from '@/lib/customerPortalClient'

function Card({ title, children, icon }: any) {
  const Icon = icon
  return <section className="adminCard">{Icon ? <Icon size={22}/> : null}<h2>{title}</h2>{children}</section>
}
function Metric({ label, value }: any) {
  return <div className="statCard"><span>{label}</span><strong>{value ?? 0}</strong></div>
}

export default function PortalHomePage() {
  const [data, setData] = useState<any>(null)
  const [msg, setMsg] = useState('')

  async function load() {
    setMsg('Lade Kundenportal...')
    const result = await customerPortalClient.overview().catch((e:any) => ({ ok:false, error:e.message }))
    setData(result)
    setMsg(result.ok ? 'Kundenportal geladen.' : result.error || 'Fehler')
  }

  useEffect(() => { void load() }, [])

  const m = data?.metrics || {}
  return (
    <main className="adminPage">
      <div className="pageHeader">
        <div>
          <p className="eyebrow">Kundenportal</p>
          <h1>{data?.customer?.name || 'Ihr MMOS Kundenbereich'}</h1>
          <p className="muted">Reports, Einwilligungen, Kampagnenstatus und wichtige Dokumente auf einen Blick.</p>
        </div>
        <button className="btn secondary" onClick={load}><RefreshCw size={14}/> Aktualisieren</button>
      </div>

      {msg && <p className="sub">{msg}</p>}

      <section className="statsGrid">
        <Metric label="Dokumente" value={m.documents}/>
        <Metric label="Reports" value={m.reports}/>
        <Metric label="Einwilligungen" value={m.active_consents}/>
        <Metric label="Kampagnen" value={m.campaigns}/>
      </section>

      <section className="adminCardsGrid">
        <a className="adminCard" href="/portal/reports" style={{ textDecoration:'none', color:'inherit' }}>
          <FileText size={22}/><h2>Reports & PDFs</h2><p>Freigegebene Monatsreports, Angebote, Audits und Dokumente herunterladen.</p><span className="btn secondary">Öffnen</span>
        </a>
        <a className="adminCard" href="/portal/consents" style={{ textDecoration:'none', color:'inherit' }}>
          <MailCheck size={22}/><h2>Werbeeinwilligungen</h2><p>Double-Opt-in, Widerrufe und Reminder-Entwürfe kontrollieren.</p><span className="btn secondary">Öffnen</span>
        </a>
        <a className="adminCard" href="/admin/retention/intelligence" style={{ textDecoration:'none', color:'inherit' }}>
          <Megaphone size={22}/><h2>Kundenbindung</h2><p>Retention-Vorschläge, Segmente und Kampagnenstatus einsehen.</p><span className="btn secondary">Öffnen</span>
        </a>
        <a className="adminCard" href="/admin/production/customer-readiness" style={{ textDecoration:'none', color:'inherit' }}>
          <ShieldCheck size={22}/><h2>Go-Live Status</h2><p>Technische Bereitschaft und Kundenfreigaben prüfen.</p><span className="btn secondary">Öffnen</span>
        </a>
      </section>

      <div className="grid2">
        <Card title="Neueste Dokumente" icon={FileText}>
          {(data?.latest_documents || []).slice(0,5).map((d:any) => <div className="item" key={d.id}><div><b>{d.title || d.name}</b><div className="sub">{d.status || d.type} · {String(d.created_at || '').slice(0,10)}</div></div></div>)}
          {!(data?.latest_documents || []).length && <p className="sub">Noch keine Dokumente.</p>}
        </Card>
        <Card title="Aktuelle Kampagnen" icon={Megaphone}>
          {(data?.latest_campaigns || []).slice(0,5).map((c:any) => <div className="item" key={c.id}><div><b>{c.title}</b><div className="sub">{c.resource} · {c.status}</div></div></div>)}
          {!(data?.latest_campaigns || []).length && <p className="sub">Noch keine Kampagnen.</p>}
        </Card>
      </div>
    </main>
  )
}
