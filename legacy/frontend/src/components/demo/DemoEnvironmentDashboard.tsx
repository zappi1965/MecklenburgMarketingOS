'use client'

import { useEffect, useState } from 'react'
import { demoEnvironmentClient } from '@/lib/demoEnvironmentClient'

function money(value: any) {
  return `${Number(value || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

export default function DemoEnvironmentDashboard() {
  const [demo, setDemo] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    const data = await demoEnvironmentClient.dashboard()
    setDemo(data.demo)
  }

  async function check() {
    setLoading(true)
    try {
      await demoEnvironmentClient.check()
      await load()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load().catch(() => null) }, [])

  if (!demo) return <section className="demoEnvPanel"><p>Lade Demo Umgebung...</p></section>

  const k = demo.kpis || {}

  return (
    <section className="demoEnvPanel">
      <div className="module-header">
        <div>
          <h1>Demo Umgebung</h1>
          <p>Aktueller Demo-Stand mit CRM, QR, Loyalty, Reviews, AI, Automation, Revenue und Mobile UX.</p>
        </div>
        <div className="actions">
          <button className="btn" onClick={check} disabled={loading}>{loading ? 'Prüfe...' : 'Demo prüfen'}</button>
        </div>
      </div>

      <div className="demoHeroCard">
        <div>
          <span>Interner Testkunde</span>
          <strong>{demo.customer?.name || 'Interner Testkunde'}</strong>
          <p>{demo.customer?.company} · Paket: {demo.customer?.package_key}</p>
        </div>
        <div className="demoHealthBadge">
          <strong>{demo.health?.health_score ?? 0}</strong>
          <span>{demo.health?.health_level || 'unknown'}</span>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card"><span>QR Scans</span><strong>{k.qrScans}</strong></div>
        <div className="kpi-card"><span>Loyalty Member</span><strong>{k.loyaltyMembers}</strong></div>
        <div className="kpi-card"><span>Reviews</span><strong>{k.reviews}</strong></div>
        <div className="kpi-card"><span>Umsatz</span><strong>{money(k.revenue)}</strong></div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card"><span>Forecast</span><strong>{money(demo.revenue?.forecast?.expected_revenue)}</strong></div>
        <div className="kpi-card"><span>Pipeline gewichtet</span><strong>{money(k.pipelineWeighted)}</strong></div>
        <div className="kpi-card"><span>AI Hinweise</span><strong>{k.aiMessages}</strong></div>
        <div className="kpi-card"><span>Aktive Tools</span><strong>{demo.modules?.enabledTools}/{demo.modules?.totalTools}</strong></div>
      </div>

      <div className="two-column demoEnvGrid">
        <div className="mmos-card demoEnvCard">
          <h3>Neue Module sichtbar</h3>
          <div className="demoModuleList">
            {(demo.modules?.tools || []).map((tool:any) => <span key={tool.tool_key}>{tool.tool_key.replaceAll('_',' ')}</span>)}
          </div>
        </div>
        <div className="mmos-card demoEnvCard">
          <h3>AI Business Assistant</h3>
          {(demo.assistant || []).map((msg:any) => (
            <article className={`demoMsg ${msg.severity}`} key={msg.id}>
              <strong>{msg.title}</strong>
              <span>{msg.message}</span>
            </article>
          ))}
        </div>
      </div>

      <div className="two-column demoEnvGrid">
        <div className="mmos-card demoEnvCard">
          <h3>QR & Loyalty</h3>
          {(demo.qr || []).map((q:any) => <div className="demoRow" key={q.id}><span>{q.name}</span><strong>{q.scans} Scans / {q.conversions} Conversions</strong></div>)}
          {(demo.loyalty?.rewards || []).map((r:any) => <div className="demoRow" key={r.id}><span>{r.title}</span><strong>{r.points_required} Punkte</strong></div>)}
        </div>
        <div className="mmos-card demoEnvCard">
          <h3>Review Intelligence</h3>
          <div className="demoRow"><span>Sentiment Score</span><strong>{demo.reviews?.profile?.sentiment_score ?? 0}</strong></div>
          <div className="demoRow"><span>Ø Bewertung</span><strong>{Number(demo.reviews?.profile?.avg_rating || 0).toFixed(2)}</strong></div>
          {(demo.reviews?.profile?.top_negative_topics || []).map((t:any) => <div className="demoRow warning" key={t.topic_key}><span>{t.label}</span><strong>{t.count}x</strong></div>)}
        </div>
      </div>

      <div className="mmos-card demoEnvCard">
        <h3>Timeline</h3>
        <div className="demoTimeline">
          {(demo.timeline || []).map((event:any) => (
            <article className={`timelineItem ${event.severity}`} key={event.id}>
              <strong>{event.title}</strong>
              <span>{event.description}</span>
              <small>{event.source_module} · {new Date(event.created_at).toLocaleString('de-DE')}</small>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
