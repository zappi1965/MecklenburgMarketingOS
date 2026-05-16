
'use client'
import { useEffect, useState } from 'react'
import { advancedLoyaltyClient } from '@/lib/advancedLoyaltyClient'

export default function AdvancedLoyaltyPanel({
  customerId,
  programId
}: {
  customerId:string
  programId:string
}) {
  const [overview,setOverview]=useState<any>(null)
  const [loading,setLoading]=useState(false)
  const [ruleName,setRuleName]=useState('Doppelte Punkte Aktion')
  const [segmentName,setSegmentName]=useState('Eigene Zielgruppe')

  async function load(){
    if(!programId) return
    const r = await advancedLoyaltyClient.overview(programId)
    setOverview(r.overview)
  }

  async function initDefaults(){
    setLoading(true)
    try{
      await advancedLoyaltyClient.ensureDefaults(programId)
      await advancedLoyaltyClient.rebuild(programId)
      await load()
    } finally { setLoading(false) }
  }

  async function rebuild(){
    setLoading(true)
    try{
      await advancedLoyaltyClient.rebuild(programId)
      await load()
    } finally { setLoading(false) }
  }

  async function createBonusRule(){
    setLoading(true)
    try{
      await advancedLoyaltyClient.createPointRule({
        customer_id: customerId,
        loyalty_program_id: programId,
        name: ruleName,
        rule_type:'bonus',
        trigger_key:'qr_scan',
        points_delta:0,
        multiplier:2,
        condition_config:{},
        priority:20,
        active:true
      })
      await load()
    } finally { setLoading(false) }
  }

  async function createCustomSegment(){
    setLoading(true)
    try{
      await advancedLoyaltyClient.createSegment({
        customer_id: customerId,
        loyalty_program_id: programId,
        name: segmentName,
        segment_key: `custom_${Date.now()}`,
        description:'Manuell angelegte Segmentregel',
        rule_config:{ min_points:100 },
        active:true
      })
      await load()
    } finally { setLoading(false) }
  }

  async function createCampaign(segmentId:string){
    setLoading(true)
    try{
      await advancedLoyaltyClient.createMarketingFromSegment(segmentId,{ loyalty_program_id:programId, campaign_type:'reactivation' })
      await load()
    } finally { setLoading(false) }
  }

  useEffect(()=>{load().catch(()=>null)},[programId])

  const segments = overview?.segments || []
  const tiers = overview?.tiers || []
  const pointRules = overview?.pointRules || []
  const members = overview?.members || []
  const actions = overview?.smartActions || []

  return <section className="advancedLoyaltyPanel">
    <div className="module-header">
      <div>
        <h2>Advanced Loyalty & Segmente</h2>
        <p>Segmentiere Endkunden, steuere VIP-Level und erstelle dynamische Punkteaktionen.</p>
      </div>
      <div className="actions">
        <button className="btn" onClick={initDefaults} disabled={loading}>{loading?'Arbeite...':'Defaults anlegen'}</button>
        <button className="secondary-btn" onClick={rebuild} disabled={loading}>Segmente neu berechnen</button>
      </div>
    </div>

    <div className="kpi-grid">
      <div className="kpi-card"><span>Endkunden</span><strong>{members.length}</strong></div>
      <div className="kpi-card"><span>Segmente</span><strong>{segments.length}</strong></div>
      <div className="kpi-card"><span>VIP-Level</span><strong>{tiers.length}</strong></div>
      <div className="kpi-card"><span>Punkte-Regeln</span><strong>{pointRules.length}</strong></div>
    </div>

    <div className="two-column advancedLoyaltyGrid">
      <div className="mmos-card advancedLoyaltyCard">
        <h3>Segmente</h3>
        <div className="inlineForm">
          <input value={segmentName} onChange={e=>setSegmentName(e.target.value)} />
          <button className="secondary-btn" onClick={createCustomSegment}>Segment erstellen</button>
        </div>
        {segments.map((s:any)=><div className="segmentItem" key={s.id}>
          <div><strong>{s.name}</strong><span>{s.description}</span><small>{s.member_count || 0} Mitglieder · {s.segment_key}</small></div>
          <button onClick={()=>createCampaign(s.id)}>Kampagne</button>
        </div>)}
      </div>

      <div className="mmos-card advancedLoyaltyCard">
        <h3>VIP-Level</h3>
        {tiers.map((t:any)=><div className="tierItem" key={t.id}>
          <strong>{t.name}</strong>
          <span>ab {t.min_points} Punkte · {t.multiplier}x Punkte</span>
        </div>)}
      </div>
    </div>

    <div className="two-column advancedLoyaltyGrid">
      <div className="mmos-card advancedLoyaltyCard">
        <h3>Dynamische Punkte-Regeln</h3>
        <div className="inlineForm">
          <input value={ruleName} onChange={e=>setRuleName(e.target.value)} />
          <button className="secondary-btn" onClick={createBonusRule}>2x Punkte-Regel</button>
        </div>
        {pointRules.map((r:any)=><div className="ruleItem" key={r.id}>
          <strong>{r.name}</strong>
          <span>{r.trigger_key} · +{r.points_delta} · {r.multiplier}x</span>
        </div>)}
      </div>

      <div className="mmos-card advancedLoyaltyCard">
        <h3>Smart Actions</h3>
        {actions.length === 0 && <p className="muted">Noch keine Smart Actions.</p>}
        {actions.map((a:any)=><div className="actionItem" key={a.id}>
          <strong>{a.name}</strong>
          <span>{a.action_type} · {a.status}</span>
        </div>)}
      </div>
    </div>
  </section>
}
