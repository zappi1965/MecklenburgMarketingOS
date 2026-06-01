'use client'

import { useEffect, useState } from 'react'
import AdminShell from '@/components/AdminShell'
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

export default function SupportDiagnosticsPage() {
  const [customerId, setCustomerId] = useState('')
  const [data, setData] = useState<any>(null)
  const [billing, setBilling] = useState<any>(null)
  const [msg, setMsg] = useState('')

  async function load() {
    const cid = getAdminSelectedCustomerId()
    setCustomerId(cid)
    if (!cid) { setMsg('Bitte oben einen Kunden auswählen.'); return }
    setMsg('Diagnose läuft...')
    const [diag, bill] = await Promise.all([
      operationsClient.supportDiagnostics(cid).catch((e:any) => ({ ok:false, error:e.message, recommendations: [] })),
      operationsClient.billingConsistency(cid).catch((e:any) => ({ ok:false, error:e.message, issues: [] }))
    ])
    setData(diag)
    setBilling(bill)
    setMsg('Diagnose abgeschlossen.')
  }

  useEffect(() => { void load() }, [])

  return (
    <AdminShell activeHref="/admin/production/support-diagnostics">
      <div className="pageHeader">
        <div><p className="eyebrow">Support</p><h1>Support-Diagnose-Cockpit</h1><p className="muted">QR, Slug, Loyalty, Tokens, Rewards, Billing und letzte Fehler je Kunde prüfen.</p></div>
        <button className="btn" onClick={load}>Neu prüfen</button>
      </div>
      <Card title="Kundenkontext" action={<Badge ok={Boolean(customerId)}>{customerId ? 'gewählt' : 'fehlt'}</Badge>}><p className="sub">{customerId || 'Kein Kunde gewählt'} · {msg}</p></Card>
      <div className="grid2">
        <Card title="Diagnose-Empfehlungen" action={<Badge ok={data?.ok}>{data?.recommendations?.length || 0} Hinweise</Badge>}><IssueList rows={data?.recommendations || []}/></Card>
        <Card title="Billing Consistency Guard" action={<Badge ok={billing?.ok}>{billing?.issues?.length || 0} Hinweise</Badge>}><IssueList rows={billing?.issues || []}/></Card>
        <Card title="Zähler"><pre className="codeBox">{JSON.stringify(data?.counts || {}, null, 2)}</pre></Card>
        <Card title="Letzte Fehler"><IssueList rows={data?.latest?.errors || []}/></Card>
      </div>
    </AdminShell>
  )
}
