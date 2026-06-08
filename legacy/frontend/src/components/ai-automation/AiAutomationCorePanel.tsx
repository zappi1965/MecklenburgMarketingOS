
'use client'
import { useEffect, useState } from 'react'
import { aiAutomationCoreClient } from '@/lib/aiAutomationCoreClient'

export default function AiAutomationCorePanel({ customerId }: { customerId: string }) {
  const [health,setHealth]=useState<any>(null)
  const [messages,setMessages]=useState<any[]>([])
  const [runs,setRuns]=useState<any[]>([])
  const [campaigns,setCampaigns]=useState<any[]>([])
  const [loading,setLoading]=useState(false)

  async function load(){
    if(!customerId) return
    const [h,m,r,c]=await Promise.all([
      aiAutomationCoreClient.health(customerId),
      aiAutomationCoreClient.assistantMessages(customerId),
      aiAutomationCoreClient.automationRuns(customerId),
      aiAutomationCoreClient.marketingCampaigns(customerId)
    ])
    setHealth(h.health); setMessages(m.messages||[]); setRuns(r.runs||[]); setCampaigns(c.campaigns||[])
  }

  async function calculateAll(){
    setLoading(true)
    try{
      await aiAutomationCoreClient.calculateHealth(customerId)
      await aiAutomationCoreClient.generateAssistant(customerId)
      await aiAutomationCoreClient.runAutomations(customerId)
      await load()
    } finally { setLoading(false) }
  }

  async function createCampaign(type:string){
    setLoading(true)
    try{
      await aiAutomationCoreClient.createMarketingCampaign({customer_id:customerId,campaign_type:type})
      await load()
    } finally { setLoading(false) }
  }

  useEffect(()=>{load().catch(()=>null)},[customerId])
  const healthClass = health?.health_level === 'green' ? 'success' : health?.health_level === 'yellow' ? 'warning' : 'danger'

  return <section className="aiAutomationPanel">
    <div className="module-header">
      <div>
        <h2>AI & Automation Core</h2>
        <p>Health, Assistant, Smart Automations und Marketing Automation aus deinen Kundendaten.</p>
      </div>
      <div className="actions">
        <button className="btn" onClick={calculateAll} disabled={loading}>{loading?'Arbeite...':'Analyse & Automationen starten'}</button>
      </div>
    </div>

    <div className="kpi-grid">
      <div className="kpi-card"><span>Health Score</span><strong>{health?.health_score ?? 0}/100</strong><span className={`badge ${healthClass}`}>{health?.health_level || 'unknown'}</span></div>
      <div className="kpi-card"><span>Warnungen</span><strong>{health?.warnings?.length ?? 0}</strong></div>
      <div className="kpi-card"><span>Chancen</span><strong>{health?.opportunities?.length ?? 0}</strong></div>
      <div className="kpi-card"><span>Assistant Hinweise</span><strong>{messages.length}</strong></div>
    </div>

    <div className="two-column aiAutomationGrid">
      <div className="mmos-card aiAutomationCard">
        <h3>AI Business Assistant</h3>
        {messages.length===0 && <p className="muted">Noch keine Hinweise vorhanden.</p>}
        {messages.map(msg=><article className={`assistantMsg ${msg.severity}`} key={msg.id}><strong>{msg.title}</strong><span>{msg.message}</span><small>{msg.recommendation_type} · {new Date(msg.created_at).toLocaleString('de-DE')}</small></article>)}
      </div>

      <div className="mmos-card aiAutomationCard">
        <h3>Customer Health</h3>
        {(health?.warnings||[]).map((w:any,i:number)=><div className="healthItem warning" key={'w'+i}><strong>Warnung</strong><span>{w.text}</span></div>)}
        {(health?.opportunities||[]).map((o:any,i:number)=><div className="healthItem success" key={'o'+i}><strong>Chance</strong><span>{o.text}</span></div>)}
        {!health && <p className="muted">Noch kein Health Snapshot.</p>}
      </div>
    </div>

    <div className="two-column aiAutomationGrid">
      <div className="mmos-card aiAutomationCard">
        <h3>Marketing Automation</h3>
        <div className="actions">
          <button className="secondary-btn" onClick={()=>createCampaign('reactivation')}>Reaktivierung vorbereiten</button>
          <button className="secondary-btn" onClick={()=>createCampaign('review_request')}>Review Flow vorbereiten</button>
          <button className="secondary-btn" onClick={()=>createCampaign('loyalty_boost')}>Loyalty Boost vorbereiten</button>
        </div>
        {campaigns.map(c=><div className="campaignItem" key={c.id}><strong>{c.name}</strong><span>{c.campaign_type} · {c.status}</span></div>)}
      </div>

      <div className="mmos-card aiAutomationCard">
        <h3>Automation Runs</h3>
        {runs.length===0 && <p className="muted">Noch keine Runs.</p>}
        {runs.map(run=><div className="runItem" key={run.id}><strong>{run.trigger_key}</strong><span>{run.status} · {new Date(run.created_at).toLocaleString('de-DE')}</span></div>)}
      </div>
    </div>
  </section>
}
