'use client'

import { useEffect, useState } from 'react'
import AdminShell from '@/components/AdminShell'
import { finalProductionHardeningClient } from '@/lib/finalProductionHardeningClient'
import { getAdminSelectedCustomerId } from '@/lib/adminCustomerSelection'

function Card({ title, children, action }: any) {
  return <section className="card"><div className="cardHead"><div><h2>{title}</h2></div>{action}</div>{children}</section>
}

function Badge({ ok, children }: any) {
  return <span className={ok ? 'badge green' : 'badge red'}>{children || (ok ? 'OK' : 'Prüfen')}</span>
}

function List({ rows }: any) {
  const items = Array.isArray(rows) ? rows : []
  if (!items.length) return <p className="sub">Keine Hinweise.</p>
  return <div className="stack">{items.slice(0, 10).map((x:any,i:number) => <div className="item" key={i}><div><b>{x.name || x.table || x.issue || x.provider || x.key || 'Check'}</b><div className="sub">{x.hint || x.error || x.recommendation || x.label || JSON.stringify(x).slice(0, 160)}</div></div><Badge ok={x.ok !== false}>{x.ok === false ? 'Fehler' : 'OK'}</Badge></div>)}</div>
}

export default function FinalProductionHardeningPage() {
  const [customerId, setCustomerId] = useState('')
  const [data, setData] = useState<any>(null)
  const [msg, setMsg] = useState('')

  async function load() {
    const cid = getAdminSelectedCustomerId()
    setCustomerId(cid)
    setMsg('Lade finale Produktionshärtung...')
    setData(await finalProductionHardeningClient.overview(cid || undefined).catch((e:any) => ({ ok:false, error:e.message })))
    setMsg(cid ? 'Final Hardening geladen.' : 'Final Hardening geladen. Für kundenspezifische Checks oben Kundenkontext wählen.')
  }

  async function runJob(key: string) {
    setMsg(`Job ${key} läuft...`)
    const result = await finalProductionHardeningClient.runJob(key)
    setMsg(`${key}: ${result.ok ? 'OK' : 'Fehler'}`)
    await load()
  }

  async function runAll() {
    setMsg('Alle Jobs laufen...')
    const result = await finalProductionHardeningClient.runAllJobs()
    setMsg(`Alle Jobs: ${result.ok ? 'OK' : 'Prüfen'}`)
    await load()
  }

  useEffect(() => { void load() }, [])

  const blocks = data?.blocks || {}
  const jobs = data?.jobs || []

  return (
    <AdminShell activeHref="/admin/production/final-hardening">
      <div className="pageHeader">
        <div>
          <p className="eyebrow">99/100 Production Hardening</p>
          <h1>Final Production Hardening Center</h1>
          <p className="muted">Smoke Tests, Tenant-Isolation, Background Jobs, Webhooks, Upload-Policy, RBAC, Mail Compliance und Error Center.</p>
        </div>
        <div className="actionRow">
          <button className="btn secondary" onClick={load}>Neu prüfen</button>
          <button className="btn" onClick={runAll}>Alle Jobs starten</button>
        </div>
      </div>

      <Card title="Produktionsscore" action={<Badge ok={data?.score >= 90}>{data?.score || 0}/100</Badge>}>
        <p className="sub">{msg}</p>
        <p className="sub">Kundenkontext: {customerId || 'kein Kunde gewählt'}</p>
      </Card>

      <div className="grid2">
        <Card title="Production Smoke Test" action={<Badge ok={blocks.smoke?.ok}>{blocks.smoke?.score || 0}%</Badge>}>
          <List rows={blocks.smoke?.tests || []} />
        </Card>

        <Card title="Tenant Isolation Final Audit" action={<Badge ok={blocks.tenant?.ok}>{blocks.tenant?.failed?.length || 0} Fehler</Badge>}>
          <List rows={blocks.tenant?.failed || []} />
        </Card>

        <Card title="Webhook Signature Guard" action={<Badge ok={blocks.webhook?.ok}>Webhooks</Badge>}>
          <List rows={blocks.webhook?.checks || []} />
        </Card>

        <Card title="File Upload Security Guard" action={<Badge ok={blocks.upload?.ok}>Policy</Badge>}>
          <pre className="codeBox">{JSON.stringify(blocks.upload || {}, null, 2)}</pre>
        </Card>

        <Card title="Mail Compliance & Template Versioning" action={<Badge ok={blocks.mail?.ok}>{blocks.mail?.issues?.length || 0} Hinweise</Badge>}>
          <List rows={blocks.mail?.issues || []} />
        </Card>

        <Card title="Production Error Center" action={<Badge ok={blocks.errors?.ok}>{blocks.errors?.count || 0} Events</Badge>}>
          <List rows={blocks.errors?.errors || []} />
        </Card>

        <Card title="Activation Readiness 99/100" action={<Badge ok={blocks.activation?.ok}>{blocks.activation?.score || 0}/100</Badge>}>
          <p className="sub">{blocks.activation?.recommendation || 'Live-Nachweise prüfen.'}</p>
          <List rows={(blocks.activation?.missing || []).map((x:any) => ({ ...x, name: x.label, ok: x.ok, hint: x.hint }))} />
        </Card>

        <Card title="RBAC Permission Matrix" action={<Badge ok={true}>aktiv</Badge>}>
          <pre className="codeBox">{JSON.stringify(data?.rbac || {}, null, 2)}</pre>
        </Card>

        <Card title="Background Jobs" action={<Badge ok={jobs.length > 0}>{jobs.length} Jobs</Badge>}>
          {jobs.map((job:any) => <div className="item" key={job.key}><div><b>{job.label}</b><div className="sub">alle {job.interval_minutes} Minuten</div></div><button className="btn secondary" onClick={() => runJob(job.key)}>Starten</button></div>)}
        </Card>
      </div>
    </AdminShell>
  )
}
