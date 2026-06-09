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

export default function BackupRestorePage() {
  const [data, setData] = useState<any>(null)
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')

  async function load() {
    setData(await operationsClient.backupRestore().catch((e:any) => ({ ok:false, error:e.message, checks: [] })))
  }

  async function record() {
    setMsg('Restore-Test wird protokolliert...')
    await operationsClient.recordRestoreTest({ status: 'green', note })
    setNote('')
    setMsg('Restore-Test protokolliert.')
    await load()
  }

  useEffect(() => { void load() }, [])

  return (
    <>
      <div className="pageHeader">
        <div><p className="eyebrow">Backup & Restore</p><h1>Backup-/Restore Readiness</h1><p className="muted">Backup-Konfiguration, RTO/RPO und Restore-Test Nachweise verwalten.</p></div>
        <button className="btn secondary" onClick={load}>Neu prüfen</button>
      </div>
      <div className="grid2">
        <Card title="Readiness" action={<Badge ok={data?.ok}>{data?.ok ? 'bereit' : 'prüfen'}</Badge>}><IssueList rows={data?.checks || []}/></Card>
        <Card title="Restore-Test protokollieren">
          <textarea className="input" value={note} onChange={e=>setNote(e.target.value)} placeholder="Notiz zum Restore-Test"/>
          <button className="btn" onClick={record}>Als erfolgreich protokollieren</button>
          <p className="sub">{msg}</p>
          <pre className="codeBox">{JSON.stringify(data?.last_restore_test || {}, null, 2)}</pre>
        </Card>
      </div>
    </>
  )
}
