'use client'

import { useEffect, useState } from 'react'
import { customerPortalClient } from '@/lib/customerPortalClient'

function Card({ title, children, action }: any) {
  return <section className="card"><div className="cardHead"><div><h2>{title}</h2></div>{action}</div>{children}</section>
}
function Badge({ ok, children }: any) {
  return <span className={ok ? 'badge green' : 'badge red'}>{children || (ok ? 'OK' : 'Prüfen')}</span>
}
function List({ rows, empty = 'Keine Einträge.' }: any) {
  const items = Array.isArray(rows) ? rows : []
  if (!items.length) return <p className="sub">{empty}</p>
  return <div className="stack">{items.slice(0, 30).map((x:any,i:number) => <div className="item" key={i}><div><b>{x.display_name || x.email || x.title || x.id}</b><div className="sub">{x.email || x.consent_at || x.requested_at || x.withdrawn_at || x.status}</div></div><Badge ok={true}>{x.version || x.status || 'ok'}</Badge></div>)}</div>
}

export default function PortalConsentsPage() {
  const [data, setData] = useState<any>(null)
  const [msg, setMsg] = useState('')

  async function load() {
    setMsg('Lade Einwilligungen...')
    const result = await customerPortalClient.marketingConsents().catch((e:any) => ({ ok:false, error:e.message }))
    setData(result)
    setMsg(result.ok ? 'Einwilligungen geladen.' : result.error || 'Fehler')
  }

  useEffect(() => { void load() }, [])

  return (
    <main className="adminPage">
      <div className="pageHeader">
        <div>
          <p className="eyebrow">Kundenportal</p>
          <h1>Werbeeinwilligungen</h1>
          <p className="muted">Übersicht über bestätigte Double-Opt-in-Einwilligungen, offene Bestätigungen, Widerrufe und Reminder-Entwürfe.</p>
        </div>
        <button className="btn secondary" onClick={load}>Aktualisieren</button>
      </div>

      <Card title="Übersicht" action={<Badge ok={data?.ok}>{data?.counts?.active_consents || 0} aktiv</Badge>}>
        <p className="sub">{msg}</p>
        <pre className="codeBox">{JSON.stringify(data?.counts || {}, null, 2)}</pre>
      </Card>

      <div className="grid2">
        <Card title="Aktive Werbeeinwilligungen">
          <List rows={data?.active_members || []} empty="Keine aktiven Werbeeinwilligungen."/>
        </Card>
        <Card title="Offene Double-Opt-in-Bestätigungen">
          <List rows={data?.pending_members || []} empty="Keine offenen Bestätigungen."/>
        </Card>
        <Card title="Widerrufe">
          <List rows={data?.withdrawn_members || []} empty="Keine Widerrufe."/>
        </Card>
        <Card title="Reminder-Entwürfe">
          <List rows={(data?.reminder_drafts || []).map((r:any) => ({ id:r.local_id, title:r.title, status:r.status, email:r.payload?.email }))} empty="Keine Reminder-Entwürfe."/>
        </Card>
      </div>
    </main>
  )
}
