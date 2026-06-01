'use client'

import { useEffect, useMemo, useState } from 'react'
import { completenessAuditClient } from '@/lib/completenessAuditClient'
import { getAdminSelectedCustomerId } from '@/lib/adminCustomerSelection'

function Badge({ status, children }: any) {
  const ok = status === 'ready' || status === true
  const warn = status === 'prepared' || status === 'partial'
  return <span className={ok ? 'badge green' : warn ? 'badge yellow' : 'badge red'}>{children || status}</span>
}

function Card({ title, children, action }: any) {
  return <section className="card"><div className="cardHead"><div><h2>{title}</h2></div>{action}</div>{children}</section>
}

function pct(score: number) {
  return `${Math.max(0, Math.min(100, Number(score || 0)))}%`
}

export default function CompletenessAuditPage() {
  const [data, setData] = useState<any>(null)
  const [customerId, setCustomerId] = useState('')
  const [msg, setMsg] = useState('')
  const [filter, setFilter] = useState<'all'|'blockers'|'prepared'|'ready'>('all')

  async function load() {
    const cid = getAdminSelectedCustomerId()
    setCustomerId(cid)
    setMsg('Completeness Audit wird ausgeführt...')
    const result = await completenessAuditClient.overview(cid || undefined).catch((e:any) => ({ ok:false, error:e.message, modules: [], blockers: [], next_steps: [], summary: {} }))
    setData(result)
    setMsg(result.error || (result.ok ? 'Pilotbereit ohne harte Blocker.' : 'Offene Punkte vorhanden.'))
  }

  useEffect(() => { void load() }, [])

  const modules = useMemo(() => {
    const list = data?.modules || []
    if (filter === 'blockers') return list.filter((m:any) => (m.missing || []).some((x:any) => x.severity === 'high'))
    if (filter === 'prepared') return list.filter((m:any) => ['prepared','partial'].includes(m.status))
    if (filter === 'ready') return list.filter((m:any) => m.status === 'ready')
    return list
  }, [data, filter])

  return (
    <>
      <div className="pageHeader">
        <div>
          <p className="eyebrow">Production</p>
          <h1>System Completeness & Pilot-Readiness Audit</h1>
          <p className="muted">Prüft, was wirklich bereit ist, was nur vorbereitet ist und was den ersten echten Kunden noch blockiert.</p>
        </div>
        <button className="btn" onClick={load}>Neu prüfen</button>
      </div>

      <Card title="Gesamtstatus" action={<Badge status={data?.ok}>{data?.score || 0}/100</Badge>}>
        <p className="sub">{customerId || 'Kein Kundenkontext gewählt'} · {msg}</p>
        <div className="progressTrack"><div className="progressBar" style={{ width: pct(data?.score || 0) }}/></div>
        <div className="statsGrid">
          <div className="statCard"><span>Bereit</span><strong>{data?.summary?.ready || 0}</strong></div>
          <div className="statCard"><span>Vorbereitet</span><strong>{data?.summary?.prepared || 0}</strong></div>
          <div className="statCard"><span>Teilweise</span><strong>{data?.summary?.partial || 0}</strong></div>
          <div className="statCard"><span>Blocker</span><strong>{data?.blockers?.length || 0}</strong></div>
        </div>
      </Card>

      <div className="actionRow" style={{ marginBottom: 12 }}>
        {(['all','blockers','prepared','ready'] as const).map((x) => (
          <button key={x} className={filter === x ? 'btn' : 'btn secondary'} onClick={() => setFilter(x)}>
            {x === 'all' ? 'Alle' : x === 'blockers' ? 'Blocker' : x === 'prepared' ? 'Vorbereitet' : 'Ready'}
          </button>
        ))}
      </div>

      <div className="grid2">
        <Card title="Harte Blocker">
          {(data?.blockers || []).length ? (data.blockers || []).map((b:any) => (
            <div className="item" key={`${b.module}-${b.check}`}>
              <div><b>{b.title}</b><div className="sub">{b.label} · {b.hint}</div></div>
              <Badge status={false}>high</Badge>
            </div>
          )) : <p className="sub">Keine harten Blocker erkannt.</p>}
        </Card>

        <Card title="Nächste Schritte">
          {(data?.next_steps || []).slice(0, 10).map((s:any, i:number) => (
            <div className="item" key={i}>
              <div><b>{s.title}</b><div className="sub">{s.hint}</div></div>
              <Badge status={s.priority !== 'high'}>{s.priority}</Badge>
            </div>
          ))}
        </Card>
      </div>

      <section className="grid2">
        {modules.map((m:any) => (
          <Card key={m.key} title={m.title} action={<Badge status={m.status}>{m.score}/100</Badge>}>
            <p className="sub">{m.description}</p>
            <div className="progressTrack"><div className="progressBar" style={{ width: pct(m.score) }}/></div>
            {(m.checks || []).map((c:any) => (
              <div className="item" key={c.key}>
                <div><b>{c.label}</b><div className="sub">{c.ok ? 'OK' : c.hint}</div></div>
                <span className={c.ok ? 'badge green' : c.severity === 'high' ? 'badge red' : 'badge yellow'}>{c.ok ? 'OK' : c.severity}</span>
              </div>
            ))}
            {(m.next_steps || []).length ? <details><summary>Nächste Schritte</summary><ul>{m.next_steps.map((n:string) => <li key={n}>{n}</li>)}</ul></details> : null}
          </Card>
        ))}
      </section>

      <Card title="ENV-/Proof Flags">
        <pre className="codeBox">{JSON.stringify(data?.env_flags || {}, null, 2)}</pre>
      </Card>
    </>
  )
}
