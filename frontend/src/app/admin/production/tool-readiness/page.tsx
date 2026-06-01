'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminShell from '@/components/AdminShell'
import { toolReadinessClient } from '@/lib/toolReadinessClient'

function Badge({ status, children }: any) {
  const ok = status === 'ready_candidate' || status === 'pilot_ready' || status === true
  const warn = status === 'prepared' || status === 'partial'
  return <span className={ok ? 'badge green' : warn ? 'badge yellow' : 'badge red'}>{children || status}</span>
}

function Card({ title, children, action }: any) {
  return <section className="card"><div className="cardHead"><div><h2>{title}</h2></div>{action}</div>{children}</section>
}

function pct(score: number) {
  return `${Math.max(0, Math.min(100, Number(score || 0)))}%`
}

export default function ToolReadinessPage() {
  const [data, setData] = useState<any>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [msg, setMsg] = useState('')

  async function load() {
    setMsg('Tool-Reife wird geprüft...')
    const result = await toolReadinessClient.overview().catch((e:any) => ({ ok:false, error:e.message, tools: [], weakest: [], strongest: [], blockers: [], summary: {} }))
    setData(result)
    setMsg(result.error || 'Tool-Reife geladen.')
  }

  useEffect(() => { void load() }, [])

  const tools = useMemo(() => {
    let list = data?.tools || []
    if (status !== 'all') list = list.filter((t:any) => t.status === status)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter((t:any) => `${t.name} ${t.category} ${t.key}`.toLowerCase().includes(q))
    }
    return list
  }, [data, query, status])

  return (
    <AdminShell activeHref="/admin/production/tool-readiness">
      <div className="pageHeader">
        <div>
          <p className="eyebrow">Production</p>
          <h1>Tool-Produktionsreife 1–100</h1>
          <p className="muted">Bewertet jedes verkaufbare Tool, zeigt fehlende Punkte und externe Live-Nachweise.</p>
        </div>
        <div className="actionRow">
          <a className="btn secondary" href={toolReadinessClient.markdownUrl()}>Markdown Export</a>
          <button className="btn" onClick={load}>Neu prüfen</button>
        </div>
      </div>

      <Card title="Gesamtbewertung" action={<Badge status={data?.ok}>{data?.average_score || 0}/100</Badge>}>
        <p className="sub">{msg}</p>
        <div className="progressTrack"><div className="progressBar" style={{ width: pct(data?.average_score || 0) }}/></div>
        <div className="statsGrid">
          <div className="statCard"><span>Tools</span><strong>{data?.total_tools || 0}</strong></div>
          <div className="statCard"><span>Ready Candidate</span><strong>{data?.summary?.ready_candidate || 0}</strong></div>
          <div className="statCard"><span>Pilot Ready</span><strong>{data?.summary?.pilot_ready || 0}</strong></div>
          <div className="statCard"><span>Blocker</span><strong>{data?.blockers?.length || 0}</strong></div>
        </div>
      </Card>

      <div className="grid2">
        <Card title="Schwächste Tools">
          {(data?.weakest || []).map((t:any) => (
            <a className="item" href={`#${t.key}`} key={t.key} style={{ textDecoration:'none', color:'inherit' }}>
              <div><b>{t.name}</b><div className="sub">{t.category}</div></div>
              <Badge status={t.status}>{t.live_score}</Badge>
            </a>
          ))}
        </Card>
        <Card title="Stärkste Tools">
          {(data?.strongest || []).map((t:any) => (
            <a className="item" href={`#${t.key}`} key={t.key} style={{ textDecoration:'none', color:'inherit' }}>
              <div><b>{t.name}</b><div className="sub">{t.category}</div></div>
              <Badge status={t.status}>{t.live_score}</Badge>
            </a>
          ))}
        </Card>
      </div>

      <div className="actionRow" style={{ marginBottom: 12 }}>
        <input className="input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tool suchen..." />
        <select className="input" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="all">Alle Status</option>
          <option value="ready_candidate">Ready Candidate</option>
          <option value="pilot_ready">Pilot Ready</option>
          <option value="prepared">Prepared</option>
          <option value="partial">Partial</option>
          <option value="immature">Immature</option>
        </select>
      </div>

      <section className="grid2">
        {tools.map((tool:any) => (
          <Card key={tool.key} title={tool.name} action={<Badge status={tool.status}>{tool.live_score}/100</Badge>}>
            <div id={tool.key} />
            <p className="sub">{tool.category} · Basis-Score {tool.score}/100 · Check-Score {tool.check_score}/100</p>
            <div className="progressTrack"><div className="progressBar" style={{ width: pct(tool.live_score) }}/></div>
            <h3>Was zur vollen Produktionsreife fehlt</h3>
            <ul className="compactList">
              {(tool.missing || []).slice(0, 10).map((m:string) => <li key={m}>{m}</li>)}
            </ul>
            <details>
              <summary>Systemchecks</summary>
              {(tool.checks || []).map((c:any) => (
                <div className="item" key={c.key}>
                  <div><b>{c.label}</b><div className="sub">{c.external ? 'externer Live-Nachweis' : 'Code-/Systemcheck'}</div></div>
                  <span className={c.ok ? 'badge green' : c.external ? 'badge red' : 'badge yellow'}>{c.ok ? 'OK' : 'offen'}</span>
                </div>
              ))}
            </details>
          </Card>
        ))}
      </section>
    </AdminShell>
  )
}
