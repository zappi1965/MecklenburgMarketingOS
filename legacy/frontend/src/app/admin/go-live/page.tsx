'use client'

import { useEffect, useState } from 'react'
import { goLiveCockpitClient } from '@/lib/goLiveCockpitClient'
import { getAdminSelectedCustomerId } from '@/lib/adminCustomerSelection'

function Badge({ ok, children }: any) {
  return <span className={ok ? 'badge green' : 'badge red'}>{children}</span>
}
function Card({ title, children, action }: any) {
  return <section className="card"><div className="cardHead"><div><h2>{title}</h2></div>{action}</div>{children}</section>
}

export default function GoLiveCockpitPage() {
  const [data, setData] = useState<any>(null)
  const [customerId, setCustomerId] = useState('')
  const [msg, setMsg] = useState('')

  async function load() {
    const cid = getAdminSelectedCustomerId()
    setCustomerId(cid)
    setMsg('Go-Live Cockpit wird geprüft...')
    const result = await goLiveCockpitClient.overview(cid || undefined).catch((e:any) => ({ ok:false, error:e.message, modules: [], blockers: [], next_steps: [] }))
    setData(result)
    setMsg(result.ok ? 'Pilotbereit.' : result.error || 'Offene Punkte vorhanden.')
  }

  useEffect(() => { void load() }, [])

  return (
    <>
      <div className="pageHeader">
        <div>
          <p className="eyebrow">Go-Live</p>
          <h1>Go-Live Cockpit</h1>
          <p className="muted">Zentrale Startseite für Pilotfähigkeit, Mail, Final Hardening, Kundenkontext, Billing und Retention.</p>
        </div>
        <button className="btn" onClick={load}>Neu prüfen</button>
      </div>

      <Card title="Gesamtstatus" action={<Badge ok={data?.ok}>{data?.score || 0}/100</Badge>}>
        <p className="sub">{customerId || 'Kein Kundenkontext gewählt'} · {msg}</p>
        <div className="progressTrack"><div className="progressBar" style={{ width: `${data?.score || 0}%` }}/></div>
      </Card>

      <div className="grid2">
        <Card title="Module">
          {(data?.modules || []).map((m:any) => <a className="item" key={m.key} href={m.href} style={{ textDecoration:'none', color:'inherit' }}>
            <div><b>{m.label}</b><div className="sub">{m.href}</div></div><Badge ok={m.ok}>{m.status}</Badge>
          </a>)}
        </Card>

        <Card title="Blocker">
          {(data?.blockers || []).length ? (data.blockers || []).map((b:any) => <a className="item" key={b.module} href={b.href} style={{ textDecoration:'none', color:'inherit' }}>
            <div><b>{b.label}</b><div className="sub">{b.hint}</div></div><Badge ok={false}>Blocker</Badge>
          </a>) : <p className="sub">Keine harten Blocker erkannt.</p>}
        </Card>

        <Card title="Nächste Schritte">
          {(data?.next_steps || []).map((s:any, i:number) => <a className="item" key={i} href={s.href} style={{ textDecoration:'none', color:'inherit' }}>
            <div><b>{s.title}</b><div className="sub">{s.href}</div></div><Badge ok={s.priority !== 'high'}>{s.priority}</Badge>
          </a>)}
        </Card>

        <Card title="Rohdaten">
          <pre className="codeBox">{JSON.stringify({ status: data?.status, generated_at: data?.generated_at }, null, 2)}</pre>
        </Card>
      </div>
    </>
  )
}
