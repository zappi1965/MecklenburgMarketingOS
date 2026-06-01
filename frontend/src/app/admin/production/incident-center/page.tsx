'use client'

import { useEffect, useState } from 'react'
import { operationsClient } from '@/lib/operationsClient'
import { getAdminSelectedCustomerId } from '@/lib/adminCustomerSelection'

function Card({ title, children, action }: any) {
  return <section className="card"><div className="cardHead"><div><h2>{title}</h2></div>{action}</div>{children}</section>
}
function Badge({ ok, children }: any) {
  return <span className={ok ? 'badge green' : 'badge red'}>{children || (ok ? 'OK' : 'Prüfen')}</span>
}
function IssueList({ rows }: any) {
  const items = Array.isArray(rows) ? rows : []
  if (!items.length) return <p className="sub">Keine Hinweise.</p>
  return <div className="stack">{items.slice(0, 12).map((x:any,i:number) => <div className="item" key={i}><div><b>{x.issue || x.title || x.area || x.key || 'Hinweis'}</b><div className="sub">{x.hint || x.description || x.error || JSON.stringify(x).slice(0, 160)}</div></div><Badge ok={x.severity !== 'critical'}>{x.severity || x.status || 'info'}</Badge></div>)}</div>
}

export default function IncidentCenterPage() {
  const [customerId, setCustomerId] = useState('')
  const [data, setData] = useState<any>(null)
  const [form, setForm] = useState<any>({ title:'', module:'system', severity:'medium', description:'' })
  const [msg, setMsg] = useState('')

  async function load() {
    const cid = getAdminSelectedCustomerId()
    setCustomerId(cid)
    const result = await operationsClient.incidents(cid || undefined).catch((e:any) => ({ ok:false, error:e.message, incidents: [] }))
    setData(result)
  }

  async function save() {
    const cid = getAdminSelectedCustomerId()
    setMsg('Incident wird gespeichert...')
    await operationsClient.saveIncident({ ...form, customer_id: cid || null })
    setForm({ title:'', module:'system', severity:'medium', description:'' })
    setMsg('Incident gespeichert.')
    await load()
  }

  useEffect(() => { void load() }, [])

  return (
    <>
      <div className="pageHeader">
        <div><p className="eyebrow">Betrieb</p><h1>Incident Center</h1><p className="muted">Störungen, Ursachen, Lösungen und interne Notizen je Kunde dokumentieren.</p></div>
        <button className="btn secondary" onClick={load}>Aktualisieren</button>
      </div>
      <div className="grid2">
        <Card title="Incident erfassen" action={<Badge ok={Boolean(customerId)}>{customerId ? 'kundengebunden' : 'global'}</Badge>}>
          <input className="input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Titel"/>
          <input className="input" value={form.module} onChange={e=>setForm({...form,module:e.target.value})} placeholder="Modul, z. B. QR, Billing, Mail"/>
          <select className="input" value={form.severity} onChange={e=>setForm({...form,severity:e.target.value})}><option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="critical">critical</option></select>
          <textarea className="input" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Beschreibung"/>
          <button className="btn" onClick={save}>Speichern</button>
          <p className="sub">{msg}</p>
        </Card>
        <Card title="Incidents" action={<Badge ok={(data?.incidents || []).filter((x:any)=>x.status!=='resolved'&&x.status!=='closed').length===0}>{data?.count || 0}</Badge>}>
          {(data?.incidents || []).map((i:any) => <div className="item" key={i.id}><div><b>{i.title}</b><div className="sub">{i.module} · {i.severity} · {i.status}</div></div><Badge ok={i.status==='resolved'||i.status==='closed'}>{i.status}</Badge></div>)}
        </Card>
      </div>
    </>
  )
}
