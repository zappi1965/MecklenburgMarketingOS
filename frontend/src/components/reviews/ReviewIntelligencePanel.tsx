
'use client'
import { useEffect, useState } from 'react'
import { reviewIntelligenceClient } from '@/lib/reviewIntelligenceClient'

export default function ReviewIntelligencePanel({ customerId }: { customerId:string }) {
  const [profile,setProfile]=useState<any>(null)
  const [items,setItems]=useState<any[]>([])
  const [loading,setLoading]=useState(false)

  async function load(){
    if(!customerId) return
    const [p,i]=await Promise.all([
      reviewIntelligenceClient.profile(customerId),
      reviewIntelligenceClient.items(customerId)
    ])
    setProfile(p.profile)
    setItems(i.items||[])
  }

  async function analyze(){
    setLoading(true)
    try{
      const result = await reviewIntelligenceClient.analyzeCustomer(customerId)
      setProfile(result.profile)
      await load()
    } finally { setLoading(false) }
  }

  useEffect(()=>{ load().catch(()=>null) },[customerId])

  const score = Number(profile?.sentiment_score || 0)
  const scoreClass = score >= 25 ? 'success' : score <= -25 ? 'danger' : 'warning'

  return <section className="reviewIntelligencePanel">
    <div className="module-header">
      <div>
        <h2>Review Intelligence</h2>
        <p>Analysiert Bewertungen nach Sentiment, Themen, Problemen, Lobpunkten und Antwortvorschlägen.</p>
      </div>
      <div className="actions">
        <button className="btn" onClick={analyze} disabled={loading}>{loading?'Analysiere...':'Bewertungen analysieren'}</button>
      </div>
    </div>

    <div className="kpi-grid">
      <div className="kpi-card"><span>Bewertungen</span><strong>{profile?.total_reviews ?? 0}</strong></div>
      <div className="kpi-card"><span>Ø Rating</span><strong>{Number(profile?.avg_rating||0).toFixed(2)}</strong></div>
      <div className="kpi-card"><span>Sentiment</span><strong>{profile?.sentiment_score ?? 0}</strong><span className={`badge ${scoreClass}`}>{scoreClass}</span></div>
      <div className="kpi-card"><span>Kritisch</span><strong>{profile?.negative_count ?? 0}</strong></div>
    </div>

    <div className="two-column reviewIntelGrid">
      <div className="mmos-card reviewIntelCard">
        <h3>Häufige Kritikpunkte</h3>
        {(profile?.top_negative_topics||[]).length===0 && <p className="muted">Keine kritischen Themen erkannt.</p>}
        {(profile?.top_negative_topics||[]).map((t:any)=><div className="reviewTopic negative" key={t.topic_key}><strong>{t.label}</strong><span>{t.count} Erwähnungen</span></div>)}

        <h3 style={{marginTop:24}}>Häufiges Lob</h3>
        {(profile?.top_positive_topics||[]).length===0 && <p className="muted">Noch keine Lob-Themen erkannt.</p>}
        {(profile?.top_positive_topics||[]).map((t:any)=><div className="reviewTopic positive" key={t.topic_key}><strong>{t.label}</strong><span>{t.count} Erwähnungen</span></div>)}
      </div>

      <div className="mmos-card reviewIntelCard">
        <h3>Handlungsempfehlungen</h3>
        {(profile?.recommended_actions||[]).length===0 && <p className="muted">Keine Empfehlungen vorhanden.</p>}
        {(profile?.recommended_actions||[]).map((a:any,i:number)=><div className="reviewAction" key={i}><strong>{a.type}</strong><span>{a.text}</span></div>)}
      </div>
    </div>

    <div className="mmos-card reviewIntelCard reviewIntelList">
      <h3>Analysierte Bewertungen</h3>
      {items.length===0 && <p className="muted">Noch keine analysierten Bewertungen.</p>}
      {items.map(item=><article className={`reviewIntelItem ${item.sentiment}`} key={item.id}>
        <div>
          <strong>{item.summary}</strong>
          <span>Antwortvorschlag: {item.suggested_response}</span>
          <small>{item.sentiment} · Score {item.sentiment_score}</small>
        </div>
      </article>)}
    </div>
  </section>
}
