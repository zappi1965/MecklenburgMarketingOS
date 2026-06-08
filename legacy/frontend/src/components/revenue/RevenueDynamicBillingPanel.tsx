
'use client'
import { useEffect, useState } from 'react'
import { revenueDynamicBillingClient } from '@/lib/revenueDynamicBillingClient'

export default function RevenueDynamicBillingPanel({ customerId }: { customerId:string }) {
  const [forecasts,setForecasts]=useState<any[]>([])
  const [usage,setUsage]=useState<any[]>([])
  const [recommendations,setRecommendations]=useState<any[]>([])
  const [shareEvents,setShareEvents]=useState<any[]>([])
  const [loading,setLoading]=useState(false)

  async function load(){
    if(!customerId) return
    const [f,u,r,s]=await Promise.all([
      revenueDynamicBillingClient.forecasts(customerId),
      revenueDynamicBillingClient.usage(customerId),
      revenueDynamicBillingClient.recommendations(customerId),
      revenueDynamicBillingClient.shareEvents(customerId)
    ])
    setForecasts(f.forecasts||[])
    setUsage(u.usage||[])
    setRecommendations(r.recommendations||[])
    setShareEvents(s.events||[])
  }

  async function calculateAll(){
    setLoading(true)
    try{
      await revenueDynamicBillingClient.createForecast(customerId)
      await revenueDynamicBillingClient.calculateUsage(customerId)
      await revenueDynamicBillingClient.recommendPackage(customerId)
      await load()
    } finally { setLoading(false) }
  }

  async function testShare(){
    setLoading(true)
    try{
      await revenueDynamicBillingClient.calculateShare(customerId,{gross_amount:299,source_type:'subscription'})
      await load()
    } finally { setLoading(false) }
  }

  useEffect(()=>{load().catch(()=>null)},[customerId])

  const latestForecast=forecasts[0]
  const latestUsage=usage[0]
  const latestRecommendation=recommendations[0]

  return <section className="revenueBillingPanel">
    <div className="module-header">
      <div>
        <h2>Revenue Forecasting & Dynamic Billing</h2>
        <p>Umsatzprognose, Paketempfehlungen, Usage Billing und Revenue Share.</p>
      </div>
      <div className="actions">
        <button className="btn" onClick={calculateAll} disabled={loading}>{loading?'Berechne...':'Forecast & Billing berechnen'}</button>
        <button className="secondary-btn" onClick={testShare} disabled={loading}>Revenue Share simulieren</button>
      </div>
    </div>

    <div className="kpi-grid">
      <div className="kpi-card"><span>Forecast Umsatz</span><strong>{Number(latestForecast?.expected_revenue||0).toFixed(2)} €</strong></div>
      <div className="kpi-card"><span>MRR</span><strong>{Number(latestForecast?.expected_mrr||0).toFixed(2)} €</strong></div>
      <div className="kpi-card"><span>Usage Add-on</span><strong>{Number(latestUsage?.calculated_addon_amount||0).toFixed(2)} €</strong></div>
      <div className="kpi-card"><span>Empfehlung</span><strong>{latestRecommendation?.recommended_package || '—'}</strong></div>
    </div>

    <div className="two-column revenueBillingGrid">
      <div className="mmos-card revenueBillingCard">
        <h3>Forecast Treiber</h3>
        {!latestForecast && <p className="muted">Noch kein Forecast berechnet.</p>}
        {(latestForecast?.drivers||[]).map((d:any,i:number)=><div className="driverItem" key={i}><strong>{d.type}</strong><span>{d.text}</span></div>)}
        {latestForecast && <div className="driverItem"><strong>Confidence</strong><span>{latestForecast.confidence_score}/100 · {latestForecast.forecast_level}</span></div>}
      </div>

      <div className="mmos-card revenueBillingCard">
        <h3>Paketempfehlungen</h3>
        {recommendations.length===0 && <p className="muted">Keine Empfehlungen.</p>}
        {recommendations.map(rec=><div className="recommendationItem" key={rec.id}><strong>{rec.recommended_package}</strong><span>{rec.reason}</span><small>{rec.priority} · +{Number(rec.estimated_revenue_uplift||0).toFixed(2)} €</small></div>)}
      </div>
    </div>

    <div className="two-column revenueBillingGrid">
      <div className="mmos-card revenueBillingCard">
        <h3>Usage Billing</h3>
        {!latestUsage && <p className="muted">Noch keine Usage berechnet.</p>}
        {latestUsage && Object.entries(latestUsage.usage_breakdown||{}).map(([key,value]:any)=><div className="usageBillingRow" key={key}><span>{key}</span><strong>{value.quantity} × {value.unit_price} € = {Number(value.amount).toFixed(2)} €</strong></div>)}
      </div>

      <div className="mmos-card revenueBillingCard">
        <h3>Revenue Share</h3>
        {shareEvents.length===0 && <p className="muted">Noch keine Revenue-Share-Events.</p>}
        {shareEvents.map(ev=><div className="shareEventItem" key={ev.id}><strong>{Number(ev.share_amount||0).toFixed(2)} € Anteil</strong><span>Gross {Number(ev.gross_amount||0).toFixed(2)} € · Plattform {Number(ev.platform_amount||0).toFixed(2)} €</span></div>)}
      </div>
    </div>
  </section>
}
