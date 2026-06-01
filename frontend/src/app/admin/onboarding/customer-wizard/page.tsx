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
  if (!items.length) return <p className="sub">Keine kritischen Hinweise.</p>
  return <div className="stack">{items.slice(0, 12).map((x:any,i:number) => <div className="item" key={i}><div><b>{x.issue || x.title || x.area || x.key || 'Hinweis'}</b><div className="sub">{x.hint || x.description || x.error || JSON.stringify(x).slice(0, 160)}</div></div><Badge ok={x.severity !== 'critical'}>{x.severity || 'info'}</Badge></div>)}</div>
}

export default function CustomerWizardPage() {
  const [customerId, setCustomerId] = useState('')
  const [workflow, setWorkflow] = useState<any>(null)
  const [lifecycle, setLifecycle] = useState<any>(null)
  const [msg, setMsg] = useState('')

  async function load() {
    const cid = getAdminSelectedCustomerId()
    setCustomerId(cid)
    if (!cid) { setMsg('Bitte oben Kunden auswählen.'); return }
    setMsg('Lade Onboarding...')
    const [wf, lc] = await Promise.all([
      operationsClient.onboarding(cid).catch((e:any) => ({ ok:false, error:e.message, steps: [] })),
      operationsClient.lifecycle(cid).catch((e:any) => ({ ok:false, error:e.message, states: [] }))
    ])
    setWorkflow(wf)
    setLifecycle(lc)
    setMsg('Onboarding geladen.')
  }

  async function toggle(step:any) {
    if (!customerId) return
    setMsg('Speichere Schritt...')
    await operationsClient.updateOnboardingStep(customerId, { key: step.key, done: !step.done })
    await load()
  }

  async function setStatus(status:string) {
    if (!customerId) return
    setMsg('Setze Lifecycle...')
    await operationsClient.setLifecycle(customerId, { status, note: 'Status aus Onboarding-Wizard gesetzt.' })
    await load()
  }

  useEffect(() => { void load() }, [])

  return (
    <>
      <div className="pageHeader">
        <div><p className="eyebrow">Onboarding</p><h1>Kunden-Onboarding-Wizard</h1><p className="muted">Kunden von Lead bis Live sauber durch Paket, Vertrag, Branding, QR, Billing und Zugang führen.</p></div>
        <button className="btn" onClick={load}>Aktualisieren</button>
      </div>
      <Card title="Fortschritt" action={<Badge ok={(workflow?.progress || 0) >= 90}>{workflow?.progress || 0}%</Badge>}><p className="sub">{customerId || 'Kein Kunde gewählt'} · {msg}</p></Card>
      <div className="grid2">
        <Card title="Onboarding-Schritte">
          {(workflow?.steps || []).map((step:any) => <div className="item" key={step.key}><div><b>{step.label}</b><div className="sub">{step.done ? 'erledigt' : 'offen'}</div></div><button className="btn secondary" onClick={() => toggle(step)}>{step.done ? 'Zurücksetzen' : 'Erledigt'}</button></div>)}
        </Card>
        <Card title="Customer Lifecycle">
          <p className="sub">Aktuell: <b>{lifecycle?.status || 'lead'}</b></p>
          <div className="actionRow">{(lifecycle?.states || []).map((s:string) => <button key={s} className="btn secondary" onClick={() => setStatus(s)}>{s}</button>)}</div>
        </Card>
      </div>
    </>
  )
}
