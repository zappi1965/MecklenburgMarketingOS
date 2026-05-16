
'use client'
import { useEffect, useState } from 'react'
import { customerIntelligenceClient } from '@/lib/customerIntelligenceClient'

function Badge({ level }: { level?: string }) {
  const cls = level === 'high' ? 'danger' : level === 'medium' ? 'warning' : 'success'
  return <span className={`badge ${cls}`}>{level || 'low'}</span>
}

export default function CustomerIntelligencePanel({ customerId }: { customerId: string }) {
  const [score, setScore] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [usage, setUsage] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  async function load() {
    if (!customerId) return
    const [s, t, u] = await Promise.all([
      customerIntelligenceClient.score(customerId),
      customerIntelligenceClient.timeline(customerId, 60),
      customerIntelligenceClient.toolUsage(customerId)
    ])
    setScore(s.intelligence)
    setEvents(t.events || [])
    setUsage(u.usage || [])
  }

  async function recalc() {
    setLoading(true)
    try {
      const r = await customerIntelligenceClient.calculate(customerId)
      setScore(r.intelligence)
      const t = await customerIntelligenceClient.timeline(customerId, 60)
      setEvents(t.events || [])
    } finally { setLoading(false) }
  }

  async function monthlyReport() {
    setLoading(true)
    try {
      await customerIntelligenceClient.monthlySnapshot(customerId, { create_pdf:true })
      await load()
    } finally { setLoading(false) }
  }

  useEffect(() => { load().catch(()=>null) }, [customerId])
  const recommendations = score?.recommendations || []

  return (
    <section className="customerIntelligencePanel">
      <div className="module-header">
        <div>
          <h2>Customer Intelligence</h2>
          <p>Zentrale Verknüpfung aus CRM, QR, Loyalty, Reviews, Booking, Rechnungen und Pipeline.</p>
        </div>
        <div className="actions">
          <button className="btn" onClick={recalc} disabled={loading}>{loading ? 'Berechne...' : 'Neu berechnen'}</button>
          <button className="secondary-btn" onClick={monthlyReport} disabled={loading}>Monatsreport erzeugen</button>
        </div>
      </div>
      <div className="kpi-grid">
        <div className="kpi-card"><span>Lifetime Value</span><strong>{Number(score?.customer_lifetime_value || 0).toFixed(2)} €</strong></div>
        <div className="kpi-card"><span>Risiko</span><strong>{score?.risk_score ?? 0}/100</strong><Badge level={score?.risk_level} /></div>
        <div className="kpi-card"><span>Upsell</span><strong>{score?.upsell_score ?? 0}/100</strong><Badge level={score?.upsell_level} /></div>
        <div className="kpi-card"><span>Toolnutzung</span><strong>{score?.package_usage_score ?? 0}%</strong></div>
      </div>
      <div className="two-column customerIntelGrid">
        <div className="mmos-card customerIntelCard">
          <h3>Timeline</h3>
          {events.length === 0 && <p className="muted">Noch keine Timeline-Ereignisse.</p>}
          <div className="timelineList">{events.map(ev => <article className={`timelineItem ${ev.severity}`} key={ev.id}><div><strong>{ev.title}</strong><span>{ev.description}</span><small>{ev.source_module} · {new Date(ev.created_at).toLocaleString('de-DE')}</small></div></article>)}</div>
        </div>
        <div className="mmos-card customerIntelCard">
          <h3>Empfehlungen</h3>
          {recommendations.length === 0 && <p className="muted">Keine kritischen Empfehlungen.</p>}
          {recommendations.map((rec:any, i:number) => <div className="recommendationItem" key={i}><strong>{rec.title}</strong><span>{rec.text}</span></div>)}
          <h3 style={{marginTop:24}}>Toolnutzung</h3>
          {usage.length === 0 && <p className="muted">Noch keine Toolnutzung getrackt.</p>}
          {usage.map(tool => <div className="usageRow" key={tool.id}><span>{tool.tool_key}</span><strong>{tool.usage_count}</strong></div>)}
        </div>
      </div>
    </section>
  )
}
