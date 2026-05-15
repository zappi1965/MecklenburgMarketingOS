
const PDFDocument = require('pdfkit')

function clamp(n,min=0,max=100){ return Math.max(min, Math.min(max, Number(n)||0)) }
function level(score){ const s=Number(score)||0; return s>=70?'high':s>=35?'medium':'low' }
function monthRange(date=new Date()){ const s=new Date(date.getFullYear(),date.getMonth(),1); const e=new Date(date.getFullYear(),date.getMonth()+1,0); return {start:s.toISOString().slice(0,10),end:e.toISOString().slice(0,10)} }

function reportPdf(snapshot){
  return new Promise((resolve,reject)=>{
    const doc=new PDFDocument({size:'A4',margin:48}); const chunks=[]
    doc.on('data',c=>chunks.push(c)); doc.on('end',()=>resolve(Buffer.concat(chunks))); doc.on('error',reject)
    doc.fontSize(24).text('MMOS Monatsreport',{align:'right'}); doc.moveDown()
    doc.fontSize(26).text(snapshot.title||'Customer Intelligence Report')
    doc.fontSize(11).text(`Zeitraum: ${snapshot.period_start} bis ${snapshot.period_end}`); doc.moveDown()
    ;[['Umsatz',`${Number(snapshot.revenue||0).toFixed(2)} EUR`],['Termine',snapshot.appointments],['Rechnungen',snapshot.invoices],['QR Scans',snapshot.qr_scans],['QR Conversions',snapshot.qr_conversions],['Loyalty Teilnehmer',snapshot.loyalty_participants],['Loyalty Punkte',snapshot.loyalty_points_issued],['Bewertungen',snapshot.reviews],['Durchschnittsbewertung',snapshot.avg_rating],['Leads',snapshot.leads],['Offene Tickets',snapshot.open_tickets],['Risiko Score',snapshot.risk_score],['Upsell Score',snapshot.upsell_score]].forEach(([k,v])=>doc.fontSize(12).text(`${k}: ${v}`))
    doc.moveDown(); doc.fontSize(10).text('Automatisch erzeugt aus CRM, QR, Loyalty, Reviews, Booking, Rechnungen und Pipeline.'); doc.end()
  })
}

class CustomerIntelligenceService{
  constructor(supabase){ this.supabase=supabase }

  async event(payload){
    if(!payload.customer_id) return null
    const {data,error}=await this.supabase.from('customer_timeline_events').insert(payload).select('*').single()
    if(error) throw error
    return data
  }

  async trackTool({customer_id,tool_key,metadata={}}){
    if(!customer_id||!tool_key) return null
    const existing=await this.supabase.from('customer_tool_usage').select('*').eq('customer_id',customer_id).eq('tool_key',tool_key).maybeSingle()
    if(existing.data){
      const {data,error}=await this.supabase.from('customer_tool_usage').update({usage_count:Number(existing.data.usage_count||0)+1,last_used_at:new Date().toISOString(),metadata:{...(existing.data.metadata||{}),...metadata}}).eq('id',existing.data.id).select('*').single()
      if(error) throw error; return data
    }
    const {data,error}=await this.supabase.from('customer_tool_usage').insert({customer_id,tool_key,usage_count:1,first_used_at:new Date().toISOString(),last_used_at:new Date().toISOString(),metadata}).select('*').single()
    if(error) throw error; return data
  }

  async collectMetrics(customer_id){
    const [appointments,invoices,qr,loyaltyCustomers,loyaltyTx,reviews,tickets,leads,subscriptions,usage,toolAccess]=await Promise.all([
      this.supabase.from('appointments').select('*').eq('customer_id',customer_id),
      this.supabase.from('invoices').select('*').eq('customer_id',customer_id),
      this.supabase.from('qr_campaigns').select('*').eq('customer_id',customer_id),
      this.supabase.from('loyalty_customers').select('*').eq('customer_id',customer_id),
      this.supabase.from('loyalty_transactions').select('*').eq('customer_id',customer_id),
      this.supabase.from('review_feedback').select('*').eq('customer_id',customer_id),
      this.supabase.from('tickets').select('*').eq('customer_id',customer_id),
      this.supabase.from('pipeline_leads').select('*').eq('customer_id',customer_id),
      this.supabase.from('customer_subscriptions').select('*').eq('customer_id',customer_id).order('created_at',{ascending:false}).limit(1),
      this.supabase.from('customer_tool_usage').select('*').eq('customer_id',customer_id),
      this.supabase.from('customer_tool_access').select('*').eq('customer_id',customer_id).eq('enabled',true)
    ])
    const appts=appointments.data||[], inv=invoices.data||[], qrs=qr.data||[], loyals=loyaltyCustomers.data||[], ltx=loyaltyTx.data||[], revs=reviews.data||[], tix=tickets.data||[], pls=leads.data||[], sub=(subscriptions.data||[])[0]||null, use=usage.data||[], access=toolAccess.data||[]
    const revenue=appts.reduce((s,a)=>s+Number(a.price||0),0)+inv.reduce((s,i)=>s+Number(i.amount||i.total||0),0)
    const qrScans=qrs.reduce((s,q)=>s+Number(q.scans||0),0), qrConversions=qrs.reduce((s,q)=>s+Number(q.conversions||0),0)
    const loyaltyPoints=ltx.reduce((s,t)=>s+Number(t.points||0),0)
    const ratings=revs.map(r=>Number(r.rating||0)).filter(Boolean)
    const avgRating=ratings.length?ratings.reduce((a,b)=>a+b,0)/ratings.length:0
    const negativeReviews=revs.filter(r=>Number(r.rating||0)<=3&&Number(r.rating||0)>0).length
    const openTickets=tix.filter(t=>String(t.status||'').toLowerCase()!=='closed').length
    const enabledTools=access.length, usedTools=use.filter(u=>Number(u.usage_count||0)>0).length
    const packageUsageScore=enabledTools?clamp(Math.round((usedTools/enabledTools)*100)):clamp(usedTools*20)
    return {revenue,monthlyRecurring:Number(sub?.amount||sub?.monthly_price||0),appointments:appts.length,invoices:inv.length,qrScans,qrConversions,qrCampaigns:qrs.length,loyaltyParticipants:loyals.length,loyaltyPoints,reviews:revs.length,avgRating,negativeReviews,openTickets,leads:pls.length,wonLeads:pls.filter(l=>String(l.stage||'').toLowerCase()==='won').length,enabledTools,usedTools,packageUsageScore}
  }

  calculateScores(metrics){
    const reviewHealth=metrics.reviews?clamp(Math.round((metrics.avgRating/5)*100)-metrics.negativeReviews*8):65
    const loyaltyEngagement=clamp(metrics.loyaltyParticipants*8+metrics.loyaltyPoints/20)
    const qrHealth=metrics.qrScans?clamp((metrics.qrConversions/Math.max(metrics.qrScans,1))*100+Math.min(metrics.qrScans/10,30)):35
    const activity=clamp(metrics.appointments*8+metrics.invoices*4+metrics.leads*5+metrics.usedTools*8)
    const risk=clamp((metrics.openTickets*15)+(metrics.negativeReviews*18)+(metrics.packageUsageScore<30?25:0)+(metrics.qrScans===0?10:0)+(metrics.reviews===0?8:0)-(activity/6)-(loyaltyEngagement/10))
    const upsell=clamp((metrics.qrScans>50?25:metrics.qrScans/2)+(metrics.loyaltyParticipants>10?22:metrics.loyaltyParticipants*2)+(metrics.reviews>10?15:metrics.reviews)+(metrics.leads>3?18:metrics.leads*4)+(metrics.packageUsageScore>70?20:0))
    const clientSuccess=clamp(Math.round((reviewHealth*.25)+(loyaltyEngagement*.20)+(qrHealth*.20)+(activity*.20)+(metrics.packageUsageScore*.15)-risk*.20))
    const recommendations=[]
    if(risk>=60) recommendations.push({type:'risk',title:'Kundenrisiko hoch',text:'Offene Tickets, geringe Nutzung oder negative Bewertungen prüfen.'})
    if(upsell>=60) recommendations.push({type:'upsell',title:'Upsell-Chance',text:'Kunde zeigt hohe Aktivität. Growth/Premium-Angebot prüfen.'})
    if(metrics.packageUsageScore<40) recommendations.push({type:'adoption',title:'Geringe Toolnutzung',text:'Onboarding oder kurze Einweisung anbieten.'})
    if(metrics.negativeReviews>0) recommendations.push({type:'review',title:'Negatives Feedback',text:'Interne Rückmeldung prüfen und Kunden proaktiv kontaktieren.'})
    return {customer_lifetime_value:metrics.revenue,monthly_recurring_revenue:metrics.monthlyRecurring,risk_score:Math.round(risk),upsell_score:Math.round(upsell),package_usage_score:Math.round(metrics.packageUsageScore),loyalty_engagement_score:Math.round(loyaltyEngagement),review_health_score:Math.round(reviewHealth),client_success_score:Math.round(clientSuccess),risk_level:level(risk),upsell_level:level(upsell),recommendations,metrics}
  }

  async calculateAndStore(customer_id){
    const metrics=await this.collectMetrics(customer_id)
    const scores=this.calculateScores(metrics)
    const payload={customer_id,...scores,calculated_at:new Date().toISOString()}
    const {data,error}=await this.supabase.from('customer_intelligence_scores').upsert(payload,{onConflict:'customer_id'}).select('*').single()
    if(error) throw error
    await this.supabase.from('customers').update({customer_lifetime_value:scores.customer_lifetime_value,risk_score:scores.risk_score,upsell_score:scores.upsell_score,package_usage_score:scores.package_usage_score,risk_level:scores.risk_level,upsell_level:scores.upsell_level,intelligence_updated_at:new Date().toISOString()}).eq('id',customer_id)
    await this.event({customer_id,event_type:'intelligence_calculated',title:'Customer Intelligence aktualisiert',description:`Risiko ${scores.risk_score}/100, Upsell ${scores.upsell_score}/100, Nutzung ${scores.package_usage_score}/100.`,source_module:'customer_intelligence',severity:scores.risk_score>=70?'warning':'info',metadata:scores})
    return data
  }

  async createInvoiceFromAppointment({appointment_id,customer_id}){
    const {data:appointment,error}=await this.supabase.from('appointments').select('*').eq('id',appointment_id).single()
    if(error) throw error
    const amount=Number(appointment.price||0)
    const {data:invoice,error:ie}=await this.supabase.from('invoices').insert({customer_id:customer_id||appointment.customer_id,invoice_number:`RE-${Date.now()}`,service_type:appointment.service_category_name||appointment.title||'Terminleistung',amount,status:'Offen',service_category_id:appointment.service_category_id||null,source_appointment_id:appointment.id}).select('*').single()
    if(ie) throw ie
    await this.event({customer_id:invoice.customer_id,event_type:'invoice_created_from_booking',title:'Rechnung aus Termin erstellt',description:`Aus Termin wurde Rechnung ${invoice.invoice_number} über ${amount.toFixed(2)} EUR erstellt.`,source_module:'booking',source_id:appointment.id,severity:'success',metadata:{appointment,invoice}})
    return invoice
  }

  async reviewWarning({review_feedback_id}){
    const {data:review,error}=await this.supabase.from('review_feedback').select('*').eq('id',review_feedback_id).single()
    if(error) throw error
    if(Number(review.rating||0)>3) return {skipped:true,review}
    const created=await this.supabase.from('tickets').insert({customer_id:review.customer_id,title:'Negatives Kundenfeedback prüfen',description:review.feedback_text||`Bewertung mit ${review.rating} Sternen erhalten.`,status:'open',priority:'high',source:'review_feedback'}).select('*').single()
    await this.event({customer_id:review.customer_id,event_type:'negative_review_alert',title:'Negatives Feedback erhalten',description:review.feedback_text||`Bewertung mit ${review.rating} Sternen.`,source_module:'reviews',source_id:review.id,severity:'warning',metadata:{review,ticket:created.data||null}})
    return {review,ticket:created.data||null}
  }

  async qrUpsellLead({qr_campaign_id}){
    const {data:campaign,error}=await this.supabase.from('qr_campaigns').select('*').eq('id',qr_campaign_id).single()
    if(error) throw error
    const scans=Number(campaign.scans||0), conversions=Number(campaign.conversions||0)
    if(scans<25&&conversions<5) return {skipped:true,reason:'Zu wenig Performance',campaign}
    const {data:lead,error:le}=await this.supabase.from('pipeline_leads').insert({customer_id:campaign.customer_id,title:`Upsell-Chance aus QR-Kampagne: ${campaign.name||campaign.title||'QR Kampagne'}`,source:'qr_campaign',stage:'qualified',value:299,probability:scans>100?70:45,metadata:{qr_campaign_id,scans,conversions}}).select('*').single()
    if(le) throw le
    await this.event({customer_id:campaign.customer_id,event_type:'qr_upsell_lead_created',title:'Upsell-Lead aus QR-Kampagne erstellt',description:`QR-Kampagne hat ${scans} Scans und ${conversions} Conversions.`,source_module:'qr_campaigns',source_id:campaign.id,severity:'success',metadata:{campaign,lead}})
    return {campaign,lead}
  }

  async monthlySnapshot({customer_id,period_start,period_end,create_pdf=false}){
    const metrics=await this.collectMetrics(customer_id), scores=this.calculateScores(metrics)
    const snapshot={customer_id,period_start,period_end,title:`MMOS Monatsreport ${period_start} bis ${period_end}`,revenue:metrics.revenue,appointments:metrics.appointments,invoices:metrics.invoices,qr_scans:metrics.qrScans,qr_conversions:metrics.qrConversions,loyalty_participants:metrics.loyaltyParticipants,loyalty_points_issued:metrics.loyaltyPoints,reviews:metrics.reviews,avg_rating:Math.round(metrics.avgRating*100)/100,leads:metrics.leads,open_tickets:metrics.openTickets,risk_score:scores.risk_score,upsell_score:scores.upsell_score,metadata:{scores,metrics}}
    if(create_pdf){ const pdf=await reportPdf(snapshot); snapshot.pdf_base64=pdf.toString('base64'); snapshot.pdf_url=`data:application/pdf;base64,${snapshot.pdf_base64}` }
    const {data,error}=await this.supabase.from('customer_monthly_report_snapshots').upsert(snapshot,{onConflict:'customer_id,period_start,period_end'}).select('*').single()
    if(error) throw error
    await this.event({customer_id,event_type:'monthly_snapshot_created',title:'Monatsreport-Datenbasis erstellt',description:`Report für ${period_start} bis ${period_end} wurde erzeugt.`,source_module:'reports',source_id:data.id,severity:'info',metadata:{snapshot_id:data.id}})
    return data
  }
}
module.exports={CustomerIntelligenceService,monthRange}
