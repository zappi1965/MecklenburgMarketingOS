
'use client'
import { v20GrowthClient } from '@/lib/v20GrowthClient'
import { v33FunctionalClient } from '@/lib/v33FunctionalClient'
import { packageBillingClient } from '@/lib/packageBillingClient'
import { packageMatrix } from '@/lib/packageConfig'
import { opsClient, openBase64Pdf, openQrWindow } from '@/lib/opsClient'
import { enterpriseClient } from '@/lib/enterpriseClient'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { supabaseAuth, getCurrentUserProfile } from '@/lib/authClient'
import { DEMO_SANDBOX_KEY, markDemoMode, markLiveMode, clearDemoSandbox } from '@/lib/demoSandbox'
import { demoToolsClient, openPdfBase64, openQrCampaign } from '@/lib/demoToolsClient'
import { API_BASE, hasSupabase, supabase } from '@/lib/supabase'
import { startGoogleAuth, syncGoogleProvider, systemReady, systemSchema, integrationStatus, providerToApiKey } from '@/lib/apiReady'
import { apiRequest } from '@/lib/apiRequest'
import { businessToolsClient } from '@/lib/businessToolsClient'
import { customerPortalClient } from '@/lib/customerPortalClient'
import { adminProfilesClient } from '@/lib/adminProfilesClient'
import { safeLocalStorageGet, safeLocalStorageSet, safeLocalStorageText } from '@/lib/safeStorage'

type Role='guest'|'admin'|'customer'
type FileType='invoices'|'contracts'|'media'|'documents'|'reports'

const uid=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2)
const eur=(v:any)=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(v||0))
const slugifyLocal=(v:any,fb='seite')=>String(v||fb).toLowerCase().trim().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||fb
const appOrigin=()=>typeof window!=='undefined'?window.location.origin:''
const publicSlugUrl=(slug:string)=>`${appOrigin()}/l/${slug}`
const invoicePdfUrl=(i:any)=>i?.pdf_url||(i?.pdf_base64?`data:application/pdf;base64,${i.pdf_base64}`:i?.url||'/demo-files/demo-rechnung.pdf')
function openInvoicePdf(i:any){window.open(invoicePdfUrl(i),'_blank')}
async function generateInvoicePdf(store:any, invoice:any){
 try{
  const r=await opsClient.createInvoicePdf(invoice)
  const pdf_url=r.pdf_url||(r.pdf_base64?`data:application/pdf;base64,${r.pdf_base64}`:'/demo-files/demo-rechnung.pdf')
  await store.update('invoices',invoice.id,{pdf_base64:r.pdf_base64,pdf_url,customer_id:invoice.customer_id})
  await store.create('customer_files',{customer_id:invoice.customer_id,name:`${invoice.invoice_number}.pdf`,original_name:`${invoice.invoice_number}.pdf`,file_type:'invoices',mime_type:'application/pdf',size_bytes:Math.round((r.pdf_base64||'').length*0.75),version:1,actor_name:'System',url:pdf_url})
  window.open(pdf_url,'_blank')
 }catch{
  const pdf_url='/demo-files/demo-rechnung.pdf'
  await store.update('invoices',invoice.id,{pdf_url,customer_id:invoice.customer_id})
  await store.create('customer_files',{customer_id:invoice.customer_id,name:`${invoice.invoice_number}.pdf`,original_name:`${invoice.invoice_number}.pdf`,file_type:'invoices',mime_type:'application/pdf',size_bytes:142000,version:1,actor_name:'Demo PDF',url:pdf_url})
 window.open(pdf_url,'_blank')
 }
}
async function deleteInvoiceAndPdf(store:any, invoice:any){
 await store.remove('invoices',invoice.id)
 const files=(store.data.customer_files||[]).filter((f:any)=>f.customer_id===invoice.customer_id&&f.file_type==='invoices'&&String(f.name||'').includes(String(invoice.invoice_number||'')))
 for(const f of files) await store.remove('customer_files',f.id)
}

function v424ExternalQrUrls(value:string){
 const encoded=encodeURIComponent(value)
 return [
  `https://api.qrserver.com/v1/create-qr-code/?size=520x520&margin=20&data=${encoded}`,
  `https://quickchart.io/qr?size=520&margin=2&text=${encoded}`
 ]
}
function V424QrImage({value}:{value:string}){
 const urls=v424ExternalQrUrls(value)
 const [idx,setIdx]=useState(0)
 return <img className="qrSmall" src={urls[idx]} alt="QR Code" onError={()=>setIdx(Math.min(idx+1,urls.length-1))}/>
}


class V40ErrorBoundary extends React.Component<any,{hasError:boolean,error:any}>{
 constructor(props:any){super(props);this.state={hasError:false,error:null}}
 static getDerivedStateFromError(error:any){return {hasError:true,error}}
 componentDidCatch(error:any,info:any){console.error('[V40 Module Error]',this.props.moduleName,error,info)}
 render(){
  if(this.state.hasError){
   return <Card title={`Modulfehler: ${this.props.moduleName||'Tool'}`}><div className="v40ErrorBox"><b>Dieses Modul konnte nicht geladen werden.</b><span>{String(this.state.error?.message||this.state.error||'Unbekannter Fehler')}</span><div className="toolbarActions"><button className="btn secondary" onClick={()=>this.setState({hasError:false,error:null})}>Erneut versuchen</button><button className="btn secondary" onClick={()=>location.reload()}>Seite neu laden</button></div></div></Card>
  }
  return this.props.children
 }
}

function V40AsyncButton({children,onClick,className='btn secondary'}:any){
 const [busy,setBusy]=useState(false)
 async function run(){
  if(busy)return
  setBusy(true)
  try{await onClick?.()}finally{setBusy(false)}
 }
 return <button className={className} disabled={busy} onClick={run}>{busy?'Lädt...':children}</button>
}


const ids={barber:'11111111-1111-1111-1111-111111111111',roof:'22222222-2222-2222-2222-222222222222',restaurant:'33333333-3333-3333-3333-333333333333'}
const dids={restaurant:'aaaaaaaa-3333-3333-3333-333333333333',barber:'aaaaaaaa-1111-1111-1111-111111111111',roof:'aaaaaaaa-2222-2222-2222-222222222222'}

const adminProfiles=[
  {name:'DominiqueMM', email:'dominique@mm.local', role:'admin', avatar:''},
  {name:'JanneMM', email:'janne@mm.local', role:'admin', avatar:''}
]

const featureDescriptions:any={
  CRM:'Kundendaten, Kontaktinformationen, Kundenstatus und zentrale Kundenakte.',
  Tickets:'Kundenanfragen aufnehmen, beantworten, abschließen und archivieren.',
  Rechnungen:'Rechnungen erstellen, anzeigen, Status ändern und im Kundenportal spiegeln.',
  'Media Center':'PDFs, Verträge, Rechnungen, Bilder und Dokumente kundengenau verwalten.',
  SEO:'SEO-Wachstum, Sichtbarkeit und lokale Performance im Kundenbereich anzeigen.',
  'SEO Analytics':'Klicks, Impressionen, Sichtbarkeit, Leads und lokale SEO-Werte im Kundenbereich.',
  'SEO Heatmap':'Lokale Suchradius-Heatmap und Karten-Sichtbarkeit für Growth/Premium-Kunden.',
  Booking:'Termine, Tagesansichten, Termintexte und Kundenbuchungen verwalten.',
  Pipeline:'Angebote, Verkaufschancen, Paketpreise und Abschlusswahrscheinlichkeit verwalten.',
  Integrationen:'Google Business, Analytics, Search Console oder Meta Keys hinterlegen.',
  Reports:'Monatsberichte und Report-Vorlagen vorbereiten.',
  Automationen:'Automatisierte Abläufe wie Ticket-, Rechnungs- oder Review-Erinnerungen.',
  Workflows:'Vordefinierte Prozesse starten, verfolgen und dokumentieren.',
  Rechte:'Toolzugriffe und Paketfreigaben gezielt steuern.',
  'Review Funnel':'Bewertungsprozesse und Kundenfeedback strukturiert auslösen.',
  'Alles aus Starter-Paket':'Enthält CRM, Tickets, Rechnungen und Media Center.',
  'Alles aus Growth-Paket':'Enthält alle Starter- und Growth-Funktionen.'
}
Object.assign(featureDescriptions, {
  'QR Kampagnen':'QR-Kampagnen mit Slug, Landingpage, Scans, Conversions und Loyalty-Verknüpfung.',
  'Öffentliche /l/[slug] Seite':'Schöne öffentliche Endkundenseite für QR, Review und Loyalty.',
  'Loyalty Programm':'Punkteprogramm über QR-Code mit nachträglicher Kampagnenverknüpfung.',
  'Rewards':'Einlösbare Prämien, Rabatte, Produkte und VIP-Rewards.',
  'Reward Regeln':'Konfiguration von Reward-Typen, Punktebedarf und Bedingungen.',
  'Mitarbeiter-Bestätigungscode':'Mitarbeiter bestätigen Reward-Einlösungen per Code.',
  'Loyalty Segmente':'VIP, inaktiv, reward-ready und review-aktive Endkunden.',
  'Smart Loyalty V2':'VIP-Level, Multiplikatoren, Punkte-Regeln und Smart Actions.',
  'Reviews':'Bewertungen und Feedback-Funnel.',
  'Reviews zusammengeführt':'Review Inbox, KI-Auswertung und Antwortvorlagen in einem Tab.',
  'Smart Automation':'Regelbasierte Automationen aus QR, Loyalty, Reviews und Health.',
  'Marketing Automation':'Reaktivierung, Review Booster, Loyalty-Boost und Kampagnen.',
  'AI Business Assistant':'Hinweise, Chancen, Risiken und Handlungsempfehlungen.',
  'Customer Health':'Health Score, Risiken, Chancen und Warnungen.',
  'Customer Intelligence':'Risk Score, Upsell Score, Paketnutzung und Empfehlungen.',
  'Dynamic Billing':'Usage-basierte Zusatzabrechnung aus QR, AI, Reviews und Automation.',
  'Revenue Forecasting':'MRR, Pipeline, Forecast, Churn Risk und Umsatztreiber.',
  'Revenue Share':'Umsatzbeteiligungslogik und Stripe-Connect-Vorbereitung.',
  'Package Recommendations':'Upgrade-, Add-on- und Risikoempfehlungen aus Nutzungsdaten.',
  'Paket-Matrix':'Paketlogik, Tool-Zugriffe und Feature-Matrix.',
  'Timeline Events':'Chronologische Verknüpfung aus QR, Loyalty, Reviews, Billing und Tickets.',
  'SEO Dashboard':'Gebündelte SEO-Übersicht mit Analytics, Search Console, lokalen Werten und Heatmap.',
  'Workflow Center':'Kunden-Workflows, erfüllte Aufgaben und Systemläufe transparent anzeigen.',
  'KPI Analytics':'Leads, Conversion, Ticketlast, Umsatz und operative Kennzahlen für Kunden sichtbar machen.',
  'Onboarding':'Geführter Start mit Google Business, Logo, Farben, QR, Rechnungen und ersten Aufgaben.',
  'Reports':'Monatsberichte, PDF-Entwürfe und sichtbare Ergebnisse für Kunden.',
  'Freigaben':'Kunden können Beiträge, Texte, Angebote, Reports und Kampagnen freigeben oder Änderungen wünschen.',
  'Output Engine':'Einheitliche Mecklenburg-Marketing-Dokumente für Audit, Angebot, Vertrag, Mahnung und Report.'
})

const packageDefs:any={
  Starter:{
    price:199,
    base:null,
    displayFeatures:['CRM','Tickets','Rechnungen','Booking','Media Center','Wissenscenter','Onboarding','Reports'],
    tools:['Dashboard','Rechnungen','Tickets','Booking','Media Center','Pakete & Billing','Wissenscenter','Onboarding','Reports','Freigaben','Onboarding','Reports','Freigaben']
  },
  Growth:{
    price:499,
    base:'Starter',
    displayFeatures:['Alles aus Starter-Paket','Integrationen','SEO Dashboard','SEO Analytics','SEO Heatmap','Workflow Center','KPI Analytics','Wettbewerber Vergleich'],
    tools:[
      'Dashboard','Rechnungen','Tickets','Booking','Media Center','Pakete & Billing','Wissenscenter','Onboarding','Reports','Freigaben',
      'Integrationen','SEO Dashboard','SEO Analytics','SEO Heatmap','Workflow Center','KPI Analytics','Wettbewerber Vergleich',
      'QR Kampagnen','Öffentliche /l/[slug] Seite','Loyalty Programm','Rewards','Reviews'
    ]
  },
  Premium:{
    price:899,
    base:'Growth',
    displayFeatures:['Alles aus Growth-Paket','Integrationen','SEO Dashboard','SEO Analytics','SEO Heatmap','Workflow Center','KPI Analytics','Wettbewerber Vergleich','Smart Loyalty V2','Automation','AI','Revenue'],
    tools:[
      'Dashboard','Rechnungen','Tickets','Booking','Media Center','Pakete & Billing','Wissenscenter','Onboarding','Reports','Freigaben',
      'Integrationen','SEO Dashboard','SEO Analytics','SEO Heatmap','Workflow Center','KPI Analytics','Wettbewerber Vergleich',
      'QR Kampagnen','Öffentliche /l/[slug] Seite','Loyalty Programm','Rewards','Reward Regeln',
      'Mitarbeiter-Bestätigungscode','Loyalty Segmente','Smart Loyalty V2',
      'Reviews',
      'Smart Automation','Marketing Automation','AI Business Assistant',
      'Customer Health','Customer Intelligence',
      'Dynamic Billing','Revenue Forecasting','Revenue Share','Package Recommendations',
      'Paket-Matrix','Pipeline','Timeline Events'
    ]
  }

}

const defaultMainLandingSettings:any={
 id:'main',
 scope:'public_home',
 brand_name:'Mecklenburg Marketing',
 nav_title:'Mecklenburg Marketing',
 logo_url:'',
 logo_alt:'Mecklenburg Marketing Logo',
 logo_mark_text:'M',
 logo_show_text:true,
 hero_title:'Mehr Sichtbarkeit. Mehr Bewertungen. Mehr Kunden.',
 hero_subline:'Das lokale Marketing-Betriebssystem für Unternehmen in Mecklenburg-Vorpommern: Google Business Optimierung, Bewertungen, SEO, QR-Kampagnen, Reports und Kundenportal sauber verbunden.',
 primary_cta_label:'Anmelden',
 secondary_cta_label:'Demo',
 show_public_demo_button:true,
 package_headline:'Pakete für lokale Unternehmen',
 package_subline:'Transparente Pakete für lokale Betriebe – vom Kundenportal bis zur laufenden Google Business Optimierung mit Reports.',
 footer_note:'Mecklenburg Marketing · Google Business Optimierung · lokale SEO · Reviews · QR-Kampagnen · Kundenportal.',
 steps:[
  {title:'Audit & Potenziale erkennen',description:'Google Business, Reviews, SEO und Wettbewerber werden geprüft und in klare Chancen übersetzt.'},
  {title:'Maßnahmen und Kampagnen starten',description:'QR-Kampagnen, Reviews, SEO-Aufgaben und Kundenbindung werden aus dem Audit abgeleitet.'},
  {title:'Monatlich Ergebnisse zeigen',description:'Reports, Empfehlungen und nächste Schritte machen die Arbeit für Kunden nachvollziehbar.'}
 ],
 faq:[
  {question:'Brauche ich eine Website?',answer:'Nein. QR-/Slug-Seiten und Google Business Optimierung funktionieren auch ohne eigene Website.'},
  {question:'Was sieht der Kunde?',answer:'Ein einfaches Portal mit Aufgaben, Kennzahlen, Reports, Freigaben und Dateien.'},
  {question:'Wofür ist Google Business Optimierung wichtig?',answer:'Für lokale Sichtbarkeit, mehr Vertrauen, bessere Bewertungen und mehr Kontaktanfragen über Google.'}
 ],
 example_metrics:[
  {label:'neue Bewertungen',value:'+34'},
  {label:'Profilaufrufe',value:'+22%'},
  {label:'Klicks',value:'+18%'}
 ],
 packages:{
  Starter:{headline:'Starter',description:'Solider Einstieg für Termine, Rechnungen, Tickets und Dateien.'},
  Growth:{headline:'Growth',description:'Für aktive Kundengewinnung mit SEO Dashboard, Integrationen, Heatmap und Workflows.'},
  Premium:{headline:'Premium',description:'Für volle Automatisierung, Smart Loyalty, AI, Revenue und KPI-Steuerung.'}
 }
}
function mainLandingSettings(d:any){
 const saved=((d.landing_page_settings||[]).find((x:any)=>x.id==='main'||x.scope==='public_home')||{})
 const merged={...defaultMainLandingSettings,...saved,packages:{...defaultMainLandingSettings.packages,...(saved.packages||{})}}
 merged.steps=Array.isArray(saved.steps)&&saved.steps.length?saved.steps:defaultMainLandingSettings.steps
 merged.faq=Array.isArray(saved.faq)&&saved.faq.length?saved.faq:defaultMainLandingSettings.faq
 merged.example_metrics=Array.isArray(saved.example_metrics)&&saved.example_metrics.length?saved.example_metrics:defaultMainLandingSettings.example_metrics
 return merged
}

const automationLabels=['Rechnung überfällig','Neues Ticket erstellt','SEO Rückgang erkannt','Paket angefragt','Monatsreport fällig','Review Funnel auslösen']

const seed:any={
 customers:[
  {id:ids.barber,name:'Barber Lounge Rostock',branch:'Friseur',email:'kontakt@barber.de',phone:'0381 123456',address:'Kröpeliner Str. 12',city:'Rostock',package_name:'Growth',contact_person:'Marten Schulz',is_demo:false},
  {id:ids.roof,name:'NordDach GmbH',branch:'Dachdecker',email:'kontakt@norddach.de',phone:'0385 987654',address:'Wismarsche Str. 88',city:'Schwerin',package_name:'Premium',contact_person:'Nadine Krüger',is_demo:false},
  {id:ids.restaurant,name:'Alexas Inselblick',branch:'Restaurant',email:'kontakt@alexas.de',phone:'03991 123456',address:'Am See 4',city:'Waren',package_name:'Starter',contact_person:'Alexa Peters',is_demo:false}
 ],
 demo_customers:[
  {id:dids.restaurant,name:'DEMO Alexas Inselblick',branch:'Restaurant',package_name:'Starter',is_demo:true},
  {id:dids.barber,name:'DEMO Barber Lounge Rostock',branch:'Friseur',package_name:'Growth',is_demo:true},
  {id:dids.roof,name:'DEMO NordDach GmbH',branch:'Dachdecker',package_name:'Premium',is_demo:true}
 ],
 customer_subscriptions:[
  {id:'sub1',customer_id:ids.barber,package_name:'Growth',status:'active',price_monthly:499},
  {id:'sub2',customer_id:ids.roof,package_name:'Premium',status:'active',price_monthly:899},
  {id:'sub3',customer_id:ids.restaurant,package_name:'Starter',status:'active',price_monthly:199},
  {id:'sub4',customer_id:dids.restaurant,package_name:'Starter',status:'active',price_monthly:199},
  {id:'sub5',customer_id:dids.barber,package_name:'Growth',status:'active',price_monthly:499},
  {id:'sub6',customer_id:dids.roof,package_name:'Premium',status:'active',price_monthly:899}
 ],
 customer_tool_access:[],
 package_requests:[{id:'pr1',customer_id:ids.restaurant,package_name:'Growth',status:'Angefragt',created_at:'2026-05-10'}],
 invoices:[
  {id:'i1',customer_id:ids.barber,invoice_number:'Re_Barber_Lounge_Rostock_1',service_type:'Growth Paketgebühr',amount:499,status:'Bezahlt',created_at:'2026-05-01',is_demo:false},
  {id:'i2',customer_id:ids.barber,invoice_number:'Re_Barber_Lounge_Rostock_2',service_type:'Google Business',amount:249,status:'Offen',created_at:'2026-05-10',is_demo:false},
  {id:'i3',customer_id:ids.roof,invoice_number:'Re_NordDach_GmbH_1',service_type:'Premium Paketgebühr',amount:899,status:'Offen',created_at:'2026-05-03',is_demo:false},
  {id:'di1',customer_id:dids.barber,invoice_number:'Re_DEMO_Barber_Lounge_Rostock_1',service_type:'Demo Rechnung',amount:499,status:'Bezahlt',created_at:'2026-05-01',is_demo:true}
 ],
 tickets:[
  {id:'t1',customer_id:ids.barber,title:'Neue Bewertungsaktion',description:'Bitte QR Karten vorbereiten.',status:'Offen',priority:'Mittel',created_at:'2026-05-09'},
  {id:'t2',customer_id:ids.roof,title:'Leadformular prüfen',description:'Formular wurde geprüft.',status:'Geschlossen',priority:'Hoch',created_at:'2026-05-04',closed_at:'2026-05-06'}
 ],
 ticket_messages:[{id:'tm1',ticket_id:'t2',customer_id:ids.roof,sender_role:'DominiqueMM',message:'Leadformular wurde angepasst und ist wieder aktiv.',created_at:'2026-05-06'}],
 appointments:[{id:'a1',customer_id:ids.barber,client_name:'Strategie Call',appointment_date:'2026-05-15',start_time:'10:00',end_time:'11:00',status:'Geplant',notes:'Quartalsplanung besprechen.'}],
 customer_service_categories:[{id:'cat1',customer_id:ids.barber,name:'Haarschnitt Herren',price:29,description:'Standard Haarschnitt'},{id:'cat2',customer_id:ids.barber,name:'Bartpflege',price:19,description:'Bart trimmen'}],
 customer_clients:[{id:'cc1',customer_id:ids.barber,name:'Max Mustermann',phone:'0176 123456'}],
 offers:[{id:'o1',customer_id:ids.barber,title:'Premium Upgrade',package_name:'Premium',amount:899,status:'Angebot',probability:60}],
 automations:[{id:'au1',name:'Rechnung überfällig → Notification',trigger_type:'Rechnung überfällig',action_type:'Benachrichtigung',enabled:true}],
 workflow_runs:[{id:'wr1',customer_id:ids.barber,workflow_name:'Monatsreport fällig',status:'completed',created_at:'2026-05-01'}],
 activity_logs:[{id:'al1',customer_id:ids.barber,actor_name:'DominiqueMM',action:'invoice_created',message:'Rechnung erstellt',created_at:'2026-05-01'}],
 customer_notes:[{id:'n1',customer_id:ids.barber,actor_name:'DominiqueMM',note:'Kunde möchte Paket im Juni prüfen.',created_at:'2026-05-08'}],
 integrations:[{id:'int1',customer_id:ids.barber,name:'Google Business Profile',api_key:'demo-key',status:'Verbunden'}],
 seo_snapshots:[{id:'s1',customer_id:ids.barber,organic_traffic:3100,created_at:'2026-05-06'},{id:'s2',customer_id:ids.barber,organic_traffic:3200,created_at:'2026-05-13'}],
 customer_files:[
  {id:'f1',customer_id:ids.barber,name:'Re_Barber_Lounge_Rostock_1.pdf',file_type:'invoices',mime_type:'application/pdf',size_bytes:142000,version:1,actor_name:'DominiqueMM',created_at:'2026-05-01',url:'/demo-files/demo-rechnung.pdf'},
  {id:'f2',customer_id:ids.barber,name:'Growth_Vertrag.pdf',file_type:'contracts',mime_type:'application/pdf',size_bytes:98000,version:1,actor_name:'DominiqueMM',created_at:'2026-05-02',url:'/demo-files/demo-vertrag.pdf'}
 ],
 qr_campaigns:[],
 notifications:[
  {id:'not1',customer_id:ids.restaurant,title:'Paketanfrage',message:'Alexas Inselblick hat Growth angefragt.',type:'package_request',actor_name:'Alexas Inselblick',created_at:'2026-05-10',is_read:false}
 ],
 knowledge_articles:[
  {id:'ka1',title:'Wie sammle ich mehr Google Bewertungen?',category:'Google Business',summary:'Aktiv nach dem Besuch fragen, QR-Code sichtbar platzieren und jede Bewertung beantworten.',content:'Nutze den Bewertungs-Booster, lege den QR-Code an Tresen oder Rechnung und bitte zufriedene Kunden direkt um Feedback.',package_scope:'Starter',created_at:'2026-05-01'},
  {id:'ka2',title:'Was bedeutet lokale Sichtbarkeit?',category:'SEO',summary:'Lokale Sichtbarkeit beschreibt, wie häufig dein Betrieb bei relevanten Suchanfragen erscheint.',content:'Sichtbarkeit steigt durch vollständige Google Business Daten, aktuelle Fotos, Leistungen, gute Bewertungen und regelmäßige Beiträge.',package_scope:'Growth',created_at:'2026-05-02'}
 ],
 competitor_benchmarks:[
  {id:'cb1',customer_id:ids.barber,name:'Barber Rostock Zentrum',rating:4.6,reviews:182,visibility:76,profile_score:82,keywords:['barber rostock','herrenschnitt rostock'],notes:'Starke Bewertungsanzahl, aber wenig Beiträge.',created_at:'2026-05-03'},
  {id:'cb2',customer_id:ids.barber,name:'Herrenfriseur Altstadt',rating:4.4,reviews:94,visibility:62,profile_score:71,keywords:['friseur herren rostock'],notes:'Gute Kategorie, wenig Fotos.',created_at:'2026-05-03'}
 ],
 google_business_audits:[
  {id:'gba1',customer_id:ids.barber,business_name:'Barber Lounge Rostock',city:'Rostock',score:78,status:'Geprüft',summary:'Profil solide, aber mehr Fotos, Leistungen und Beiträge empfohlen.',findings:['Bewertungen regelmäßig beantworten','Leistungen präziser beschreiben','Neue Fotos alle 2 Wochen hochladen'],created_at:'2026-05-12'}
 ],
 mini_audits:[
  {id:'ma1',customer_id:ids.barber,audit_id:'gba1',title:'Mini-Audit Barber Lounge Rostock',status:'Erstellt',recommendations:['Google Business Leistungen ergänzen','Bewertungskampagne starten','Monatlichen Beitrag veröffentlichen'],created_at:'2026-05-12'}
 ],
 prospect_leads:[
  {id:'pl1',name:'L.A. Nails Schwerin',branch:'Beauty',city:'Schwerin',rating:4.2,reviews:48,website:'',score:84,status:'Neu',reasons:['wenige Bewertungen','keine Website erkannt','Google Profil ausbaufähig'],created_at:'2026-05-13'},
  {id:'pl2',name:'Wunderwerk Medical Beauty',branch:'Beauty',city:'Schwerin',rating:4.7,reviews:33,website:'https://example.de',score:71,status:'Neu',reasons:['wenige Fotos','wenige Beiträge','SEO-Potenzial'],created_at:'2026-05-13'}
 ],
 generated_offers:[
  {id:'go1',customer_id:ids.barber,title:'Angebot Growth Paket + Google Business Optimierung',package_name:'Growth',amount:499,status:'Entwurf',created_at:'2026-05-11'}
 ],
 generated_contracts:[
  {id:'gc1',customer_id:ids.barber,title:'Dienstleistungsvertrag Growth Paket',package_name:'Growth',status:'Entwurf',created_at:'2026-05-11'}
 ],
 dunning_cases:[
  {id:'dc1',invoice_id:'i2',customer_id:ids.barber,level:1,status:'Vorbereitet',due_date:'2026-05-24',message:'Zahlungserinnerung für offene Rechnung vorbereitet.',created_at:'2026-05-15'}
 ],
 acquisition_campaigns:[
  {id:'acq1',name:'Beauty-Schwerin Review & GBP Sprint',branch:'Beauty',city:'Schwerin',goal:'10 qualifizierte Betriebe ansprechen und 3 Mini-Audits versenden',channel:'E-Mail + Telefon',status:'Aktiv',stage:'Mini-Audit versendet',lead_ids:['pl1','pl2'],customer_ids:[],next_step:'Follow-up bei L.A. Nails und Wunderwerk vorbereiten',follow_up_at:'2026-05-22',notes:'Fokus auf Google Business Optimierung, Reviews und lokale Sichtbarkeit.',created_at:'2026-05-17'}
 ],
 customer_health_scores:[
  {id:'chs1',customer_id:ids.barber,score:82,status:'Grün',reasons:['Paket aktiv','Bewertungen stabil','keine kritischen Tickets'],created_at:'2026-05-15'},
  {id:'chs2',customer_id:ids.roof,score:63,status:'Gelb',reasons:['offene Rechnung','wenige neue Aktivitäten'],created_at:'2026-05-15'}
 ],
 onboarding_checklists:[
  {id:'onb1',customer_id:ids.barber,status:'In Arbeit',steps:{company:true,google:false,brand:true,qr:true,invoice:false,first_tasks:false},created_at:'2026-05-18'}
 ],
 monthly_reports:[
  {id:'mr1',customer_id:ids.barber,title:'Monatsreport Mai 2026',status:'Entwurf',summary:'Sichtbarkeit stabil, QR-Kampagne aktiv, Bewertungsaufbau empfohlen.',created_at:'2026-05-18'}
 ],
 approval_requests:[
  {id:'ap1',customer_id:ids.barber,title:'Google Beitrag Mai freigeben',type:'Google Beitrag',status:'Offen',description:'Kurzbeitrag zur Sommeraktion prüfen und freigeben.',created_at:'2026-05-18'}
 ],
 output_documents:[],
 customer_registrations:[],
 customer_invites:[],
 customer_users:[],
 landing_page_settings:[defaultMainLandingSettings]
}

function useStore(){
 const [data,setData]=useState<any>(seed)
 const [toast,setToast]=useState('')
 const tables=['customers','customer_subscriptions','customer_tool_access','package_requests','invoices','tickets','ticket_messages','appointments','customer_clients','offers','automations','workflow_runs','activity_logs','customer_notes','integrations','seo_snapshots','customer_files','notifications','customer_service_categories','customer_seo_metrics','review_funnel_stats','client_success_events','qr_campaigns','review_feedback','knowledge_articles','competitor_benchmarks','google_business_audits','mini_audits','prospect_leads','generated_offers','generated_contracts','dunning_cases','customer_health_scores','acquisition_campaigns','onboarding_checklists','monthly_reports','approval_requests','output_documents','customer_registrations','customer_invites','customer_users','landing_page_settings','public_landing_pages','loyalty_rewards','loyalty_reward_rules','staff_codes']
 function notify(m:string){setToast(m);setTimeout(()=>setToast(''),3200)}
 useEffect(()=>{
  function onGlobalToast(e:any){notify(String(e?.detail||''))}
  if(typeof window!=='undefined') window.addEventListener('mmos:toast',onGlobalToast as any)
  return ()=>{ if(typeof window!=='undefined') window.removeEventListener('mmos:toast',onGlobalToast as any) }
 },[])
 async function load(){
  if(!hasSupabase||!supabase)return
  const r:any={}
  for(const t of tables){const {data}=await supabase.from(t).select('*');r[t]=data||[]}
  setData((p:any)=>({...p,...r}))
 }
 useEffect(()=>{load()},[])
 function addActivity(action:string,table:string,refId:string,extra:any={}){
  if(table==='activity_logs')return
  const log={id:uid(),type:action,title:`${table}: ${action}`,ref_table:table,ref_id:refId,severity:action==='delete'?'warning':'success',metadata:extra,created_at:new Date().toISOString()}
  setData((p:any)=>({...p,activity_logs:[log,...(p.activity_logs||[])]}))
  try{if(hasSupabase&&supabase){void Promise.resolve(supabase.from('activity_logs').insert(log)).then(()=>undefined,()=>undefined)}}catch{}
 }
 async function create(table:string,row:any){
  const payload={id:row.id||uid(),...row,created_at:row.created_at||new Date().toISOString()}
  try{
   if(hasSupabase&&supabase){const {error}=await supabase.from(table).insert(payload);if(error)throw error;await load()}
   else setData((p:any)=>({...p,[table]:[payload,...(p[table]||[])]}))
   addActivity('create',table,payload.id,{live:hasSupabase})
   notify('Gespeichert')
  }catch(e:any){
   console.warn(`[MMOS] ${table} remote create failed, using local fallback`,e)
   setData((p:any)=>({...p,[table]:[payload,...(p[table]||[])]}))
   addActivity('create_local_fallback',table,payload.id,{error:e?.message})
   notify('Lokal gespeichert')
  }
  return payload
 }
 async function update(table:string,id:string,row:any){
  const normalized={...row,updated_at:row.updated_at||new Date().toISOString()}
  try{
   if(hasSupabase&&supabase){const {error}=await supabase.from(table).update(normalized).eq('id',id);if(error)throw error;await load()}
   else setData((p:any)=>({...p,[table]:(p[table]||[]).map((x:any)=>x.id===id?{...x,...normalized}:x)}))
   addActivity('update',table,id,{patch:Object.keys(row||{}),live:hasSupabase})
   notify('Aktualisiert')
  }catch(e:any){
   console.warn(`[MMOS] ${table} remote update failed, using local fallback`,e)
   setData((p:any)=>({...p,[table]:(p[table]||[]).map((x:any)=>x.id===id?{...x,...normalized}:x)}))
   addActivity('update_local_fallback',table,id,{error:e?.message})
   notify('Lokal aktualisiert')
  }
  return {id,...normalized}
 }
 async function remove(table:string,id:string){
  try{
   if(hasSupabase&&supabase){const {error}=await supabase.from(table).delete().eq('id',id);if(error)throw error;await load()}
   else setData((p:any)=>({...p,[table]:(p[table]||[]).filter((x:any)=>x.id!==id)}))
   addActivity('delete',table,id,{live:hasSupabase})
   notify('Gelöscht')
  }catch(e:any){
   console.warn(`[MMOS] ${table} remote delete failed, using local fallback`,e)
   setData((p:any)=>({...p,[table]:(p[table]||[]).filter((x:any)=>x.id!==id)}))
   addActivity('delete_local_fallback',table,id,{error:e?.message})
   notify('Lokal gelöscht')
  }
  return true
 }
 return {data,setData,create,update,remove,load,toast,notify}
}

function allCustomers(d:any){return [...(d.customers||[]),...(d.demo_customers||[])]}
function cname(d:any,id:string){return allCustomers(d).find((c:any)=>c.id===id)?.name||'Kunde'}
function cobj(d:any,id:string){return allCustomers(d).find((c:any)=>c.id===id)}
function isDemoCustomer(d:any,id:string){return Boolean(cobj(d,id)?.is_demo)||String(cname(d,id)).startsWith('DEMO ')}
function cpkg(d:any,id:string){return d.customer_subscriptions.find((s:any)=>s.customer_id===id)?.package_name||cobj(d,id)?.package_name||'Starter'}
function pprice(p:string){return packageDefs[p]?.price||199}
function invName(d:any,cid:string){const n=cname(d,cid).replace(/\s+/g,'_').replace(/[^\w_äöüÄÖÜß-]/g,'');return `Re_${n}_${d.invoices.filter((i:any)=>i.customer_id===cid).length+1}`}
function InfoI({text}:any){return <span className="infoi" data-tooltip={text||'Weitere Informationen'} tabIndex={0}>i</span>}
function FeatureList({pkg}:any){const def=packageDefs[pkg]||packageDefs.Starter;return <div className="featureList">{def.displayFeatures.map((t:string)=><div className="featureItem" key={t}><span>{t} <InfoI text={featureDescriptions[t]}/></span></div>)}</div>}
function appToast(message:string){
 if(typeof window!=='undefined') window.dispatchEvent(new CustomEvent('mmos:toast',{detail:String(message||'')}))
}
function Toast({m}:any){return m?<div className="toast green" role="status" aria-live="polite">{m}</div>:null}
function Badge({children,type='purple'}:any){return <span className={`badge ${type}`}>{children}</span>}
function Card({title,children,action}:any){return <section className="card"><div className="row between"><h2>{title}</h2>{action}</div>{children}</section>}
function Head({title,sub,action}:any){return <div className="head"><div><h1>{title}</h1>{sub&&<div className="sub">{sub}</div>}</div>{action}</div>}
function Metric({label,value,sub}:any){return <div className="metric"><div className="metricLabel">{label}</div><div className="metricValue">{value}</div>{sub&&<div className="delta">{sub}</div>}</div>}
function Search({items,value,onChange,placeholder}:any){const [q,setQ]=useState('');const s=items.find((x:any)=>x.id===value);const list=items.filter((x:any)=>(x.name+x.branch+x.email).toLowerCase().includes(q.toLowerCase()));return <div style={{position:'relative'}}><input className="input" placeholder={placeholder} value={s&&!q?s.name:q} onChange={e=>{setQ(e.target.value);if(s)onChange('')}}/>{q&&<div className="card floating">{list.map((x:any)=><button className="nav" key={x.id} onClick={()=>{onChange(x.id);setQ('')}}>{x.name}<div className="sub">{x.branch} · {x.package_name}</div></button>)}</div>}</div>}

function CentralCustomerSelector({store,cid,setCid,title='Kunde auswählen',sub='Dieses Modul arbeitet mit den Daten des ausgewählten Kunden.'}:any){
 if(!setCid)return <Card title={title}><div className="sub">Aktiver Kunde: {cname(store.data,cid)}</div></Card>
 return <Card title={title}><Search items={allCustomers(store.data)} value={cid} onChange={setCid} placeholder="Kunde für dieses Modul suchen"/><div className="sub">{sub} Aktuell: <b>{cname(store.data,cid)}</b></div></Card>
}
function rewardPointsValue(r:any){return Number(r.points_required ?? r.required_points ?? r.points ?? 0)}
function campaignOptionsForCustomer(store:any,cid:string){return (store.data.qr_campaigns||[]).filter((q:any)=>q.customer_id===cid)}


// V42.20 Professional UX & Output helpers
function EmptyState({icon='✨',title,children,action}:any){return <div className="proEmpty"><div className="proEmptyIcon">{icon}</div><h2>{title}</h2><p>{children}</p>{action}</div>}
function TrustHint({source='System',updated}:any){return <div className="trustHint"><span>Quelle: {source}</span><span>Zuletzt aktualisiert: {updated?new Date(updated).toLocaleString('de-DE'):'Demo/Fallback'}</span></div>}
function LiveModeBadge(){return <Badge type={hasSupabase?'green':'yellow'}>{hasSupabase?'Live-Daten':'Lokaler Fallback'}</Badge>}
function ToolTipHint({title,children}:any){return <div className="hintBox"><b>{title}</b><p>{children}</p></div>}
function getDocumentCss(){return `<style>body{font-family:Inter,Arial,sans-serif;background:#f5f7fb;color:#111827;margin:0}.doc{max-width:860px;margin:0 auto;background:#fff;min-height:100vh;padding:42px}.top{display:flex;justify-content:space-between;border-bottom:2px solid #111827;padding-bottom:18px;margin-bottom:28px}.mark{width:46px;height:46px;border-radius:14px;background:#111827;color:#fff;display:grid;place-items:center;font-weight:900}.brand{display:flex;gap:12px;align-items:center}.badge{display:inline-block;border:1px solid #d4af37;color:#7c5c00;border-radius:999px;padding:6px 12px;font-size:12px}.metric{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:20px 0}.metric div{border:1px solid #e5e7eb;border-radius:12px;padding:12px}.section{margin:24px 0}.section h2{font-size:18px}.footer{margin-top:38px;border-top:1px solid #e5e7eb;padding-top:16px;color:#6b7280;font-size:12px}@media print{body{background:#fff}.doc{box-shadow:none}}</style>`}
function buildBrandDocument(title:string, subtitle:string, body:string, meta:any={}){return `<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title>${getDocumentCss()}</head><body><main class="doc"><div class="top"><div class="brand"><div class="mark">M</div><div><b>Mecklenburg Marketing</b><div>Google Business · lokale SEO · Reviews · Kampagnen</div></div></div><span class="badge">${meta.status||'Entwurf'}</span></div><h1>${title}</h1><p>${subtitle||''}</p>${body}<div class="footer">Erstellt mit Mecklenburg Marketing OS · ${new Date().toLocaleDateString('de-DE')} · Dieses Dokument ist ein professioneller Entwurf und kann vor Versand final geprüft werden.</div></main></body></html>`}
function openBrandDocument(title:string, subtitle:string, body:string, meta:any={}){const w=window.open('','_blank');if(!w)return;w.document.write(buildBrandDocument(title,subtitle,body,meta));w.document.close();setTimeout(()=>w.focus(),150)}

async function openPdfDocument(title:string, subtitle:string, body:string, meta:any={}){
 const html=buildBrandDocument(title,subtitle,body,meta)
 try{
  const blob=await businessToolsClient.renderPdf({html,filename:title,title})
  const url=URL.createObjectURL(blob)
  window.open(url,'_blank')
  setTimeout(()=>URL.revokeObjectURL(url),60000)
 }catch(e:any){
  appToast(`PDF-Erzeugung über Gotenberg nicht möglich: ${e.message || e}. HTML/Print-Fallback wird geöffnet.`)
  openBrandDocument(title,subtitle,body,meta)
 }
}

function downloadHtmlDocument(filename:string,title:string,subtitle:string,body:string,meta:any={}){const blob=new Blob([buildBrandDocument(title,subtitle,body,meta)],{type:'text/html'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename.replace(/[^a-z0-9äöüß_.-]+/gi,'_');a.click();URL.revokeObjectURL(url)}
function packageProgress(pct:number){return <div className="progressTrack"><span style={{width:`${Math.max(0,Math.min(100,pct))}%`}}/></div>}
function onboardingStepsFor(customer:any){return [
 ['company','Firmendaten prüfen',Boolean(customer?.name&&customer?.phone)],
 ['google','Google Business Link hinterlegen',Boolean(customer?.google_url||customer?.google_business_url)],
 ['brand','Logo/Farben hochladen',Boolean(customer?.logo_url||customer?.brand_primary)],
 ['qr','QR-/Slug-Seite vorbereiten',true],
 ['invoice','erste Rechnung vorbereiten',true],
 ['first_tasks','erste Aufgaben definieren',false]
]}
function ProfessionalLanding({lp,setRole,setActiveAdmin}:any){
 const steps=Array.isArray(lp.steps)&&lp.steps.length?lp.steps:defaultMainLandingSettings.steps
 const faq=Array.isArray(lp.faq)&&lp.faq.length?lp.faq:defaultMainLandingSettings.faq
 const metrics=Array.isArray(lp.example_metrics)&&lp.example_metrics.length?lp.example_metrics:defaultMainLandingSettings.example_metrics
 return <div className="landing proLanding"><div className="landingNav proLandingNav"><div className={lp.logo_url?'logo hasImage':'logo'}>{lp.logo_url?<img className="brandLogoImg" src={lp.logo_url} alt={lp.logo_alt||lp.nav_title||lp.brand_name||'Mecklenburg Marketing Logo'}/>:<div className="mark">{lp.logo_mark_text||'M'}</div>}{lp.logo_show_text!==false&&<span className="brandLogoText">{lp.nav_title||'Mecklenburg Marketing'}</span>}</div><div className="row"><button className="btn" onClick={()=>{window.location.href='/auth'}}>{lp.primary_cta_label||'Anmelden'}</button>{lp.show_public_demo_button!==false&&<button className="btn secondary" onClick={()=>{markDemoMode();setRole('admin');setActiveAdmin('DominiqueMM')}}>{lp.secondary_cta_label||'Demo ansehen'}</button>}</div></div><section className="hero proHero"><div><Badge>Lokales Marketing-Betriebssystem</Badge><h1>{lp.hero_title||'Mehr Sichtbarkeit. Mehr Bewertungen. Mehr Kunden.'}</h1><p>{lp.hero_subline}</p><div className="landingCtas"><button className="btn" onClick={()=>{window.location.href='/auth'}}>Portal öffnen</button>{lp.show_public_demo_button!==false&&<button className="btn secondary" onClick={()=>{markDemoMode();setRole('admin');setActiveAdmin('DominiqueMM')}}>{lp.secondary_cta_label||'Live-Demo starten'}</button>}</div></div><div className="proMock"><div className="mockTop"><span></span><span></span><span></span></div><div className="grid4"><Metric label="Sichtbarkeit" value="+34%"/><Metric label="Reviews" value="128"/><Metric label="Leads" value="42"/><Metric label="Health" value="Grün"/></div><div className="chartLine">{Array.from({length:14},(_,i)=><span key={i} style={{height:`${22+(i*9)%70}px`}} />)}</div><div className="item"><b>Nächste Empfehlung</b><span>Google Business Fotos aktualisieren und Bewertungs-Booster starten.</span></div></div></section><section className="proSection"><h2>Ablauf in 3 Schritten</h2><div className="grid3">{steps.slice(0,3).map((s:any,i:number)=><Card key={`${s.title}-${i}`} title={`${i+1}. ${s.title}`}><p className="sub">{s.description}</p>{i===2&&<div className="miniMetrics">{metrics.map((m:any)=><Metric key={m.label} label={m.label} value={m.value}/>)}</div>}</Card>)}</div></section><section className="landingPackages proSection"><h2>{lp.package_headline}</h2><p className="sub">{lp.package_subline}</p><div className="grid3 packageGrid">{Object.keys(packageDefs).map(p=>{const po=(lp.packages||{})[p]||{};return <Card key={p} title={po.headline||p}><div className="metricValue">{eur(pprice(p))}</div><div className="sub">monatlich</div>{po.description&&<p className="sub">{po.description}</p>}<FeatureList pkg={p}/></Card>})}</div></section><section className="proSection"><Card title="FAQ">{faq.map((f:any,i:number)=><div className="item" key={`${f.question}-${i}`}><b>{f.question}</b><span>{f.answer}</span></div>)}</Card></section>{lp.footer_note&&<div className="landingFooter sub">{lp.footer_note}</div>}</div>
}

function Avatar({name,src,size=34}:any){return src?<img className="avatar" style={{width:size,height:size}} src={src}/>:<div className="avatar fallback" style={{width:size,height:size}}>{String(name||'?').slice(0,1)}</div>}
function NotificationBell({store,cid,role,activeAdmin,adminAvatars}:any){
 const [open,setOpen]=useState(false)
 const rows=store.data.notifications.filter((n:any)=>role==='admin'||n.customer_id===cid).sort((a:any,b:any)=>String(b.created_at).localeCompare(String(a.created_at)))
 async function removeNotification(id:string){await store.remove('notifications',id)}
 return <div className="notifWrap"><button className="bellBtn" onClick={()=>setOpen(!open)}>🔔<span>{rows.length}</span></button>{open&&<div className="notifPanel"><h2>Benachrichtigungen</h2>{rows.length===0&&<div className="sub">Keine Benachrichtigungen.</div>}{rows.map((n:any)=><div className="notifItem" key={n.id}><Avatar name={n.actor_name||activeAdmin} src={n.actor_avatar||adminAvatars[n.actor_name]||''}/><div><b>{n.title}</b><div className="sub">{n.message}</div><div className="sub">{new Date(n.created_at).toLocaleString('de-DE')}</div><button className="btn secondary notifDelete" onClick={()=>removeNotification(n.id)}>Löschen</button></div></div>)}</div>}</div>
}
function AdminToggle({activeAdmin,setActiveAdmin}:any){return <button className="adminSwitch" onClick={()=>setActiveAdmin(activeAdmin==='DominiqueMM'?'JanneMM':'DominiqueMM')} title="Adminprofil wechseln"><span className={activeAdmin==='DominiqueMM'?'on':''}>D</span><span className={activeAdmin==='JanneMM'?'on':''}>J</span></button>}
function ProfileUpload({activeAdmin,setAdminAvatars,adminAvatars}:any){
 const [open,setOpen]=useState(false)
 const [busy,setBusy]=useState(false)
 const current=adminAvatars[activeAdmin]||''
 async function pick(e:any){
  const file=e.target.files?.[0]; if(!file)return
  const preview=URL.createObjectURL(file)
  setAdminAvatars((p:any)=>({...p,[activeAdmin]:preview}))
  const fd=new FormData(); fd.append('file',file); fd.append('display_name',activeAdmin)
  setBusy(true)
  try{const j:any=await apiRequest(`${API_BASE}/api/avatars/upload`,{method:'POST',body:fd,expectJson:false,timeoutMs:20000});setAdminAvatars((p:any)=>({...p,[activeAdmin]:j.data?.avatar_url||j.avatar_url||preview}))}catch(e:any){appToast(e.message||'Avatar Upload fehlgeschlagen')}finally{setBusy(false)}
 }
 return <div className="profileWrap"><button className="profileBtn" onClick={()=>setOpen(!open)}><Avatar name={activeAdmin} src={current} size={38}/></button>{open&&<div className="profilePanel"><h2>{activeAdmin}</h2><Avatar name={activeAdmin} src={current} size={72}/><input className="input" type="file" accept="image/*" onChange={pick}/><div className="sub">{busy?'Speichert...':'Profilbild wird bei Backend-Verbindung dauerhaft gespeichert.'}</div></div>}</div>
}

function StorageUploader({store,cid,fileType='documents',refTable,refId,title='Datei hochladen',activeAdmin='DominiqueMM'}:any){
 const input=useRef<HTMLInputElement|null>(null); const [drag,setDrag]=useState(false); const [selected,setSelected]=useState<File|null>(null)
async function upload(file:File|null=selected){
  if(!file){store.notify?.('Bitte Datei auswählen'); return}
  const fd=new FormData(); fd.append('file',file); fd.append('customer_id',cid); fd.append('file_type',fileType); if(refTable)fd.append('ref_table',refTable); if(refId)fd.append('ref_id',refId)
  try{await apiRequest(`${API_BASE}/api/storage/upload`,{method:'POST',body:fd,expectJson:false,timeoutMs:30000}); await store.load()}catch(e:any){
   store.notify?.(e.message||'Upload im Backend fehlgeschlagen. Lokaler Fallback wird angelegt.')
   await store.create('customer_files',{customer_id:cid,name:file.name,original_name:file.name,file_type:fileType,bucket:fileType,storage_path:'#',mime_type:file.type,size_bytes:file.size,version:1,ref_table:refTable,ref_id:refId,actor_name:activeAdmin,url:URL.createObjectURL(file)})
  }
  await store.create('notifications',{customer_id:cid,title:`${activeAdmin} hat Datei hochgeladen`,message:`${activeAdmin} hat ${file.name} hochgeladen.`,type:'admin_change',actor_name:activeAdmin})
 }
 return <Card title={title} action={<button className="btn" onClick={()=>upload()}>{selected?'Upload starten':'Datei speichern'}</button>}><div className={`drop ${drag?'activeDrop':''}`} onClick={()=>input.current?.click()} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);setSelected(e.dataTransfer.files?.[0]||null)}}><input ref={input} type="file" style={{display:'none'}} onChange={e=>setSelected(e.target.files?.[0]||null)}/><b>{selected?selected.name:'Datei hier ablegen oder klicken'}</b><div className="sub">Typ: {fileType}</div></div>{selected&&<MiniPreview file={selected}/>}</Card>
}
function MiniPreview({file}:any){const url=URL.createObjectURL(file);return <div className="miniPreview"><b>{file.name}</b><div className="sub">{file.type||'Datei'} · {Math.round(file.size/1024)} KB</div>{file.type==='application/pdf'&&<iframe src={url}/>} {file.type?.startsWith('image/')&&<img src={url}/>}</div>}
function FileList({store,cid,type}:any){const rows=store.data.customer_files.filter((f:any)=>f.customer_id===cid&&(!type||f.file_type===type));return <div className="fileScroll">{rows.map((f:any)=><div className="fileMini" key={f.id} onClick={()=>f.url&&window.open(f.url,'_blank')}><div><b>{f.name}</b><div className="sub">{f.file_type} · {Math.round((f.size_bytes||0)/1024)} KB · V{f.version||1}</div><div className="sub">{f.actor_name||'System'} · {new Date(f.created_at).toLocaleDateString('de-DE')}</div></div><button className="btn secondary" onClick={(e)=>{e.stopPropagation();store.remove('customer_files',f.id)}}>Löschen</button></div>)}</div>}


function GlobalCustomerSearch({store,role,setCid,setView}:any){
 const [q,setQ]=useState('')
 const customers=allCustomers(store.data).filter((c:any)=>(c.name+c.branch+c.email).toLowerCase().includes(q.toLowerCase()))
 if(role!=='admin') return <input className="search" placeholder="Suche..."/>
 return <div className="globalSearch"><input className="search" placeholder="Globale Kundensuche..." value={q} onChange={e=>setQ(e.target.value)}/>{q&&<div className="card globalResults">{customers.map((c:any)=><button className="nav" key={c.id} onClick={()=>{setCid(c.id);setView('crm');setQ('')}}>{c.name}<div className="sub">{c.branch} · {c.package_name}</div></button>)}</div>}</div>
}
function QRCodes({store,cid,setCid,role='admin'}:any){
 const [customer,setCustomer]=useState(cid)
 const [f,setF]=useState<any>({title:'Bewertungs QR',purpose:'both',points_per_scan:10,internal_email:'',internal_from:1,internal_to:3,google_from:4,google_to:5,google_review_url:''})
 const rows=(store.data.qr_campaigns||[]).filter((q:any)=>q.customer_id===customer)
 async function createLocalQr(seedData:any={}){
  const slug=seedData.slug||slugifyLocal(`${cname(store.data,customer)}-${f.title||seedData.title||'qr'}`)
  const row={id:seedData.id||uid(),customer_id:customer,title:f.title||seedData.title||'QR Kampagne',name:f.title||seedData.name||'QR Kampagne',slug,public_url:publicSlugUrl(slug),target_url:`/l/${slug}`,...f,points_per_scan:Number(f.points_per_scan||10),metadata:{...(seedData.metadata||{}),purpose:f.purpose,google_review_url:f.google_review_url},status:'Aktiv',active:true,scans:0,conversions:0,created_at:new Date().toISOString()}
  await store.create('qr_campaigns',row)
  await store.create('notifications',{customer_id:customer,title:'QR Kampagne erstellt',message:`Für ${cname(store.data,customer)} wurde ${row.title} erstellt.`,type:'admin_change',actor_name:'DominiqueMM'})
  store.notify?.('QR Kampagne erstellt')
 }
 async function v34CreateQrCampaign(){
  try{
   const r=await v33FunctionalClient.createQrCampaign(customer,{title:f.title||'Neue QR Kampagne',purpose:f.purpose,mode:f.purpose,points_per_scan:Number(f.points_per_scan||10),google_review_url:f.google_review_url,create_loyalty:f.purpose!=='review'})
   await createLocalQr({...r.qr_campaign,public_url:r.public_url_path?`${appOrigin()}${r.public_url_path}`:undefined})
   store.notify?.(`QR Kampagne erstellt: ${r.public_url_path}`)
   setF({...f,title:''})
   setCid?.(customer)
  }catch(e:any){
   await createLocalQr()
   store.notify?.(`Backend nicht erreichbar, QR lokal erstellt`)
  }
 }
 return <><Head title="QR Codes" sub="Kampagnentyp, Google-Bewertungen, Loyalty-Punkte und öffentliche Slug-Seite." action={<button className="btn" onClick={v34CreateQrCampaign}>QR Kampagne erstellen</button>}/><div className="grid2"><Card title="Kunde & Ziel">{role==='admin'?<Search items={allCustomers(store.data)} value={customer} onChange={(id:string)=>{setCustomer(id);setCid?.(id)}} placeholder="Kunde für QR-Kampagne suchen"/>:<div className="item"><b>Kunde</b><span>{cname(store.data,cid)}</span></div>}<input className="input" placeholder="Kampagnentitel, z. B. Google Bewertung & Bonuspunkte" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/><select className="input" value={f.purpose} onChange={e=>setF({...f,purpose:e.target.value})}><option value="review">Nur Google Bewertungen</option><option value="loyalty">Nur Loyalty / Punkte</option><option value="both">Google Bewertungen + Loyalty</option></select><input className="input" type="number" min="0" placeholder="Punkte pro Scan für diesen QR-Code" value={f.points_per_scan} onChange={e=>setF({...f,points_per_scan:Number(e.target.value)})}/><input className="input" placeholder="Interne Feedback-E-Mail für kritische Bewertungen" value={f.internal_email} onChange={e=>setF({...f,internal_email:e.target.value})}/><input className="input" placeholder="Google Bewertungslink des Kunden" value={f.google_review_url} onChange={e=>setF({...f,google_review_url:e.target.value})}/></Card><Card title="Sterne-Regeln"><div className="row"><input className="input" type="number" min="1" max="5" value={f.internal_from} onChange={e=>setF({...f,internal_from:Number(e.target.value)})}/><input className="input" type="number" min="1" max="5" value={f.internal_to} onChange={e=>setF({...f,internal_to:Number(e.target.value)})}/></div><div className="sub">Sternebereich für internes Feedback</div><div className="row"><input className="input" type="number" min="1" max="5" value={f.google_from} onChange={e=>setF({...f,google_from:Number(e.target.value)})}/><input className="input" type="number" min="1" max="5" value={f.google_to} onChange={e=>setF({...f,google_to:Number(e.target.value)})}/></div><div className="sub">Sternebereich für Google Weiterleitung</div></Card></div><Card title="QR Kampagnen">{rows.length===0&&<div className="sub">Noch keine Kampagne für diesen Kunden.</div>}{rows.map((q:any)=>{const slug=q.slug||slugifyLocal(q.title||q.name||q.id);const url=q.public_url||publicSlugUrl(slug);const mode=q.purpose||q.mode||q.metadata?.purpose||'loyalty';return <div className="item" key={q.id}><V424QrImage value={url}/><div><b>{q.title||q.name}</b><div className="sub">{slug} · Typ: {mode==='both'?'Bewertung + Loyalty':mode==='review'?'Google Bewertung':'Loyalty'} · {q.points_per_scan||q.metadata?.points_per_scan||10} Punkte</div><div className="sub">{q.active===false?'Inaktiv':'Aktiv'} · {q.internal_from||1}-{q.internal_to||3} intern · {q.google_from||4}-{q.google_to||5} Google</div><div className="toolbarActions"><button className="btn secondary" onClick={()=>window.open(url,'_blank')}>Slug öffnen</button>{(q.google_review_url||q.metadata?.google_review_url)&&<button className="btn secondary" onClick={()=>window.open(q.google_review_url||q.metadata?.google_review_url,'_blank')}>Bewertungsseite öffnen</button>}<button className="btn secondary" onClick={()=>navigator.clipboard?.writeText(url)}>Link kopieren</button><button className="btn secondary" onClick={()=>store.update('qr_campaigns',q.id,{active:q.active===false,status:q.active===false?'Aktiv':'Inaktiv'})}>{q.active===false?'Aktivieren':'Deaktivieren'}</button><button className="btn secondary" onClick={()=>store.remove('qr_campaigns',q.id)}>Löschen</button></div></div></div>})}</Card><V42PublicLandingPreview campaigns={rows} customer={cobj(store.data,customer)}/></>
}


function V42PublicLandingPreview({campaigns,customer}:any){
 const q=campaigns?.[0]
 const slug=q?.slug||slugifyLocal(customer?.name||'kunde')
 const url=publicSlugUrl(slug)
 return <Card title="Öffentliche Slug-Seite Preview">{q?<div className="grid2"><div className="phonePreview"><iframe src={`/l/${slug}`}/></div><div><b>{customer?.name||'Kunde'}</b><p className="sub">Preview der Endkundenseite für QR, Review und Loyalty.</p><div className="qrExport"><V424QrImage value={url}/><div><b>{url}</b><div className="toolbarActions"><button className="btn secondary" onClick={()=>window.open(`/l/${slug}`,'_blank')}>Preview öffnen</button><button className="btn secondary" onClick={()=>navigator.clipboard?.writeText(url)}>Link kopieren</button></div></div></div></div></div>:<div className="sub">Erstelle zuerst eine QR-Kampagne. Danach erscheint hier automatisch die Preview der öffentlichen Endkundenseite.</div>}</Card>
}


function MainLandingPageEditor({store}:any){
 const current=mainLandingSettings(store.data)
 const [f,setF]=useState<any>(current)
 const [msg,setMsg]=useState('')
 useEffect(()=>{setF(mainLandingSettings(store.data))},[store.data.landing_page_settings])
 function setPackage(pkg:string,patch:any){setF((p:any)=>({...p,packages:{...(p.packages||{}),[pkg]:{...((p.packages||{})[pkg]||{}),...patch}}}))}
 function patchStep(i:number,patch:any){const next=[...(f.steps||defaultMainLandingSettings.steps)];next[i]={...next[i],...patch};setF({...f,steps:next})}
 function patchFaq(i:number,patch:any){const next=[...(f.faq||defaultMainLandingSettings.faq)];next[i]={...next[i],...patch};setF({...f,faq:next})}
 function patchMetric(i:number,patch:any){const next=[...(f.example_metrics||defaultMainLandingSettings.example_metrics)];next[i]={...next[i],...patch};setF({...f,example_metrics:next})}
 async function save(){
  const payload={...f,id:'main',scope:'public_home',updated_at:new Date().toISOString()}
  store.setData((d:any)=>{const existing=(d.landing_page_settings||[]).filter((x:any)=>!(x.id==='main'||x.scope==='public_home'));return {...d,landing_page_settings:[payload,...existing]}})
  try{
   const existing=(store.data.landing_page_settings||[]).find((x:any)=>x.id==='main'||x.scope==='public_home')
   if(existing) await store.update('landing_page_settings',existing.id||'main',payload)
   else await store.create('landing_page_settings',payload)
   setMsg('Landingpage gespeichert.')
  }catch(e:any){setMsg('Lokal gespeichert. Für Live-Speicherung SQL_V42_21_LANDINGPAGE_SCHEMA_FIX.sql ausführen.')}
 }
 function reset(){setF(defaultMainLandingSettings);setMsg('Standardtexte geladen – bitte speichern.')}
 return <><Head title="Haupt-Landingpage" sub="Texte der öffentlichen Startseite, Ablauf und FAQ bearbeiten" action={<button className="btn" onClick={save}>Landingpage speichern</button>}/><div className="grid2"><Card title="Logo, Hero & Navigation"><input className="input" value={f.nav_title||''} onChange={e=>setF({...f,nav_title:e.target.value})} placeholder="Text neben dem Logo, z. B. Mecklenburg Marketing"/><input className="input" value={f.logo_url||''} onChange={e=>setF({...f,logo_url:e.target.value})} placeholder="Logo-URL, z. B. /mecklenburg-marketing-logo.png oder Supabase-Storage-Link"/><div className="grid2"><input className="input" value={f.logo_alt||''} onChange={e=>setF({...f,logo_alt:e.target.value})} placeholder="Alternativtext für das Firmenlogo"/><input className="input" value={f.logo_mark_text||''} onChange={e=>setF({...f,logo_mark_text:e.target.value})} placeholder="Fallback-Kürzel, wenn kein Logo hinterlegt ist"/></div><label className="checkline"><input type="checkbox" checked={f.logo_show_text!==false} onChange={e=>setF({...f,logo_show_text:e.target.checked})}/> Navigationstext neben dem Logo anzeigen</label><input className="input" value={f.hero_title||''} onChange={e=>setF({...f,hero_title:e.target.value})} placeholder="Große Überschrift der öffentlichen Startseite"/><textarea className="input textarea" value={f.hero_subline||''} onChange={e=>setF({...f,hero_subline:e.target.value})} placeholder="Erklärungstext unter der Überschrift"/><div className="grid2"><input className="input" value={f.primary_cta_label||''} onChange={e=>setF({...f,primary_cta_label:e.target.value})} placeholder="Text des Login-Buttons"/><input className="input" value={f.secondary_cta_label||''} onChange={e=>setF({...f,secondary_cta_label:e.target.value})} placeholder="Text des Demo-Buttons"/></div><label className="checkline"><input type="checkbox" checked={f.show_public_demo_button!==false} onChange={e=>setF({...f,show_public_demo_button:e.target.checked})}/> Öffentlichen Demo-Button auf der Landingpage anzeigen</label><textarea className="input textarea" value={f.footer_note||''} onChange={e=>setF({...f,footer_note:e.target.value})} placeholder="Hinweistext unten auf der Startseite"/>{msg&&<div className="sub">{msg}</div>}</Card><Card title="Live-Vorschau"><div className="landingMiniPreview"><div className={f.logo_url?'logo hasImage':'logo'}>{f.logo_url?<img className="brandLogoImg" src={f.logo_url} alt={f.logo_alt||f.nav_title||'Logo'}/>:<div className="mark">{f.logo_mark_text||'M'}</div>}{f.logo_show_text!==false&&<span className="brandLogoText">{f.nav_title}</span>}</div><h1>{f.hero_title}</h1><p className="sub">{f.hero_subline}</p><div className="toolbarActions"><button className="btn">{f.primary_cta_label}</button>{f.show_public_demo_button!==false&&<button className="btn secondary">{f.secondary_cta_label}</button>}</div><div className="sub">Ablauf, Beispiel-Ergebnis und FAQ werden auf der Landingpage darunter angezeigt.</div></div></Card></div><Card title="Ablauf in 3 Schritten bearbeiten">{(f.steps||defaultMainLandingSettings.steps).slice(0,3).map((step:any,i:number)=><div className="v42PackageEdit" key={i}><input className="input" value={step.title||''} onChange={e=>patchStep(i,{title:e.target.value})} placeholder={`Titel Schritt ${i+1}`}/><textarea className="input textarea" value={step.description||''} onChange={e=>patchStep(i,{description:e.target.value})} placeholder={`Beschreibung Schritt ${i+1}`}/></div>)}<div className="sub">Beispiel-Ergebnisse werden im dritten Schritt angezeigt.</div><div className="grid3">{(f.example_metrics||defaultMainLandingSettings.example_metrics).map((m:any,i:number)=><Card key={i} title={`Beispielwert ${i+1}`}><input className="input" value={m.label||''} onChange={e=>patchMetric(i,{label:e.target.value})} placeholder="Kennzahl, z. B. neue Bewertungen"/><input className="input" value={m.value||''} onChange={e=>patchMetric(i,{value:e.target.value})} placeholder="Wert, z. B. +34"/></Card>)}</div></Card><Card title="FAQ bearbeiten">{(f.faq||defaultMainLandingSettings.faq).map((qa:any,i:number)=><div className="v42PackageEdit" key={i}><input className="input" value={qa.question||''} onChange={e=>patchFaq(i,{question:e.target.value})} placeholder="Frage"/><textarea className="input textarea" value={qa.answer||''} onChange={e=>patchFaq(i,{answer:e.target.value})} placeholder="Antwort"/><button className="btn secondary" onClick={()=>setF({...f,faq:(f.faq||[]).filter((_:any,idx:number)=>idx!==i)})}>FAQ entfernen</button></div>)}<button className="btn secondary" onClick={()=>setF({...f,faq:[...(f.faq||[]),{question:'Neue Frage',answer:'Antwort ergänzen.'}]})}>FAQ hinzufügen</button></Card><Card title="Paketauflistung bearbeiten"><input className="input" value={f.package_headline||''} onChange={e=>setF({...f,package_headline:e.target.value})} placeholder="Überschrift über der Paketauflistung"/><textarea className="input textarea" value={f.package_subline||''} onChange={e=>setF({...f,package_subline:e.target.value})} placeholder="Kurzbeschreibung oberhalb der Pakete"/><div className="grid3">{Object.keys(packageDefs).map(pkg=>{const p=(f.packages||{})[pkg]||{};return <Card key={pkg} title={pkg}><input className="input" value={p.headline||pkg} onChange={e=>setPackage(pkg,{headline:e.target.value})} placeholder={`Anzeigename für ${pkg}`}/><textarea className="input textarea" value={p.description||''} onChange={e=>setPackage(pkg,{description:e.target.value})} placeholder={`Beschreibung für ${pkg} auf der Landingpage`}/><div className="sub">Preis und Featureliste kommen weiterhin aus der zentralen Paketlogik.</div></Card>})}</div><div className="toolbarActions"><button className="btn" onClick={save}>Änderungen speichern</button><button className="btn secondary" onClick={reset}>Standardtexte laden</button><button className="btn secondary" onClick={()=>{setF(mainLandingSettings(store.data));window.open('/', '_blank')}}>Öffentliche Seite öffnen</button></div></Card></>
}

function LandingTextEditor({store,q}:any){
 const md=q.metadata||{}
 const [f,setF]=useState({
  title:q.title||q.name||'',
  headline:md.hero_headline||q.headline||'Willkommen im Bonusclub',
  subline:md.hero_subline||'Sammle Punkte, sichere dir Rewards und werde VIP.',
  cta_label:md.cta_label||'Punkte sammeln',
  review_cta_label:md.review_cta_label||'Bewertung absenden',
  success_title:md.success_title||'Deine Punkte wurden gespeichert.',
  success_message:md.success_message||'Danke für deine Teilnahme. Deine Vorteile werden direkt deinem Bonuskonto zugeordnet.',
  fineprint:md.fineprint||'Mit dem Absenden nimmst du am digitalen Bonusprogramm teil.'
 })
 async function save(){
  await store.update('qr_campaigns',q.id,{title:f.title,name:f.title,headline:f.headline,metadata:{...md,hero_headline:f.headline,hero_subline:f.subline,cta_label:f.cta_label,review_cta_label:f.review_cta_label,success_title:f.success_title,success_message:f.success_message,fineprint:f.fineprint}})
 }
 return <div className="v42PackageEdit"><input className="input" value={f.title} onChange={e=>setF({...f,title:e.target.value})} placeholder="Interner Seitentitel"/><input className="input" value={f.headline} onChange={e=>setF({...f,headline:e.target.value})} placeholder="Öffentliche Headline auf der Slug-Seite"/><textarea className="input textarea" value={f.subline} onChange={e=>setF({...f,subline:e.target.value})} placeholder="Unterzeile / Erklärung auf der Slug-Seite"/><div className="grid2"><input className="input" value={f.cta_label} onChange={e=>setF({...f,cta_label:e.target.value})} placeholder="Button-Text für Loyalty"/><input className="input" value={f.review_cta_label} onChange={e=>setF({...f,review_cta_label:e.target.value})} placeholder="Button-Text für Review"/></div><input className="input" value={f.success_title} onChange={e=>setF({...f,success_title:e.target.value})} placeholder="Erfolgsüberschrift nach Scan/Absenden"/><textarea className="input textarea" value={f.success_message} onChange={e=>setF({...f,success_message:e.target.value})} placeholder="Erfolgstext nach Scan/Absenden"/><textarea className="input textarea" value={f.fineprint} onChange={e=>setF({...f,fineprint:e.target.value})} placeholder="Rechtlicher Hinweis / Kleingedrucktes"/><div className="toolbarActions"><button className="btn" onClick={save}>Slug-Seiten-Texte speichern</button><button className="btn secondary" onClick={()=>window.open(`/l/${q.slug}`,'_blank')}>Live ansehen</button></div></div>
}

function V42PublicLandingManager({store,cid}:any){
 const customer=cobj(store.data,cid)
 const [form,setForm]=useState({title:`${customer?.name||'Kunde'} Bonusclub`,slug:slugifyLocal(customer?.name||'kunde'),headline:'Willkommen im Bonusclub',subline:'Sammle Punkte, sichere dir Rewards und werde VIP.',mode:'loyalty'})
 const campaigns=(store.data.qr_campaigns||[]).filter((q:any)=>q.customer_id===cid)
 async function create(){
  const slug=slugifyLocal(form.slug||form.title)
  await store.create('qr_campaigns',{customer_id:cid,title:form.title,name:form.title,slug,headline:form.headline,mode:form.mode,metadata:{purpose:form.mode,hero_headline:form.headline,hero_subline:form.subline,cta_label:form.mode==='review'?'Bewertung absenden':'Punkte sammeln',review_cta_label:'Bewertung absenden'},public_url:publicSlugUrl(slug),target_url:`/l/${slug}`,status:'Aktiv',active:true,created_at:new Date().toISOString()})
  await store.create('notifications',{customer_id:cid,title:'Öffentliche Slug-Seite erstellt',message:`/l/${slug} wurde erstellt.`,type:'public_landing',actor_name:'DominiqueMM'})
 }
 return <><Head title="Öffentliche /l/[slug] Seite" sub={`Nur Kampagnen von ${customer?.name||'diesem Kunden'} anzeigen, bearbeiten und previewen`}/><div className="grid2"><Card title="Slug-Seite erstellen"><input className="input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Seitentitel, z. B. Bonusclub Café Morgenlicht"/><input className="input" value={form.slug} onChange={e=>setForm({...form,slug:slugifyLocal(e.target.value)})} placeholder="URL-Slug, z. B. cafe-morgenlicht-bonus"/><input className="input" value={form.headline} onChange={e=>setForm({...form,headline:e.target.value})} placeholder="Headline, die öffentlich oben angezeigt wird"/><textarea className="input textarea" value={form.subline} onChange={e=>setForm({...form,subline:e.target.value})} placeholder="Unterzeile der öffentlichen Landingpage"/><select className="input" value={form.mode} onChange={e=>setForm({...form,mode:e.target.value})}><option value="loyalty">Loyalty</option><option value="review">Review</option><option value="both">Bewertung + Loyalty</option><option value="lead">Lead</option></select><button className="btn" onClick={create}>Slug-Seite erstellen</button></Card><V42PublicLandingPreview campaigns={campaigns} customer={customer}/></div><Card title="Bestehende Slug-Seiten">{campaigns.map((q:any)=><div className="item" key={q.id}><b>/l/{q.slug}</b><span>{q.title||q.name}</span><button className="btn secondary" onClick={()=>window.open(`/l/${q.slug}`,'_blank')}>Öffnen</button><button className="btn secondary" onClick={()=>store.remove('qr_campaigns',q.id)}>Löschen</button></div>)}</Card><Card title="Slug-Seiten-Texte bearbeiten">{campaigns.length===0&&<div className="sub">Erstelle zuerst eine Slug-Seite. Danach kannst du die öffentlichen Texte ändern.</div>}{campaigns.map((q:any)=><LandingTextEditor key={q.id} store={store} q={q}/>)}</Card></>
}



function ProductionStatusCard(){
 const [health,setHealth]=useState<any>(null)
 useEffect(()=>{v33FunctionalClient.health().then(setHealth).catch((e:any)=>setHealth({ok:false,error:e.message||'Backend nicht erreichbar'}))},[])
 return <Card title="Production Status"><div className="item"><b>Backend</b><Badge type={health?.ok?'green':'red'}>{health?.ok?'Verbunden':'Nicht verbunden'}</Badge></div><div className="sub">Service: {health?.service||health?.error||'Prüfe Verbindung...'}</div><div className="sub">Worker, API-Syncs, PDF- und QR-Services sind backendseitig vorbereitet.</div></Card>
}


function applyDemoSandboxStorePatch(store:any){
 if(!store || store.__demoSandboxPatched) return store
 store.__demoSandboxPatched=true
 const persist=()=>{try{localStorage.setItem(DEMO_SANDBOX_KEY,JSON.stringify(store.data))}catch{}}
 const id=()=>crypto?.randomUUID?.()||String(Date.now()+Math.random())
 const localCreate=async(table:string,row:any)=>{
   const next={id:id(),created_at:new Date().toISOString(),...row}
   store.setData((d:any)=>{const nd={...d,[table]:[...(d[table]||[]),next]};try{localStorage.setItem(DEMO_SANDBOX_KEY,JSON.stringify(nd))}catch{};return nd})
   return next
 }
 const localUpdate=async(table:string,rowId:string,patch:any)=>{
   store.setData((d:any)=>{const nd={...d,[table]:(d[table]||[]).map((r:any)=>r.id===rowId?{...r,...patch}:r)};try{localStorage.setItem(DEMO_SANDBOX_KEY,JSON.stringify(nd))}catch{};return nd})
   return {id:rowId,...patch}
 }
 const localRemove=async(table:string,rowId:string)=>{
   store.setData((d:any)=>{const nd={...d,[table]:(d[table]||[]).filter((r:any)=>r.id!==rowId)};try{localStorage.setItem(DEMO_SANDBOX_KEY,JSON.stringify(nd))}catch{};return nd})
   return true
 }
 const oldCreate=store.create?.bind(store)
 const oldUpdate=store.update?.bind(store)
 const oldRemove=(store.remove||store.delete)?.bind(store)
 store.create=async(table:string,row:any)=>{
   const mode=safeLocalStorageText('mmos_mode','')
   if(mode==='demo') return localCreate(table,row)
   try{return oldCreate?await oldCreate(table,row):await localCreate(table,row)}catch(e){return localCreate(table,row)}
 }
 store.update=async(table:string,rowId:string,patch:any)=>{
   const mode=safeLocalStorageText('mmos_mode','')
   if(mode==='demo') return localUpdate(table,rowId,patch)
   try{return oldUpdate?await oldUpdate(table,rowId,patch):await localUpdate(table,rowId,patch)}catch(e){return localUpdate(table,rowId,patch)}
 }
 store.remove=async(table:string,rowId:string)=>{
   const mode=safeLocalStorageText('mmos_mode','')
   if(mode==='demo') return localRemove(table,rowId)
   try{return oldRemove?await oldRemove(table,rowId):await localRemove(table,rowId)}catch(e){return localRemove(table,rowId)}
 }
 store.delete=store.remove
 return store
}


async function runDemoWorkflow(key:string, customer_name='Demo NordDach GmbH'){
  const result = await demoToolsClient.workflow(key,{customer_name})
  const pdf = result?.run?.result?.pdf_base64
  const campaign = result?.run?.result?.campaign
  if(pdf) openPdfBase64(pdf)
  if(campaign) openQrCampaign(campaign)
  return result
}
async function createDemoInvoice(customer_name='Demo NordDach GmbH'){
  const result = await demoToolsClient.createInvoice({customer_name, service_type:'Demo Rechnung', amount:199})
  if(result?.pdf_base64) openPdfBase64(result.pdf_base64)
  return result
}
async function createDemoQr(customer_name='Demo NordDach GmbH'){
  const result = await demoToolsClient.createQrCampaign({customer_name, name:'Review Kampagne'})
  if(result?.campaign) openQrCampaign(result.campaign)
  return result
}


async function runEnterprisePreset(preset:string){
  try{
    const result = await enterpriseClient.runPreset(preset,{source:'admin-ui'})
    appToast(`Enterprise Aktion gestartet: ${preset}`)
    return result
  }catch(e:any){
    appToast(e.message||'Enterprise Fehler')
  }
}
async function planEnterpriseBackup(){
  try{
    const result = await enterpriseClient.planBackup({label:'Manueller Restore Point', backup_type:'database'})
    appToast('Backup Restore Point geplant')
    return result
  }catch(e:any){ appToast(e.message||'Backup Fehler') }
}


async function v19CreateInvoicePdf(payload:any){
  const r = await opsClient.createInvoicePdf(payload || {amount:0,service_type:'Dienstleistung'})
  if(r.pdf_base64) openBase64Pdf(r.pdf_base64)
  return r
}
async function v19CreateQrCampaign(payload:any){
  const r = await opsClient.createQr(payload || {name:'QR Kampagne'})
  if(r.campaign) openQrWindow(r.campaign)
  return r
}


async function v19RequestPackage(customer_id:string, package_key:string){
  return packageBillingClient.requestPackage({customer_id, package_key, billing_interval:'month'})
}
async function v19GrantPackage(customer_id:string, package_key:string){
  return packageBillingClient.grantPackage({customer_id, package_key})
}
function v19ToolsForPackage(packageKey:string){
  return packageMatrix.find(p=>p.key===packageKey)?.tools || []
}


async function v20EnableLoyaltyForQr(customer_id:string, qr_campaign_id:string, name='Loyalty Programm'){
  return v20GrowthClient.createLoyaltyProgram({customer_id, qr_campaign_id, name})
}
async function v20LinkLoyaltyToQr(qr_campaign_id:string, loyalty_program_id:string){
  return v20GrowthClient.linkLoyaltyQr({qr_campaign_id, loyalty_program_id})
}
async function v20GenerateInsights(customer_id:string){
  return v20GrowthClient.generateInsights({customer_id})
}


function BrandOutputEngine({store,cid}:any){
 const [target,setTarget]=useState(cid||'')
 const customer=cname(store.data,target||cid)
 const docs=[
  {key:'mini',title:'Mini-Audit',subtitle:`Kurz-Audit für ${customer}`,body:`<div class="section"><h2>Google Business Optimierung</h2><p>Score, Chancen und nächste Maßnahmen für lokale Sichtbarkeit.</p></div>`,status:'Entwurf'},
  {key:'offer',title:'Angebot',subtitle:`Angebot für ${customer}`,body:`<div class="section"><h2>Leistungsumfang</h2><p>Google Business Optimierung, lokale SEO, Bewertungsmanagement und Kundenportal.</p></div>`,status:'Vorlage'},
  {key:'contract',title:'Vertrag',subtitle:`Vertragsentwurf für ${customer}`,body:`<div class="section"><h2>Dienstleistungsvertrag</h2><p>Paketleistungen, Laufzeit, Datenschutz-/AVV-Hinweis und Kündigung.</p></div>`,status:'Entwurf'},
  {key:'dunning',title:'Mahnung',subtitle:`Zahlungserinnerung für ${customer}`,body:`<div class="section"><h2>Offener Betrag</h2><p>Bitte prüfen und Zahlungseingang abgleichen.</p></div>`,status:'Vorlage'},
  {key:'report',title:'Monatsreport',subtitle:`Monatsreport für ${customer}`,body:`<div class="section"><h2>Zusammenfassung</h2><p>SEO, Reviews, QR-Kampagnen, Leads und Potenziale des Monats.</p></div>`,status:'Entwurf'}
 ]
 return <><Head title="Output Engine" sub="Gebrandete Dokumente als echtes PDF über Gotenberg oder HTML-Fallback erzeugen" action={<LiveModeBadge/>}/><CentralCustomerSelector store={store} cid={target||cid} setCid={setTarget} title="Kunde für Dokumente auswählen"/><div className="grid2">{docs.map(d=><Card key={d.key} title={d.title}><p className="sub">{d.subtitle}</p><div className="toolbarActions"><button className="btn" onClick={()=>openPdfDocument(d.title,d.subtitle,d.body,{status:d.status})}>PDF öffnen</button><button className="btn secondary" onClick={()=>downloadHtmlDocument(`${d.title}-${customer}.html`,d.title,d.subtitle,d.body,{status:d.status})}>HTML exportieren</button></div></Card>)}</div></>
}

function AdminProfilesManager(){
 const [profiles,setProfiles]=useState<any[]>([])
 const [setupToken,setSetupToken]=useState('')
 const [msg,setMsg]=useState('')
 const [busy,setBusy]=useState(false)
 const [form,setForm]=useState<any>({username:'',display_name:'',email:'',password:'',status:'active'})
 const [edit,setEdit]=useState<any>(null)
 async function load(){
  setBusy(true); setMsg('')
  try{const r=await adminProfilesClient.list(setupToken);setProfiles(r.profiles||[]);setMsg(r.auth_via==='setup_token'?'Adminprofile per Setup-Key geladen.':'Adminprofile geladen.')}catch(e:any){setMsg(e.message||'Adminprofile konnten nicht geladen werden.')}finally{setBusy(false)}
 }
 useEffect(()=>{load()},[])
 async function create(){
  setMsg('')
  if(!form.username||!form.email||!form.password){setMsg('Bitte Benutzername, E-Mail und Passwort ausfüllen.');return}
  if(String(form.password).length<10||!/[^A-Za-z0-9]/.test(String(form.password))){setMsg('Passwort muss mindestens 10 Zeichen und ein Sonderzeichen enthalten.');return}
  setBusy(true)
  try{
   const r=await adminProfilesClient.create({...form,setup_token:setupToken})
   setProfiles([r.profile,...profiles.filter(p=>p.id!==r.profile.id)])
   setForm({username:'',display_name:'',email:'',password:'',status:'active'})
   setMsg('Live-Adminprofil wurde in Supabase Auth angelegt und für den Login freigeschaltet.')
  }catch(e:any){setMsg(e.message||'Adminprofil konnte nicht erstellt werden.')}finally{setBusy(false)}
 }
 async function saveEdit(){
  if(!edit?.id)return
  setBusy(true); setMsg('')
  try{
   const r=await adminProfilesClient.update(edit.id,{...edit,setup_token:setupToken})
   setProfiles(profiles.map(p=>p.id===edit.id?r.profile:p))
   setEdit(null)
   setMsg('Adminprofil aktualisiert.')
  }catch(e:any){setMsg(e.message||'Adminprofil konnte nicht aktualisiert werden.')}finally{setBusy(false)}
 }
 async function setStatus(p:any,status:string){
  setBusy(true); setMsg('')
  try{
   const r=await adminProfilesClient.setStatus(p.id,status,setupToken)
   setProfiles(profiles.map(x=>x.id===p.id?r.profile:x))
   setMsg(status==='blocked'?'Adminprofil wurde gesperrt.':'Adminprofil wurde aktiviert.')
  }catch(e:any){setMsg(e.message||'Status konnte nicht geändert werden.')}finally{setBusy(false)}
 }
 return <>
  <Head title="Admin Profile" sub="Echte Live-Adminzugänge für den Supabase-Login anlegen und verwalten." action={<button className="btn" onClick={load}>{busy?'Lädt...':'Neu laden'}</button>}/>
  <Card title="Sicherheit & Autorisierung">
   <ToolTipHint title="Live-Login, keine lokalen Demo-Profile">Diese Profile werden über das Backend in Supabase Auth erstellt. Passwörter werden nicht im Frontend gespeichert, sondern nur zum Erstellen oder Aktualisieren des Auth-Users übergeben. V42.23 verhindert das Sperren des letzten aktiven Admins und protokolliert Änderungen im Activity Log.</ToolTipHint>
   <input className="input" value={setupToken} onChange={e=>setSetupToken(e.target.value)} placeholder="Optionaler Setup-Key aus Railway ENV ADMIN_PROFILE_SETUP_TOKEN" type="password"/>
   <div className="sub">Wenn du bereits als Live-Admin angemeldet bist, reicht deine Session. Für den ersten Admin oder Demo-Adminmodus kannst du den Setup-Key verwenden.</div>
  </Card>
  <Card title="Neues Adminprofil anlegen">
   <div className="grid2">
    <input className="input" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} placeholder="Benutzername, z. B. DominiqueMM"/>
    <input className="input" value={form.display_name} onChange={e=>setForm({...form,display_name:e.target.value})} placeholder="Anzeigename, z. B. Dominique"/>
    <input className="input" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="E-Mail für Live-Login" type="email"/>
    <input className="input" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Startpasswort mind. 10 Zeichen + Sonderzeichen" type="password"/>
    <select className="input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="active">active</option><option value="pending">pending</option><option value="blocked">blocked</option></select>
   </div>
   <div className="toolbarActions"><button className="btn" onClick={create} disabled={busy}>{busy?'Speichert...':'Live-Admin erstellen'}</button></div>
  </Card>
  <Card title="Vorhandene Live-Adminprofile"><ToolTipHint title="Sicherheitsregel">Der letzte aktive Admin kann nicht gesperrt werden. Nutze Status pending für vorbereitete Zugänge und blocked nur für gesperrte Accounts.</ToolTipHint>
   {profiles.length===0&&<EmptyState icon="🔐" title="Noch keine Adminprofile geladen">Lade die Profile mit einer aktiven Admin-Session oder mit dem Setup-Key. Der erste Admin kann über den Setup-Key erstellt werden.</EmptyState>}
   {profiles.map((p:any)=><div className="item" key={p.id}>
    <div><b>{p.username||p.display_name||p.email}</b><div className="sub">{p.email} · {p.role} · {p.status}</div><div className="sub">ID: {p.id}</div></div>
    <div className="toolbarActions"><Badge type={p.status==='active'?'green':p.status==='blocked'?'red':'yellow'}>{p.status}</Badge><button className="btn secondary" onClick={()=>setEdit({...p,password:''})}>Bearbeiten</button><button className="btn secondary" onClick={()=>setStatus(p,p.status==='blocked'?'active':'blocked')}>{p.status==='blocked'?'Aktivieren':'Sperren'}</button></div>
   </div>)}
  </Card>
  {edit&&<Card title="Adminprofil bearbeiten" action={<button className="btn secondary" onClick={()=>setEdit(null)}>Schließen</button>}>
   <div className="grid2">
    <input className="input" value={edit.username||''} onChange={e=>setEdit({...edit,username:e.target.value})} placeholder="Benutzername"/>
    <input className="input" value={edit.display_name||''} onChange={e=>setEdit({...edit,display_name:e.target.value})} placeholder="Anzeigename"/>
    <input className="input" value={edit.email||''} onChange={e=>setEdit({...edit,email:e.target.value})} placeholder="E-Mail" type="email"/>
    <input className="input" value={edit.password||''} onChange={e=>setEdit({...edit,password:e.target.value})} placeholder="Neues Passwort optional" type="password"/>
    <select className="input" value={edit.status||'active'} onChange={e=>setEdit({...edit,status:e.target.value})}><option value="active">active</option><option value="pending">pending</option><option value="blocked">blocked</option></select>
   </div>
   <div className="toolbarActions"><button className="btn" onClick={saveEdit}>Speichern</button></div>
  </Card>}
  {msg&&<Card title="Status"><p className="sub">{msg}</p></Card>}
 </>
}

export default function App(){
 const store=applyDemoSandboxStorePatch(useStore())
 const [role,setRole]=useState<Role>('guest')
 const [view,setView]=useState('dashboard')
 const [cid,setCid]=useState(ids.barber)
 const [activeAdmin,setActiveAdmin]=useState('DominiqueMM')
 const [mobileNavOpen,setMobileNavOpen]=useState(false)
 const [liveAuthChecked,setLiveAuthChecked]=useState(false)
 useEffect(()=>{if(typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('demo')){setLiveAuthChecked(true);return}(async()=>{try{const profile=await getCurrentUserProfile(); if(profile){markLiveMode();setRole(profile.role==='admin'?'admin':'customer'); if(profile.customer_id)setCid(profile.customer_id); setView('dashboard')}}finally{setLiveAuthChecked(true)}})()},[])
 const [adminAvatars,setAdminAvatars]=useState<any>({DominiqueMM:'',JanneMM:''})
 useEffect(()=>{const p=new URLSearchParams(window.location.search);const demo=p.get('demo');const c=p.get('customer');if(demo==='admin'){markDemoMode();setRole('admin');setActiveAdmin('DominiqueMM');setView('dashboard');return}if(c){if(demo==='customer')markDemoMode();setRole('customer');setCid(c);setView('dashboard')}},[])
 const admin=[
   'dashboard','admin_profiles','main_landing','demo_environment','crm','finance','tickets','booking','pipeline','automations','workflows','media','qr',
   'public_landing','loyalty','loyalty_rewards','loyalty_rules','staff_codes','loyalty_segments','smart_loyalty',
   'reviews','smart_automation','marketing_automation','ai_assistant','integrations','seo','heatmap','kpi',
   'customer_health','customer_intelligence','dynamic_billing','revenue_forecasting','revenue_share','package_recommendations','package_matrix','timeline_events',
   'business_audit','mini_audit','lead_scraper','acquisition_campaigns','offer_generator','contract_generator','output_engine','monthly_reports','onboarding','approvals','health_scores','dunning','health_center'
 ]
 const packageToolRoutes:any={
   'QR Kampagnen':'qr',
   'Öffentliche /l/[slug] Seite':'public_landing',
   'Loyalty Programm':'loyalty',
   'Rewards':'loyalty_rewards',
   'Reward Regeln':'loyalty_rules',
   'Mitarbeiter-Bestätigungscode':'staff_codes',
   'Loyalty Segmente':'loyalty_segments',
   'Smart Loyalty V2':'smart_loyalty',
   'Reviews':'reviews',
   'Review Intelligence':'review_intelligence',
   'Antwortvorlagen':'review_templates',
   'Smart Automation':'smart_automation',
   'Marketing Automation':'marketing_automation',
   'AI Business Assistant':'ai_assistant',
   'Customer Health':'customer_health',
   'Customer Intelligence':'customer_intelligence',
   'Dynamic Billing':'dynamic_billing',
   'Revenue Forecasting':'revenue_forecasting',
   'Revenue Share':'revenue_share',
   'Package Recommendations':'package_recommendations',
   'Paket-Matrix':'package_matrix',
   'Pipeline':'pipeline',
   'Timeline Events':'timeline_events',
   'Media Center':'media',
   'Integrationen':'integrations',
   'SEO Dashboard':'seo',
   'SEO Analytics':'seo',
   'SEO Heatmap':'heatmap',
   'Workflow Center':'customer_workflows',
   'KPI Analytics':'kpi',
   'Wissenscenter':'knowledge',
   'Wettbewerber Vergleich':'competitors',
   'Onboarding':'onboarding',
   'Reports':'reports',
   'Freigaben':'approvals',
   'Output Engine':'output_engine'
 }
 const customerBase=['dashboard','knowledge','onboarding','reports','approvals','finance','tickets','booking','packages']
 const packageRoutes=(packageDefs[cpkg(store.data,cid)]?.tools||[]).map((t:string)=>packageToolRoutes[t]).filter(Boolean)
 const accessRows=(store.data.customer_tool_access||[]).filter((x:any)=>x.customer_id===cid)
 const enabledRoutes=accessRows.filter((x:any)=>x.enabled!==false).map((x:any)=>packageToolRoutes[x.tool_key]||x.tool_key).filter(Boolean)
 const disabledRoutes=new Set(accessRows.filter((x:any)=>x.enabled===false).map((x:any)=>packageToolRoutes[x.tool_key]||x.tool_key).filter(Boolean))
 const customer=Array.from(new Set([...customerBase,...packageRoutes,...enabledRoutes])).filter((route:string)=>!disabledRoutes.has(route))
 const labels:any={
   dashboard:'Dashboard',admin_profiles:'Admin Profile',main_landing:'Haupt-Landingpage',crm:'CRM',finance:'Rechnungen',tickets:'Tickets',booking:'Booking',pipeline:'Pipeline',automations:'Automationen',workflows:'Workflows',activity:'Aktivitäten',media:'Media Center',qr:'QR Kampagnen',demo_customers:'Demo Kunden',demo_environment:'Demo Umgebung',integrations:'Integrationen',packages:'Pakete & Billing',
   public_landing:'Öffentliche /l/[slug] Seite',
   loyalty:'Loyalty Programm',
   loyalty_rewards:'Rewards',
   loyalty_rules:'Reward Regeln',
   staff_codes:'Mitarbeitercode',
   loyalty_segments:'Loyalty Segmente',
   smart_loyalty:'Smart Loyalty V2',
   reviews:'Reviews',
   review_intelligence:'Review Intelligence',
   review_templates:'Antwortvorlagen',
   smart_automation:'Smart Automation',
   marketing_automation:'Marketing Automation',
   ai_assistant:'AI Business Assistant',
   customer_health:'Customer Health',
   customer_intelligence:'Customer Intelligence',
   dynamic_billing:'Dynamic Billing',
   revenue_forecasting:'Revenue Forecasting',
   revenue_share:'Revenue Share',
   package_recommendations:'Package Recommendations',
   package_matrix:'Paket-Matrix',
   timeline_events:'Timeline Events',
   seo:'SEO Dashboard',review:'Review Funnel',customer_automations:'Automationen',customer_workflows:'Workflow Center',roles:'Rechte',kpi:'KPI Analytics',heatmap:'SEO Heatmap',success:'Client Success Score',advanced_reports:'Advanced Reports',
   knowledge:'Wissenscenter',competitors:'Wettbewerber Vergleich',onboarding:'Onboarding',reports:'Reports',approvals:'Freigaben',output_engine:'Output Engine',monthly_reports:'Monatsreport Generator',business_audit:'Google Business Audit',mini_audit:'Mini-Audit Generator',lead_scraper:'Lead Scraper',acquisition_campaigns:'Akquise-Kampagnen',offer_generator:'Angebotsgenerator',contract_generator:'Vertragsgenerator',health_scores:'Kunden-Erfolgsampel',dunning:'Mahnwesen',health_center:'Health Center'
 }
 const visibleNavKeys=role==='admin'?admin:customer
 const adminNavGroups=[
   {label:'Übersicht',hint:'Start, Landingpage, Revenue & interne Demo',tools:['dashboard','main_landing','demo_environment','revenue_forecasting','revenue_share']},
   {label:'System & Zugänge',hint:'Live-Adminprofile, Logins und Zugriff',tools:['admin_profiles','health_center']},
   {label:'CRM & Betrieb',hint:'Kunden, Onboarding, Termine, Tickets',tools:['crm','onboarding','finance','tickets','booking','pipeline','media','timeline_events','health_scores']},
   {label:'QR & Loyalty',hint:'QR-Code, Endkundenseite, Punkte, Rewards',tools:['qr','public_landing','loyalty','loyalty_rewards','loyalty_rules','staff_codes','loyalty_segments','smart_loyalty']},
   {label:'Reviews',hint:'Feedback, KI-Auswertung, Vorlagen',tools:['reviews']},
   {label:'Akquise & Sales',hint:'Audit, Leads, Angebote, Verträge',tools:['business_audit','mini_audit','lead_scraper','acquisition_campaigns','offer_generator','contract_generator','output_engine']},
   {label:'Automation & Marketing',hint:'Kampagnen, Regeln, AI Assistant',tools:['automations','workflows','smart_automation','marketing_automation','ai_assistant']},
   {label:'SEO & Analytics',hint:'Google/API, SEO, Heatmap, KPI',tools:['integrations','seo','heatmap','kpi','competitors','customer_health','customer_intelligence','dynamic_billing','revenue_forecasting','revenue_share','package_recommendations','package_matrix']},
   {label:'Reports & System',hint:'Reports, Output, Mahnwesen, Health',tools:['monthly_reports','approvals','dunning','health_center']}
 ]
 const customerNavGroups=[
   {label:'Übersicht',hint:'Portalstart',tools:['dashboard','onboarding','knowledge']},
   {label:'QR & Loyalty',hint:'QR, Endkundenseite, Punkte, Rewards',tools:['qr','public_landing','loyalty','loyalty_rewards','loyalty_rules','staff_codes','loyalty_segments','smart_loyalty']},
   {label:'Reviews',hint:'Bewertungen & Antworten',tools:['reviews']},
   {label:'Marketing & Automation',hint:'Workflows, Kampagnen & AI',tools:['customer_workflows','smart_automation','marketing_automation','ai_assistant']},
   {label:'Betrieb',hint:'Termine, Rechnungen, Tickets, Dateien',tools:['reports','approvals','booking','finance','tickets','media','packages']},
   {label:'SEO & Analytics',hint:'Integrationen, SEO, Heatmap, KPI',tools:['integrations','seo','heatmap','kpi','competitors','customer_health','customer_intelligence']}
 ]
 const navGroups=(role==='admin'?adminNavGroups:customerNavGroups)
   .map((g:any)=>({...g,tools:g.tools.filter((k:string)=>visibleNavKeys.includes(k))}))
   .filter((g:any)=>g.tools.length>0)
 if(role==='guest'){
  const lp=mainLandingSettings(store.data)
  return <ProfessionalLanding lp={lp} setRole={setRole} setActiveAdmin={setActiveAdmin}/>
 }
 const nav=role==='admin'?admin:customer
 const mobileBottomKeys=(role==='admin'?['dashboard','lead_scraper','acquisition_campaigns','crm','health_center']:['dashboard','seo','reviews','reports','finance']).filter((k:string)=>visibleNavKeys.includes(k))
 return <div className={`app appLike ${mobileNavOpen?'navOpen':''}`}><button className="mobileMenuBtn" onClick={()=>setMobileNavOpen(!mobileNavOpen)} aria-label={mobileNavOpen?'Menü schließen':'Menü öffnen'}>{mobileNavOpen?'✕':'☰'}</button><div className="mobileOverlay" onClick={()=>setMobileNavOpen(false)}></div><aside className="side"><div className="logo"><div className="mark">M</div><span>MMOS</span></div><div className="demoModeBadge">DEMO MODE</div>{role==='admin'&&view!=='demo_customers'&&<Search items={allCustomers(store.data)} value={cid} onChange={setCid} placeholder="Kundensuche"/>}<div className="navGroups">{navGroups.map((g:any)=><div className="navGroup" key={g.label}><div className="navGroupHead"><span>{g.label}</span><small>{g.hint}</small></div>{g.tools.map((k:string)=><button key={k} className={`nav ${view===k?'active':''}`} onClick={()=>{setView(k);setMobileNavOpen(false)}}>{labels[k]}</button>)}</div>)}</div><button className="nav" onClick={()=>{clearDemoSandbox();location.reload()}}>Demo zurücksetzen</button><button className="nav" onClick={async()=>{await supabaseAuth.auth.signOut();try{localStorage.removeItem('mmos_mode')}catch{};setRole('guest')}}>Logout</button></aside><main className="main appMainShell"><div className="top appMobileTop"><div className="mobileAppTitle"><div className="mobileAppIcon">M</div><div><strong>{labels[view]||'Dashboard'}</strong><span>{role==='admin'?'Admin App':'Kunden App'}</span></div></div><GlobalCustomerSearch store={store} role={role} setCid={setCid} setView={setView}/><div className="topActions"><NotificationBell store={store} cid={cid} role={role} activeAdmin={activeAdmin} adminAvatars={adminAvatars}/>{role==='admin'&&<AdminToggle activeAdmin={activeAdmin} setActiveAdmin={setActiveAdmin}/>}<ProfileUpload activeAdmin={role==='admin'?activeAdmin:cname(store.data,cid)} setAdminAvatars={setAdminAvatars} adminAvatars={adminAvatars}/><Badge>{role==='admin'?activeAdmin:'Kundenportal'} · {role==='customer'?cname(store.data,cid):'Global'}</Badge></div></div><Toast m={store.toast}/>
 <MobileContextStrip store={store} cid={cid} role={role} view={view} labels={labels} setView={setView} openMenu={()=>setMobileNavOpen(true)}/>
 {view==='dashboard'&&role==='admin'&&<ProductionStatusCard/>}
 {view==='dashboard'&&<Dashboard store={store} cid={cid} role={role} setCid={setCid} setView={setView} activeAdmin={activeAdmin}/>}
 {view==='main_landing'&&role==='admin'&&<MainLandingPageEditor store={store}/>}
 {view==='admin_profiles'&&role==='admin'&&<AdminProfilesManager/>}
 {view==='crm'&&role==='admin'&&<CRM store={store} cid={cid} activeAdmin={activeAdmin} adminAvatars={adminAvatars}/>}
 {view==='finance'&&<Finance store={store} cid={cid} role={role} activeAdmin={activeAdmin}/>}
 {view==='tickets'&&<Tickets store={store} cid={cid} role={role} activeAdmin={activeAdmin}/>}
 {view==='booking'&&<Booking store={store} cid={cid} role={role}/>}
 {view==='pipeline'&&role==='admin'&&<Pipeline store={store} cid={cid}/>}
 {view==='automations'&&role==='admin'&&<Automations store={store}/>}
 {view==='workflows'&&role==='admin'&&<Workflows store={store} cid={cid}/>}
 
 {view==='media'&&<MediaCenter store={store} cid={cid} setCid={setCid} role={role} activeAdmin={activeAdmin}/>}
 {view==='qr'&&<QRCodes store={store} cid={cid} setCid={role==='admin'?setCid:undefined} role={role}/>}
 {view==='demo_environment'&&role==='admin'&&<DemoEnvironment store={store} setView={setView}/>}
 {/* V30.1: Demo tool modules visible in Admin and Customer UI */}
 {['public_landing','loyalty','loyalty_rewards','loyalty_rules','staff_codes','loyalty_segments','smart_loyalty','reviews','smart_automation','marketing_automation','ai_assistant','customer_health','customer_intelligence','dynamic_billing','revenue_forecasting','revenue_share','package_recommendations','package_matrix','timeline_events'].includes(view)&&<V40ErrorBoundary moduleName={view}><V30ToolModule view={view} store={store} cid={cid} role={role} setCid={setCid}/></V40ErrorBoundary>}
 {view==='integrations'&&<Integrations store={store} cid={cid} role={role}/>}
 {view==='packages'&&role==='customer'&&<CustomerPackages store={store} cid={cid}/>} 
 {view==='seo'&&<CustomerSEO store={store} cid={cid}/>}
 {view==='review'&&role==='customer'&&<CustomerReview store={store} cid={cid}/>}
 {view==='customer_automations'&&role==='customer'&&<CustomerAutomations/>}
 {view==='customer_workflows'&&<CustomerWorkflows store={store} cid={cid}/>}
 {view==='roles'&&role==='customer'&&<CustomerRoles store={store} cid={cid}/>}
 {view==='kpi'&&<CustomerKPI store={store} cid={cid}/>}
 {view==='heatmap'&&<CustomerHeatmap store={store} cid={cid} role={role} setCid={setCid}/>}
 {view==='success'&&role==='customer'&&<CustomerSuccess/>}
 {view==='advanced_reports'&&role==='customer'&&<CustomerAdvancedReports/>}

 {view==='knowledge'&&<KnowledgeCenter store={store} cid={cid} role={role}/>}
 {view==='competitors'&&<LocalCompetitorComparison store={store} cid={cid} role={role}/>}
 {view==='business_audit'&&role==='admin'&&<GoogleBusinessAuditTool store={store} cid={cid}/>}
 {view==='mini_audit'&&role==='admin'&&<MiniAuditGenerator store={store} cid={cid}/>}
 {view==='lead_scraper'&&role==='admin'&&<LeadScraperTool store={store} setCid={setCid} setView={setView}/>}
 {view==='acquisition_campaigns'&&role==='admin'&&<AcquisitionCampaignCenter store={store} setCid={setCid} setView={setView}/>}
 {view==='offer_generator'&&role==='admin'&&<OfferGenerator store={store} cid={cid}/>}
 {view==='contract_generator'&&role==='admin'&&<ContractGenerator store={store} cid={cid}/>}
 {view==='health_scores'&&role==='admin'&&<CustomerSuccessTrafficLight store={store} setCid={setCid} setView={setView}/>}
 {view==='dunning'&&role==='admin'&&<DunningCenter store={store} setCid={setCid} setView={setView}/>}
 {view==='health_center'&&role==='admin'&&<HealthCenterV42 store={store}/>} 
 {view==='onboarding'&&<GuidedOnboardingCenter store={store} cid={cid} role={role} setCid={setCid} setView={setView}/>} 
 {view==='reports'&&<MonthlyReportCenter store={store} cid={cid} role={role}/>} 
 {view==='monthly_reports'&&role==='admin'&&<MonthlyReportCenter store={store} cid={cid} role={role}/>} 
 {view==='output_engine'&&role==='admin'&&<BrandOutputEngine store={store} cid={cid}/>} 
 {view==='approvals'&&<ApprovalCenter store={store} cid={cid} role={role}/>} 
 <MobileAppBottomNav role={role} view={view} keys={mobileBottomKeys} labels={labels} setView={setView} openMenu={()=>setMobileNavOpen(true)}/>
 </main></div>
}


function MobileContextStrip({store,cid,role,view,labels,setView,openMenu}:any){
 const customer=cobj(store.data,cid)
 const pkg=cpkg(store.data,cid)
 const isDemo=typeof window!=='undefined'&&((localStorage.getItem('mmos_mode')==='demo')||new URLSearchParams(window.location.search).has('demo'))
 const quicks=role==='admin'
  ?[{key:'dashboard',label:'Cockpit'},{key:'crm',label:'CRM'},{key:'lead_scraper',label:'Leads'},{key:'acquisition_campaigns',label:'Akquise'},{key:'health_center',label:'Health'}]
  :[{key:'dashboard',label:'Start'},{key:'seo',label:'SEO'},{key:'reviews',label:'Reviews'},{key:'reports',label:'Reports'},{key:'finance',label:'Rechnungen'}]
 return <div className="mobileContextStrip" aria-label="Mobiler Arbeitskontext">
  <div className="mobileContextCard">
   <span>{role==='admin'?'Aktiver Arbeitskontext':'Dein Kundenportal'}</span>
   <strong>{role==='admin'?`${customer?.name||'Global'} · ${labels[view]||view}`:`${customer?.name||'Kunde'} · ${pkg}`}</strong>
   <small>{isDemo?'Demo-/Fallback-Daten':'Live-Daten'} · Tippe unten auf „Mehr“ für alle Tools.</small>
  </div>
  <div className="mobileQuickRail">
   {quicks.map((q:any)=><button key={q.key} type="button" className={view===q.key?'active':''} onClick={()=>setView(q.key)}>{q.label}</button>)}
   <button type="button" onClick={openMenu}>Alle Tools</button>
  </div>
 </div>
}

function MobileAppBottomNav({role,view,keys,labels,setView,openMenu}:any){
 const icon:any={dashboard:'⌂',seo:'◌',reviews:'★',reports:'▤',finance:'€',lead_scraper:'◎',acquisition_campaigns:'↗',crm:'◍',health_center:'✓'}
 const short:any={dashboard:'Start',lead_scraper:'Leads',acquisition_campaigns:'Akquise',health_center:'Health'}
 return <nav className="mobileAppBottomNav" aria-label="Mobile App Navigation">{keys.map((k:string)=><button key={k} type="button" className={view===k?'active':''} onClick={()=>setView(k)}><span>{icon[k]||'•'}</span><small>{short[k]||labels[k]||k}</small></button>)}<button type="button" onClick={openMenu}><span>☰</span><small>Mehr</small></button></nav>
}













// V42.17 SALES, KNOWLEDGE & OPERATIONS TOOLS
function downloadTextFile(filename:string, content:string, mime='text/plain'){
 const blob=new Blob([content],{type:mime})
 const url=URL.createObjectURL(blob)
 const a=document.createElement('a')
 a.href=url
 a.download=safeFilename(filename.replace(/\.txt$/,''))+'.txt'
 a.click()
 setTimeout(()=>URL.revokeObjectURL(url),500)
}
function safeList(v:any){return Array.isArray(v)?v:[]}

// V42.19 Stability & Data Integrity helpers
const STATUS_OPTIONS:any={
 acquisition:['Neu','Audit geplant','Mini-Audit erstellt','Mini-Audit versendet','Kontakt aufgenommen','Follow-up offen','Angebot gesendet','Vertrag gesendet','Gewonnen','Verloren','Archiviert'],
 campaign:['Aktiv','Pausiert','Archiviert'],
 lead:['Neu','Qualifiziert','Kontaktiert','Als Kunde angelegt','Nicht geeignet','Archiviert'],
 audit:['Entwurf','Aus Kampagne','Erstellt','Geprüft','Archiviert'],
 mini_audit:['Erstellt','Versendet','Nachfassen','Erledigt','Archiviert'],
 offer:['Entwurf','Gesendet','Angenommen','Abgelehnt','Archiviert'],
 contract:['Entwurf','Freigegeben','Gesendet','Unterschrieben','Abgelehnt','Archiviert'],
 invoice:['Entwurf','Offen','Teilbezahlt','Bezahlt','Überfällig','Mahnung 1','Mahnung 2','Storniert','Archiviert'],
 dunning:['Vorbereitet','Gesendet','Erinnert','Bezahlt','Eskaliert','Archiviert'],
 pipeline:['Offen','Qualifiziert','Angebot gesendet','Gewonnen','Verloren','Archiviert'],
 report:['Entwurf','Freigegeben','Gesendet','Archiviert'],
 approval:['Offen','Freigegeben','Änderung gewünscht','Archiviert']
}
const STATUS_BADGE:any={Gewonnen:'green',Bezahlt:'green',Unterschrieben:'green',Angenommen:'green',Grün:'green',Verloren:'red',Abgelehnt:'red',Überfällig:'red','Mahnung 2':'red',Rot:'red','Mahnung 1':'yellow',Gesendet:'purple','Mini-Audit versendet':'purple','Angebot gesendet':'purple','Vertrag gesendet':'purple',Gelb:'yellow',Archiviert:'gray','Freigegeben':'green','Änderung gewünscht':'yellow'}
function statusBadge(v:any){return STATUS_BADGE[String(v||'')]||'purple'}
function normalizeStatus(kind:string,value:any){const opts=STATUS_OPTIONS[kind]||[];return opts.includes(value)?value:(opts[0]||String(value||'Neu'))}
function StatusSelect({kind,value,onChange,compact=true}:any){const opts=STATUS_OPTIONS[kind]||['Neu'];return <select className={compact?'input compactInput':'input'} value={normalizeStatus(kind,value)} onChange={e=>onChange(e.target.value)}>{opts.map((s:string)=><option key={s}>{s}</option>)}</select>}
function safeText(v:any,fallback=''){return String(v??fallback).trim()}
function safeFilename(v:any){return slugifyLocal(String(v||'export')).replace(/-+/g,'_')}
function v4219Export(title:string,body:string){return `Mecklenburg Marketing OS\n${title}\n${new Date().toLocaleString('de-DE')}\n${'-'.repeat(54)}\n\n${body}\n\n${'-'.repeat(54)}\nHinweis: Export aus MMOS. Bitte vor Versand prüfen.`}
function confirmAction(label:string){return typeof window==='undefined'||window.confirm(label)}
async function archiveOrRemove(store:any,table:string,row:any,label='Eintrag'){if(!row?.id)return;if(!confirmAction(`${label} wirklich archivieren?`))return; if(['prospect_leads','generated_offers','generated_contracts','dunning_cases','acquisition_campaigns','google_business_audits','mini_audits'].includes(table)){await store.update(table,row.id,{status:'Archiviert',stage:row.stage==='Gewonnen'||row.stage==='Verloren'?row.stage:'Archiviert',archived_at:new Date().toISOString()})}else await store.remove(table,row.id)}
function LocalLiveBadge(){return <Badge type={hasSupabase?'green':'yellow'}>{hasSupabase?'Live/Supabase':'Lokal/Fallback'}</Badge>}
function validateRequired(payload:any,fields:string[]){const missing=fields.filter(f=>!safeText(payload?.[f]));return {ok:missing.length===0,missing,message:missing.length?`Bitte ausfüllen: ${missing.join(', ')}`:''}}
function uniqueIds(ids:any[]){return Array.from(new Set(safeList(ids).filter(Boolean)))}
function cleanCampaignPayload(p:any){return {...p,name:safeText(p.name,'Neue Akquise-Kampagne'),branch:safeText(p.branch),city:safeText(p.city),goal:safeText(p.goal),channel:safeText(p.channel,'Telefon + E-Mail'),lead_ids:uniqueIds(p.lead_ids),follow_up_at:p.follow_up_at||new Date().toISOString().slice(0,10),stage:normalizeStatus('acquisition',p.stage||'Neu'),status:normalizeStatus('campaign',p.status||'Aktiv')}}
function healthColor(score:number){return score>=75?'Grün':score>=50?'Gelb':'Rot'}
function healthBadge(score:number){return score>=75?'green':score>=50?'yellow':'red'}
function customerHealthSnapshot(d:any,cid:string){
 const inv=safeList(d.invoices).filter((i:any)=>i.customer_id===cid)
 const openInv=inv.filter((i:any)=>['Offen','Überfällig','Mahnung 1','Mahnung 2'].includes(i.status||'')).length
 const openTickets=safeList(d.tickets).filter((t:any)=>t.customer_id===cid&&t.status!=='Geschlossen').length
 const integrations=safeList(d.integrations).filter((i:any)=>i.customer_id===cid&&String(i.status||'').toLowerCase().includes('verbunden')).length
 const reviews=safeList(d.review_feedback).filter((r:any)=>r.customer_id===cid).length
 const seo=safeList(d.seo_snapshots).filter((s:any)=>s.customer_id===cid).length
 let score=86-openInv*14-openTickets*8+(integrations?8:0)+(reviews?4:0)+(seo?4:0)
 score=Math.max(18,Math.min(100,score))
 const reasons=[
  openInv?`${openInv} offene Rechnung(en)`:'Rechnungen unkritisch',
  openTickets?`${openTickets} offene Tickets`:'Tickets unkritisch',
  integrations?'Integration verbunden':'Keine aktive Integration',
  seo?'SEO-Daten vorhanden':'Noch wenig SEO-Daten'
 ]
 return {score,status:healthColor(score),reasons,openInv,openTickets,integrations,seo}
}
function auditScoreFromPayload(p:any){
 let score=62
 if(p.website)score+=8
 if(p.google_url)score+=8
 if(p.category)score+=4
 if(p.reviews&&Number(p.reviews)>50)score+=6
 if(p.rating&&Number(p.rating)>=4.5)score+=6
 return Math.max(20,Math.min(96,score))
}

function KnowledgeCenter({store,cid,role}:any){
 const [q,setQ]=useState('')
 const [category,setCategory]=useState('Alle')
 const articles=safeList(store.data.knowledge_articles)
 const cats=['Alle',...Array.from(new Set(articles.map((a:any)=>a.category||'Allgemein')))]
 const filtered=articles.filter((a:any)=>{
  const hay=`${a.title} ${a.category} ${a.summary} ${a.content}`.toLowerCase()
  return (category==='Alle'||a.category===category)&&hay.includes(q.toLowerCase())
 })
 const [form,setForm]=useState<any>({title:'',category:'Google Business',summary:'',content:'',package_scope:'Alle'})
 async function addArticle(){
  if(!form.title.trim())return store.notify('Titel fehlt')
  await store.create('knowledge_articles',{...form,created_at:new Date().toISOString()})
  setForm({title:'',category:'Google Business',summary:'',content:'',package_scope:'Alle'})
 }
 return <><Head title="Kunden Wissenscenter" sub="Anleitungen, FAQ und kurze Handlungsempfehlungen für Kunden"/>
 <div className="grid2"><Card title="Wissen suchen"><input className="input" value={q} onChange={e=>setQ(e.target.value)} placeholder="Suche nach Google Bewertungen, QR, SEO, Öffnungszeiten..."/><select className="input" value={category} onChange={e=>setCategory(e.target.value)}>{cats.map((c:any)=><option key={c}>{c}</option>)}</select><div className="sub">Für Kunden als Self-Service-Hilfe. Für Admins als zentrale Wissensdatenbank.</div></Card>
 {role==='admin'&&<Card title="Artikel hinzufügen"><input className="input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Titel der Anleitung"/><input className="input" value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder="Kategorie, z. B. Google Business"/><input className="input" value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})} placeholder="Kurzbeschreibung für die Übersicht"/><textarea className="input textarea" value={form.content} onChange={e=>setForm({...form,content:e.target.value})} placeholder="Ausführliche Erklärung oder Schritt-für-Schritt-Anleitung"/><button className="btn" onClick={addArticle}>Artikel speichern</button></Card>}</div>
 <Card title="Artikel">{filtered.map((a:any)=><div className="item" key={a.id}><div><b>{a.title}</b><div className="sub">{a.category} · {a.package_scope||'Alle Pakete'} · {a.summary}</div><p className="sub">{a.content}</p></div>{role==='admin'&&<button className="btn secondary" onClick={()=>store.remove('knowledge_articles',a.id)}>Löschen</button>}</div>)}{filtered.length===0&&<div className="sub">Keine passenden Artikel gefunden.</div>}</Card></>
}

function LocalCompetitorComparison({store,cid,role}:any){
 const customer=cobj(store.data,cid)||{}
 const rows=safeList(store.data.competitor_benchmarks).filter((x:any)=>x.customer_id===cid)
 const avg=rows.length?Math.round(rows.reduce((s:number,x:any)=>s+Number(x.visibility||0),0)/rows.length):0
 const [form,setForm]=useState<any>({name:'',rating:'',reviews:'',visibility:'',profile_score:'',keywords:'',notes:''})
 async function add(){
  if(!form.name)return store.notify('Name des Wettbewerbers fehlt')
  await store.create('competitor_benchmarks',{customer_id:cid,...form,rating:Number(form.rating||0),reviews:Number(form.reviews||0),visibility:Number(form.visibility||0),profile_score:Number(form.profile_score||0),keywords:String(form.keywords||'').split(',').map((x:string)=>x.trim()).filter(Boolean)})
  setForm({name:'',rating:'',reviews:'',visibility:'',profile_score:'',keywords:'',notes:''})
 }
 return <><Head title="Lokaler Wettbewerber Vergleich" sub={`${customer.name||'Kunde'} · Bewertungen, Sichtbarkeit und Google-Profil-Stärke vergleichen`}/>
 <div className="grid4"><Metric label="Wettbewerber" value={rows.length}/><Metric label="Ø Sichtbarkeit" value={`${avg}%`}/><Metric label="Bester Score" value={rows.length?Math.max(...rows.map((r:any)=>Number(r.profile_score||0))):0}/><Metric label="Kundenpaket" value={cpkg(store.data,cid)}/></div>
 {role==='admin'&&<Card title="Wettbewerber hinzufügen"><div className="grid4"><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Name des lokalen Wettbewerbers"/><input className="input" type="number" value={form.rating} onChange={e=>setForm({...form,rating:e.target.value})} placeholder="Google Bewertung, z. B. 4.6"/><input className="input" type="number" value={form.reviews} onChange={e=>setForm({...form,reviews:e.target.value})} placeholder="Anzahl Bewertungen"/><input className="input" type="number" value={form.visibility} onChange={e=>setForm({...form,visibility:e.target.value})} placeholder="Sichtbarkeit 0-100"/></div><div className="grid2"><input className="input" type="number" value={form.profile_score} onChange={e=>setForm({...form,profile_score:e.target.value})} placeholder="Profil-Score 0-100"/><input className="input" value={form.keywords} onChange={e=>setForm({...form,keywords:e.target.value})} placeholder="Keywords kommagetrennt"/></div><textarea className="input textarea" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Notizen, Chancen oder Schwächen"/><button className="btn" onClick={add}>Vergleich speichern</button></Card>}
 <Card title="Vergleichstabelle">{rows.map((r:any)=><div className="item" key={r.id}><div><b>{r.name}</b><div className="sub">⭐ {r.rating||'-'} · {r.reviews||0} Bewertungen · Sichtbarkeit {r.visibility||0}% · Profil {r.profile_score||0}%</div><div className="sub">{safeList(r.keywords).join(', ')}</div><p className="sub">{r.notes}</p></div>{role==='admin'&&<button className="btn secondary" onClick={()=>store.remove('competitor_benchmarks',r.id)}>Löschen</button>}</div>)}{!rows.length&&<div className="sub">Noch keine Wettbewerber hinterlegt.</div>}</Card></>
}

function GoogleBusinessAuditTool({store,cid}:any){
 const c=cobj(store.data,cid)||{}
 const [form,setForm]=useState<any>({business_name:c.name||'',city:c.city||'',branch:c.branch||'',website:'',google_url:'',rating:'',reviews:''})
 const [msg,setMsg]=useState('')
 const audits=safeList(store.data.google_business_audits)
 async function runAudit(){
  setMsg('Audit wird erstellt...')
  try{
   const remote=await businessToolsClient.googleBusinessAudit({...form,customer_id:cid})
   const score=remote?.audit?.score||auditScoreFromPayload(form)
   const findings=remote?.audit?.findings||[
    'Google Business Leistungen und Kategorien prüfen',
    'Bewertungsantworten und Review-Frequenz verbessern',
    'Fotos, Beiträge und Öffnungszeiten regelmäßig aktualisieren'
   ]
   await store.create('google_business_audits',{customer_id:cid,business_name:form.business_name,city:form.city,branch:form.branch,website:form.website,google_url:form.google_url,rating:Number(form.rating||0),reviews:Number(form.reviews||0),score,status:'Geprüft',summary:remote?.audit?.summary||`Google Business Audit mit Score ${score}/100 erstellt.`,findings,created_at:new Date().toISOString()})
   setMsg('Audit erstellt und gespeichert.')
  }catch(e:any){
   const score=auditScoreFromPayload(form)
   await store.create('google_business_audits',{customer_id:cid,business_name:form.business_name,city:form.city,branch:form.branch,website:form.website,google_url:form.google_url,rating:Number(form.rating||0),reviews:Number(form.reviews||0),score,status:'Entwurf',summary:`Lokaler Audit-Fallback mit Score ${score}/100 erstellt.`,findings:['Google Places API nicht erreichbar oder nicht konfiguriert','Manuelle Profildaten wurden bewertet','Für Live-Daten GOOGLE_PLACES_API_KEY in Railway setzen'],created_at:new Date().toISOString()})
   setMsg(e.message||'Lokal gespeichert')
  }
 }
 return <><Head title="Google Business Audit Tool" sub="Akquise- und Bestandskunden-Audit für Google Business Optimierung" action={<button className="btn" onClick={runAudit}>Audit durchführen</button>}/>
 <div className="grid2"><Card title="Betrieb prüfen"><input className="input" value={form.business_name} onChange={e=>setForm({...form,business_name:e.target.value})} placeholder="Firmenname"/><input className="input" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} placeholder="Ort"/><input className="input" value={form.branch} onChange={e=>setForm({...form,branch:e.target.value})} placeholder="Branche"/><input className="input" value={form.website} onChange={e=>setForm({...form,website:e.target.value})} placeholder="Website URL, falls vorhanden"/><input className="input" value={form.google_url} onChange={e=>setForm({...form,google_url:e.target.value})} placeholder="Google Business / Maps Link, falls vorhanden"/><div className="grid2"><input className="input" type="number" value={form.rating} onChange={e=>setForm({...form,rating:e.target.value})} placeholder="Google Sterne, z. B. 4.4"/><input className="input" type="number" value={form.reviews} onChange={e=>setForm({...form,reviews:e.target.value})} placeholder="Anzahl Bewertungen"/></div>{msg&&<div className="sub">{msg}</div>}</Card><Card title="Bewertungskriterien"><div className="item"><b>Profil-Vollständigkeit</b><span>Kategorien, Leistungen, Öffnungszeiten, Beschreibung</span></div><div className="item"><b>Bewertungen</b><span>Sterne, Anzahl, Antwortquote, Review-Frequenz</span></div><div className="item"><b>Lokale SEO</b><span>Website, Keywords, Fotos, Beiträge, Aktionen</span></div></Card></div>
 <Card title="Gespeicherte Audits">{audits.filter((a:any)=>a.status!=='Archiviert').map((a:any)=><div className="item" key={a.id}><div><b>{a.business_name}</b><div className="sub">{a.city} · Score {a.score}/100 · {a.status}</div><p className="sub">{a.summary}</p></div><div className="toolbarActions"><StatusSelect kind="audit" value={a.status||'Entwurf'} onChange={(v:string)=>store.update('google_business_audits',a.id,{status:v})}/><button className="btn secondary" onClick={async()=>{await store.create('mini_audits',{customer_id:a.customer_id,audit_id:a.id,title:`Mini-Audit ${a.business_name}`,status:'Erstellt',recommendations:a.findings||[],created_at:new Date().toISOString()});setMsg('Mini-Audit erzeugt. Öffne den Mini-Audit Generator für PDF/Export.')}}>Mini-Audit erzeugen</button><button className="btn secondary" onClick={()=>archiveOrRemove(store,'google_business_audits',a,'Audit')}>Archivieren</button></div></div>)}</Card></>
}

function MiniAuditGenerator({store,cid}:any){
 const audits=safeList(store.data.google_business_audits).filter((a:any)=>a.customer_id===cid)
 const mini=safeList(store.data.mini_audits).filter((m:any)=>m.customer_id===cid)
 const [msg,setMsg]=useState('')
 async function generate(a:any){
  const recs=safeList(a.findings).length?safeList(a.findings):['Google Business Profil optimieren','Bewertungen aktiv sammeln','Neue Fotos und Beiträge veröffentlichen']
  await store.create('mini_audits',{customer_id:cid,audit_id:a.id,title:`Mini-Audit ${a.business_name}`,status:'Erstellt',recommendations:recs,created_at:new Date().toISOString()})
  setMsg(`Mini-Audit für ${a.business_name} erzeugt.`)
 }
 function body(m:any){const a=audits.find((x:any)=>x.id===m.audit_id)||{};return `<div class="section"><h2>Score</h2><p>${a.score||'-'}/100 · ${a.business_name||cname(store.data,cid)}</p></div><div class="section"><h2>Empfehlungen</h2><ol>${safeList(m.recommendations).map((r:any)=>`<li>${r}</li>`).join('')}</ol></div><div class="section"><h2>Nächster Schritt</h2><p>Google Business Optimierung, Bewertungs-Booster und lokale SEO-Basis durch Mecklenburg Marketing.</p></div>`}
 function text(m:any){
  const a=audits.find((x:any)=>x.id===m.audit_id)||{}
  return v4219Export('Mini-Audit', `Mini-Audit: ${m.title}
Status: ${m.status}

Score: ${a.score||'-'}/100
Betrieb: ${a.business_name||cname(store.data,cid)}

Wichtigste Empfehlungen:
${safeList(m.recommendations).map((r:any,i:number)=>`${i+1}. ${r}`).join('\n')}

Angebot: Google Business Optimierung durch Mecklenburg Marketing.`)
 }
 return <><Head title="Mini-Audit Generator" sub="Aus Google Business Audits verkaufsfähige 1-Seiten-Audits erzeugen"/>
 <Card title="Aus Audit erzeugen">{audits.map((a:any)=><div className="item" key={a.id}><div><b>{a.business_name}</b><span>Score {a.score}/100 · {a.summary}</span></div><button className="btn" onClick={()=>generate(a)}>Mini-Audit erstellen</button></div>)}{!audits.length&&<div className="sub">Noch kein Audit vorhanden. Erstelle zuerst einen Google Business Audit.</div>}{msg&&<div className="sub">{msg}</div>}</Card>
 <Card title="Mini-Audits">{mini.filter((m:any)=>m.status!=='Archiviert').map((m:any)=><div className="item" key={m.id}><div><b>{m.title}</b><div className="sub">{m.status} · {safeList(m.recommendations).join(' · ')}</div></div><div className="toolbarActions"><StatusSelect kind="mini_audit" value={m.status||'Erstellt'} onChange={(v:string)=>store.update('mini_audits',m.id,{status:v})}/><button className="btn secondary" onClick={()=>openPdfDocument(m.title,`Mini-Audit für ${cname(store.data,cid)}`,body(m),{status:m.status})}>PDF öffnen</button><button className="btn secondary" onClick={()=>downloadTextFile(`${m.title}.txt`,text(m))}>Export TXT</button><button className="btn secondary" onClick={()=>archiveOrRemove(store,'mini_audits',m,'Mini-Audit')}>Archivieren</button></div></div>)}</Card></>
}

function LeadScraperTool({store,setCid,setView}:any){
 const [form,setForm]=useState<any>({branch:'Friseur',city:'Schwerin',min_rating:'',max_reviews:'80',without_website:true})
 const [msg,setMsg]=useState('')
 const leads=safeList(store.data.prospect_leads).filter((l:any)=>l.status!=='Archiviert')
 async function search(){
  setMsg('Suche Leads...')
  try{
   const r=await businessToolsClient.leadSearch(form)
   const result=safeList(r?.leads)
   for(const lead of result){await store.create('prospect_leads',{...lead,status:'Neu',created_at:new Date().toISOString()})}
   setMsg(`${result.length} Leads importiert.`)
  }catch(e:any){
   const samples=['Musterbetrieb '+form.branch+' Mitte','Lokaler Anbieter '+form.city,'Studio '+form.city].map((name,i)=>({name,branch:form.branch,city:form.city,rating:4.1+i/10,reviews:28+i*17,website:i===0?'':'',score:86-i*8,status:'Neu',reasons:['Demo-Fallback','Google Places API nicht konfiguriert','Profil für Akquise geeignet']}))
   for(const lead of samples){await store.create('prospect_leads',{...lead,created_at:new Date().toISOString()})}
   setMsg('Live-Suche nicht verfügbar, Demo-Leads erzeugt. Für echte Daten GOOGLE_PLACES_API_KEY in Railway setzen.')
  }
 }
 async function convert(l:any){
  const c=await store.create('customers',{name:l.name,branch:l.branch,city:l.city,email:'',phone:'',address:'',package_name:'Starter',contact_person:'',is_demo:false})
  await store.create('customer_subscriptions',{customer_id:c.id,package_name:'Starter',status:'lead',price_monthly:199})
  setCid(c.id);setView('business_audit')
 }
 return <><Head title="Lead Scraper" sub="Google-Maps-/Places-basierte Lead-Recherche mit Demo-Fallback – nutzt GOOGLE_PLACES_API_KEY, kein aggressives Webseiten-Scraping" action={<div className="toolbarActions"><LocalLiveBadge/><button className="btn" onClick={search}>Lead-Suche starten</button></div>}/>
 <Card title="Suchparameter"><div className="grid4"><input className="input" value={form.branch} onChange={e=>setForm({...form,branch:e.target.value})} placeholder="Branche, z. B. Friseur, Beauty, Kiosk"/><input className="input" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} placeholder="Ort, z. B. Schwerin"/><input className="input" type="number" value={form.min_rating} onChange={e=>setForm({...form,min_rating:e.target.value})} placeholder="Mindestbewertung"/><input className="input" type="number" value={form.max_reviews} onChange={e=>setForm({...form,max_reviews:e.target.value})} placeholder="Max. Bewertungen"/></div><label className="checkline"><input type="checkbox" checked={form.without_website} onChange={e=>setForm({...form,without_website:e.target.checked})}/> Betriebe ohne Website bevorzugen</label>{msg&&<div className="sub">{msg}</div>}</Card>
 <Card title="Lead-Liste">{leads.map((l:any)=><div className="item" key={l.id}><div><b>{l.name}</b><div className="sub">{l.branch} · {l.city} · ⭐ {l.rating||'-'} · {l.reviews||0} Bewertungen · Score {l.score||0}</div><div className="sub">{safeList(l.reasons).join(' · ')}</div></div><div className="toolbarActions"><StatusSelect kind="lead" value={l.status||'Neu'} onChange={(v:string)=>store.update('prospect_leads',l.id,{status:v})}/><button className="btn secondary" onClick={()=>convert(l)}>Als Kunde anlegen</button><button className="btn secondary" onClick={()=>archiveOrRemove(store,'prospect_leads',l,'Lead')}>Archivieren</button></div></div>)}</Card></>
}


function AcquisitionCampaignCenter({store,setCid,setView}:any){
 const today=new Date().toISOString().slice(0,10)
 const stages=STATUS_OPTIONS.acquisition
 const campaigns=safeList(store.data.acquisition_campaigns).filter((c:any)=>c.status!=='Archiviert'&&c.stage!=='Archiviert')
 const archived=safeList(store.data.acquisition_campaigns).filter((c:any)=>c.status==='Archiviert'||c.stage==='Archiviert')
 const leads=safeList(store.data.prospect_leads).filter((l:any)=>l.status!=='Archiviert')
 const [statusFilter,setStatusFilter]=useState('Alle')
 const [form,setForm]=useState<any>({name:'Neue Akquise-Kampagne',branch:'Friseur',city:'Schwerin',goal:'5 qualifizierte Betriebe kontaktieren und 2 Mini-Audits versenden',channel:'Telefon + E-Mail',lead_ids:[],follow_up_at:today,notes:'Fokus auf Google Business Optimierung, Bewertungen und lokale Sichtbarkeit.'})
 const [msg,setMsg]=useState('')
 const activeCampaigns=campaigns.filter((c:any)=>!['Verloren','Gewonnen'].includes(c.stage))
 const followUps=campaigns.filter((c:any)=>String(c.follow_up_at||'').slice(0,10)<=today&&!['Gewonnen','Verloren'].includes(c.stage))
 const won=campaigns.filter((c:any)=>c.stage==='Gewonnen').length
 const filtered=campaigns.filter((c:any)=>statusFilter==='Alle'||c.stage===statusFilter||c.status===statusFilter)
 const campaignLeads=(c:any)=>uniqueIds(c.lead_ids).map((id:string)=>leads.find((l:any)=>l.id===id)||safeList(store.data.prospect_leads).find((l:any)=>l.id===id)).filter(Boolean)
 function toggleLead(id:string){setForm((p:any)=>({...p,lead_ids:p.lead_ids.includes(id)?p.lead_ids.filter((x:string)=>x!==id):[...p.lead_ids,id]}))}
 async function cleanupCampaigns(){let fixed=0;for(const c of safeList(store.data.acquisition_campaigns)){const next=uniqueIds(c.lead_ids).filter((id:string)=>safeList(store.data.prospect_leads).some((l:any)=>l.id===id&&l.status!=='Archiviert'));if(JSON.stringify(next)!==JSON.stringify(c.lead_ids||[])){fixed++;await store.update('acquisition_campaigns',c.id,{lead_ids:next})}}setMsg(fixed?`${fixed} Kampagne(n) bereinigt.`:'Keine verwaisten Leads gefunden.')}
 async function createCampaign(){
  const payload=cleanCampaignPayload({...form,status:'Aktiv',stage:'Neu',customer_ids:[],created_at:new Date().toISOString(),updated_at:new Date().toISOString()})
  const valid=validateRequired(payload,['name','branch','city','goal'])
  if(!valid.ok){setMsg(valid.message);return}
  if(payload.lead_ids.length===0&&!confirmAction('Kampagne ohne Leads erstellen?'))return
  await store.create('acquisition_campaigns',payload)
  setForm((p:any)=>({...p,name:'Neue Akquise-Kampagne',lead_ids:[]}))
  setMsg('Akquise-Kampagne erstellt und validiert.')
 }
 async function updateCampaign(c:any, patch:any){await store.update('acquisition_campaigns',c.id,cleanCampaignPayload({...c,...patch,updated_at:new Date().toISOString()}))}
 async function ensureCustomerForLead(l:any){
  if(l.customer_id){setCid(l.customer_id);return l.customer_id}
  const c=await store.create('customers',{name:l.name,branch:l.branch,city:l.city,email:l.email||'',phone:l.phone||'',address:l.address||'',website:l.website||'',package_name:'Starter',contact_person:'',is_demo:false,source:'Akquise-Kampagne'})
  await store.create('customer_subscriptions',{customer_id:c.id,package_name:'Starter',status:'lead',price_monthly:199})
  await store.update('prospect_leads',l.id,{customer_id:c.id,status:'Als Kunde angelegt'})
  setCid(c.id)
  return c.id
 }
 async function createAuditMiniForLead(l:any,campaign?:any){
  const customerId=await ensureCustomerForLead(l)
  const score=auditScoreFromPayload({website:l.website,rating:l.rating,reviews:l.reviews,branch:l.branch})
  const audit=await store.create('google_business_audits',{customer_id:customerId,prospect_lead_id:l.id,business_name:l.name,city:l.city,branch:l.branch,website:l.website,google_url:l.google_url,rating:Number(l.rating||0),reviews:Number(l.reviews||0),score,status:'Aus Kampagne',summary:`Akquise-Audit für ${l.name} mit ${score}/100 Punkten.`,findings:['Google Business Profil optimieren','Bewertungsstrategie aufbauen','Leistungen, Fotos und Beiträge regelmäßig pflegen'],created_at:new Date().toISOString()})
  await store.create('mini_audits',{customer_id:customerId,audit_id:audit.id,prospect_lead_id:l.id,title:`Mini-Audit ${l.name}`,status:'Erstellt',recommendations:['Google Business Profil vollständig pflegen','Bewertungen aktiv sammeln','lokale Sichtbarkeit mit Fotos, Beiträgen und Leistungen erhöhen'],created_at:new Date().toISOString()})
  if(campaign)await updateCampaign(campaign,{stage:'Mini-Audit erstellt',next_step:`Mini-Audit an ${l.name} versenden`})
  setMsg('Audit und Mini-Audit wurden erstellt.')
 }
 async function createOfferForLead(l:any,campaign?:any){
  const customerId=await ensureCustomerForLead(l)
  await store.create('generated_offers',{customer_id:customerId,prospect_lead_id:l.id,campaign_id:campaign?.id,title:`Angebot Google Business Optimierung für ${l.name}`,package_name:'Growth',amount:499,setup_fee:249,status:'Entwurf',services:['Google Business Optimierung','Bewertungsaufbau','lokale SEO-Grundbetreuung','SEO Dashboard und Monatsauswertung'],created_at:new Date().toISOString()})
  await store.create('offers',{customer_id:customerId,title:`Akquise: ${l.name}`,package_name:'Growth',amount:499,status:'Angebot gesendet',probability:45,created_at:new Date().toISOString()})
  if(campaign)await updateCampaign(campaign,{stage:'Angebot gesendet',next_step:`Angebot für ${l.name} nachfassen`})
  setCid(customerId);setMsg('Angebot und Pipeline-Eintrag vorbereitet.')
 }
 async function createContractForLead(l:any,campaign?:any){
  const customerId=await ensureCustomerForLead(l)
  await store.create('generated_contracts',{customer_id:customerId,prospect_lead_id:l.id,campaign_id:campaign?.id,title:`Dienstleistungsvertrag Growth Paket – ${l.name}`,package_name:'Growth',term:'monatlich kündbar mit 30 Tagen Frist',scope:'Google Business Optimierung, lokales SEO, Bewertungsmanagement, Kundenportal und vereinbarte Paketleistungen',dpa:'AVV/Datenschutz-Hinweis erforderlich',status:'Entwurf',created_at:new Date().toISOString()})
  if(campaign)await updateCampaign(campaign,{stage:'Vertrag gesendet',next_step:`Vertrag bei ${l.name} nachfassen`})
  setCid(customerId);setMsg('Vertragsentwurf vorbereitet.')
 }
 function outreachText(c:any){
  const list=campaignLeads(c)
  const body=`Akquise-Kampagne: ${c.name}\nBranche/Ort: ${c.branch || '-'} / ${c.city || '-'}\nZiel: ${c.goal || '-'}\nKanal: ${c.channel || '-'}\nStatus: ${c.stage || c.status}\nFollow-up: ${c.follow_up_at || '-'}\n\nLeads:\n${list.map((l:any,i:number)=>`${i+1}. ${l.name} · ${l.city || ''} · ${l.reviews || 0} Bewertungen · Score ${l.score || '-'}`).join('\n')}\n\nTelefon-Skript:\nGuten Tag, hier ist Dominique von Mecklenburg Marketing. Mir ist aufgefallen, dass Ihr Google-Unternehmensprofil noch Potenzial bei Sichtbarkeit, Bewertungen und Kundenanfragen hat. Ich habe dazu einen kurzen Mini-Audit vorbereitet und würde Ihnen gern 2–3 konkrete Verbesserungen zeigen.\n\nE-Mail/WhatsApp:\nHallo ${list[0]?.name || 'zusammen'}, ich habe Ihr Google Business Profil kurz geprüft. Dabei sind mir konkrete Chancen aufgefallen, mit denen Sie lokal sichtbarer werden und mehr Anfragen erhalten können. Ich sende Ihnen gern einen kurzen Mini-Audit mit den wichtigsten Punkten.`
  return v4219Export('Akquise-Kampagnen-Export',body)
 }
 const openLeadCount=leads.filter((l:any)=>!l.customer_id).length
 return <><Head title="Akquise-Kampagnen-Center" sub="Leads, Audits, Mini-Audits, Angebote und Verträge in einem Akquise-Workflow verbinden" action={<div className="toolbarActions"><LocalLiveBadge/><button className="btn" onClick={createCampaign}>Kampagne erstellen</button></div>}/>
 <div className="grid4"><Metric label="Aktive Kampagnen" value={activeCampaigns.length}/><Metric label="Offene Leads" value={openLeadCount}/><Metric label="Follow-ups fällig" value={followUps.length}/><Metric label="Archiviert" value={archived.length}/></div>
 <Card title="V42.19 Datenintegrität"><div className="toolbarActions"><button className="btn secondary" onClick={cleanupCampaigns}>Verwaiste Leads bereinigen</button><button className="btn secondary" onClick={()=>setView('health_center')}>Health Center öffnen</button></div><div className="sub">Statuswerte laufen jetzt über Dropdowns. Doppelte Lead-IDs und gelöschte Leads werden bereinigt.</div>{msg&&<div className="sub">{msg}</div>}</Card>
 <div className="grid2"><Card title="Neue Kampagne planen"><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Kampagnenname, z. B. Friseur-Schwerin Google Business Sprint"/><div className="grid3"><input className="input" value={form.branch} onChange={e=>setForm({...form,branch:e.target.value})} placeholder="Zielbranche"/><input className="input" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} placeholder="Zielort"/><input className="input" type="date" value={form.follow_up_at} onChange={e=>setForm({...form,follow_up_at:e.target.value})}/></div><input className="input" value={form.channel} onChange={e=>setForm({...form,channel:e.target.value})} placeholder="Kontaktkanal, z. B. Telefon + E-Mail"/><textarea className="input textarea" value={form.goal} onChange={e=>setForm({...form,goal:e.target.value})} placeholder="Kampagnenziel"/><textarea className="input textarea" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Notizen, Positionierung oder Angebotsschwerpunkt"/><div className="toolbarActions"><button className="btn" onClick={createCampaign}>Kampagne erstellen</button><button className="btn secondary" onClick={()=>setView('lead_scraper')}>Lead Scraper öffnen</button></div></Card>
 <Card title="Leads für Kampagne auswählen">{leads.length===0&&<div className="sub">Noch keine Leads vorhanden. Starte zuerst eine Lead-Suche.</div>}{leads.slice(0,12).map((l:any)=><label className="item" key={l.id}><span><b>{l.name}</b><div className="sub">{l.branch} · {l.city} · ⭐ {l.rating||'-'} · {l.reviews||0} Bewertungen · Score {l.score||'-'}</div></span><input type="checkbox" checked={form.lead_ids.includes(l.id)} onChange={()=>toggleLead(l.id)}/></label>)}</Card></div>
 <Card title="Kampagnen-Board" action={<StatusSelect kind="acquisition" value={statusFilter==='Alle'?'Neu':statusFilter} onChange={(v:string)=>setStatusFilter(v)}/>}>{statusFilter!=='Alle'&&<button className="btn secondary" onClick={()=>setStatusFilter('Alle')}>Alle anzeigen</button>}{filtered.length===0&&<div className="sub">Keine Kampagne im aktuellen Filter.</div>}{filtered.map((c:any)=><div className="v42PackageEdit" key={c.id}><div className="item"><div><b>{c.name}</b><div className="sub">{c.branch || 'Branche offen'} · {c.city || 'Ort offen'} · {c.channel || 'Kanal offen'} · Follow-up {c.follow_up_at || '-'}</div><p className="sub">{c.goal}</p></div><div className="toolbarActions"><Badge type={statusBadge(c.stage)}>{c.stage||c.status}</Badge><StatusSelect kind="acquisition" value={c.stage||'Neu'} onChange={(v:string)=>updateCampaign(c,{stage:v})}/></div></div><div className="grid2"><Card title="Verknüpfte Leads">{campaignLeads(c).length===0&&<div className="sub">Keine aktiven Leads verknüpft.</div>}{campaignLeads(c).map((l:any)=><div className="item" key={l.id}><div><b>{l.name}</b><div className="sub">{l.branch} · {l.city} · Score {l.score||'-'} · Status {l.status||'Neu'}</div></div><div className="toolbarActions"><button className="btn secondary" onClick={()=>createAuditMiniForLead(l,c)}>Audit + Mini</button><button className="btn secondary" onClick={()=>createOfferForLead(l,c)}>Angebot</button><button className="btn secondary" onClick={()=>createContractForLead(l,c)}>Vertrag</button></div></div>)}</Card><Card title="Nächster Schritt & Export"><input className="input" value={c.next_step||''} onChange={e=>updateCampaign(c,{next_step:e.target.value})} placeholder="Nächster Schritt"/><input className="input" type="date" value={String(c.follow_up_at||'').slice(0,10)} onChange={e=>updateCampaign(c,{follow_up_at:e.target.value})}/><textarea className="input textarea" value={c.notes||''} onChange={e=>updateCampaign(c,{notes:e.target.value})} placeholder="Notizen"/><div className="toolbarActions"><button className="btn secondary" onClick={()=>downloadTextFile(`${c.name}.txt`,outreachText(c))}>Kampagne exportieren</button><button className="btn secondary" onClick={()=>updateCampaign(c,{stage:'Follow-up offen',follow_up_at:today})}>Follow-up heute</button><button className="btn secondary" onClick={()=>archiveOrRemove(store,'acquisition_campaigns',c,'Kampagne')}>Archivieren</button></div></Card></div></div>)}</Card>
 </>
}

function OfferGenerator({store,cid}:any){
 const c=cobj(store.data,cid)||{}
 const [form,setForm]=useState<any>({title:`Angebot für ${c.name||'Kunde'}`,package_name:cpkg(store.data,cid),amount:pprice(cpkg(store.data,cid)),setup_fee:249,services:['Google Business Optimierung','SEO Dashboard','Bewertungsmanagement']})
 const offers=safeList(store.data.generated_offers).filter((o:any)=>o.customer_id===cid&&o.status!=='Archiviert')
 const [msg,setMsg]=useState('')
 async function createOffer(){const valid=validateRequired(form,['title','package_name']); if(!valid.ok){setMsg(valid.message);return} await store.create('generated_offers',{customer_id:cid,...form,amount:Number(form.amount||0),setup_fee:Number(form.setup_fee||0),status:'Entwurf',created_at:new Date().toISOString()});setMsg('Angebot erstellt.')}
 function offerText(o:any){return v4219Export('Angebot',`Angebot: ${o.title}\nKunde: ${cname(store.data,o.customer_id)}\nPaket: ${o.package_name}\nMonatlich: ${eur(o.amount)}\nEinrichtung: ${eur(o.setup_fee||0)}\nStatus: ${o.status}\n\nLeistungen:\n${safeList(o.services).map((s:any)=>'- '+s).join('\n')}\n\nMecklenburg Marketing · Google Business Optimierung · lokale SEO · Reviews`)}
 return <><Head title="Angebotsgenerator" sub="Aus Paket, Kunde und Zusatzleistungen ein Angebotsdokument erzeugen" action={<div className="toolbarActions"><LocalLiveBadge/><button className="btn" onClick={createOffer}>Angebot erstellen</button></div>}/>
 <Card title="Angebot konfigurieren"><input className="input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Angebotstitel"/><div className="grid3"><select className="input" value={form.package_name} onChange={e=>setForm({...form,package_name:e.target.value,amount:pprice(e.target.value)})}>{Object.keys(packageDefs).map(p=><option key={p}>{p}</option>)}</select><input className="input" type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="Monatlicher Preis"/><input className="input" type="number" value={form.setup_fee} onChange={e=>setForm({...form,setup_fee:e.target.value})} placeholder="Einrichtungsgebühr"/></div><textarea className="input textarea" value={safeList(form.services).join('\n')} onChange={e=>setForm({...form,services:e.target.value.split('\n').filter(Boolean)})} placeholder="Leistungen, je Zeile eine"/>{msg&&<div className="sub">{msg}</div>}</Card>
 <Card title="Gespeicherte Angebote">{offers.map((o:any)=><div className="item" key={o.id}><div><b>{o.title}</b><div className="sub">{o.package_name} · {eur(o.amount)} mtl. · Setup {eur(o.setup_fee||0)} · {o.status}</div></div><div className="toolbarActions"><StatusSelect kind="offer" value={o.status||'Entwurf'} onChange={(v:string)=>store.update('generated_offers',o.id,{status:v})}/><button className="btn secondary" onClick={()=>downloadTextFile(`${o.title}.txt`,offerText(o))}>Export TXT</button><button className="btn secondary" onClick={()=>archiveOrRemove(store,'generated_offers',o,'Angebot')}>Archivieren</button></div></div>)}</Card></>
}

function ContractGenerator({store,cid}:any){
 const [form,setForm]=useState<any>({title:`Dienstleistungsvertrag ${cname(store.data,cid)}`,package_name:cpkg(store.data,cid),term:'monatlich kündbar mit 30 Tagen Frist',scope:'Google Business Optimierung, lokales SEO, Kundenportal und vereinbarte Paketleistungen',dpa:'AVV/Datenschutz-Hinweis erforderlich'})
 const contracts=safeList(store.data.generated_contracts).filter((x:any)=>x.customer_id===cid&&x.status!=='Archiviert')
 const [msg,setMsg]=useState('')
 async function createContract(){const valid=validateRequired(form,['title','package_name','scope']); if(!valid.ok){setMsg(valid.message);return} await store.create('generated_contracts',{customer_id:cid,...form,status:'Entwurf',created_at:new Date().toISOString()});setMsg('Vertragsentwurf erstellt.')}
 function contractText(cn:any){return v4219Export('Vertragsentwurf',`Dienstleistungsvertrag\n\nAuftragnehmer: Mecklenburg Marketing\nAuftraggeber: ${cname(store.data,cn.customer_id)}\nPaket: ${cn.package_name}\nStatus: ${cn.status}\nLaufzeit/Kündigung: ${cn.term}\n\nLeistungsumfang:\n${cn.scope}\n\nDatenschutz:\n${cn.dpa}\n\nHinweis: Finale rechtliche Prüfung empfohlen.`)}
 return <><Head title="Vertragsgenerator" sub="Paketbezogene Vertragsentwürfe mit Leistungsumfang und Datenschutz-Hinweis" action={<div className="toolbarActions"><LocalLiveBadge/><button className="btn" onClick={createContract}>Vertrag erstellen</button></div>}/>
 <Card title="Vertrag konfigurieren"><input className="input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Vertragstitel"/><select className="input" value={form.package_name} onChange={e=>setForm({...form,package_name:e.target.value})}>{Object.keys(packageDefs).map(p=><option key={p}>{p}</option>)}</select><input className="input" value={form.term} onChange={e=>setForm({...form,term:e.target.value})} placeholder="Laufzeit/Kündigung"/><textarea className="input textarea" value={form.scope} onChange={e=>setForm({...form,scope:e.target.value})} placeholder="Leistungsumfang"/><textarea className="input textarea" value={form.dpa} onChange={e=>setForm({...form,dpa:e.target.value})} placeholder="Datenschutz / AVV Hinweis"/>{msg&&<div className="sub">{msg}</div>}</Card>
 <Card title="Vertragsentwürfe">{contracts.map((cn:any)=><div className="item" key={cn.id}><div><b>{cn.title}</b><div className="sub">{cn.package_name} · {cn.status}</div></div><div className="toolbarActions"><StatusSelect kind="contract" value={cn.status||'Entwurf'} onChange={(v:string)=>store.update('generated_contracts',cn.id,{status:v})}/><button className="btn secondary" onClick={()=>downloadTextFile(`${cn.title}.txt`,contractText(cn))}>Export TXT</button><button className="btn secondary" onClick={()=>archiveOrRemove(store,'generated_contracts',cn,'Vertrag')}>Archivieren</button></div></div>)}</Card></>
}

function CustomerSuccessTrafficLight({store,setCid,setView}:any){
 const [msg,setMsg]=useState('')
 const rows=allCustomers(store.data).filter((c:any)=>!c.is_demo).map((c:any)=>{
  const existing=safeList(store.data.customer_health_scores).filter((x:any)=>x.customer_id===c.id).at(-1)
  const calc=customerHealthSnapshot(store.data,c.id)
  return {customer:c,...calc,stored:existing}
 }).sort((a:any,b:any)=>a.score-b.score)
 async function saveSnapshot(r:any){
  try{
   await store.create('customer_health_scores',{customer_id:r.customer.id,score:r.score,status:r.status,reasons:r.reasons,created_at:new Date().toISOString()})
   setMsg(`Snapshot für ${r.customer.name} gespeichert.`)
  }catch(e:any){setMsg(e.message||'Snapshot konnte nicht gespeichert werden.')}
 }
 return <><Head title="Kunden-Erfolgsampel" sub="Frühwarnsystem für Kündigungsrisiko, offene Themen und Upsell-Chancen"/>
 <div className="grid4"><Metric label="Rot" value={rows.filter((r:any)=>r.status==='Rot').length}/><Metric label="Gelb" value={rows.filter((r:any)=>r.status==='Gelb').length}/><Metric label="Grün" value={rows.filter((r:any)=>r.status==='Grün').length}/><Metric label="Kunden" value={rows.length}/></div>
 <Card title="Ampelübersicht">{rows.map((r:any)=><div className="item" key={r.customer.id}><div><b>{r.customer.name}</b><div className="sub">Score {r.score}/100 · {r.reasons.join(' · ')}</div>{r.stored&&<div className="sub">Letzter Snapshot: {new Date(r.stored.created_at).toLocaleDateString('de-DE')} · {r.stored.status}</div>}</div><div className="toolbarActions"><Badge type={healthBadge(r.score)}>{r.status}</Badge><button className="btn secondary" onClick={()=>saveSnapshot(r)}>Snapshot speichern</button><button className="btn secondary" onClick={()=>{setCid(r.customer.id);setView('crm')}}>Kundenakte</button></div></div>)}{msg&&<div className="sub">{msg}</div>}</Card></>
}

function DunningCenter({store,setCid,setView}:any){
 const invoices=safeList(store.data.invoices).filter((i:any)=>STATUS_OPTIONS.invoice.includes(i.status||'')&&!['Bezahlt','Storniert','Archiviert'].includes(i.status||''))
 async function prepare(i:any){
  const level=i.status==='Mahnung 2'?3:i.status==='Mahnung 1'?2:1
  await store.create('dunning_cases',{invoice_id:i.id,customer_id:i.customer_id,level,status:'Vorbereitet',due_date:new Date(Date.now()+7*86400000).toISOString().slice(0,10),message:`Zahlungserinnerung Stufe ${level} für ${i.invoice_number}`,created_at:new Date().toISOString()})
 }
 const cases=safeList(store.data.dunning_cases).filter((c:any)=>c.status!=='Archiviert')
 function dunningText(c:any){return v4219Export('Mahnung / Zahlungserinnerung',`${c.message}\n\nSehr geehrte Damen und Herren,\nbitte gleichen Sie die offene Rechnung zeitnah aus. Bei Rückfragen melden Sie sich gerne.\n\nMecklenburg Marketing`)}
 return <><Head title="Rechnungs- und Mahnwesen" sub="Offene Rechnungen überwachen, Zahlungserinnerungen vorbereiten und Status per Dropdown ändern"/>
 <Card title="Offene Rechnungen">{invoices.map((i:any)=><div className="item" key={i.id}><div><b>{i.invoice_number}</b><div className="sub">{cname(store.data,i.customer_id)} · {eur(i.amount)} · {i.status}</div></div><div className="toolbarActions"><StatusSelect kind="invoice" value={i.status||'Offen'} onChange={(v:string)=>store.update('invoices',i.id,{status:v})}/><button className="btn secondary" onClick={()=>prepare(i)}>Mahnung vorbereiten</button><button className="btn secondary" onClick={()=>{setCid(i.customer_id);setView('finance')}}>Rechnungen</button></div></div>)}</Card>
 <Card title="Mahnfälle">{cases.map((c:any)=><div className="item" key={c.id}><div><b>{c.message}</b><div className="sub">{cname(store.data,c.customer_id)} · Stufe {c.level} · Fällig bis {c.due_date} · {c.status}</div></div><div className="toolbarActions"><StatusSelect kind="dunning" value={c.status||'Vorbereitet'} onChange={(v:string)=>store.update('dunning_cases',c.id,{status:v})}/><button className="btn secondary" onClick={()=>downloadTextFile(`Mahnung_${c.invoice_id}.txt`,dunningText(c))}>Text exportieren</button><button className="btn secondary" onClick={()=>archiveOrRemove(store,'dunning_cases',c,'Mahnfall')}>Archivieren</button></div></div>)}</Card></>
}

function HealthCenterV42({store}:any){
 const [ready,setReady]=useState<any>(null)
 const [schema,setSchema]=useState<any>(null)
 const [bt,setBt]=useState<any>(null)
 const [integrations,setIntegrations]=useState<any>(null)
 const [msg,setMsg]=useState('')
 async function run(){
  setMsg('Prüfe System...')
  try{setReady(await systemReady())}catch(e:any){setReady({ok:false,error:e.message})}
  try{setSchema(await systemSchema())}catch(e:any){setSchema({ok:false,error:e.message})}
  try{setBt(await businessToolsClient.health())}catch(e:any){setBt({ok:false,error:e.message})}
  try{setIntegrations(await integrationStatus())}catch(e:any){setIntegrations({ok:false,error:e.message})}
  setMsg('Prüfung abgeschlossen')
 }
 useEffect(()=>{run()},[])
 const migrations=[
  {version:'V42.14',file:'SQL_LANDING_PAGE_SETTINGS_V42_14.sql',tables:['landing_page_settings']},
  {version:'V42.16',file:'SQL_V42_16_STABILITY_INTEGRATION_STATUS.sql',tables:['integrations','oauth_tokens']},
  {version:'V42.17',file:'SQL_V42_17_BUSINESS_TOOLS.sql',tables:['knowledge_articles','competitor_benchmarks','google_business_audits','mini_audits','prospect_leads','generated_offers','generated_contracts','dunning_cases','customer_health_scores']},
  {version:'V42.18',file:'SQL_V42_18_AKQUISE_KAMPAGNEN_CENTER.sql',tables:['acquisition_campaigns']},
  {version:'V42.19',file:'SQL_V42_19_STABILITY_DATA_INTEGRITY.sql',tables:['activity_logs','api_usage_cache','data_integrity_checks']},
  {version:'V42.20',file:'SQL_V42_20_PROFESSIONAL_CX_OUTPUT.sql',tables:['onboarding_checklists','monthly_reports','approval_requests','output_documents']},
  {version:'V42.21.3',file:'SQL_V42_21_3_CUSTOMER_LOGIN_APPROVAL.sql',tables:['customer_registrations','customer_invites','customer_users','user_profiles']},
  {version:'V42.21.4',file:'SQL_V42_21_4_LIVE_ADMIN_PROFILES.sql',tables:['user_profiles']},
  {version:'V42.21.5',file:'SQL_V42_21_5_INTERNAL_DEMO_ACCESS.sql',tables:['landing_page_settings']},
  {version:'V42.23',file:'SQL_V42_23_STABILITY_PRODUCTION_READINESS.sql',tables:['activity_logs','api_usage_cache','data_integrity_checks','customer_invites','user_profiles']}
 ]
 const missing=Array.isArray(schema?.missing)?schema.missing:[]
 const migrationRows=migrations.map(m=>({...m,missing:m.tables.filter(t=>missing.includes(t)),local:m.tables.every(t=>Array.isArray(store.data[t]))}))
 const localTables=Array.from(new Set(migrations.flatMap(m=>m.tables)))
 const activity=safeList(store.data.activity_logs).slice(0,8)
 return <><Head title="Health Center" sub="Systemstatus, Migrationen, Live/Lokal-Status, API-Keys und Datenintegrität" action={<div className="toolbarActions"><LocalLiveBadge/><button className="btn" onClick={run}>Neu prüfen</button></div>}/>
 <div className="grid4"><Metric label="Backend" value={ready?.ok?'OK':'Prüfen'}/><Metric label="Schema" value={missing.length?`${missing.length} fehlt`:'OK'}/><Metric label="Business Tools" value={bt?.ok?'OK':'Fallback'}/><Metric label="Aktivitäten" value={safeList(store.data.activity_logs).length}/></div>
 <div className="grid2"><Card title="Backend / Supabase"><pre className="codeBox">{JSON.stringify(ready,null,2)}</pre></Card><Card title="Business Tools & ENV"><pre className="codeBox">{JSON.stringify(bt,null,2)}</pre><div className="sub">Live Lead-Suche und echte Places-Daten benötigen GOOGLE_PLACES_API_KEY in Railway. Ohne Key arbeitet das System mit Demo-/Fallback-Modus.</div>{msg&&<div className="sub">{msg}</div>}</Card></div>
 <Card title="Migrationen & SQL-Status">{migrationRows.map((m:any)=><div className="item" key={m.version}><div><b>{m.version} · {m.file}</b><div className="sub">Tabellen: {m.tables.join(', ')}</div>{m.missing.length>0&&<div className="sub">Fehlend laut Backend: {m.missing.join(', ')}</div>}</div><Badge type={m.missing.length?'yellow':'green'}>{m.missing.length?'prüfen':'OK'}</Badge></div>)}</Card>
 <Card title="Live/Lokal Datenzählung">{localTables.map(t=><div className="item" key={t}><b>{t}</b><span>{safeList(store.data[t]).length} Einträge</span><Badge type={Array.isArray(store.data[t])?'green':'yellow'}>{Array.isArray(store.data[t])?'verfügbar':'nicht geladen'}</Badge></div>)}</Card>
 <Card title="Aktivitätslog">{activity.length===0&&<div className="sub">Noch keine kritischen Aktionen protokolliert.</div>}{activity.map((a:any)=><div className="item" key={a.id}><div><b>{a.title||a.type}</b><div className="sub">{a.ref_table||a.type} · {new Date(a.created_at).toLocaleString('de-DE')}</div></div><Badge type={a.severity==='warning'?'yellow':'green'}>{a.type||'log'}</Badge></div>)}</Card>
 
<Card title="Integrationen & ENV-Status">{integrations?['google_oauth','google_places','gotenberg','mail'].map((k:string)=>{const row=integrations[k]||{};return <div className="item" key={k}><div><b>{k}</b><div className="sub">{row.purpose||'Integration'}</div>{Array.isArray(row.missing_env)&&row.missing_env.length>0&&<div className="sub">Fehlt: {row.missing_env.join(', ')}</div>}</div><Badge type={row.connected?'green':'yellow'}>{row.connected?'bereit':'prüfen'}</Badge></div>}):<div className="sub">Noch nicht geprüft.</div>}</Card>
<Card title="Schema Rohdaten"><pre className="codeBox">{JSON.stringify(schema,null,2)}</pre></Card></>
}

function V42BackendStatus(){
 const [status,setStatus]=useState<any>(null)
 const [msg,setMsg]=useState('')
 useEffect(()=>{v33FunctionalClient.health().then((r:any)=>setStatus(r)).catch((e:any)=>setMsg(e.message))},[])
 return <Card title="Backend Verbindung"><div className="sub">{status?.ok?'Backend erreichbar':msg||'Prüfe Verbindung...'}</div>{!status?.ok&&<div className="v42Warning">Wenn überall „fetch failed“ erscheint: Browser-Clients muessen Same-Origin /api nutzen; BACKEND_URL bleibt serverseitig in Vercel.</div>}</Card>
}

function V42CustomerLoyaltySettings({cid}:any){
 const [data,setData]=useState<any>(null)
 const [msg,setMsg]=useState('')
 const [form,setForm]=useState<any>({staff_code:'',staff_label:'',points_per_scan:'',daily_scan_limit:'',weekly_scan_limit:''})
 const [rule,setRule]=useState<any>({trigger:'qr_scan',condition:'always',action:'add_points',points:''})
 async function load(){try{const r=await v33FunctionalClient.getCustomerLoyaltySettings(cid);setData(r)}catch(e:any){setMsg(e.message)}}
 useEffect(()=>{load()},[cid])
 async function save(){
  setMsg('Speichere...')
  try{
   await v33FunctionalClient.saveStaffAndRules(cid,{...form,rules:[rule]})
   setMsg('QR & Loyalty Einstellungen gespeichert')
   await load()
  }catch(e:any){setMsg(e.message)}
 }
 return <><Head title="QR & Loyalty Einstellungen" sub="Kundenbereich · Mitarbeitercode · Punkte · Reward-Regeln"/><div className="grid2"><Card title="Mitarbeitercode & Punkte"><input className="input" value={form.staff_label} onChange={e=>setForm({...form,staff_label:e.target.value})} placeholder="Bezeichnung, z. B. Thekencode"/><input className="input" value={form.staff_code} onChange={e=>setForm({...form,staff_code:e.target.value})} placeholder="Mitarbeitercode, z. B. 2468"/><input className="input" type="number" value={form.points_per_scan} onChange={e=>setForm({...form,points_per_scan:e.target.value})} placeholder="Punkte pro Scan, z. B. 10"/><input className="input" type="number" value={form.daily_scan_limit} onChange={e=>setForm({...form,daily_scan_limit:e.target.value})} placeholder="Tageslimit pro Gast, z. B. 1"/><input className="input" type="number" value={form.weekly_scan_limit} onChange={e=>setForm({...form,weekly_scan_limit:e.target.value})} placeholder="Wochenlimit pro Gast, z. B. 5"/><button className="btn" onClick={save}>Speichern</button></Card><Card title="Reward-Regel erstellen"><select className="input" value={rule.trigger} onChange={e=>setRule({...rule,trigger:e.target.value})}><option value="qr_scan">Wenn QR gescannt wird</option><option value="review_positive">Wenn positive Bewertung abgegeben wird</option><option value="birthday">Wenn Geburtstag erreicht</option><option value="referral">Wenn Empfehlung eingeht</option><option value="level_up">Wenn Level erreicht</option></select><select className="input" value={rule.condition} onChange={e=>setRule({...rule,condition:e.target.value})}><option value="always">Immer</option><option value="first_scan">Nur beim ersten Scan</option><option value="weekday">Nur Wochentag</option><option value="weekend">Nur Wochenende</option><option value="points_over_100">Punkte größer 100</option><option value="vip_only">Nur VIP</option></select><select className="input" value={rule.action} onChange={e=>setRule({...rule,action:e.target.value})}><option value="add_points">Punkte vergeben</option><option value="multiply_points">Punkte multiplizieren</option><option value="unlock_reward">Reward freischalten</option><option value="create_followup">Follow-up erzeugen</option></select><input className="input" type="number" value={rule.points} onChange={e=>setRule({...rule,points:e.target.value})} placeholder="Punkte / Multiplikator, z. B. 50"/><button className="btn secondary" onClick={save}>Regel speichern</button></Card></div><Card title="Bestehende Programme & Regeln">{(data?.loyalty_programs||[]).map((p:any)=><div className="item" key={p.id}><b>{p.name||p.title}</b><span>{p.points_per_scan} Punkte pro Scan · {p.active?'aktiv':'inaktiv'}</span></div>)}{(data?.rules||[]).map((r:any)=><div className="item" key={r.id}><b>{r.payload?.trigger} → {r.payload?.action}</b><span>{r.payload?.condition} · {r.payload?.points||0} Punkte</span></div>)}{msg&&<div className="sub">{msg}</div>}</Card></>
}

function V42AdminLoyaltyEditor({cid}:any){
 const [msg,setMsg]=useState('')
 const [form,setForm]=useState<any>({title:'',points_per_scan:'',daily_scan_limit:'',weekly_scan_limit:'',qr_title:''})
 async function save(){try{const r=await v33FunctionalClient.saveLoyaltyProgram(cid,form);setMsg(`Gespeichert: ${r.loyalty_program?.name||'Loyalty Programm'}`)}catch(e:any){setMsg(e.message)}}
 return <Card title="Bestehendes Loyalty Programm bearbeiten"><div className="grid4"><input className="input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Programmname, z. B. Alexas Bonusclub"/><input className="input" value={form.qr_title} onChange={e=>setForm({...form,qr_title:e.target.value})} placeholder="QR Kampagnenname"/><input className="input" type="number" value={form.points_per_scan} onChange={e=>setForm({...form,points_per_scan:e.target.value})} placeholder="Punkte pro Scan"/><button className="btn" onClick={save}>Loyalty speichern</button></div>{msg&&<div className="sub">{msg}</div>}</Card>
}

function V42QrCodePanel({cid}:any){
 const [data,setData]=useState<any>(null),[msg,setMsg]=useState('')
 const [manualSlug,setManualSlug]=useState('')
 async function create(){
  setMsg('Erstelle QR/Loyalty...')
  try{
   const r=await v33FunctionalClient.createQrCampaign(cid,{title:'QR Loyalty Kampagne',purpose:'loyalty',points_per_scan:10})
   setData(r)
   setMsg('QR Kampagne erstellt')
  }catch(e:any){setMsg(e.message)}
 }
 const slug=data?.qr_campaign?.slug||data?.loyalty_program?.slug||manualSlug
 const appBase=process.env.NEXT_PUBLIC_APP_URL || (typeof window!=='undefined'?window.location.origin:'')
 const url=slug?`${appBase.replace(/\/+$/,'')}/l/${slug}`:''
 return <Card title="QR Kampagne erstellen" action={<button className="btn secondary" onClick={create}>QR + Loyalty erstellen</button>}>{url?<div className="qrExport"><V424QrImage value={url}/><div><b>{url}</b><p className="sub">QR wird extern erzeugt. Fallback: qrserver.com → quickchart.io</p><div className="toolbarActions"><button className="btn secondary" onClick={()=>navigator.clipboard?.writeText(url)}>Link kopieren</button><button className="btn secondary" onClick={()=>window.open(url,'_blank')}>Slug öffnen</button><a className="btn secondary" href={v424ExternalQrUrls(url)[0]} target="_blank">QR extern öffnen</a></div></div></div>:<div className="sub">Noch kein QR erstellt. Klicke auf „QR + Loyalty erstellen“.</div>}<input className="input" value={manualSlug} onChange={e=>setManualSlug(e.target.value)} placeholder="Optional: vorhandenen Slug manuell eingeben, z. B. demo-cafe-morgenlicht"/>{msg&&<div className="sub">{msg}</div>}</Card>
}

function V42ReviewsHub({store,cid}:any){
 const [data,setData]=useState<any>(null),[msg,setMsg]=useState('')
 const [form,setForm]=useState({reviewer_name:'Demo Gast',rating:5,feedback_text:'Sehr freundlicher Service und schnelle Bedienung.'})
 const localReviews=(store?.data?.review_feedback||[]).filter((r:any)=>r.customer_id===cid)
 async function load(){try{const r=await v33FunctionalClient.reviewsHub(cid);setData({...r,reviews:[...(r.reviews||[]),...localReviews]});setMsg('Reviews geladen')}catch(e:any){setData({reviews:localReviews,templates:[],tickets:[],stats:{total:localReviews.length,positive:localReviews.filter((r:any)=>Number(r.rating)>=4).length,negative:localReviews.filter((r:any)=>Number(r.rating)<=2).length,open_tickets:0}});setMsg('Backend nicht erreichbar, lokale Reviews angezeigt')}}
 useEffect(()=>{load()},[cid])
 async function create(){
  const row={id:uid(),customer_id:cid,...form,rating:Number(form.rating),sentiment:Number(form.rating)<=2?'negativ':Number(form.rating)>=4?'positiv':'neutral',created_at:new Date().toISOString()}
  await store?.create?.('review_feedback',row)
  try{await v33FunctionalClient.engineReview(cid,{rating:row.rating,text:row.feedback_text,name:row.reviewer_name})}catch{}
  if(row.rating<=2) await store?.create?.('tickets',{customer_id:cid,title:`Review Eskalation: ${row.rating} Sterne`,description:row.feedback_text,status:'Offen',priority:'Hoch'})
  const nextReviews=[row,...(data?.reviews||[])]
  setData({...(data||{}),reviews:nextReviews,stats:{total:nextReviews.length,positive:nextReviews.filter((r:any)=>Number(r.rating)>=4).length,negative:nextReviews.filter((r:any)=>Number(r.rating)<=2).length,open_tickets:Number(data?.stats?.open_tickets||0)+(row.rating<=2?1:0)}})
  setForm({reviewer_name:'',rating:5,feedback_text:''})
 }
 function answerFor(r:any){return Number(r.rating||0)<=2?'Danke für das ehrliche Feedback. Wir prüfen das sofort intern und melden uns persönlich mit einer Lösung.':'Vielen Dank für die tolle Bewertung. Wir freuen uns sehr und geben das direkt ans Team weiter.'}
 async function syncGoogleReviews(){try{const r=await syncGoogleProvider('google-business',cid,{});setMsg(r?.ok?'Google Business Sync gestartet. Negative Slug-Reviews erscheinen automatisch aus review_feedback.':'Google Sync noch nicht vollständig konfiguriert.')}catch(e:any){setMsg(e.message||'Google Reviews Sync nicht erreichbar')}}
 return <><Head title="Reviews" sub="Reviews · Google Business · negative Slug-Reviews · Antwortvorlagen" action={<button className="btn secondary" onClick={syncGoogleReviews}>Google Reviews synchronisieren</button>}/><div className="grid4"><Metric label="Gesamt" value={data?.stats?.total??'-'}/><Metric label="Positiv" value={data?.stats?.positive??'-'}/><Metric label="Negativ" value={data?.stats?.negative??'-'}/><Metric label="Tickets" value={data?.stats?.open_tickets??'-'}/></div><div className="grid2"><Card title="Review erfassen"><input className="input" value={form.reviewer_name} onChange={e=>setForm({...form,reviewer_name:e.target.value})} placeholder="Name"/><input className="input" type="number" min="1" max="5" value={form.rating} onChange={e=>setForm({...form,rating:Number(e.target.value)})}/><textarea className="input textarea" value={form.feedback_text} onChange={e=>setForm({...form,feedback_text:e.target.value})} placeholder="Review Text"/><button className="btn" onClick={create}>Review speichern & analysieren</button></Card><Card title="Antwortvorlage">{(data?.reviews||[])[0]?<><b>{answerFor((data?.reviews||[])[0])}</b><div className="sub">Automatische Vorlage anhand der neuesten Bewertung.</div></>:<div className="sub">Nach dem ersten Review erscheint hier eine Antwortvorlage.</div>}</Card></div><Card title="Review Inbox">{(data?.reviews||[]).map((r:any)=><div className="item" key={r.id}><div><b>{r.reviewer_name||r.name||'Gast'} · {r.rating||'-'} Sterne</b><div className="sub">{r.feedback_text||r.comment||r.text||'Keine Nachricht'}</div><div className="sub">Antwort: {answerFor(r)}</div></div><Badge type={Number(r.rating||0)<=2?'red':'green'}>{r.sentiment||'neu'}</Badge><button className="btn secondary" onClick={async()=>{await store?.remove?.('review_feedback',r.id);setData({...(data||{}),reviews:(data?.reviews||[]).filter((x:any)=>x.id!==r.id)})}}>Löschen</button></div>)}{msg&&<div className="sub">{msg}</div>}</Card></>
}

function V42PackageRecommendations({cid}:any){
 const [data,setData]=useState<any>(null)
 useEffect(()=>{v33FunctionalClient.packageRecommendations(cid).then((r:any)=>setData(r)).catch(()=>setData({recommendation:{customer_name:'Ausgewählter Kunde',addon:'Growth/Premium Add-on',price:499,confidence:84,reason:['Aktive Nutzungssignale','Paket-Fit vorhanden','Upsell im nächsten Kundengespräch möglich']}}))},[cid])
 const r=data?.recommendation
 return <><Head title="Package Recommendations" sub="Kunde · Add-on · Begründung"/>{r&&<Card title={`Empfehlung für ${r.customer_name}`}><div className="v40Deal"><b>{r.addon}</b><strong>{eur(r.price)}</strong><span>Confidence: {r.confidence}%</span>{r.reason.map((x:string)=><p key={x}>✓ {x}</p>)}</div></Card>}</>
}

function V42PackageMatrixEditor({cid}:any){
 const [packages,setPackages]=useState<any[]>([])
 const [msg,setMsg]=useState('')
 const fallbackPackages=Object.keys(packageDefs).map((key:string)=>({id:key.toLowerCase(),name:key,price:pprice(key),billing_interval:'month',features:packageDefs[key].tools,visible_on_landing:true,visible_to_customer:true,active:true}))
 const localKey=`v42_package_matrix_${cid}`
 function readLocalPackages(){return safeLocalStorageGet(localKey,null)}
 function persistPackages(next:any[]){setPackages(next);safeLocalStorageSet(localKey,next)}
 async function load(){const local=readLocalPackages();if(local?.length){setPackages(local);setMsg('Lokale Paket-Matrix geladen');return}try{const r=await v33FunctionalClient.getPackageMatrix(cid);setPackages((r.packages&&r.packages.length?r.packages:fallbackPackages)||[]);setMsg('Paket-Matrix geladen')}catch(e:any){setPackages(fallbackPackages);setMsg('Backend nicht erreichbar, lokale Paket-Matrix geladen')}}
 useEffect(()=>{load()},[cid])
 function patch(i:number,k:string,v:any){const next=[...packages];next[i]={...next[i],[k]:v};persistPackages(next)}
 async function save(){persistPackages(packages);try{await v33FunctionalClient.savePackageMatrix(cid,{packages});setMsg('Paket-Matrix gespeichert')}catch(e:any){setMsg('Lokal gespeichert · Backend nicht erreichbar')}}
 function add(){persistPackages([...packages,{id:`package_${Date.now()}`,name:'',price:'',billing_interval:'month',features:[],visible_on_landing:true,visible_to_customer:true,active:true}])}
 return <><Head title="Paket-Matrix" sub="Bestehende Pakete bearbeiten · Preise · Tools · Sichtbarkeit"/><Card title="Pakete bearbeiten" action={<button className="btn secondary" onClick={add}>Paket hinzufügen</button>}>{packages.map((p:any,i:number)=><div className="v42PackageEdit" key={p.id||i}><input className="input" value={p.name||''} onChange={e=>patch(i,'name',e.target.value)} placeholder="Paketname, z. B. Growth"/><input className="input" type="number" value={p.price||''} onChange={e=>patch(i,'price',e.target.value)} placeholder="Preis, z. B. 499"/><select className="input" value={p.billing_interval||'month'} onChange={e=>patch(i,'billing_interval',e.target.value)}><option value="month">monatlich</option><option value="year">jährlich</option><option value="once">einmalig</option></select><textarea className="input" value={(p.features||[]).join('\n')} onChange={e=>patch(i,'features',e.target.value.split('\n').filter(Boolean))} placeholder="Inhalte, je Zeile ein Feature"/><label><input type="checkbox" checked={p.visible_on_landing!==false} onChange={e=>patch(i,'visible_on_landing',e.target.checked)}/> Auf Landingpage anzeigen</label><label><input type="checkbox" checked={p.visible_to_customer!==false} onChange={e=>patch(i,'visible_to_customer',e.target.checked)}/> Im Kundenbereich/Billing anzeigen</label><label><input type="checkbox" checked={p.active!==false} onChange={e=>patch(i,'active',e.target.checked)}/> Paket aktiv</label><button className="btn secondary" onClick={()=>persistPackages(packages.filter((_:any,idx:number)=>idx!==i))}>Paket löschen</button></div>)}<button className="btn" onClick={save}>Paket-Matrix speichern</button>{msg&&<div className="sub">{msg}</div>}</Card></>
}

function V42AnalyticsBilling({store,cid}:any){
 const [data,setData]=useState<any>(null),[msg,setMsg]=useState('')
 function localData(){
  const invoices=(store?.data?.invoices||[]).filter((i:any)=>i.customer_id===cid)
  const paid=invoices.filter((i:any)=>i.status==='Bezahlt').reduce((s:number,i:any)=>s+Number(i.amount||0),0)
  const campaigns=(store?.data?.qr_campaigns||[]).filter((q:any)=>q.customer_id===cid)
  const reviews=(store?.data?.review_feedback||[]).filter((r:any)=>r.customer_id===cid)
  return {analytics:{qr_scans:campaigns.reduce((s:number,q:any)=>s+Number(q.scans||0),0),leads:0,members:0,reviews:reviews.length,pipeline_value:(store?.data?.offers||[]).filter((o:any)=>o.customer_id===cid).reduce((s:number,o:any)=>s+Number(o.amount||0),0),health:reviews.some((r:any)=>Number(r.rating)<=2)?68:86,risk:reviews.some((r:any)=>Number(r.rating)<=2)?44:16,upsell:paid>500?82:58,forecast:paid+499,revenue_share:Math.round(paid*0.15)},billing:{total:paid,base:paid,usage:campaigns.length*25}}
 }
 async function load(){try{const r=await v33FunctionalClient.analyticsBilling(cid);setData(r);setMsg('Analytics & Billing geladen')}catch(e:any){setData(localData());setMsg('Backend nicht erreichbar, lokale Analytics berechnet')}}
 useEffect(()=>{load()},[cid])
 const a=data?.analytics||{}
 return <><Head title="Analytics & Billing" sub="Live Kennzahlen · Usage · Billing" action={<button className="btn secondary" onClick={load}>Neu berechnen</button>}/><div className="grid4"><Metric label={<span>QR Scans <InfoI text="Anzahl der gescannten QR-Codes über alle Kampagnen dieses Kunden."/></span>} value={a.qr_scans??'-'}/><Metric label={<span>Reviews <InfoI text="Erfasste Bewertungen und Feedbacks aus QR-, Review- und Kundenportal-Flows."/></span>} value={a.reviews??'-'}/><Metric label={<span>Health <InfoI text="Gesundheitswert aus Nutzung, Reviews, Tickets, Rechnungen und Aktivität."/></span>} value={a.health??'-'}/><Metric label={<span>Forecast <InfoI text="Erwarteter Umsatz aus Paket, Usage, Pipeline und Add-ons."/></span>} value={eur(a.forecast??0)}/></div><div className="grid2"><Card title="Billing Berechnung"><div className="item"><b>Usage Total <InfoI text="Summe aus Paket- und nutzungsabhängigen Abrechnungspositionen."/></b><span>{eur(data?.billing?.total??0)}</span></div><div className="item"><b>Revenue Share <InfoI text="Berechneter Anteil aus Umsatzbeteiligungsregeln."/></b><span>{eur(a.revenue_share??0)}</span></div><div className="item"><b>Pipeline Value <InfoI text="Gewichteter Wert offener Verkaufschancen."/></b><span>{eur(a.pipeline_value??0)}</span></div>{msg&&<div className="sub">{msg}</div>}</Card><Card title="Analytics Signale"><div className="v40Bars">{[['QR',a.qr_scans||0],['Reviews',a.reviews||0],['Health',a.health||0],['Upsell',a.upsell||0]].map(([k,v]:any)=><div key={k}><b>{k}</b><div><span style={{width:`${Math.min(100,Number(v))}%`}}></span></div><em>{v}</em></div>)}</div></Card></div></>
}

function V41DeepModuleShell({cid,children,title,sub}:any){
 return <><Head title={title} sub={sub}/><V40ErrorBoundary moduleName={title}>{children}</V40ErrorBoundary></>
}

function V41ForecastDetail({cid}:any){
 const [data,setData]=useState<any>(null),[msg,setMsg]=useState('')
 const fallback={forecast:{series:['Mai','Jun','Jul','Aug','Sep','Okt'].map((month,i)=>({month,conservative:350+i*70,expected:520+i*95,optimistic:760+i*130,confidence:82-i})),assumptions:['Bestehende Paketgebühren bleiben aktiv','QR/Review-Nutzung steigt monatlich','Ein Add-on wird im Quartal wahrscheinlich']}}
 async function load(){try{const r=await v33FunctionalClient.deepModules(cid);setData(r.detail);setMsg('Forecast geladen')}catch(e:any){setData(fallback);setMsg('Lokaler Forecast berechnet')}}
 useEffect(()=>{load()},[cid])
 const f=data?.forecast
 return <V41DeepModuleShell cid={cid} title="Revenue Forecasting Detail" sub="Forecast · Monatsvergleich · Annahmen · Confidence"><div className="grid2"><Card title="6-Monats Forecast" action={<button className="btn secondary" onClick={load}>Neu berechnen</button>}><div className="v41ForecastChart">{(f?.series||[]).map((m:any)=><div key={m.month}><b>{m.month}</b><div className="v41ForecastBars"><span style={{height:`${Math.max(10,Math.min(100,m.conservative/20))}%`}}></span><span style={{height:`${Math.max(10,Math.min(100,m.expected/20))}%`}}></span><span style={{height:`${Math.max(10,Math.min(100,m.optimistic/20))}%`}}></span></div><em>{eur(m.expected)}</em></div>)}</div><div className="sub">Dunkel = konservativ · Gold = erwartet · hell = optimistisch</div></Card><Card title="Annahmen & Confidence">{(f?.assumptions||[]).map((a:string)=><div className="item" key={a}><b>✓</b><span>{a}</span></div>)}{(f?.series||[]).map((m:any)=><div className="item" key={m.month}><b>{m.month}</b><span>Confidence {m.confidence}% · Erwartet {eur(m.expected)}</span></div>)}{msg&&<div className="sub">{msg}</div>}</Card></div></V41DeepModuleShell>
}

function V41RevenueShareDetail({cid}:any){
 const [data,setData]=useState<any>(null)
 const fallback={revenue_share:{total:224,items:[{label:'Paketumsatz',base:899,percent:15,amount:135},{label:'Usage Billing',base:390,percent:15,amount:59},{label:'Add-ons',base:199,percent:15,amount:30}]}}
 useEffect(()=>{v33FunctionalClient.deepModules(cid).then((r:any)=>setData(r.detail)).catch(()=>setData(fallback))},[cid])
 const rs=data?.revenue_share
 return <V41DeepModuleShell cid={cid} title="Revenue Share Detail" sub="Abrechnung · Komponenten · Transparenz"><Card title="Revenue Share Aufschlüsselung"><div className="v41ShareDonut"><div><b>{eur(rs?.total||0)}</b><span>gesamt</span></div></div>{(rs?.items||[]).map((x:any)=><div className="item" key={x.label}><b>{x.label}</b><span>{eur(x.base)} × {x.percent}%</span><Badge type="green">{eur(x.amount)}</Badge></div>)}</Card></V41DeepModuleShell>
}

function V41PackageMatrixDetail({cid}:any){
 const [data,setData]=useState<any>(null),[msg,setMsg]=useState('')
 async function load(){const r=await v33FunctionalClient.deepModules(cid);setData(r.detail)}
 useEffect(()=>{load().catch(()=>{})},[cid])
 async function mark(p:any){try{await v33FunctionalClient.packageAction(cid,p);setMsg(`${p.name} als Pipeline-Chance markiert`);await load()}catch(e:any){setMsg(e.message)}}
 const pm=data?.package_matrix
 return <V41DeepModuleShell cid={cid} title="Paket-Matrix Detail" sub="Paketvergleich · Fit Score · Upsell Chance"><div className="v41PackageGrid">{(pm?.packages||[]).map((p:any)=><div className={`v41PackageCard ${p.recommended?'recommended':''}`} key={p.key}><h3>{p.name}</h3><strong>{eur(p.price)}</strong><div className="v41Fit"><span style={{width:`${p.fit_score}%`}}></span></div><em>Fit Score {p.fit_score}%</em>{p.tools.map((t:string)=><p key={t}>✓ {t}</p>)}<button className="btn" onClick={()=>mark(p)}>{p.recommended?'Empfohlene Chance':'Als Chance markieren'}</button></div>)}</div>{msg&&<div className="sub">{msg}</div>}</V41DeepModuleShell>
}

function V41CustomerIntelligenceDetail({cid}:any){
 const [data,setData]=useState<any>(null)
 const fallback={customer_intelligence:{drivers:[{label:'Review-Signal',explanation:'Neue Bewertungen erzeugen Handlungsbedarf.',value:'hoch',impact:'hoch'},{label:'Paket-Fit',explanation:'Aktuelle Tools passen zu Growth/Premium.',value:'84%',impact:'mittel'},{label:'Billing-Signal',explanation:'Offene Rechnung und Add-on-Chance vorhanden.',value:'aktiv',impact:'mittel'}],next_best_actions:['QR Kampagne aktivieren und Link testen','Review Follow-up anlegen','Paketmatrix im nächsten Termin besprechen']}}
 useEffect(()=>{v33FunctionalClient.deepModules(cid).then((r:any)=>setData(r.detail)).catch(()=>setData(fallback))},[cid])
 const ci=data?.customer_intelligence
 return <V41DeepModuleShell cid={cid} title="Customer Intelligence Detail" sub="Ursachenanalyse · Treiber · Next Best Actions"><div className="grid2"><Card title="Treiberanalyse">{(ci?.drivers||[]).map((d:any)=><div className="v41Driver" key={d.label}><div><b>{d.label}</b><span>{d.explanation}</span></div><strong>{d.value}</strong><Badge type={d.impact==='hoch'?'green':d.impact==='mittel'?'yellow':'gray'}>{d.impact}</Badge></div>)}</Card><Card title="Next Best Actions">{(ci?.next_best_actions||[]).map((a:string,i:number)=><div className="v41Action" key={a}><b>{i+1}</b><span>{a}</span></div>)}</Card></div></V41DeepModuleShell>
}

function V41MarketingDetail({cid}:any){
 const [data,setData]=useState<any>(null),[msg,setMsg]=useState('')
 async function load(){const r=await v33FunctionalClient.deepModules(cid);setData(r.detail)}
 useEffect(()=>{load().catch(()=>{})},[cid])
 async function create(item:any){try{await v33FunctionalClient.createMarketingEvent(cid,item);setMsg('Marketing-Aktion gespeichert');await load()}catch(e:any){setMsg(e.message)}}
 const m=data?.marketing
 return <V41DeepModuleShell cid={cid} title="Marketing Automation Detail" sub="Kampagnenkalender · Funnel · Aktionen"><div className="grid2"><Card title="Kampagnenkalender">{(m?.calendar||[]).map((x:any)=><div className="v41CalendarItem" key={x.title}><div><b>{x.date}</b><span>{x.title}</span><em>{x.audience} · Reichweite {x.expected_reach}</em></div><Badge>{x.status}</Badge><button onClick={()=>create(x)}>Plan speichern</button></div>)}</Card><Card title="Funnel">{(m?.funnel||[]).map((x:any)=><div className="v41FunnelRow" key={x.stage}><b>{x.stage}</b><div><span style={{width:`${Math.max(8,Math.min(100,x.count*12))}%`}}></span></div><em>{x.count}</em></div>)}{msg&&<div className="sub">{msg}</div>}</Card></div></V41DeepModuleShell>
}

function V41AiAssistantDetail({cid}:any){
 const [data,setData]=useState<any>(null),[input,setInput]=useState('Was soll ich dem Kunden als nächstes empfehlen?'),[msg,setMsg]=useState('')
 const [history,setHistory]=useState<any[]>([])
 const fallback={ai:{insights:[{title:'Nächste beste Aktion',message:'QR-Kampagne aktivieren, Review-Anfrage senden und Paket-Fit prüfen.',reasons:['Demo-Daten','Kundensignale','Billing-Potenzial'],action:'Follow-up vorbereiten'}]}}
 async function load(){try{const r=await v33FunctionalClient.deepModules(cid);setData(r.detail)}catch{setData(fallback)}}
 useEffect(()=>{load()},[cid])
 async function ask(){const localAnswer=`Empfehlung: ${input.includes('Paket')?'Paket-Matrix und Upsell-Fit prüfen':'QR/Loyalty, Reviews und nächste Kundenaktion bündeln'}. Danach Ticket oder Pipeline-Lead anlegen.`;try{const r=await v33FunctionalClient.aiMessage(cid,{message:input});setMsg(r.answer||localAnswer);setHistory([{q:input,a:r.answer||localAnswer},...history]);await load()}catch(e:any){setMsg(localAnswer);setHistory([{q:input,a:localAnswer},...history])}}
 const ai=data?.ai
 return <V41DeepModuleShell cid={cid} title="AI Business Assistant Detail" sub="Chat · Insight-Verlauf · Warum-Erklärung"><div className="grid2"><Card title="AI Insight Verlauf">{(ai?.insights||[]).map((x:any)=><div className="v41AiBubble" key={x.title}><div className="v40Avatar">AI</div><div><b>{x.title}</b><p>{x.message}</p>{(x.reasons||[]).map((r:string)=><Badge key={r}>{r}</Badge>)}<em>Aktion: {x.action}</em></div></div>)}</Card><Card title="Demo Chat"><textarea className="input" value={input} onChange={e=>setInput(e.target.value)}/><div className="toolbarActions"><button className="btn" onClick={ask}>Assistant fragen</button><button className="btn secondary" onClick={()=>setInput('Erzeuge eine Follow-up Aufgabe aus den aktuellen Reviews')}>Review Follow-up</button><button className="btn secondary" onClick={()=>setInput('Welche Paketempfehlung passt für diesen Kunden?')}>Paketempfehlung</button></div>{msg&&<div className="v41AiAnswer">{msg}</div>}{history.map((h:any,i:number)=><div className="item" key={i}><b>{h.q}</b><span>{h.a}</span></div>)}</Card></div></V41DeepModuleShell>
}

function V40QualityPanel({cid}:any){
 const [tests,setTests]=useState<any>(null),[audit,setAudit]=useState<any>(null),[link,setLink]=useState<any>(null),[msg,setMsg]=useState('')
 async function runTests(){setMsg('Contract Tests laufen...');try{const r=await v33FunctionalClient.contractTests(cid);setTests(r);setMsg(r.ready?'Alle Contract Tests bestanden':'Einige Contract Tests prüfen')}catch(e:any){setMsg(e.message)}}
 async function loadAudit(){setMsg('Audit Log wird geladen...');try{const r=await v33FunctionalClient.auditLog(cid);setAudit(r);setMsg('Audit Log geladen')}catch(e:any){setMsg(e.message)}}
 async function checkLink(){setMsg('Public Link wird geprüft...');try{const r=await v33FunctionalClient.publicLinkHealth(cid);setLink(r);setMsg(r.ready?'Public Link bereit':'Public Link mit Warnungen')}catch(e:any){setMsg(e.message)}}
 return <Card title="V40 Quality Center" action={<V40AsyncButton onClick={runTests}>Contract Tests</V40AsyncButton>}><div className="sub">Build-/API-Checks, Audit Log und Public-Link Health für die Vorführung.</div><div className="toolbarActions"><V40AsyncButton onClick={loadAudit}>Audit Log</V40AsyncButton><V40AsyncButton onClick={checkLink}>Public Link testen</V40AsyncButton></div>{msg&&<div className="sub">{msg}</div>}{tests&&<div className="grid4"><Metric label="Tests" value={tests.tests?.length||0}/><Metric label="Bestanden" value={tests.passed}/><Metric label="Fehler" value={tests.failed}/><Metric label="Ready" value={tests.ready?'Ja':'Nein'}/></div>}{tests?.tests?.map((t:any)=><div className="item" key={t.name}><b>{t.ok?'✅':'❌'} {t.name}</b><span>{t.ok?`${t.duration_ms}ms`:t.hint||t.error}</span></div>)}{link&&<div className="item"><b>{link.ready?'✅':'⚠️'} Public Link</b><span>{link.public_url_path} · {link.warnings?.map((w:any)=>w.message).join(' · ')}</span><Badge type={link.ready?'green':'red'}>{link.ready?'bereit':'prüfen'}</Badge></div>}{audit&&<div className="v40AuditFeed">{[...(audit.engine_runs||[]).slice(0,4),...(audit.timeline_events||[]).slice(0,4)].map((x:any)=><div className="v40AuditItem" key={x.id}><b>{x.engine_key||x.title||x.action}</b><span>{x.status||x.severity||x.created_at}</span></div>)}</div>}</Card>
}

function V40AutomationStudio({cid}:any){
 const [msg,setMsg]=useState('')
 const [selectedTrigger,setSelectedTrigger]=useState('Neuer Lead')
 const [selectedAction,setSelectedAction]=useState('AI Hinweis')
 const [flows,setFlows]=useState<any[]>([])
 const triggers=['QR Scan','Neuer Lead','Reward eingelöst','VIP Level-Up','Negative Review','Inaktiv 30 Tage','Upsell > 80']
 const actions=['Ticket','Pipeline Lead','AI Hinweis','Marketing Kampagne','Punktebonus','Reward freischalten']
 const localKey=`v40_automation_flows_${cid}`
 function persistFlows(next:any[]){setFlows(next);safeLocalStorageSet(localKey,next)}
 useEffect(()=>{setFlows(safeLocalStorageGet(localKey,[]))},[cid])
 async function create(t=selectedTrigger,a=selectedAction){const flow={id:uid(),customer_id:cid,name:`${t} → ${a}`,trigger:t,action:a,active:true,runs:0};persistFlows([flow,...flows]);setMsg('Speichere Flow...');try{await v33FunctionalClient.createRecord('smart_automations',flow);setMsg('Flow gespeichert')}catch(e:any){setMsg('Flow lokal gespeichert · Backend später synchronisieren')}}
 async function run(){setMsg('Automation Engine läuft...');try{await v33FunctionalClient.runAutomation(cid,{trigger:selectedTrigger,action:selectedAction});setMsg('Automation Engine gelaufen')}catch(e:any){setMsg('Demo-Lauf lokal simuliert: Aktion wurde vorgemerkt')}}
 return <><Head title="Smart Automation Studio" sub="Automation · Flow Builder · Trigger und Aktion wählbar"/><div className="grid2"><Card title="Flow konfigurieren"><select className="input" value={selectedTrigger} onChange={e=>setSelectedTrigger(e.target.value)}>{triggers.map(t=><option key={t}>{t}</option>)}</select><select className="input" value={selectedAction} onChange={e=>setSelectedAction(e.target.value)}>{actions.map(a=><option key={a}>{a}</option>)}</select><div className="item"><b>{selectedTrigger}</b><span>führt aus</span><Badge>{selectedAction}</Badge></div><button className="btn" onClick={()=>create()}>Flow speichern</button><button className="btn secondary" onClick={run}>Ausgewählten Flow testen</button></Card><Card title="Trigger-Bibliothek"><div className="v40Flow"><div className="v40FlowCol"><h3>Trigger</h3>{triggers.map(t=><button className={selectedTrigger===t?'active':''} key={t} onClick={()=>setSelectedTrigger(t)}>{t}</button>)}</div><div className="v40FlowArrow">→</div><div className="v40FlowCol"><h3>Aktionen</h3>{actions.map(a=><button className={selectedAction===a?'active':''} key={a} onClick={()=>setSelectedAction(a)}>{a}</button>)}</div></div></Card></div><Card title="Gespeicherte Flows">{flows.length===0&&<div className="sub">Noch kein Flow gespeichert.</div>}{flows.map(f=><div className="item" key={f.id}><b>{f.name}</b><button className="btn secondary" onClick={()=>persistFlows(flows.map(x=>x.id===f.id?{...x,active:!x.active}:x))}>{f.active?'Aktiv':'Inaktiv'}</button></div>)}{msg&&<div className="sub">{msg}</div>}</Card></>
}

function V40MarketingFunnel({cid}:any){
 const [msg,setMsg]=useState('')
 const stages=['Entwurf','Bereit','Gestartet','Leads','Conversion']
 async function run(){setMsg('Starte Kampagne...');try{await v33FunctionalClient.runMarketing(cid,{name:'V40 Demo Kampagne',audience:'Reward-bereit',reward:'Bonus'});setMsg('Kampagne gestartet')}catch(e:any){setMsg(e.message)}}
 return <><Head title="Marketing Automation Funnel" sub="Marketing · Kampagnen-Funnel · Demo Run"/><Card title="Kampagnen-Funnel" action={<V40AsyncButton onClick={run}>Kampagne starten</V40AsyncButton>}><div className="v40Funnel">{stages.map((s,i)=><div className="v40FunnelStage" key={s}><b>{s}</b><span>{i===0?'Idee':i===1?'Segment':i===2?'Versand':i===3?'Follow-up':'Abschluss'}</span></div>)}</div>{msg&&<div className="sub">{msg}</div>}</Card></>
}

function V40AiInsightFeed({cid}:any){
 const [data,setData]=useState<any>(null),[msg,setMsg]=useState('')
 async function load(){try{const r=await v33FunctionalClient.customer360(cid);setData(r);setMsg('Insights geladen')}catch(e:any){setMsg(e.message)}}
 useEffect(()=>{load()},[cid])
 return <><Head title="AI Business Assistant" sub="Insight Feed · Warum-Erklärungen · Empfehlungen"/><Card title="AI Insight Feed" action={<button className="btn secondary" onClick={load}>Neu laden</button>}>{(data?.ai_explanations||[]).map((x:any)=><div className="v40Chat" key={x.title}><div className="v40Avatar">AI</div><div><b>{x.title}</b><p>{(x.reason||[]).join(' · ')}</p><Badge type={x.severity==='warn'?'red':'green'}>Warum sehe ich das?</Badge></div></div>)}{msg&&<div className="sub">{msg}</div>}</Card></>
}

function V40HealthRadar({cid,store,mode='health'}:any){
 const [data,setData]=useState<any>(null)
 useEffect(()=>{v33FunctionalClient.customer360(cid).then((r:any)=>setData(r)).catch(()=>{})},[cid])
 const s=data?.snapshot||{health:86,risk:16,upsell:68,success:79}
 const vals=[{label:'Health',desc:'Gesamtzustand des Kunden aus Aktivität, Tickets, SEO, Reviews und Rechnungen.',value:s.health||0},{label:'Risk',desc:'Churn-/Risikowert. Niedriger ist besser; im Radar wird die Stabilität angezeigt.',value:100-(s.risk||0),raw:s.risk||0},{label:'Upsell',desc:'Potenzial für höheres Paket, Add-on oder weitere Leistung.',value:s.upsell||0},{label:'Success',desc:'Erfolgs-/Zufriedenheitsindikator aus Nutzung und Ergebnissen.',value:s.success||0}]
 const customerName=store?cname(store.data,cid):'ausgewählter Kunde'
 return <><Head title={mode==='health'?'Customer Health Radar':'Customer Intelligence Radar'} sub={`${customerName} · Analytics · Score-Radar · Risiken & Chancen`}/><Card title={`Score Radar für ${customerName}`}><div className="v40Radar labeled">{vals.map((x:any)=><div key={x.label} style={{height:`${Math.max(8,x.value)}%`}}><span>{x.value}</span><small>{x.label}</small></div>)}</div><div className="grid4">{vals.map((x:any)=><Metric key={x.label} label={x.label} value={x.raw??x.value}/>)}</div>{vals.map((x:any)=><div className="item" key={x.label}><b>{x.label}</b><span>{x.desc}</span></div>)}</Card></>
}

function V40RevenueChart({cid,mode='forecast'}:any){
 const [data,setData]=useState<any>(null),[msg,setMsg]=useState('')
 async function load(){try{const r=await v33FunctionalClient.billingRevenue(cid);setData(r);setMsg('Berechnet')}catch(e:any){setMsg(e.message)}}
 useEffect(()=>{load()},[cid])
 const s=data?.snapshot||{}
 const bars=[['Usage',data?.billing?.total||0],['Forecast',s.forecast||0],['Share',s.revenue_share||0],['Upsell',s.upsell||0]]
 return <><Head title={mode==='billing'?'Billing Invoice Preview':mode==='share'?'Revenue Share Chart':'Revenue Forecast Chart'} sub="Billing & Revenue · Chart · Vorschau"/><Card title="Revenue Übersicht" action={<button className="btn secondary" onClick={load}>Neu berechnen</button>}><div className="v40Bars">{bars.map(([k,v]:any)=><div key={k}><b>{k}</b><div><span style={{width:`${Math.min(100,Number(v)/10)}%`}}></span></div><em>{v}</em></div>)}</div>{msg&&<div className="sub">{msg}</div>}</Card></>
}

function V40PackageDeals({cid}:any){
 const [data,setData]=useState<any>(null)
 useEffect(()=>{v33FunctionalClient.billingRevenue(cid).then((r:any)=>setData(r)).catch(()=>{})},[cid])
 const upsell=data?.snapshot?.upsell||0
 return <><Head title="Package Recommendations" sub="Deals · Upsell · Empfehlungen"/><div className="grid2"><Card title="Empfohlenes Add-on"><div className="v40Deal"><b>{upsell>75?'Premium Growth Add-on':'Loyalty Booster'}</b><span>Upsell Score: {upsell}</span><strong>{upsell>75?'499 €':'199 €'}</strong><button className="btn">Als Chance markieren</button></div></Card><Card title="Warum?"><div className="sub">Empfehlung basiert auf QR-Aktivität, Leads, Usage und Customer Health.</div></Card></div></>
}

function V40TimelineView({cid}:any){
 const [data,setData]=useState<any>(null)
 useEffect(()=>{v33FunctionalClient.customer360(cid).then((r:any)=>setData(r)).catch(()=>{})},[cid])
 return <><Head title="Timeline Events" sub="CRM & Betrieb · vertikale Timeline"/><Card title="Kunden-Timeline"><div className="v40Timeline">{(data?.signals?.timeline_events||[]).slice(0,12).map((e:any)=><div key={e.id}><b>{e.title}</b><span>{e.description||e.event_type}</span><em>{e.severity}</em></div>)}</div></Card></>
}

function V39StabilityPanel({cid}:any){
 const [schema,setSchema]=useState<any>(null)
 const [msg,setMsg]=useState('')
 const [busy,setBusy]=useState('')
 async function run(label:string,fn:any){
  setBusy(label);setMsg(`${label} läuft...`)
  try{const r=await fn(); if(label==='Schema Health')setSchema(r); setMsg(`${label} abgeschlossen`)}
  catch(e:any){setMsg(e.message||`${label} fehlgeschlagen`)}
  finally{setBusy('')}
 }
 const missing=schema?.missing||[]
 return <Card title="Stability & Schema Guard" action={<button className="btn secondary" disabled={!!busy} onClick={()=>run('Schema Health',()=>v33FunctionalClient.schemaHealth())}>Schema prüfen</button>}><div className="sub">Prüft Migrationen, härtet Demo gegen fehlende Tabellen ab und zeigt konkrete Fix-Hinweise.</div><div className="toolbarActions"><button className="btn secondary" disabled={!!busy} onClick={()=>run('Safe Provisioning',()=>v33FunctionalClient.provisionSafe(cid,{}))}>Idempotent provisionieren</button><button className="btn secondary" disabled={!!busy} onClick={()=>run('Testscan',()=>v33FunctionalClient.simulateScan(cid,{name:'V39 Testscan'}))}>Doppelklick-sicherer Testscan</button></div>{msg&&<div className="sub">{msg}</div>}{schema&&<div className="grid4"><Metric label="Ready" value={schema.ready?'Ja':'Nein'}/><Metric label="Fehlend" value={missing.length}/><Metric label="Hinweis" value={schema.ready?'OK':'0050 SQL'}/><Metric label="Status" value={busy||'bereit'}/></div>}{missing.map((m:any)=><div className="item" key={m.table}><b>⚠️ {m.table}</b><span>{m.hint}</span><Badge type="red">0050 ausführen</Badge></div>)}</Card>
}

function V38Customer360({cid}:any){
 const [data,setData]=useState<any>(null),[msg,setMsg]=useState('')
 async function load(){setMsg('Lade Kundenakte...');try{const r=await v33FunctionalClient.customer360(cid);setData(r);setMsg('Kundenakte geladen')}catch(e:any){setMsg(e.message)}}
 async function scan(){setMsg('Simuliere Testscan...');try{await v33FunctionalClient.simulateScan(cid,{name:'Demo Testscan',email:`testscan-${Date.now()}@demo.local`});await load();setMsg('Testscan erzeugt Lead, Member, Punkte und Scores')}catch(e:any){setMsg(e.message)}}
 useEffect(()=>{load()},[cid])
 const c=data?.counts||{}, ai=data?.ai_explanations||[]
 return <Card title="CRM 360 Kundenakte" action={<button className="btn secondary" onClick={load}>Aktualisieren</button>}><div className="grid4"><Metric label="QR Scans" value={c.qrScans??'-'}/><Metric label="Leads" value={c.leads??'-'}/><Metric label="Members" value={c.members??'-'}/><Metric label="Pipeline" value={c.pipelineValue??'-'}/></div><div className="toolbarActions"><button className="btn" onClick={scan}>Testscan simulieren</button><button className="btn secondary" onClick={()=>v33FunctionalClient.qaChecklist(cid).then((r:any)=>{setData({...data,checklist:r.checklist});setMsg(r.ready?'QA bereit':'QA prüfen')}).catch((e:any)=>setMsg(e.message))}>QA-Checkliste</button></div>{ai.map((x:any)=><div className="item" key={x.title}><b>{x.title}</b><span>{(x.reason||[]).join(' · ')}</span><span className="whyHint">Warum? <InfoI text={(x.reason||[]).join(' · ') || x.explanation || x.title}/></span></div>)}{data?.checklist&&data.checklist.map((x:any)=><div className="item" key={x.key}><b>{x.ok?'✅':'⚠️'} {x.label}</b><span>{x.url||''}</span></div>)}{msg&&<div className="sub">{msg}</div>}</Card>
}
function V38RewardHistory({cid}:any){
 const [data,setData]=useState<any>(null),[msg,setMsg]=useState('')
 async function load(){try{const r=await v33FunctionalClient.rewardHistory(cid);setData(r);setMsg('Reward-Historie geladen')}catch(e:any){setMsg(e.message)}}
 useEffect(()=>{load()},[cid])
 return <Card title="Reward-Historie & Limit-Auslastung" action={<button className="btn secondary" onClick={load}>Laden</button>}>{(data?.rewards||[]).map((r:any)=><div className="item" key={r.id}><b>{r.title}</b><span>{r.total_used}/{r.max_redemptions||'∞'} Einlösungen · täglich {r.daily_limit||'∞'} · wöchentlich {r.weekly_limit||'∞'} · gültig bis {r.expires_at||'offen'}</span><Badge type={r.status==='expired'?'red':'green'}>{r.status}</Badge></div>)}{(data?.history||[]).slice(0,6).map((h:any)=><div className="item" key={h.id}><b>{h.action||h.resource}</b><span>{h.description||h.created_at}</span></div>)}{msg&&<div className="sub">{msg}</div>}</Card>
}
function V38BillingRevenueHub({cid}:any){
 const [data,setData]=useState<any>(null),[msg,setMsg]=useState('')
 async function load(){setMsg('Berechne Billing & Revenue...');try{const r=await v33FunctionalClient.billingRevenue(cid);setData(r);setMsg('Billing & Revenue berechnet')}catch(e:any){setData({billing:{total:499},snapshot:{forecast:998,revenue_share:75,upsell:68},records:[{id:'local_billing',resource:'dynamic_billing',title:'Lokale Usage-Berechnung',status:'Fallback'}]});setMsg('Lokale Billing & Revenue Berechnung aktiv')}}
 return <Card title="Billing & Revenue Hub" action={<button className="btn secondary" onClick={load}>Neu berechnen</button>}><div className="sub">Paket, Usage, Forecast, Revenue Share und Package Recommendation werden zusammengeführt.</div>{data&&<div className="grid4"><Metric label="Usage" value={data.billing?.total??'-'}/><Metric label="Forecast" value={data.snapshot?.forecast??'-'}/><Metric label="Revenue Share" value={data.snapshot?.revenue_share??'-'}/><Metric label="Upsell" value={data.snapshot?.upsell??'-'}/></div>}{(data?.records||[]).slice(0,6).map((r:any)=><div className="item" key={r.id}><b>{r.resource}</b><span>{r.title}</span><Badge>{r.status}</Badge></div>)}{msg&&<div className="sub">{msg}</div>}</Card>
}
function V38ResetControls({cid}:any){
 const [msg,setMsg]=useState('')
 async function reset(scope:string){setMsg(`Reset ${scope} läuft...`);try{await v33FunctionalClient.resetScope(cid,scope);setMsg(`Reset ${scope} abgeschlossen`)}catch(e:any){setMsg(e.message)}}
 return <Card title="Feiner Demo-Reset"><div className="toolbarActions">{['loyalty','leads','reviews','automation','billing','all'].map(s=><button key={s} className="btn secondary" onClick={()=>reset(s)}>{s}</button>)}</div>{msg&&<div className="sub">{msg}</div>}</Card>
}
function V38TriggerLibrary({cid}:any){
 const triggers=['QR Scan erfolgt','Neuer Lead entsteht','Reward eingelöst','Kunde wird VIP','Negative Review entsteht','Kunde 30 Tage inaktiv','Tageslimit erreicht','Referral Lead entsteht','Upsell Score > 80']
 const [msg,setMsg]=useState('')
 function create(t:string,a:string){v33FunctionalClient.createRecord('smart_automations',{customer_id:cid,id:uid(),name:`${t} → ${a}`,trigger:t,action:a,active:true,runs:0}).then(()=>setMsg('Automation aus Bibliothek gespeichert')).catch((e:any)=>setMsg(e.message))}
 return <Card title="Automation Trigger-Bibliothek"><div className="grid2">{triggers.map(t=><div className="item" key={t}><b>{t}</b><button onClick={()=>create(t,'Ticket erstellen')}>+ Ticket</button><button onClick={()=>create(t,'Pipeline Lead erzeugen')}>+ Pipeline</button></div>)}</div><div className="sub">Aktionen: Ticket, Timeline, AI Hinweis, Marketing, Punkte, Reward, Pipeline, E-Mail vorbereiten</div>{msg&&<div className="sub">{msg}</div>}</Card>
}
function V38PublicPreview({cid,store}:any){
 const [data,setData]=useState<any>(null)
 useEffect(()=>{v33FunctionalClient.qaReport(cid).then((r:any)=>setData(r.report)).catch(()=>{})},[cid])
 const local=(store?.data?.qr_campaigns||[]).filter((q:any)=>q.customer_id===cid)
 const slug=data?.qr_campaigns?.[0]?.slug||local[0]?.slug, url=slug?`/l/${slug}`:''
 return <Card title="Public Landingpage Preview">{slug?<><div className="phonePreview"><iframe src={url}/></div><div className="toolbarActions"><button className="btn secondary" onClick={()=>navigator.clipboard?.writeText(window.location.origin+url)}>Live-Link kopieren</button><button className="btn secondary" onClick={()=>window.open(url,'_blank')}>Live öffnen</button></div></>:<div className="sub">Noch kein QR/Landingpage-Slug vorhanden.</div>}</Card>
}

function V37LoyaltyBuilder({cid}:any){
 const [settings,setSettings]=useState<any>(null)
 const [msg,setMsg]=useState('')
 const [reward,setReward]=useState<any>({title:'Gratis Kaffee',type:'Gratisprodukt',points:100,expires_at:'',max_redemptions:100,max_per_customer:1,daily_limit:20,weekly_limit:50})
 const [ref,setRef]=useState<any>({friend_name:'Neuer Empfehlungskunde',friend_email:'lead@example.de',referrer_token:''})
 const [birthday,setBirthday]=useState<any>({email:'',member_token:'',birthday:''})
 useEffect(()=>{v33FunctionalClient.getLoyaltySettings(cid).then((r:any)=>setSettings(r.settings)).catch((e:any)=>setMsg(e.message))},[cid])
 function patch(k:string,v:any){setSettings({...settings,[k]:v})}
 async function save(){
  setMsg('Speichere Loyalty Branding & Regeln...')
  try{const r=await v33FunctionalClient.saveLoyaltySettings(cid,settings);setSettings(r.settings);setMsg('Loyalty Branding & Regeln gespeichert')}catch(e:any){setMsg(e.message)}
 }
 async function saveReward(){
  setMsg('Speichere Reward-Regeln...')
  try{await v33FunctionalClient.saveV37Reward(cid,reward);setMsg('Reward mit Ablaufdatum und Limits gespeichert')}catch(e:any){setMsg(e.message)}
 }
 async function referral(){
  setMsg('Erzeuge Referral Lead...')
  try{await v33FunctionalClient.createReferral(cid,ref);setMsg('Referral-/Empfehlungsbonus erzeugt')}catch(e:any){setMsg(e.message)}
 }
 async function birthdayBonus(){
  setMsg('Buche Geburtstagsbonus...')
  try{await v33FunctionalClient.applyBirthdayBonus(cid,birthday);setMsg('Geburtstagsbonus gebucht und Level geprüft')}catch(e:any){setMsg(e.message)}
 }
 if(!settings)return <Card title="Loyalty Branding & Regeln"><div className="sub">Lade Einstellungen...</div>{msg&&<Badge type="red">{msg}</Badge>}</Card>
 const qrUrl=typeof window!=='undefined'?`${window.location.origin}/l/${settings.slug||'dein-slug'}`:''
 return <><Head title="Loyalty Branding & Rules Builder" sub="QR & Loyalty · mobile optimiert · kundenspezifisch"/><div className="grid2"><Card title="Landingpage Branding"><label className="sub">Kundenname in geschwungener Schrift</label><input className="input" value={settings.brand_name||''} onChange={e=>patch('brand_name',e.target.value)}/><select className="input" value={settings.brand_font||'Pacifico'} onChange={e=>patch('brand_font',e.target.value)}><option>Pacifico</option><option>Great Vibes</option><option>Dancing Script</option><option>Georgia</option></select><input className="input" value={settings.hero_headline||''} onChange={e=>patch('hero_headline',e.target.value)} placeholder="Headline"/><textarea className="input" value={settings.hero_subline||''} onChange={e=>patch('hero_subline',e.target.value)} placeholder="Subline"/><div className="grid2 mini"><input className="input" type="color" value={settings.brand_primary||'#d4af37'} onChange={e=>patch('brand_primary',e.target.value)}/><input className="input" type="color" value={settings.brand_secondary||'#111827'} onChange={e=>patch('brand_secondary',e.target.value)}/></div><div className="v37BrandPreview" style={{background:settings.brand_secondary,color:settings.brand_primary}}><div style={{fontFamily:settings.brand_font}}>{settings.brand_name}</div><span>{settings.hero_headline}</span></div></Card><Card title="QR-Code Design"><select className="input" value={settings.qr_style||'luxury'} onChange={e=>patch('qr_style',e.target.value)}><option value="luxury">Luxury</option><option value="minimal">Minimal</option><option value="bold">Bold</option><option value="classic">Classic</option></select><input className="input" type="color" value={settings.qr_foreground||'#111827'} onChange={e=>patch('qr_foreground',e.target.value)}/><input className="input" type="color" value={settings.qr_background||'#ffffff'} onChange={e=>patch('qr_background',e.target.value)}/><input className="input" value={settings.qr_logo_text||''} onChange={e=>patch('qr_logo_text',e.target.value)} placeholder="QR Logo Text"/><V37QrDesignPreview settings={settings} url={qrUrl}/></Card></div><div className="grid2"><Card title="Limits & Level-Up Regeln"><div className="grid2 mini"><input className="input" type="number" value={settings.daily_scan_limit||0} onChange={e=>patch('daily_scan_limit',Number(e.target.value))} placeholder="Tageslimit"/><input className="input" type="number" value={settings.weekly_scan_limit||0} onChange={e=>patch('weekly_scan_limit',Number(e.target.value))} placeholder="Wochenlimit"/></div>{(settings.level_rules||[]).map((r:any,i:number)=><div className="item" key={i}><input className="input" value={r.tier} onChange={e=>{const x=[...settings.level_rules];x[i]={...x[i],tier:e.target.value};patch('level_rules',x)}}/><input className="input" type="number" value={r.min_points} onChange={e=>{const x=[...settings.level_rules];x[i]={...x[i],min_points:Number(e.target.value)};patch('level_rules',x)}}/><input className="input" type="number" step="0.05" value={r.multiplier} onChange={e=>{const x=[...settings.level_rules];x[i]={...x[i],multiplier:Number(e.target.value)};patch('level_rules',x)}}/></div>)}<button className="btn secondary" onClick={()=>patch('level_rules',[...(settings.level_rules||[]),{tier:'Neues Level',min_points:1500,multiplier:1.75}])}>Level hinzufügen</button></Card><Card title="Geburtstag & Referral Bonus"><input className="input" type="number" value={settings.birthday_bonus_points||0} onChange={e=>patch('birthday_bonus_points',Number(e.target.value))} placeholder="Geburtstagsbonus"/><input className="input" type="number" value={settings.referral_bonus_referrer||0} onChange={e=>patch('referral_bonus_referrer',Number(e.target.value))} placeholder="Empfehler Bonus"/><input className="input" type="number" value={settings.referral_bonus_friend||0} onChange={e=>patch('referral_bonus_friend',Number(e.target.value))} placeholder="Freund Bonus"/><hr/><input className="input" value={ref.friend_name} onChange={e=>setRef({...ref,friend_name:e.target.value})}/><input className="input" value={ref.friend_email} onChange={e=>setRef({...ref,friend_email:e.target.value})}/><button className="btn secondary" onClick={referral}>Referral Lead testen</button><hr/><input className="input" value={birthday.email} onChange={e=>setBirthday({...birthday,email:e.target.value})} placeholder="Member E-Mail"/><input className="input" type="date" value={birthday.birthday} onChange={e=>setBirthday({...birthday,birthday:e.target.value})}/><button className="btn secondary" onClick={birthdayBonus}>Geburtstagsbonus buchen</button></Card></div><Card title="Reward Ablaufdatum & Einlöselimits"><div className="grid4"><input className="input" value={reward.title} onChange={e=>setReward({...reward,title:e.target.value})}/><input className="input" type="number" value={reward.points} onChange={e=>setReward({...reward,points:Number(e.target.value)})}/><input className="input" type="date" value={reward.expires_at} onChange={e=>setReward({...reward,expires_at:e.target.value})}/><input className="input" type="number" value={reward.max_redemptions} onChange={e=>setReward({...reward,max_redemptions:Number(e.target.value)})}/></div><div className="grid4"><input className="input" type="number" value={reward.max_per_customer} onChange={e=>setReward({...reward,max_per_customer:Number(e.target.value)})}/><input className="input" type="number" value={reward.daily_limit} onChange={e=>setReward({...reward,daily_limit:Number(e.target.value)})}/><input className="input" type="number" value={reward.weekly_limit} onChange={e=>setReward({...reward,weekly_limit:Number(e.target.value)})}/><button className="btn" onClick={saveReward}>Reward speichern</button></div></Card><button className="btn" onClick={save}>Alle Loyalty Einstellungen speichern</button>{msg&&<div className="sub">{msg}</div>}<V38RewardHistory cid={cid}/></>
}

function V37QrDesignPreview({settings,url}:any){
 const qr=`https://api.qrserver.com/v1/create-qr-code/?size=640x640&color=${String(settings.qr_foreground||'#111827').replace('#','')}&bgcolor=${String(settings.qr_background||'#ffffff').replace('#','')}&data=${encodeURIComponent(url||'/l/slug')}`
 return <div className={`v37QrPreview ${settings.qr_style||'luxury'}`}><img src={qr} alt="QR Preview"/><div className="v37QrBadge">{settings.qr_logo_text||'QR'}</div><span>{settings.qr_style} · scanbar</span></div>
}

function V36QrExport({slug,path}:{slug?:string,path?:string}){
 const publicBase=process.env.NEXT_PUBLIC_APP_URL || (typeof window!=='undefined'?window.location.origin:'')
 const url=slug?`${publicBase}/l/${slug}`:(path?`${publicBase}${path}`:'')
 const qr=`https://api.qrserver.com/v1/create-qr-code/?size=640x640&data=${encodeURIComponent(url)}`
 async function copy(){try{await navigator.clipboard.writeText(url)}catch{}}
 function download(){const a=document.createElement('a');a.href=qr;a.download=`qr-${slug||'loyalty'}.png`;a.target='_blank';a.click()}
 if(!url)return null
 return <div className="qrExport"><img src={qr} alt="QR Code"/><div><b>Scan-Link</b><div className="sub">{url}</div><div className="toolbarActions"><button className="btn secondary" onClick={copy}>Link kopieren</button><button className="btn secondary" onClick={download}>QR PNG öffnen/downloaden</button></div></div></div>
}

function V36DemoQaPanel({cid}:any){
 const [status,setStatus]=useState<any>(null)
 const [report,setReport]=useState<any>(null)
 const [msg,setMsg]=useState('')
 async function run(label:string,fn:any){
  setMsg(`${label} läuft...`)
  try{const r=await fn(); if(label.includes('Status'))setStatus(r); if(label.includes('Report'))setReport(r.report); setMsg(`${label} abgeschlossen`)}
  catch(e:any){setMsg(e.message||`${label} fehlgeschlagen`)}
 }
 return <Card title="Demo QA & Worker" action={<button className="btn secondary" onClick={()=>run('Statuscheck',()=>v33FunctionalClient.systemStatus())}>API-Status</button>}><div className="sub">Prüft Backend/Supabase, erzeugt QA-Report, startet Worker und setzt Kundendemo bei Bedarf zurück.</div><div className="toolbarActions"><button className="btn secondary" onClick={()=>run('QA Report',()=>v33FunctionalClient.qaReport(cid))}>QA Report laden</button><button className="btn secondary" onClick={()=>run('Automation Worker',()=>v33FunctionalClient.runWorker(cid,{run_marketing:true}))}>Worker starten</button><button className="btn secondary" onClick={()=>run('Demo Reset',()=>v33FunctionalClient.resetDemoData(cid))}>Kundendemo zurücksetzen</button></div>{msg&&<div className="sub">{msg}</div>}{status&&<div className="grid4"><Metric label="Backend" value={status.checks?.backend?'OK':'Fehler'}/><Metric label="Supabase" value={status.checks?.supabase?'OK':'Warnung'}/><Metric label="Status" value={status.status}/><Metric label="Zeit" value="Live"/></div>}{report&&<div className="grid4"><Metric label="QR" value={report.counts.qr_campaigns}/><Metric label="Leads" value={report.counts.leads}/><Metric label="Members" value={report.counts.loyalty_members}/><Metric label="Engine Runs" value={report.counts.engine_runs}/></div>}{report?.qr_campaigns?.[0]?.slug&&<V36QrExport slug={report.qr_campaigns[0].slug}/>}</Card>
}

function V35BusinessEnginePanel({cid}:any){
 const [snapshot,setSnapshot]=useState<any>(null)
 const [msg,setMsg]=useState('')
 async function run(fn:any,label:string){
  setMsg(`${label} läuft...`)
  try{
   const result=await fn()
   setSnapshot(result.snapshot||result)
   setMsg(`${label} abgeschlossen`)
  }catch(e:any){setMsg(e.message||`${label} fehlgeschlagen`)}
 }
 return <Card title="Business Engine" action={<button className="btn secondary" onClick={()=>run(()=>v33FunctionalClient.recalculateCustomer(cid),'Recalculate')}>Alles neu berechnen</button>}><div className="sub">Produktionsnahe Demo-Engine: Health, Intelligence, Billing, Forecast, Revenue Share, Recommendations und AI-Hinweise werden aus echten Kundensignalen berechnet.</div><div className="toolbarActions"><button className="btn secondary" onClick={()=>run(()=>v33FunctionalClient.runAutomation(cid,{}),'Automation Engine')}>Automation Engine</button><button className="btn secondary" onClick={()=>run(()=>v33FunctionalClient.runMarketing(cid,{name:'Demo Booster'}),'Marketing Engine')}>Marketing Engine</button><button className="btn secondary" onClick={()=>run(()=>v33FunctionalClient.calculateBilling(cid),'Billing Engine')}>Billing Engine</button></div>{msg&&<div className="sub">{msg}</div>}{snapshot&&<div className="grid4"><Metric label="Health" value={snapshot.health??snapshot.snapshot?.health??'-'}/><Metric label="Risk" value={snapshot.risk??snapshot.snapshot?.risk??'-'}/><Metric label="Upsell" value={snapshot.upsell??snapshot.snapshot?.upsell??'-'}/><Metric label="Forecast" value={snapshot.forecast??snapshot.snapshot?.forecast??'-'}/></div>}</Card>
}

function V34CustomerProvisioning({cid}:any){
 const [data,setData]=useState<any>(null)
 const [msg,setMsg]=useState('')
 async function provision(){
  setMsg('Provisioning läuft...')
  try{
   const r=await v33FunctionalClient.provisionCustomer(cid,{})
   setData(r)
   setMsg('Kunde wurde mit QR/Loyalty/Landingpage vorbereitet.')
  }catch(e:any){setMsg(e.message||'Provisioning fehlgeschlagen')}
 }
 async function bootstrap(){
  setMsg('Kundendaten werden geladen...')
  try{
   const r=await v33FunctionalClient.bootstrapCustomer(cid)
   setData(r)
   setMsg('Kundendaten aus Supabase geladen.')
  }catch(e:any){setMsg(e.message||'Laden fehlgeschlagen')}
 }
 return <Card title="Kunden-Provisioning" action={<button className="btn secondary" onClick={bootstrap}>Daten laden</button>}><div className="sub">Für jeden neu angelegten Kunden kannst du automatisch QR-Kampagne, Loyalty-Programm, Landingpage und Standard-Code erzeugen.</div><button className="btn" onClick={provision}>Kunden für QR/Loyalty vorbereiten</button>{msg&&<div className="sub">{msg}</div>}{data?.public_url_path&&<div className="item"><b>Öffentliche Endkundenseite</b><span>{data.public_url_path}</span><Badge type="green">scanbereit</Badge></div>}{data?.qr_campaign?.slug&&<div className="item"><b>QR Slug</b><span>{data.qr_campaign.slug}</span></div>}{data?.qr_campaign?.slug&&<V36QrExport slug={data.qr_campaign.slug}/>}</Card>
}

function V33LeadQuickCheck({cid}:any){
 const [data,setData]=useState<any>(null)
 const [error,setError]=useState('')
 async function load(){
  setError('')
  try{setData(await v33FunctionalClient.leads(cid))}
  catch(e:any){setError(e.message||'Leads konnten nicht geladen werden')}
 }
 return <Card title="QR/Loyalty Leads" action={<button className="btn secondary" onClick={load}>Leads laden</button>}><div className="sub">Lead-Test: Öffne /l/demo-cafe-morgenlicht, sammle Punkte und lade danach hier die Leads.</div>{error&&<Badge type="red">{error}</Badge>}{data?.leads?.slice(0,5).map((l:any)=><div className="item" key={l.id}><b>{l.name||l.email||'QR Lead'}</b><span>{l.email||l.phone||'ohne Kontakt'} · {l.points_added||0} Punkte</span><Badge type="green">Lead</Badge></div>)}</Card>
}


function SystemStabilityPanel(){
 const [ready,setReady]=useState<any>(null)
 const [schema,setSchema]=useState<any>(null)
 const [msg,setMsg]=useState('')
 async function run(){
  setMsg('Systemcheck läuft...')
  try{
   const r=await systemReady(); setReady(r)
   try{setSchema(await systemSchema())}catch(e:any){setSchema({ok:false,error:e.message})}
   setMsg(r?.ready?'System bereit':'System mit Warnungen – Details prüfen')
  }catch(e:any){setReady({ok:false,error:e.message});setMsg(e.message||'Systemcheck fehlgeschlagen')}
 }
 return <Card title="System Stability" action={<button className="btn secondary" onClick={run}>Ready Check</button>}><div className="sub">Prüft Backend, Supabase-Erreichbarkeit und wichtige Migrationstabellen.</div>{msg&&<div className="sub">{msg}</div>}{ready&&<div className="grid4"><Metric label="Backend" value={ready.ok?'OK':'Prüfen'}/><Metric label="Ready" value={ready.ready?'Ja':'Nein'}/><Metric label="Optionale Tabellen fehlen" value={(ready.missing_optional_schema||schema?.missing||[]).length||0}/><Metric label="Google OAuth" value={ready.checks?'prüfbar':'separat'}/></div>}{ready?.error&&<Badge type="red">{ready.error}</Badge>}{(ready?.missing_optional_schema||schema?.missing||[]).slice(0,6).map((t:string)=><div className="item" key={t}><b>{t}</b><span>Migration/Tabelle prüfen</span><Badge type="red">optional fehlt</Badge></div>)}</Card>
}

function Dashboard({store,cid,role,setCid,setView,activeAdmin}:any){
 const inv=role==='admin'?store.data.invoices:store.data.invoices.filter((i:any)=>i.customer_id===cid)
 const open=store.data.tickets.filter((t:any)=>(role==='admin'||t.customer_id===cid)&&t.status!=='Geschlossen').length
 const pending=store.data.package_requests.filter((p:any)=>p.status==='Angefragt')
 const seo=store.data.seo_snapshots.filter((s:any)=>s.customer_id===cid)
 const growth=seo.length>=2?Math.round(((seo.at(-1).organic_traffic-seo[0].organic_traffic)/seo[0].organic_traffic)*100):0
 const revenue=inv.filter((i:any)=>i.status==='Bezahlt'&&!isDemoCustomer(store.data,i.customer_id)&&!i.is_demo).reduce((s:number,i:any)=>s+Number(i.amount||0),0)
 const customer=cobj(store.data,cid)
 const onboarding=(store.data.onboarding_checklists||[]).find((o:any)=>o.customer_id===cid)
 const steps=onboardingStepsFor(customer).map(([key,label,auto]:any)=>({key,label,done:Boolean(onboarding?.steps?.[key]??auto)}))
 const pct=Math.round((steps.filter((s:any)=>s.done).length/steps.length)*100)
 const approvals=(store.data.approval_requests||[]).filter((a:any)=>role==='admin'||a.customer_id===cid).filter((a:any)=>a.status!=='Archiviert')
 const reports=(store.data.monthly_reports||[]).filter((r:any)=>role==='admin'||r.customer_id===cid)
 if(role==='customer'){
  const overdue=inv.filter((i:any)=>['Überfällig','Mahnung 1','Mahnung 2'].includes(i.status)).length
  const actions=[
   {title:'Onboarding fortsetzen',desc:`${pct}% abgeschlossen`,view:'onboarding',badge:pct>=80?'green':'yellow'},
   {title:'Offene Freigaben prüfen',desc:`${approvals.filter((a:any)=>a.status==='Offen').length} offen`,view:'approvals',badge:'purple'},
   {title:'Monatsreport ansehen',desc:reports[0]?.title||'Noch kein Report erstellt',view:'reports',badge:'blue'},
   {title:'Google & SEO prüfen',desc:'Sichtbarkeit, Quellen und Wettbewerber',view:'seo',badge:'green'}
  ]
  return <><Head title="Mein Marketing-Portal" sub={`Willkommen zurück, ${cname(store.data,cid)} · klarer Überblick statt Tool-Suche`} action={<LiveModeBadge/>}/><div className="customerHero"><div><Badge type="green">Betreut durch Mecklenburg Marketing</Badge><h1>Das ist heute wichtig</h1><p>Du siehst die nächsten Aufgaben, offene Freigaben, Rechnungen und aktuelle Empfehlungen auf einen Blick.</p>{packageProgress(pct)}</div><div className="customerHeroCard"><b>Setup-Fortschritt</b><strong>{pct}%</strong><span>{steps.filter((s:any)=>!s.done)[0]?.label||'Setup vollständig'}</span></div></div><div className="grid4"><Metric label="Offene Tickets" value={open}/><Metric label="SEO-Wachstum" value={`${growth>=0?'+':''}${growth}%`}/><Metric label="Offene Rechnungen" value={inv.filter((i:any)=>i.status!=='Bezahlt').length}/><Metric label="Warnungen" value={overdue}/></div><Card title="Nächste Schritte">{actions.map((a:any)=><div className="item" key={a.title}><div><b>{a.title}</b><div className="sub">{a.desc}</div></div><div className="toolbarActions"><Badge type={a.badge}>{a.badge==='green'?'OK':'Offen'}</Badge><button className="btn secondary" onClick={()=>setView(a.view)}>Öffnen</button></div></div>)}</Card><div className="grid2"><Card title="Aktuelle Empfehlung"><ToolTipHint title="Google Business Optimierung">Aktualisiere regelmäßig Fotos, Leistungen und Beiträge. Das stärkt lokale Sichtbarkeit und Vertrauen bei neuen Kunden.</ToolTipHint><button className="btn secondary" onClick={()=>setView('knowledge')}>Erklärung im Wissenscenter öffnen</button></Card><Card title="Datenvertrauen"><TrustHint source={seo.length?'SEO Snapshot / Google Sync':'Demo-/Fallback-Daten'} updated={seo.at(-1)?.created_at}/><div className="sub">Live-/Fallback-Hinweise zeigen, ob Daten aus Supabase/API oder aus dem lokalen Demo-Modus stammen.</div></Card></div></>
 }
 const todayFollowUps=(store.data.acquisition_campaigns||[]).filter((c:any)=>String(c.follow_up_at||'').slice(0,10)<=new Date().toISOString().slice(0,10)&&!['Gewonnen','Verloren','Archiviert'].includes(c.stage||c.status))
 const redCustomers=(store.data.customer_health_scores||[]).filter((h:any)=>h.status==='Rot'||Number(h.score||0)<55)
 return <><Head title="Agentur-Cockpit" sub={`Herzlich willkommen ${activeAdmin} · Akquise, Kunden, Finanzen und Systemzustand`} action={<LiveModeBadge/>}/><div className="grid4"><Metric label="Umsatz" value={eur(revenue)} sub="ohne Demo-Kunden"/><Metric label="Follow-ups heute" value={todayFollowUps.length}/><Metric label="Offene Tickets" value={open}/><Metric label="Paketanfragen" value={pending.length}/></div><div className="grid2"><Card title="Revenue Übersicht"><div className="item"><b>Revenue Forecasting</b><span>MRR, Pipeline und Umsatzpotenzial zentral sichtbar.</span><button className="btn secondary" onClick={()=>setView('revenue_forecasting')}>Forecast öffnen</button></div><div className="item"><b>Revenue Share</b><span>Beteiligung, Add-ons und Revenue-Modelle prüfen.</span><button className="btn secondary" onClick={()=>setView('revenue_share')}>Revenue Share öffnen</button></div></Card><Card title="Heute erledigen"><div className="item"><b>Akquise-Follow-ups</b><span>{todayFollowUps.length} Kampagnen benötigen Nachfassen.</span><button className="btn secondary" onClick={()=>setView('acquisition_campaigns')}>Öffnen</button></div><div className="item"><b>Rote Kunden</b><span>{redCustomers.length} Kunden mit erhöhtem Risiko.</span><button className="btn secondary" onClick={()=>setView('health_scores')}>Prüfen</button></div><div className="item"><b>Überfällige Rechnungen</b><span>{store.data.invoices.filter((i:any)=>['Überfällig','Mahnung 1','Mahnung 2'].includes(i.status)).length} Vorgänge.</span><button className="btn secondary" onClick={()=>setView('dunning')}>Mahnwesen</button></div></Card><Card title="Professioneller Output"><div className="item"><b>Mini-Audits, Angebote, Verträge, Mahnungen</b><span>Einheitlich im Mecklenburg-Marketing-Design öffnen oder als HTML/PDF-Vorlage exportieren.</span><button className="btn secondary" onClick={()=>setView('output_engine')}>Output Engine</button></div><div className="item"><b>Monatsreports</b><span>Kundenwert monatlich sichtbar machen.</span><button className="btn secondary" onClick={()=>setView('monthly_reports')}>Reports</button></div></Card></div>{pending.length>0&&<Card title="Paketanfragen">{pending.map((p:any)=><div className="item" key={p.id}><div><b>{cname(store.data,p.customer_id)} möchte {p.package_name}</b><div className="sub">{p.billing_interval}</div></div><button className="btn secondary" onClick={()=>setCid(p.customer_id)}>Kunde öffnen</button></div>)}</Card>}</>
}


function CRM({store,cid,activeAdmin,adminAvatars}:any){return <><Head title="CRM Kundenakte" sub={cname(store.data,cid)} action={<LiveModeBadge/>}/><CustomerAccessPanel store={store} cid={cid} activeAdmin={activeAdmin}/><CustomerInfo store={store} cid={cid}/><PackageControl store={store} cid={cid} activeAdmin={activeAdmin}/><QuickCRM store={store} cid={cid}/><div className="grid2"><CRMInvoices store={store} cid={cid}/><CRMNotes store={store} cid={cid} activeAdmin={activeAdmin}/></div><div className="grid2"><Card title="Verträge"><FileList store={store} cid={cid} type="contracts"/></Card><Card title="Media"><FileList store={store} cid={cid}/></Card></div></>}


function CustomerAccessPanel({store,cid,activeAdmin}:any){
 const customer=cobj(store.data,cid)||{}
 const [email,setEmail]=useState(customer.email||'')
 const [contact,setContact]=useState(customer.contact_person||'')
 const [pkg,setPkg]=useState(cpkg(store.data,cid)||customer.package_name||'Starter')
 const [inviteUrl,setInviteUrl]=useState('')
 const [msg,setMsg]=useState('')
 const registrations=(store.data.customer_registrations||[]).filter((r:any)=>r.customer_id===cid)
 const invites=(store.data.customer_invites||[]).filter((i:any)=>i.customer_id===cid).sort((a:any,b:any)=>String(b.created_at).localeCompare(String(a.created_at)))
 const users=(store.data.customer_users||[]).filter((u:any)=>u.customer_id===cid)
 useEffect(()=>{setEmail(customer.email||'');setContact(customer.contact_person||'');setPkg(cpkg(store.data,cid)||customer.package_name||'Starter');setInviteUrl('');setMsg('')},[cid])
 async function createInvite(){
  setMsg('')
  if(!email){setMsg('Bitte E-Mail-Adresse für den Login hinterlegen.');return}
  try{
   const r=await customerPortalClient.createInvite({customer_id:cid,email,contact_person:contact,package_name:pkg,created_by:activeAdmin,origin:window.location.origin})
   setInviteUrl(r.invite_url)
   await store.load?.()
   setMsg('Einladungslink erzeugt. Du kannst ihn kopieren oder per E-Mail senden.')
  }catch(e:any){
   const token=uid()
   const localUrl=`${window.location.origin}/auth?invite=${token}`
   const invite={id:uid(),customer_id:cid,email,contact_person:contact,package_name:pkg,status:'open_local',token,invite_url:localUrl,created_by:activeAdmin,expires_at:new Date(Date.now()+14*86400000).toISOString(),metadata:{local_only:true}}
   await store.create('customer_invites',invite)
   setInviteUrl(localUrl)
   setMsg(`Backend/Supabase konnte die Einladung nicht speichern: ${e.message}. Link nur als lokaler Entwurf erzeugt.`)
  }
 }
 async function copyLink(url:string){await navigator.clipboard?.writeText(url);setMsg('Einladungslink kopiert.')}
 function mailto(url:string){
  const subject=encodeURIComponent('Dein Zugang zum Mecklenburg Marketing Kundenportal')
  const body=encodeURIComponent(`Hallo ${contact||''},\n\nhier ist dein persönlicher Einladungslink zum Kundenportal von Mecklenburg Marketing:\n${url}\n\nBitte öffne den Link und setze dein Passwort.\n\nViele Grüße\nMecklenburg Marketing`)
  window.location.href=`mailto:${email}?subject=${subject}&body=${body}`
 }
 async function approve(reg:any){
  try{
   await customerPortalClient.approve(reg.id,{reviewed_by:activeAdmin})
   await store.update('customer_registrations',reg.id,{status:'approved',reviewed_by:activeAdmin,reviewed_at:new Date().toISOString()})
   await store.update('customers',cid,{status:'active',package_name:reg.requested_package||pkg,requested_package:reg.requested_package||pkg})
   setMsg('Kunde freigeschaltet. Der Login ist aktiv, sobald Supabase Auth bestätigt ist.')
  }catch(e:any){
   await store.update('customer_registrations',reg.id,{status:'approved_local',reviewed_by:activeAdmin,reviewed_at:new Date().toISOString()})
   await store.update('customers',cid,{status:'active',package_name:reg.requested_package||pkg,requested_package:reg.requested_package||pkg})
   setMsg(`Freischaltung lokal markiert. Backend-Meldung: ${e.message}`)
  }
 }
 async function blockUser(u:any){await store.update('customer_users',u.id,{status:u.status==='blocked'?'active':'blocked'});setMsg(u.status==='blocked'?'Zugang wieder aktiviert.':'Zugang gesperrt.')}
 async function revokeInvite(i:any){
  try{await customerPortalClient.revokeInvite(i.id,{revoked_by:activeAdmin}); await store.load?.(); setMsg('Einladung widerrufen.')}
  catch(e:any){await store.update('customer_invites',i.id,{status:'revoked_local',revoked_by:activeAdmin,revoked_at:new Date().toISOString()}); setMsg(`Einladung lokal widerrufen. Backend: ${e.message}`)}
 }
 async function resendInvite(i:any){
  try{const r=await customerPortalClient.resendInvite(i.id,{created_by:activeAdmin,origin:window.location.origin}); await store.load?.(); setInviteUrl(r.invite_url||i.invite_url); setMsg('Einladung wurde erneuert. Neuer Link ist aktiv.')}
  catch(e:any){setMsg(`Erneutes Senden nicht möglich: ${e.message}`)}
 }
 return <Card title="Login & Zugänge" action={<Badge type={customer.status==='active'?'green':customer.status==='pending'?'yellow':'purple'}>{customer.status||'active'}</Badge>}>
  <div className="grid2"><div><b>Kundenlogin einladen</b><p className="sub">CRM-Kunde und Login-Nutzer bleiben getrennt: Diese Einladung verbindet eine E-Mail mit dieser Kundenakte.</p><input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-Mail für Kundenlogin"/><input className="input" value={contact} onChange={e=>setContact(e.target.value)} placeholder="Ansprechpartner"/><select className="input" value={pkg} onChange={e=>setPkg(e.target.value)}><option>Starter</option><option>Growth</option><option>Premium</option></select><div className="toolbarActions"><button className="btn" onClick={createInvite}>Einladungslink erzeugen</button>{inviteUrl&&<button className="btn secondary" onClick={()=>copyLink(inviteUrl)}>Link kopieren</button>}{inviteUrl&&<button className="btn secondary" onClick={()=>mailto(inviteUrl)}>Per E-Mail öffnen</button>}</div>{inviteUrl&&<input className="input" readOnly value={inviteUrl}/>}</div><div><b>Aktive / angefragte Zugänge</b>{users.length===0&&registrations.length===0&&invites.length===0&&<EmptyState icon="🔐" title="Noch kein Portalzugang">Erzeuge eine Einladung oder warte auf eine Kundenregistrierung. Selbstregistrierungen erscheinen hier zur Freischaltung.</EmptyState>}{users.map((u:any)=><div className="item" key={u.id||u.auth_user_id}><div><b>{u.display_name||u.email}</b><div className="sub">{u.email} · {u.role||'owner'} · {u.status||'active'}</div></div><button className="btn secondary" onClick={()=>blockUser(u)}>{u.status==='blocked'?'Entsperren':'Sperren'}</button></div>)}{registrations.map((r:any)=><div className="item" key={r.id}><div><b>{r.company_name}</b><div className="sub">Registrierung · {r.email} · {r.requested_package} · {r.status}</div></div><div className="toolbarActions">{String(r.status).startsWith('pending')&&<button className="btn" onClick={()=>approve(r)}>Freischalten</button>}<Badge type={String(r.status).includes('approved')?'green':'yellow'}>{r.status}</Badge></div></div>)}{invites.map((i:any)=><div className="item" key={i.id}><div><b>{i.email}</b><div className="sub">Einladung · {i.package_name} · {i.status} · gültig bis {i.expires_at?new Date(i.expires_at).toLocaleDateString('de-DE'):'-'}</div></div><div className="toolbarActions"><button className="btn secondary" onClick={()=>copyLink(i.invite_url)}>Kopieren</button>{String(i.status).startsWith('open')&&<button className="btn secondary" onClick={()=>resendInvite(i)}>Erneut senden</button>}{String(i.status).startsWith('open')&&<button className="btn secondary" onClick={()=>revokeInvite(i)}>Widerrufen</button>}<Badge type={i.status==='accepted'?'green':i.status==='open'?'purple':String(i.status).includes('revoked')?'red':'yellow'}>{i.status}</Badge></div></div>)}</div></div>{msg&&<div className="sub">{msg}</div>}</Card>
}

function CustomerInfo({store,cid}:any){
 const c=cobj(store.data,cid)
 const [f,setF]=useState<any>(c)
 const initialContacts=(c?.metadata?.contacts&&Array.isArray(c.metadata.contacts)?c.metadata.contacts:[]).length
   ? c.metadata.contacts
   : [{name:c?.contact_person||'',email:c?.contact_email||'',phone:c?.contact_phone||''},{name:c?.second_contact_person||'',email:'',phone:''}].filter((x:any)=>x.name||x.email||x.phone)
 const [contacts,setContacts]=useState<any[]>(initialContacts.length?initialContacts:[{name:'',email:'',phone:''}])
 if(!c)return null
 function patchContact(i:number,key:string,value:string){const next=[...contacts];next[i]={...next[i],[key]:value};setContacts(next)}
 function addContact(){setContacts([...contacts,{name:'',email:'',phone:''}])}
 function removeContact(i:number){setContacts(contacts.filter((_:any,idx:number)=>idx!==i))}
 async function save(){
  const cleaned=contacts.filter((x:any)=>x.name||x.email||x.phone)
  await store.update('customers',cid,{...f,contact_person:cleaned[0]?.name||'',second_contact_person:cleaned[1]?.name||'',metadata:{...(f.metadata||{}),contacts:cleaned}})
 }
 return <Card title="Kundeninfos bearbeiten" action={<button className="btn" onClick={save}>Speichern</button>}><div className="grid2"><input className="input" placeholder="Firmen-/Kundenname" value={f.name||''} onChange={e=>setF({...f,name:e.target.value})}/><input className="input" placeholder="Allgemeine Telefonnummer" value={f.phone||''} onChange={e=>setF({...f,phone:e.target.value})}/><input className="input" placeholder="Allgemeine E-Mail-Adresse" value={f.email||''} onChange={e=>setF({...f,email:e.target.value})}/><input className="input" placeholder="Straße, Hausnummer, PLZ und Ort" value={f.address||''} onChange={e=>setF({...f,address:e.target.value})}/></div><Card title="Ansprechpartner"><div className="sub">Mehrere Ansprechpartner mit eigener E-Mail und Telefonnummer hinterlegen.</div>{contacts.map((contact:any,i:number)=><div className="grid3" key={i}><input className="input" placeholder="Name des Ansprechpartners" value={contact.name||''} onChange={e=>patchContact(i,'name',e.target.value)}/><input className="input" placeholder="E-Mail des Ansprechpartners" value={contact.email||''} onChange={e=>patchContact(i,'email',e.target.value)}/><div className="row"><input className="input" placeholder="Telefon des Ansprechpartners" value={contact.phone||''} onChange={e=>patchContact(i,'phone',e.target.value)}/><button className="btn secondary" onClick={()=>removeContact(i)}>−</button></div></div>)}<button className="btn secondary" onClick={addContact}>Ansprechpartner hinzufügen</button></Card></Card>
}

function PackageControl({store,cid,activeAdmin}:any){
async function apply(pkg:string){
  try{await opsClient.grantPackage({customer_id:cid,package_name:pkg,tools:packageDefs[pkg].tools})}catch{}
  const current=store.data.customer_subscriptions.find((s:any)=>s.customer_id===cid)
  if(current) await store.update('customer_subscriptions',current.id,{package_name:pkg,status:'active',price_monthly:pprice(pkg),customer_id:cid})
  else await store.create('customer_subscriptions',{customer_id:cid,package_name:pkg,status:'active',price_monthly:pprice(pkg)})
  const allTools=Array.from(new Set(Object.values(packageDefs).flatMap((p:any)=>p.tools)))
  for(const t of allTools){const row=store.data.customer_tool_access.find((x:any)=>x.customer_id===cid&&x.tool_key===t);const enabled=packageDefs[pkg].tools.includes(t);if(row) await store.update('customer_tool_access',row.id,{enabled,customer_id:cid});else await store.create('customer_tool_access',{customer_id:cid,tool_key:t,enabled})}
  for(const r of store.data.package_requests.filter((x:any)=>x.customer_id===cid&&x.status==='Angefragt')) await store.update('package_requests',r.id,{status:r.package_name===pkg?'Freigegeben':'Abgelehnt',customer_id:cid})
  await store.create('notifications',{customer_id:cid,title:`${activeAdmin} hat Paket freigeschaltet`,message:`${activeAdmin} hat ${pkg} für ${cname(store.data,cid)} aktiviert.`,type:'admin_change',actor_name:activeAdmin})
 }
async function toggleTool(t:string){
  const row=store.data.customer_tool_access.find((x:any)=>x.customer_id===cid&&x.tool_key===t)
  const inherited=Boolean(packageDefs[cpkg(store.data,cid)]?.tools.includes(t))
  const enabled=row?!row.enabled:!inherited
  try{await opsClient.grantTool({customer_id:cid,tool_key:t,enabled})}catch{}
  if(row) await store.update('customer_tool_access',row.id,{enabled,customer_id:cid})
  else await store.create('customer_tool_access',{customer_id:cid,tool_key:t,enabled})
 }
 const allTools=Array.from(new Set(Object.values(packageDefs).flatMap((p:any)=>p.tools)))
 return <><Card title="Paketfreigabe">{Object.keys(packageDefs).map(p=><div className="item" key={p}><div><b>{p}</b><div className="sub">{eur(pprice(p))}</div></div><button className="btn secondary" onClick={()=>apply(p)}>{cpkg(store.data,cid)===p?'Aktiv':'Freischalten'}</button></div>)}</Card><Card title="Einzelne Tools individuell freischalten">{allTools.map((t:any)=>{const row=store.data.customer_tool_access.find((x:any)=>x.customer_id===cid&&x.tool_key===t);const enabled=row?row.enabled:packageDefs[cpkg(store.data,cid)]?.tools.includes(t);return <div className="item" key={t}><span>{t}</span><button className="btn secondary" onClick={()=>toggleTool(t)}>{enabled?'Freigegeben':'Gesperrt'}</button></div>})}</Card></>
}
function QuickCRM({store,cid}:any){return <Card title="Smart Quick Actions"><button className="btn secondary" onClick={async()=>{const invoice={id:uid(),customer_id:cid,invoice_number:invName(store.data,cid),service_type:'Quick Rechnung',amount:199,status:'Offen',is_demo:isDemoCustomer(store.data,cid),created_at:new Date().toISOString()};await store.create('invoices',invoice);await generateInvoicePdf(store,invoice)}}>Rechnung + PDF erstellen</button> <button className="btn secondary" onClick={()=>store.create('tickets',{customer_id:cid,title:'Neues Ticket',description:'Interner Vorgang',status:'Offen',priority:'Mittel'})}>Ticket erstellen</button></Card>}
function CRMInvoices({store,cid}:any){
 const rows=store.data.invoices.filter((i:any)=>i.customer_id===cid).sort((a:any,b:any)=>String(b.created_at).localeCompare(String(a.created_at)))
 const invoiceStatuses=STATUS_OPTIONS.invoice
 return <Card title="Aktuelle Rechnungen"><div className="scrollBox">{rows.map((i:any)=><div className="item" key={i.id}><div><b>{i.invoice_number}</b><div className="sub">{i.service_type} · {eur(i.amount)} · {i.status}</div></div><div className="toolbarActions"><select className="input compactInput" value={i.status||'Offen'} onChange={e=>store.update('invoices',i.id,{status:e.target.value,customer_id:i.customer_id})}>{invoiceStatuses.map(s=><option key={s}>{s}</option>)}</select><button className="btn secondary" onClick={()=>i.pdf_url||i.pdf_base64?openInvoicePdf(i):generateInvoicePdf(store,i)}>PDF öffnen</button><button className="btn secondary" onClick={()=>deleteInvoiceAndPdf(store,i)}>Löschen</button></div></div>)}</div><div className="sub">Hochgeladene Rechnungs-PDFs:</div><FileList store={store} cid={cid} type="invoices"/></Card>
}
function CRMNotes({store,cid,activeAdmin}:any){const [note,setNote]=useState('');return <Card title="Notizen" action={<button className="btn" onClick={()=>{if(note)store.create('customer_notes',{customer_id:cid,note,actor_name:activeAdmin});setNote('')}}>Notiz speichern</button>}><textarea className="input textarea" value={note} onChange={e=>setNote(e.target.value)} placeholder="Neue Notiz"/>{store.data.customer_notes.filter((n:any)=>n.customer_id===cid).map((n:any)=><div className="item" key={n.id}><span>{n.note}</span><div className="sub">{n.actor_name||'Unbekannt'} · {new Date(n.created_at).toLocaleString('de-DE')}</div></div>)}</Card>}

function Finance({store,cid,role,activeAdmin}:any){
 const [target,setTarget]=useState(cid)
 const [service,setService]=useState('Paketgebühr')
 const [amount,setAmount]=useState(pprice(cpkg(store.data,target)))
 const invoiceStatuses=STATUS_OPTIONS.invoice
 async function createInv(){const invoice={id:uid(),customer_id:target,invoice_number:invName(store.data,target),service_type:service,amount,status:'Offen',is_demo:isDemoCustomer(store.data,target),created_at:new Date().toISOString()};await store.create('invoices',invoice);await generateInvoicePdf(store,invoice); if(role==='admin') await store.create('notifications',{customer_id:target,title:`${activeAdmin} hat Rechnung erstellt`,message:`${activeAdmin} hat ${service} für ${cname(store.data,target)} erstellt.`,type:'admin_change',actor_name:activeAdmin})}
 return <><Head title="Rechnungen" action={<button className="btn" onClick={createInv}>Rechnung + PDF erzeugen</button>}/><div className="grid2"><Card title="Neue Rechnung">{role==='admin'&&<Search items={allCustomers(store.data)} value={target} onChange={(id:string)=>{setTarget(id);setAmount(pprice(cpkg(store.data,id)))}} placeholder="Kunde für Rechnung suchen"/>}<select className="input" value={service} onChange={e=>setService(e.target.value)}><option>Paketgebühr</option><option>Google Business Optimierung</option><option>SEO Betreuung</option><option>Webseite / Landingpage</option><option>Review Funnel</option><option>Individuelle Dienstleistung</option></select><input className="input" placeholder="Leistungsbeschreibung für die Rechnung" value={service} onChange={e=>setService(e.target.value)}/><input className="input" type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} placeholder="Rechnungsbetrag in Euro"/><div className="sub">Nächster Name: {invName(store.data,target)}</div></Card><Card title="Rechnungsvorlage Word/Keynote"><StorageUploader store={store} cid={target} fileType="documents" refTable="invoice_templates" title="Rechnungsvorlage hochladen" activeAdmin={activeAdmin}/><div className="sub"><b>Platzhalter:</b> {'{{KUNDENNAME}}'}, {'{{ADRESSE}}'}, {'{{RECHNUNGSNUMMER}}'}, {'{{BETRAG}}'}, {'{{LEISTUNG}}'}, {'{{DATUM}}'}, {'{{FAELLIGKEIT}}'}</div><div className="sub">Word-Dateien können als Vorlage gespeichert werden. Echte Word→PDF-Konvertierung benötigt LibreOffice/Gotenberg im Backend.</div></Card></div><Card title="Rechnungen">{store.data.invoices.filter((i:any)=>role==='admin'||i.customer_id===cid).map((i:any)=><div className="item" key={i.id}><div><b>{i.invoice_number}</b><div className="sub">{cname(store.data,i.customer_id)} · {eur(i.amount)} · {i.status}</div></div><div className="toolbarActions"><select className="input compactInput" value={i.status||'Offen'} onChange={e=>store.update('invoices',i.id,{status:e.target.value,customer_id:i.customer_id})}>{invoiceStatuses.map(s=><option key={s}>{s}</option>)}</select><button className="btn secondary" onClick={()=>i.pdf_url||i.pdf_base64?openInvoicePdf(i):generateInvoicePdf(store,i)}>PDF öffnen</button><button className="btn secondary" onClick={()=>deleteInvoiceAndPdf(store,i)}>Löschen</button></div></div>)}</Card>{role==='customer'&&<CustomerServiceCategories store={store} cid={cid}/>}</>
}

function Tickets({store,cid,role,activeAdmin}:any){const rows=store.data.tickets.filter((t:any)=>role==='admin'||t.customer_id===cid);const open=rows.filter((t:any)=>t.status!=='Geschlossen');const closed=rows.filter((t:any)=>t.status==='Geschlossen');const [active,setActive]=useState<any>(null);const [msg,setMsg]=useState('');const [newTicket,setNewTicket]=useState({title:'',description:'',priority:'Mittel'});async function createTicket(){if(!newTicket.title)return;await store.create('tickets',{customer_id:cid,...newTicket,status:'Offen'});await store.create('notifications',{customer_id:cid,title:'Neues Ticket',message:`${cname(store.data,cid)} hat ${newTicket.title} erstellt.`,type:'ticket',actor_name:cname(store.data,cid)});setNewTicket({title:'',description:'',priority:'Mittel'})}async function answer(){if(!active||!msg)return;await store.create('ticket_messages',{ticket_id:active.id,customer_id:active.customer_id,sender_role:role==='admin'?activeAdmin:role,message:msg});await store.update('tickets',active.id,{status:'Geschlossen',closed_at:new Date().toISOString(),customer_id:active.customer_id});if(role==='admin') await store.create('notifications',{customer_id:active.customer_id,title:`${activeAdmin} hat Ticket beantwortet`,message:`${activeAdmin} hat das Ticket „${active.title}“ erledigt.`,type:'admin_change',actor_name:activeAdmin});setMsg('')}return <><Head title="Tickets"/>{role==='customer'&&<Card title="Neues Ticket erstellen"><input className="input" placeholder="Titel" value={newTicket.title} onChange={e=>setNewTicket({...newTicket,title:e.target.value})}/><textarea className="input textarea" placeholder="Beschreibung" value={newTicket.description} onChange={e=>setNewTicket({...newTicket,description:e.target.value})}/><select className="input" value={newTicket.priority} onChange={e=>setNewTicket({...newTicket,priority:e.target.value})}><option>Niedrig</option><option>Mittel</option><option>Hoch</option></select><button className="btn" onClick={createTicket}>Ticket erstellen</button></Card>}<Card title={role==='admin'?'Offene Tickets':'Meine Tickets'}>{open.map((t:any)=><div className="item" key={t.id}><div><b>{t.title}</b><div className="sub">{cname(store.data,t.customer_id)} · {t.description}</div></div><button className="btn secondary" onClick={()=>setActive(t)}>Öffnen</button></div>)}</Card>{active&&<Card title={`Ticket: ${active.title}`}><div className="sub">{active.description}</div>{store.data.ticket_messages.filter((m:any)=>m.ticket_id===active.id).map((m:any)=><div className="item" key={m.id}><b>{adminProfiles.some((a:any)=>a.name===m.sender_role)?m.sender_role:'Kunde'}</b><span>{m.message}</span></div>)}{role==='admin'&&<><textarea className="input textarea" placeholder="Feedback / Antwort. Speichern schließt Ticket." value={msg} onChange={e=>setMsg(e.target.value)}/><button className="btn" onClick={answer}>Antwort speichern & schließen</button></>}</Card>}<Card title="Ticketarchiv">{closed.map((t:any)=><div className="item" key={t.id}><b>{t.title}</b><button className="btn secondary" onClick={()=>setActive(t)}>{role==='customer'?'Erledigt ansehen':'Archiv öffnen'}</button></div>)}</Card></>}



function Booking({store,cid,role}:any){
 const [selectedCid,setSelectedCid]=useState(cid)
 const [currentMonth,setCurrentMonth]=useState(new Date())
 const [selectedDate,setSelectedDate]=useState(new Date().toISOString().slice(0,10))
 const [active,setActive]=useState<any>(null)
 const [client,setClient]=useState('')
 const [q,setQ]=useState('')
 const [f,setF]=useState({client_name:'',appointment_date:new Date().toISOString().slice(0,10),start_time:'10:00',end_time:'11:00',notes:''})
 const [edit,setEdit]=useState<any>(null)
 const target=role==='admin'?selectedCid:cid
 const rows=store.data.appointments.filter((a:any)=>a.customer_id===target)
 const clients=(store.data.customer_clients||[]).filter((c:any)=>c.customer_id===target&&String(c.name||'').toLowerCase().includes(q.toLowerCase()))
 const year=currentMonth.getFullYear()
 const month=currentMonth.getMonth()
 const first=new Date(year,month,1)
 const last=new Date(year,month+1,0)
 const offset=(first.getDay()+6)%7
 const days=Array.from({length:offset+last.getDate()},(_,i)=>i<offset?null:i-offset+1)
 const monthName=currentMonth.toLocaleDateString('de-DE',{month:'long',year:'numeric'})
 const iso=(day:number)=>`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
 const dayRows=(date:string)=>rows.filter((a:any)=>String(a.appointment_date).slice(0,10)===date)
 async function addClient(){if(!client)return;await store.create('customer_clients',{customer_id:target,name:client});setClient('')}
 async function create(){await store.create('appointments',{customer_id:target,...f,appointment_date:f.appointment_date||selectedDate,client_name:f.client_name||client||cname(store.data,target),status:'Geplant'});setSelectedDate(f.appointment_date||selectedDate)}
 function startEdit(a:any){setActive(a);setEdit({...a})}
 async function saveEdit(){if(!edit)return;await store.update('appointments',edit.id,{customer_id:edit.customer_id,...edit});setActive(null);setEdit(null)}
 async function deleteEdit(){if(!edit)return;await store.remove('appointments',edit.id);setActive(null);setEdit(null)}
 return <><Head title="Booking" sub={role==='admin'?`Termine für ${cname(store.data,target)}`:'Deine Termine'} action={<button className="btn" onClick={create}>Termin anlegen</button>}/><div className="grid2"><Card title="Termin erstellen">{role==='admin'&&<Search items={allCustomers(store.data)} value={selectedCid} onChange={setSelectedCid} placeholder="Kunde für Termin suchen"/>}{role==='customer'&&<><input className="input" placeholder="Neuen Endkunden/Kontakt anlegen" value={client} onChange={e=>setClient(e.target.value)}/><button className="btn secondary" onClick={addClient}>Kunde speichern</button><input className="input" placeholder="Gespeicherten Endkunden suchen" value={q} onChange={e=>setQ(e.target.value)}/>{clients.map((c:any)=><button className="nav" key={c.id} onClick={()=>setF({...f,client_name:c.name})}>{c.name}</button>)}</>}<input className="input" placeholder="Terminname oder Name des Endkunden" value={f.client_name} onChange={e=>setF({...f,client_name:e.target.value})}/><input className="input" type="date" value={f.appointment_date} onChange={e=>{setF({...f,appointment_date:e.target.value});setSelectedDate(e.target.value)}}/><input className="input" placeholder="Startzeit, z. B. 10:00" value={f.start_time} onChange={e=>setF({...f,start_time:e.target.value})}/><input className="input" placeholder="Endzeit, z. B. 11:00" value={f.end_time} onChange={e=>setF({...f,end_time:e.target.value})}/><textarea className="input textarea" placeholder="Interner Text oder Hinweise zum Termin" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/></Card><Card title={`Termine am ${new Date(selectedDate).toLocaleDateString('de-DE')}`}>{dayRows(selectedDate).length===0&&<div className="sub">Keine Termine für diesen Tag.</div>}{dayRows(selectedDate).map((a:any)=><div className="item" key={a.id}><div><b>{a.start_time} {a.client_name}</b><div className="sub">{a.end_time} · {a.notes||'Kein Text hinterlegt'}</div></div><button className="btn secondary" onClick={()=>startEdit(a)}>Bearbeiten</button></div>)}</Card></div><Card title="Kalender" action={<div className="row"><button className="btn secondary" onClick={()=>{setCurrentMonth(new Date(year,month-1,1));setActive(null)}}>←</button><b>{monthName}</b><button className="btn secondary" onClick={()=>{setCurrentMonth(new Date(year,month+1,1));setActive(null)}}>→</button></div>}><div className="weekHead"><b>Mo</b><b>Di</b><b>Mi</b><b>Do</b><b>Fr</b><b>Sa</b><b>So</b></div><div className="calendar">{days.map((d:any,i:number)=>d?<button className={`day ${selectedDate===iso(d)?'selectedDay':''}`} key={i} onClick={()=>{setSelectedDate(iso(d));setF({...f,appointment_date:iso(d)})}}><b>{d}</b>{dayRows(iso(d)).map((a:any)=><div className="event" key={a.id} onClick={(e)=>{e.stopPropagation();startEdit(a)}}>{a.start_time} {a.client_name}</div>)}</button>:<div className="day emptyDay" key={i}></div>)}</div></Card>{active&&edit&&<Card title={`Termin bearbeiten: ${active.client_name}`} action={<button className="btn secondary" onClick={()=>{setActive(null);setEdit(null)}}>Schließen</button>}><div className="grid2"><input className="input" value={edit.client_name||''} onChange={e=>setEdit({...edit,client_name:e.target.value})} placeholder="Terminname oder Endkunde"/><input className="input" type="date" value={String(edit.appointment_date||'').slice(0,10)} onChange={e=>setEdit({...edit,appointment_date:e.target.value})}/><input className="input" value={edit.start_time||''} onChange={e=>setEdit({...edit,start_time:e.target.value})} placeholder="Startzeit"/><input className="input" value={edit.end_time||''} onChange={e=>setEdit({...edit,end_time:e.target.value})} placeholder="Endzeit"/><select className="input" value={edit.status||'Geplant'} onChange={e=>setEdit({...edit,status:e.target.value})}><option>Geplant</option><option>Bestätigt</option><option>Abgeschlossen</option><option>Abgesagt</option></select></div><textarea className="input textarea" value={edit.notes||''} onChange={e=>setEdit({...edit,notes:e.target.value})} placeholder="Terminnotizen"/><div className="toolbarActions"><button className="btn" onClick={saveEdit}>Termin speichern</button><button className="btn secondary" onClick={deleteEdit}>Termin löschen</button></div></Card>}</>
}

function Pipeline({store,cid}:any){
 const [f,setF]=useState<any>({customer_id:'',title:'',package_name:'Growth',amount:499,status:'Offen',probability:50})
 const [edit,setEdit]=useState<any>(null)
 async function create(){await store.create('offers',{...f,customer_id:f.customer_id||null,amount:Number(f.amount||0),probability:Number(f.probability||0)});setF({...f,title:''})}
 async function saveEdit(){if(!edit)return;await store.update('offers',edit.id,{...edit,customer_id:edit.customer_id||null,amount:Number(edit.amount||0),probability:Number(edit.probability||0)});setEdit(null)}
 return <><Head title="Pipeline" sub="Globale Deals – nicht an den aktuell geöffneten Kunden gebunden" action={<button className="btn" onClick={create}>Deal erstellen</button>}/><Card title="Neuer Deal"><div className="grid2"><input className="input" placeholder="Deal-Titel, z. B. Growth Upgrade Strandkiosk" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/><select className="input" value={f.customer_id||''} onChange={e=>setF({...f,customer_id:e.target.value})}><option value="">Kein Kunde / globale Pipeline</option>{allCustomers(store.data).map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select><select className="input" value={f.package_name} onChange={e=>{const p=e.target.value;setF({...f,package_name:p,amount:pprice(p)})}}>{Object.keys(packageDefs).map(p=><option key={p}>{p}</option>)}</select><input className="input" type="number" value={f.amount} onChange={e=>setF({...f,amount:Number(e.target.value)})} placeholder="Deal-Wert in Euro"/><select className="input" value={f.status} onChange={e=>setF({...f,status:e.target.value})}><option>Offen</option><option>Qualifiziert</option><option>Angebot gesendet</option><option>Gewonnen</option><option>Verloren</option></select><input className="input" type="number" min="0" max="100" value={f.probability} onChange={e=>setF({...f,probability:Number(e.target.value)})} placeholder="Abschlusswahrscheinlichkeit in Prozent"/></div></Card><Card title="Deals">{store.data.offers.map((o:any)=><div className="item" key={o.id}><div><b>{o.title||'Ohne Titel'}</b><div className="sub">{o.customer_id?cname(store.data,o.customer_id):'Globale Pipeline'} · {o.package_name||'Paket offen'} · {eur(o.amount)} · {o.probability}% · {o.status||'Offen'}</div></div><div className="toolbarActions"><button className="btn secondary" onClick={()=>setEdit({...o})}>Bearbeiten</button><button className="btn secondary" onClick={()=>store.remove('offers',o.id)}>Löschen</button></div></div>)}</Card>{edit&&<Card title="Deal bearbeiten" action={<button className="btn secondary" onClick={()=>setEdit(null)}>Schließen</button>}><div className="grid2"><input className="input" value={edit.title||''} onChange={e=>setEdit({...edit,title:e.target.value})} placeholder="Deal-Titel"/><select className="input" value={edit.customer_id||''} onChange={e=>setEdit({...edit,customer_id:e.target.value})}><option value="">Kein Kunde / globale Pipeline</option>{allCustomers(store.data).map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select><select className="input" value={edit.package_name||'Growth'} onChange={e=>{const p=e.target.value;setEdit({...edit,package_name:p,amount:pprice(p)})}}>{Object.keys(packageDefs).map(p=><option key={p}>{p}</option>)}</select><input className="input" type="number" value={edit.amount||0} onChange={e=>setEdit({...edit,amount:Number(e.target.value)})}/><select className="input" value={edit.status||'Offen'} onChange={e=>setEdit({...edit,status:e.target.value})}><option>Offen</option><option>Qualifiziert</option><option>Angebot gesendet</option><option>Gewonnen</option><option>Verloren</option></select><input className="input" type="number" min="0" max="100" value={edit.probability||0} onChange={e=>setEdit({...edit,probability:Number(e.target.value)})}/></div><button className="btn" onClick={saveEdit}>Deal speichern</button></Card>}</>
}

function Automations({store}:any){const [f,setF]=useState({name:'',trigger_type:'Rechnung überfällig',action_type:'Benachrichtigung erstellen',enabled:true});return <><Head title="Automationen" action={<button className="btn" onClick={()=>store.create('automations',f)}>Automation erstellen</button>}/><Card title="Neue Automation"><input className="input" placeholder="Name" onChange={e=>setF({...f,name:e.target.value})}/><select className="input" onChange={e=>setF({...f,trigger_type:e.target.value})}>{automationLabels.map(a=><option key={a}>{a}</option>)}</select></Card><Card title="Regeln">{store.data.automations.map((a:any)=><div className="item" key={a.id}><b>{a.name}</b><button className="btn secondary" onClick={()=>store.update('automations',a.id,{enabled:!a.enabled})}>{a.enabled?'Aktiv':'Inaktiv'}</button></div>)}</Card></>}
function Workflows({store,cid}:any){return <><Head title="Workflows"/><Card title="Workflow starten">{automationLabels.map(a=><button key={a} className="btn secondary" onClick={async()=>{await store.create('workflow_runs',{customer_id:cid,workflow_name:a,status:'completed'});await store.create('notifications',{customer_id:cid,title:'Workflow erfüllt',message:`Workflow ${a} wurde erfüllt.`,type:'workflow'})}}>{a}</button>)}</Card><Card title="Läufe">{store.data.workflow_runs.map((w:any)=><div className="item" key={w.id}><b>{w.workflow_name}</b><Badge>{w.status}</Badge></div>)}</Card></>}
function Activity({store,cid}:any){return <><Head title="Aktivitäten"/><Card title="Timeline">{store.data.activity_logs.filter((a:any)=>!a.customer_id||a.customer_id===cid).map((a:any)=><div className="item" key={a.id}><b>{a.action}</b><span>{a.message}</span></div>)}</Card></>}

function MediaCenter({store,cid,setCid,role,activeAdmin}:any){
 const [type,setType]=useState<FileType>('media')
 const [selectedCid,setSelectedCid]=useState(cid)
 const target=role==='admin'?selectedCid:cid
 return <><Head title="Media Center" sub="Dateien landen je nach Typ im passenden CRM-Bereich."/><div className="grid2"><Card title="Ziel auswählen">{role==='admin'&&<Search items={allCustomers(store.data)} value={target} onChange={(id:string)=>{setSelectedCid(id);setCid?.(id)}} placeholder="Kunde für Upload suchen"/>}<select className="input" value={type} onChange={e=>setType(e.target.value as FileType)}><option value="invoices">Rechnung</option><option value="contracts">Vertrag</option><option value="media">Bilder / Medien</option><option value="documents">Dokument</option><option value="reports">Report</option></select></Card><StorageUploader store={store} cid={target} fileType={type} title="Datei hochladen" activeAdmin={activeAdmin}/></div><Card title={`Gespeicherte Dateien für ${cname(store.data,target)}`}><FileList store={store} cid={target}/></Card></>
}
function DemoEnvironment({store,setView}:any){function openAdmin(){window.open(`${window.location.origin}${window.location.pathname}?demo=admin`,'_blank','noopener,noreferrer')}function openCustomer(c:any){window.open(`${window.location.origin}${window.location.pathname}?demo=customer&customer=${c.id}`,'_blank','noopener,noreferrer')}return <><Head title="Demo Umgebung" sub="Interner Demo-Zugang für Admins. Damit kann der öffentliche Demo-Button auf der Landingpage ausgeblendet werden." action={<button className="btn" onClick={openAdmin}>Admin-Demo öffnen</button>}/><div className="grid2"><Card title="Admin-Demo"><p className="sub">Öffnet die vollständige Admin-Demo in einem neuen Tab mit Demo-/Fallback-Daten. Nur im Adminbereich sichtbar.</p><div className="toolbarActions"><button className="btn" onClick={openAdmin}>Admin-Demo öffnen</button><button className="btn secondary" onClick={()=>{clearDemoSandbox();location.reload()}}>Demo zurücksetzen</button></div></Card><Card title="Öffentlicher Demo-Button"><p className="sub">Den Demo-Button auf der Landingpage blendest du unter „Haupt-Landingpage“ mit der Checkbox „Öffentlichen Demo-Button anzeigen“ ein oder aus.</p><button className="btn secondary" onClick={()=>setView('main_landing')}>Reiter Haupt-Landingpage öffnen</button></Card></div><Card title="Demo-Kundenumgebungen">{(store.data.demo_customers||[]).map((c:any)=><div className="item" key={c.id}><div><b>{c.name}</b><div className="sub">{c.package_name} · öffnet Kundenportal-Demo im neuen Tab</div></div><button className="btn" onClick={()=>openCustomer(c)}>Kunden-Demo öffnen</button></div>)}</Card></>}
function DemoCustomers({store}:any){return <DemoEnvironment store={store} setView={()=>{}}/>}
function Integrations({store,cid,role,setCid}:any){
 const [target,setTarget]=useState(cid)
 useEffect(()=>setTarget(cid),[cid])
 const [f,setF]=useState({customer_id:cid,name:'Google Business Profile',api_key:'',site_url:'',property_id:'',status:'Bereit'})
 useEffect(()=>setF((p:any)=>({...p,customer_id:target})),[target])
 const [msg,setMsg]=useState('')
 const rows=(store.data.integrations||[]).filter((i:any)=>i.customer_id===target)
 const providerMap:any={'Google Business Profile':'google-business','Google Search Console':'search-console','Google Analytics':'analytics','Meta Business Suite':'meta'}
 async function save(){
  const provider=providerMap[f.name]||f.name
  await store.create('integrations',{customer_id:target,name:f.name,provider,api_key:f.api_key,site_url:f.site_url,property_id:f.property_id,status:f.api_key?'API-Key hinterlegt':'OAuth/API vorbereiten',seo_enabled:true})
  setMsg(`Integration für ${cname(store.data,target)} gespeichert.`)
 }
 async function oauth(){
  try{const r=await startGoogleAuth(target);setMsg(r?.data?.url?'Google OAuth Fenster geöffnet.':'Google OAuth ist backendseitig noch nicht konfiguriert.')}catch(e:any){setMsg(e.message||'Google OAuth nicht erreichbar')}
 }
 async function sync(name:string){
  const provider=providerMap[name]||name
  if(provider==='meta'){setMsg('Meta Sync ist als Integration vorbereitet, aber noch nicht angebunden.');return}
  try{const r=await syncGoogleProvider(provider,target,{site_url:f.site_url,property_id:f.property_id});const providerKey=providerToApiKey(provider);setMsg(r?.ok?`Sync für ${providerKey} ausgeführt. SEO Dashboard nutzt neue Daten bzw. Fallbackdaten.`:(r?.error||'Sync konnte nicht abgeschlossen werden.')); const row=rows.find((i:any)=>(i.name||i.provider)===provider||(i.provider===providerKey)); if(row) await store.update('integrations',row.id,{provider:providerKey,status:r?.ok?'Verbunden':'Fehler',last_sync_at:new Date().toISOString(),last_sync_status:r?.ok?'synced':'error',last_sync_error:r?.ok?'':r?.error})}catch(e:any){setMsg(e.message||'Sync nicht erreichbar')}
 }
 return <><Head title="Integrationen" sub={`${cname(store.data,target)} · Google/API-Zugänge kundenbezogen hinterlegen und mit dem SEO Dashboard verbinden`} action={<button className="btn" onClick={save}>Integration speichern</button>}/>{role==='admin'&&<CentralCustomerSelector store={store} cid={target} setCid={(id:string)=>{setTarget(id);setCid?.(id)}} title="Integrationen · Kunde auswählen" sub="Hier wird festgelegt, für welchen Kunden Google/API-Daten hinterlegt werden."/>}<div className="grid2"><Card title="Tool verbinden"><select className="input" value={f.name} onChange={e=>setF({...f,name:e.target.value})}><option>Google Business Profile</option><option>Google Search Console</option><option>Google Analytics</option><option>Meta Business Suite</option></select><input className="input" placeholder="API-Key oder Token, falls vorhanden – wird nur serverseitig benötigt" value={f.api_key} onChange={e=>setF({...f,api_key:e.target.value})}/><input className="input" placeholder="Search Console Property / Website-URL, z. B. https://kunde.de" value={f.site_url} onChange={e=>setF({...f,site_url:e.target.value})}/><input className="input" placeholder="GA4 Property-ID, z. B. 123456789" value={f.property_id} onChange={e=>setF({...f,property_id:e.target.value})}/><div className="toolbarActions"><button className="btn secondary" onClick={oauth}>Google OAuth starten</button><button className="btn secondary" onClick={()=>sync(f.name)}>Jetzt ins SEO Dashboard syncen</button></div><div className="sub">Saubere Verbindung: Integrationen → Google Sync → SEO Dashboard / KPI Analytics / Heatmap.</div></Card><Card title="SEO-Verknüpfung"><div className="item"><b>SEO Dashboard</b><span>Nutzt Search Console, Analytics und Google Business Daten.</span></div><div className="item"><b>SEO Heatmap</b><span>Nutzt lokale Google-Business-/Maps-Signale.</span></div><div className="item"><b>KPI Analytics</b><span>Übernimmt Leads, Klicks, Conversion und Aktivität.</span></div>{msg&&<div className="sub">{msg}</div>}</Card></div><Card title="Verbindungen">{rows.length===0&&<div className="sub">Noch keine Integration für {cname(store.data,target)} gespeichert.</div>}{rows.map((i:any)=><div className="item" key={i.id}><div><b>{i.name||i.provider}</b><div className="sub">{i.site_url||'Keine Website hinterlegt'} · {i.property_id||'Keine GA4-ID'}</div></div><div className="toolbarActions"><Badge>{i.status||'Bereit'}</Badge><button className="btn secondary" onClick={()=>sync(i.name||i.provider)}>Sync</button><button className="btn secondary" onClick={()=>store.remove('integrations',i.id)}>Löschen</button></div></div>)}</Card></>}



function CustomerServiceCategories({store,cid}:any){
 const [f,setF]=useState({name:'',price:0,description:''})
 const cats=(store.data.customer_service_categories||[]).filter((c:any)=>c.customer_id===cid)
 async function save(){if(!f.name)return;await store.create('customer_service_categories',{customer_id:cid,...f,price:Number(f.price||0)});setF({name:'',price:0,description:''})}
 async function invoice(cat:any){const row={id:uid(),customer_id:cid,invoice_number:invName(store.data,cid),service_type:cat.name,amount:Number(cat.price||0),status:'Offen',is_demo:isDemoCustomer(store.data,cid),created_at:new Date().toISOString()};await store.create('invoices',row);await generateInvoicePdf(store,row)}
 return <Card title="Eigene Kategorien & Preise"><div className="grid2"><input className="input" placeholder="Kategorie / Dienstleistung" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/><input className="input" type="number" placeholder="Preis" value={f.price} onChange={e=>setF({...f,price:Number(e.target.value)})}/></div><textarea className="input textarea" placeholder="Beschreibung" value={f.description} onChange={e=>setF({...f,description:e.target.value})}/><button className="btn" onClick={save}>Kategorie speichern</button>{cats.map((c:any)=><div className="item" key={c.id}><div><b>{c.name}</b><div className="sub">{eur(c.price)} · {c.description}</div></div><button className="btn secondary" onClick={()=>invoice(c)}>Rechnung erstellen</button></div>)}</Card>
}
function CustomerToolPage({title,children}:any){return <><Head title={title}/><Card title={title}>{children}</Card></>}
function CustomerSEO({store,cid,role,setCid}:any){
 const data=(store.data.customer_seo_metrics||store.data.seo_snapshots||[]).filter((s:any)=>s.customer_id===cid)
 const latest=data.at(-1)||{}
 const integrations=(store.data.integrations||[]).filter((i:any)=>i.customer_id===cid)
 const [msg,setMsg]=useState('')
 async function syncAll(){
  const providers=['google-business','search-console','analytics']
  const results=[]
  for(const provider of providers){try{results.push(await syncGoogleProvider(provider,cid,{site_url:integrations[0]?.site_url,property_id:integrations.find((i:any)=>String(i.name||i.provider).toLowerCase().includes('analytics'))?.property_id}))}catch(e:any){results.push({ok:false,error:e.message})}}
  setMsg(results.some((r:any)=>r?.ok)?'SEO Sync ausgeführt. Neue Daten erscheinen nach Backend/Supabase-Aktualisierung.':'Sync noch nicht vollständig konfiguriert – Fallbackwerte bleiben sichtbar.')
 }
 return <><Head title="SEO Dashboard" sub={`${cname(store.data,cid)} · Analytics · Search Console · Google Business · Heatmap`} action={<button className="btn secondary" onClick={syncAll}>Google/API Sync starten</button>}/>{role==='admin'&&<CentralCustomerSelector store={store} cid={cid} setCid={setCid} title="SEO & Analytics · Kunde" sub="Alle SEO-, Heatmap- und KPI-Werte werden auf diesen Kunden bezogen."/>}<div className="grid4"><Metric label="Sichtbarkeit" value={latest.visibility||latest.visibility_score||72}/><Metric label="Klicks" value={latest.clicks||latest.organic_traffic||1450}/><Metric label="Impressionen" value={latest.impressions||42000}/><Metric label="Top Keywords" value={latest.top_keywords||data.length||18}/></div><div className="grid2"><Card title="SEO Analytics"><div className="chartLine">{Array.from({length:12},(_,i)=><span key={i} style={{height:`${30+(i*7)%58}px`}} />)}</div><div className="sub">Datenquelle: {integrations.length?integrations.map((i:any)=>i.name||i.provider).join(', '):'Noch keine Integration – bitte unter Integrationen verbinden.'}</div>{msg&&<div className="sub">{msg}</div>}</Card><Card title="SEO Heatmap"><div className="mapMock"><b>Lokale Sichtbarkeit</b><span>Heatmap wird mit Google Business/Maps-Signalen und Suchradius befüllt.</span></div></Card></div><Card title="Verbundene Quellen">{integrations.length===0?<div className="sub">Noch keine Google/API-Verbindung hinterlegt.</div>:integrations.map((i:any)=><div className="item" key={i.id}><b>{i.name||i.provider}</b><Badge>{i.status||'Bereit'}</Badge></div>)}</Card></>}
function CustomerReview({store,cid}:any){return <CustomerToolPage title="Review Funnel"><div className="grid4"><Metric label="Positive Reviews" value="24"/><Metric label="Internes Feedback" value="6"/><Metric label="Google Redirects" value="18"/><Metric label="Ø Sterne" value="4.6"/></div><div className="sub">QR-Kampagnen werden im Adminbereich erstellt und hier ausgewertet.</div></CustomerToolPage>}
function CustomerAutomations(){return <CustomerToolPage title="Automationen">{automationLabels.map(a=><div className="item" key={a}><b>{a}</b><Badge>vorbereitet</Badge></div>)}</CustomerToolPage>}
function CustomerWorkflows({store,cid}:any){return <CustomerToolPage title="Workflow Center">{(store.data.workflow_runs||[]).filter((w:any)=>w.customer_id===cid).map((w:any)=><div className="item" key={w.id}><b>{w.workflow_name}</b><Badge>{w.status}</Badge></div>)}<div className="sub">Workflow-Ergebnisse und erfüllte Aufgaben werden hier angezeigt.</div></CustomerToolPage>}
function CustomerRoles({store,cid}:any){return <CustomerToolPage title="Rechte & Rollen"><div className="item"><b>Aktives Paket</b><span>{cpkg(store.data,cid)}</span></div><div className="item"><b>Zugriff</b><span>Kundenrechte aktiv</span></div></CustomerToolPage>}
function CustomerKPI({store,cid,role,setCid}:any){return <><Head title="KPI Analytics" sub={`${cname(store.data,cid)} · Leads, Conversion, Tickets und Umsatz`}/>{role==='admin'&&<CentralCustomerSelector store={store} cid={cid} setCid={setCid} title="KPI Analytics · Kunde"/>}<Card title="KPI Analytics"><div className="grid4"><Metric label="Leads" value={(store.data.prospect_leads||[]).filter((l:any)=>l.customer_id===cid).length||37}/><Metric label="Conversion" value="12%"/><Metric label="Tickets offen" value={(store.data.tickets||[]).filter((t:any)=>t.customer_id===cid&&t.status!=='Geschlossen').length}/><Metric label="Umsatz" value={eur((store.data.invoices||[]).filter((i:any)=>i.customer_id===cid&&i.status==='Bezahlt').reduce((s:number,i:any)=>s+Number(i.amount||0),0))}/></div><div className="chartLine">{Array.from({length:16},(_,i)=><span key={i} style={{height:`${20+(i*11)%70}px`}} />)}</div></Card></>}
function CustomerHeatmap({store,cid,role,setCid}:any){return <><Head title="SEO Heatmap" sub={`${cname(store.data,cid)} · lokale Sichtbarkeit`}/>{role==='admin'&&<CentralCustomerSelector store={store} cid={cid} setCid={setCid} title="SEO Heatmap · Kunde"/>}<Card title="SEO Heatmap"><div className="mapMock"><b>Lokale SEO Heatmap</b><span>Live-Karte wird nach Google Business/Maps API Sync befüllt.</span></div><div className="sub">Die Heatmap ist mit dem SEO Dashboard und den gespeicherten Integrationen verknüpft.</div></Card></>}
function CustomerSuccess(){return <CustomerToolPage title="Client Success Score"><div className="successCircle">84</div><div className="sub">Score aus Tickets, SEO, Rechnungen, Aktivität und Review-Funnel.</div></CustomerToolPage>}
function CustomerAdvancedReports(){return <CustomerToolPage title="Advanced Reports"><div className="item"><b>Monatsreport</b><button className="btn secondary" onClick={()=>appToast('Bitte Reports im Kundenbereich öffnen.')}>PDF vorbereiten</button></div><div className="item"><b>SEO Report</b><button className="btn secondary">Report ansehen</button></div></CustomerToolPage>}

function GuidedOnboardingCenter({store,cid,role,setCid,setView}:any){
 const [target,setTarget]=useState(cid)
 const customer=cobj(store.data,target)||cobj(store.data,cid)
 const existing=(store.data.onboarding_checklists||[]).find((o:any)=>o.customer_id===target)
 const [msg,setMsg]=useState('')
 const baseSteps=onboardingStepsFor(customer)
 const steps=baseSteps.map(([key,label,auto]:any)=>({key,label,done:Boolean(existing?.steps?.[key]??auto)}))
 const pct=Math.round((steps.filter((s:any)=>s.done).length/steps.length)*100)
 async function saveStep(key:string,done:boolean){
  const payload={customer_id:target,status:done?'In Arbeit':'In Arbeit',steps:{...(existing?.steps||{}),[key]:done},updated_at:new Date().toISOString()}
  if(existing) await store.update('onboarding_checklists',existing.id,payload); else await store.create('onboarding_checklists',{id:uid(),...payload,created_at:new Date().toISOString()})
 }
 async function bootstrap(){
  if(!customer)return
  await saveStep('company',true)
  if(!(store.data.qr_campaigns||[]).some((q:any)=>q.customer_id===target)) await store.create('qr_campaigns',{customer_id:target,title:`${customer.name} QR Start`,slug:slugifyLocal(`${customer.name}-start`),purpose:'both',points_per_scan:10,status:'Aktiv',active:true,created_at:new Date().toISOString()})
  if(!(store.data.invoices||[]).some((i:any)=>i.customer_id===target)) await store.create('invoices',{customer_id:target,invoice_number:invName(store.data,target),service_type:'Starter Einrichtung',amount:pprice(cpkg(store.data,target)),status:'Entwurf',created_at:new Date().toISOString()})
  setMsg('Onboarding-Grundstruktur vorbereitet: Kundenakte, QR-Start und erste Rechnung geprüft.')
 }
 return <><Head title="Geführtes Onboarding" sub={role==='admin'?'Kunden sauber starten: Daten, Google Business, Branding, QR, Rechnung und Aufgaben.':'Dein Start mit Mecklenburg Marketing Schritt für Schritt.'} action={<div className="toolbarActions"><LiveModeBadge/>{role==='admin'&&<button className="btn" onClick={bootstrap}>Setup vorbereiten</button>}</div>}/>{role==='admin'&&<Card title="Kunde auswählen"><Search items={allCustomers(store.data)} value={target} onChange={(id:string)=>{setTarget(id);setCid?.(id)}} placeholder="Kunde für Onboarding suchen"/></Card>}<div className="customerHero"><div><Badge type={pct>=80?'green':'yellow'}>{pct}% abgeschlossen</Badge><h1>{customer?.name||'Kunde'} startklar machen</h1><p>Geführter Workflow für professionelle Übergabe, weniger Rückfragen und klare Verantwortlichkeiten.</p>{packageProgress(pct)}</div><div className="customerHeroCard"><b>Nächster Schritt</b><strong>{steps.find((s:any)=>!s.done)?.label||'Abgeschlossen'}</strong><span>{role==='admin'?'im Admin prüfen':'bitte bei Bedarf nachreichen'}</span></div></div><Card title="Setup-Checkliste">{steps.map((s:any)=><div className="item" key={s.key}><div><b>{s.label}</b><div className="sub">{s.done?'Erledigt':'offen'} · wird im Monatsreport und Kundenstatus berücksichtigt.</div></div><div className="toolbarActions"><Badge type={s.done?'green':'yellow'}>{s.done?'erledigt':'offen'}</Badge><button className="btn secondary" onClick={()=>saveStep(s.key,!s.done)}>{s.done?'Zurücksetzen':'Erledigt markieren'}</button></div></div>)}{msg&&<div className="sub">{msg}</div>}</Card><div className="grid2"><Card title="Was der Kunde erlebt"><ToolTipHint title="Geführter Start">Der Kunde sieht keine Tool-Flut, sondern klare Aufgaben, Fortschritt und die nächsten Schritte.</ToolTipHint></Card><Card title="Verknüpfte Module"><div className="item"><b>QR & Slug</b><span>Startkampagne automatisch vorbereiten.</span></div><div className="item"><b>Rechnung</b><span>erste Rechnung oder Entwurf erzeugen.</span></div><div className="item"><b>Reports</b><span>Onboarding-Fortschritt im Monatsreport erwähnen.</span></div></Card></div></>
}

function reportBody(store:any,cid:string,report:any={}){
 const seo=(store.data.seo_snapshots||[]).filter((s:any)=>s.customer_id===cid).at(-1)||{}
 const reviews=(store.data.review_feedback||[]).filter((r:any)=>r.customer_id===cid)
 const campaigns=(store.data.qr_campaigns||[]).filter((q:any)=>q.customer_id===cid)
 const invoices=(store.data.invoices||[]).filter((i:any)=>i.customer_id===cid)
 const competitors=(store.data.competitor_benchmarks||[]).filter((c:any)=>c.customer_id===cid)
 return `<div class="metric"><div><b>${seo.organic_traffic||seo.clicks||1450}</b><br/>Klicks/Traffic</div><div><b>${reviews.length}</b><br/>Bewertungen</div><div><b>${campaigns.length}</b><br/>QR-Kampagnen</div><div><b>${invoices.filter((i:any)=>i.status!=='Bezahlt').length}</b><br/>offene Rechnungen</div></div><div class="section"><h2>Executive Summary</h2><p>${report.summary||'Die Online-Präsenz wurde geprüft. Fokus bleibt auf Google Business Optimierung, Reviews, lokalen SEO-Signalen und klaren nächsten Aufgaben.'}</p></div><div class="section"><h2>Empfehlungen für den nächsten Monat</h2><ol><li>Google Business Fotos und Leistungen aktualisieren.</li><li>Bewertungs-Booster aktiv nutzen.</li><li>Wettbewerberentwicklung prüfen und lokale Keywords nachschärfen.</li></ol></div><div class="section"><h2>Wettbewerber</h2><p>${competitors.length?competitors.map((c:any)=>`${c.name}: ${c.rating} Sterne / ${c.reviews} Reviews`).join('<br/>'):'Noch keine Wettbewerber hinterlegt.'}</p></div>`
}
function MonthlyReportCenter({store,cid,role}:any){
 const [target,setTarget]=useState(cid)
 const rows=(store.data.monthly_reports||[]).filter((r:any)=>role==='admin'?r.customer_id===target:r.customer_id===cid)
 const [form,setForm]=useState<any>({title:`Monatsreport ${new Date().toLocaleDateString('de-DE',{month:'long',year:'numeric'})}`,summary:'Google Business, Reviews, SEO, QR-Kampagnen und nächste Empfehlungen zusammengefasst.',include_seo:true,include_reviews:true,include_qr:true,include_competitors:true,include_billing:true,potential:'Bewertungsaufbau, Google Business Beiträge und lokale Sichtbarkeit weiter ausbauen.'})
 function selectedSources(){return Object.entries({seo:form.include_seo,reviews:form.include_reviews,qr:form.include_qr,competitors:form.include_competitors,billing:form.include_billing}).filter(([,v])=>v).map(([k])=>k)}
 async function create(){await store.create('monthly_reports',{customer_id:target,title:form.title,summary:form.summary,status:'Entwurf',selected_sources:selectedSources(),potential:form.potential,created_at:new Date().toISOString()})}
 function openReport(r:any){openPdfDocument(r.title,`Monatsreport für ${cname(store.data,r.customer_id)}`,reportBody(store,r.customer_id,r),{status:r.status||'Entwurf'})}
 return <><Head title={role==='admin'?'Monatsreport Generator':'Reports'} sub="Monatlichen Wert sichtbar machen: Google Business, SEO, Reviews, QR, Wettbewerber und nächste Aufgaben." action={role==='admin'?<button className="btn" onClick={create}>Report erstellen</button>:<LiveModeBadge/>}/>{role==='admin'&&<Card title="Neuen Report vorbereiten"><Search items={allCustomers(store.data)} value={target} onChange={setTarget} placeholder="Kunde für Monatsreport suchen"/><input className="input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Report-Titel"/><textarea className="input textarea" value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})} placeholder="Executive Summary"/><div className="grid3"><label className="checkline"><input type="checkbox" checked={form.include_seo} onChange={e=>setForm({...form,include_seo:e.target.checked})}/> SEO & Analytics</label><label className="checkline"><input type="checkbox" checked={form.include_reviews} onChange={e=>setForm({...form,include_reviews:e.target.checked})}/> Reviews</label><label className="checkline"><input type="checkbox" checked={form.include_qr} onChange={e=>setForm({...form,include_qr:e.target.checked})}/> QR & Loyalty</label><label className="checkline"><input type="checkbox" checked={form.include_competitors} onChange={e=>setForm({...form,include_competitors:e.target.checked})}/> Wettbewerber</label><label className="checkline"><input type="checkbox" checked={form.include_billing} onChange={e=>setForm({...form,include_billing:e.target.checked})}/> Rechnungen / Billing</label></div><textarea className="input textarea" value={form.potential} onChange={e=>setForm({...form,potential:e.target.value})} placeholder="Potenzial und Empfehlungen für den nächsten Monat"/><div className="sub">Report wird mit Kundendaten aus SEO, Reviews, QR, Wettbewerbern und Rechnungen verknüpft.</div></Card>}<Card title="Reports">{rows.length===0&&<EmptyState icon="📄" title="Noch kein Report vorhanden">Sobald ein Monatsreport erstellt wurde, erscheint er hier für den Kunden mit klarer Zusammenfassung und Empfehlungen.</EmptyState>}{rows.map((r:any)=><div className="item" key={r.id}><div><b>{r.title}</b><div className="sub">{cname(store.data,r.customer_id)} · {r.status||'Entwurf'} · {new Date(r.created_at).toLocaleDateString('de-DE')}</div><p className="sub">{r.summary}</p><div className="sub">Auswertung: {safeList(r.selected_sources).join(', ')||'Standard'} · Potenzial: {r.potential||'Bewertungsaufbau, Google Business Pflege und lokale SEO.'}</div></div><div className="toolbarActions"><StatusSelect kind="report" value={r.status||'Entwurf'} onChange={(v:string)=>store.update('monthly_reports',r.id,{status:v})}/><button className="btn secondary" onClick={()=>openReport(r)}>PDF öffnen</button><button className="btn secondary" onClick={()=>downloadHtmlDocument(`${r.title}.html`,r.title,`Monatsreport für ${cname(store.data,r.customer_id)}`,reportBody(store,r.customer_id,r),{status:r.status})}>HTML exportieren</button></div></div>)}</Card></>}

function ApprovalCenter({store,cid,role}:any){
 const [f,setF]=useState<any>({title:'',type:'Google Beitrag',description:''})
 const rows=(store.data.approval_requests||[]).filter((a:any)=>role==='admin'||a.customer_id===cid).filter((a:any)=>a.status!=='Archiviert')
 async function create(){if(!f.title)return;await store.create('approval_requests',{customer_id:cid,...f,status:'Offen',created_at:new Date().toISOString()});setF({title:'',type:'Google Beitrag',description:''})}
 async function setStatus(row:any,status:string){await store.update('approval_requests',row.id,{status,decided_at:new Date().toISOString()})}
 return <><Head title="Freigabe-Center" sub={role==='admin'?'Kundenfreigaben für Beiträge, Angebote, Reports, Texte und Kampagnen bündeln.':'Bitte prüfe offene Freigaben und gib Rückmeldung.'} action={role==='admin'?<button className="btn" onClick={create}>Freigabe anlegen</button>:<LiveModeBadge/>}/>{role==='admin'&&<Card title="Neue Freigabe"><div className="grid2"><input className="input" value={f.title} onChange={e=>setF({...f,title:e.target.value})} placeholder="Titel, z. B. Google Beitrag Sommeraktion"/><select className="input" value={f.type} onChange={e=>setF({...f,type:e.target.value})}><option>Google Beitrag</option><option>Landingpage Text</option><option>Angebot</option><option>Vertrag</option><option>Monatsreport</option><option>QR-Kampagne</option></select></div><textarea className="input textarea" value={f.description} onChange={e=>setF({...f,description:e.target.value})} placeholder="Was soll der Kunde prüfen oder freigeben?"/></Card>}<Card title="Freigaben">{rows.length===0&&<EmptyState icon="✅" title="Keine offenen Freigaben">Alles erledigt. Neue Beiträge, Reports oder Kampagnen erscheinen hier zur Prüfung.</EmptyState>}{rows.map((r:any)=><div className="item" key={r.id}><div><b>{r.title}</b><div className="sub">{r.type} · {r.status}</div><p className="sub">{r.description}</p></div><div className="toolbarActions"><Badge type={r.status==='Freigegeben'?'green':r.status==='Änderung gewünscht'?'yellow':'purple'}>{r.status}</Badge><button className="btn secondary" onClick={()=>setStatus(r,'Freigegeben')}>Freigeben</button><button className="btn secondary" onClick={()=>setStatus(r,'Änderung gewünscht')}>Änderung</button>{role==='admin'&&<button className="btn secondary" onClick={()=>setStatus(r,'Archiviert')}>Archivieren</button>}</div></div>)}</Card></>
}


const v33ToolConfigs:any={
 qr:{title:'QR Kampagnen',category:'QR & Loyalty',resource:'qr_campaigns',fields:['title','purpose','points_per_scan'],defaults:[{id:'qr_local_1',title:'Neue Loyalty QR Kampagne',purpose:'loyalty',points_per_scan:10,active:true}],special:'qr'},
 public_landing:{title:'Öffentliche /l/[slug] Seite',category:'QR & Loyalty',resource:'public_landing_pages',fields:['title','slug','headline','mode'],defaults:[{id:'lp1',title:'Frühstücks-Loyalty Landingpage',slug:'demo-cafe-morgenlicht',headline:'Willkommen im Bonusclub',mode:'loyalty',active:true},{id:'lp2',title:'Google Review Landingpage',slug:'demo-review-morgenlicht',headline:'Wie war dein Besuch?',mode:'review',active:true}]},
 loyalty:{title:'Loyalty Programm',category:'QR & Loyalty',resource:'loyalty_programs',fields:['name','qr_campaign_id','points_per_scan'],defaults:[{id:'loy1',name:'Morgenlicht Bonusclub',qr_campaign_id:'22222222-2222-2222-2222-222222222222',points_per_scan:10,active:true}]},
 loyalty_rewards:{title:'Rewards',category:'QR & Loyalty',resource:'loyalty_rewards',fields:['title','type','points','qr_campaign_id'],defaults:[{id:'rew1',title:'Gratis Cappuccino',type:'Gratisprodukt',points:100,active:true},{id:'rew2',title:'10% Frühstücksrabatt',type:'Rabatt',points:180,active:true}]},
 loyalty_rules:{title:'Reward Regeln',category:'QR & Loyalty',resource:'loyalty_reward_rules',fields:['name','trigger','condition','points','multiplier','qr_campaign_id'],defaults:[{id:'rule1',name:'Doppelte Punkte am Vormittag',trigger:'QR Scan',condition:'08:00-11:00 Uhr',points:0,multiplier:2,active:true}]},
 staff_codes:{title:'Mitarbeiter-Bestätigungscode',category:'QR & Loyalty',resource:'staff_codes',fields:['label','code','qr_campaign_id'],defaults:[{id:'code1',label:'Demo Thekencode',code:'2468',uses:0,active:true}],special:'staff'},
 loyalty_segments:{title:'Loyalty Segmente',category:'QR & Loyalty',resource:'loyalty_segments',fields:['name','rule','members'],defaults:[{id:'seg1',name:'VIP Kunden',rule:'Punkte > 500',members:1,active:true},{id:'seg2',name:'Reward-bereit',rule:'Punkte >= 100',members:2,active:true}]},
 smart_loyalty:{title:'Smart Loyalty V2',category:'QR & Loyalty',resource:'loyalty_members',fields:['name','points','tier'],defaults:[{id:'mem1',name:'Anna Stammkundin',points:420,tier:'Gold',active:true},{id:'mem2',name:'Max Reviewfan',points:160,tier:'Silver',active:true}]},
 reviews:{title:'Reviews',category:'Reviews',resource:'reviews',fields:['name','rating','text'],defaults:[{id:'rv1',name:'Anna',rating:5,text:'Super freundlicher Service.',sentiment:'positiv',active:true},{id:'rv2',name:'Gast',rating:2,text:'Lange gewartet.',sentiment:'negativ',active:true}]},
 review_intelligence:{title:'Review Intelligence',category:'Reviews',resource:'review_intelligence',fields:['topic','severity','recommendation'],defaults:[{id:'ri1',topic:'Wartezeit',severity:'hoch',recommendation:'Service-Zeiten prüfen',active:true}]},
 review_templates:{title:'Antwortvorlagen',category:'Reviews',resource:'review_response_templates',fields:['label','sentiment','body'],defaults:[{id:'tpl1',label:'Positive Bewertung bedanken',sentiment:'positiv',body:'Vielen Dank für das tolle Feedback!',active:true}]},
 smart_automation:{title:'Smart Automation',category:'Automation & Marketing',resource:'smart_automations',fields:['name','trigger','action'],defaults:[{id:'auto1',name:'Negatives Review → Ticket',trigger:'Bewertung <= 3',action:'Ticket + AI Hinweis',runs:0,active:true}]},
 marketing_automation:{title:'Marketing Automation',category:'Automation & Marketing',resource:'marketing_campaigns',fields:['name','audience','reward','status'],defaults:[{id:'camp1',name:'Inaktive Gäste zurückholen',audience:'Inaktive Endkunden',reward:'10% Frühstücksrabatt',status:'Entwurf',active:true}]},
 ai_assistant:{title:'AI Business Assistant',category:'Automation & Marketing',resource:'assistant_messages',fields:['title','severity','message'],defaults:[{id:'ai1',title:'Hohe Upsell-Chance erkannt',severity:'success',message:'QR und Loyalty werden stark genutzt.',active:true}]},
 customer_health:{title:'Customer Health',category:'Analytics & Billing',resource:'customer_health',fields:['name','score','note'],defaults:[{id:'h1',name:'Health Score',score:86,note:'Stabil mit Review-Warnung',active:true}]},
 customer_intelligence:{title:'Customer Intelligence',category:'Analytics & Billing',resource:'customer_intelligence',fields:['name','score','recommendation'],defaults:[{id:'ci1',name:'Upsell Score',score:84,recommendation:'Premium Add-on anbieten',active:true}]},
 dynamic_billing:{title:'Dynamic Billing',category:'Analytics & Billing',resource:'dynamic_billing_usage',fields:['label','quantity','unit'],defaults:[{id:'bu1',label:'QR Scans',quantity:280,unit:0.01,active:true}]},
 revenue_forecasting:{title:'Revenue Forecasting',category:'Analytics & Billing',resource:'revenue_forecasts',fields:['period','expected','confidence'],defaults:[{id:'fc1',period:'Aktueller Monat',expected:1442,confidence:82,active:true}]},
 revenue_share:{title:'Revenue Share',category:'Analytics & Billing',resource:'revenue_shares',fields:['name','gross','percent'],defaults:[{id:'rs1',name:'MMOS Demo Revenue Share',gross:299,percent:15,active:true}]},
 package_recommendations:{title:'Package Recommendations',category:'Analytics & Billing',resource:'package_recommendations',fields:['title','uplift','confidence'],defaults:[{id:'pr1',title:'Premium Add-on empfehlen',uplift:499,confidence:86,active:true}]},
 package_matrix:{title:'Paket-Matrix',category:'Analytics & Billing',resource:'package_matrix',fields:['name','tools','price'],defaults:[{id:'pm1',name:'Premium',tools:28,price:899,active:true}]},
 timeline_events:{title:'Timeline Events',category:'CRM & Betrieb',resource:'timeline_events',fields:['type','title','severity'],defaults:[{id:'tl1',type:'QR',title:'QR-Kampagne erstellt',severity:'success',active:true}]}
}

function v33LocalKey(view:string,cid:string){return `v33_${view}_${cid}`}
function V30ToolModule({view,store,cid,role,setCid}:any){
 const cfg=v33ToolConfigs[view]||{title:view,category:'Tool',resource:view,fields:['title'],defaults:[]}
 // v40_ui_polish_router
 // v42_router_patch
 if(view==='public_landing')return <V42PublicLandingManager store={store} cid={cid}/>
 if(view==='reviews'||view==='review_intelligence'||view==='review_templates')return <V42ReviewsHub store={store} cid={cid}/>
 if(view==='package_recommendations')return <V42PackageRecommendations cid={cid}/>
 if(view==='package_matrix')return <V42PackageMatrixEditor cid={cid}/>
 if(view==='dynamic_billing')return <V42AnalyticsBilling store={store} cid={cid}/>
 if(view==='smart_automation')return <V40AutomationStudio cid={cid}/>
 if(view==='marketing_automation')return <V41MarketingDetail cid={cid}/>
 if(view==='ai_assistant')return <><CentralCustomerSelector store={store} cid={cid} setCid={role==='admin'?setCid:undefined} title='AI Business Assistant · Kunde'/><V41AiAssistantDetail cid={cid}/></>
 if(view==='customer_health')return <><CentralCustomerSelector store={store} cid={cid} setCid={role==='admin'?setCid:undefined} title='Customer Health · Kunde'/><V40HealthRadar cid={cid} store={store} mode="health"/></>
 if(view==='customer_intelligence')return <><CentralCustomerSelector store={store} cid={cid} setCid={role==='admin'?setCid:undefined} title='Customer Intelligence · Kunde'/><V41CustomerIntelligenceDetail cid={cid}/></>
 if(view==='dynamic_billing')return <V40RevenueChart cid={cid} mode="billing"/>
 if(view==='revenue_forecasting')return <><CentralCustomerSelector store={store} cid={cid} setCid={role==='admin'?setCid:undefined} title='Revenue Forecasting · Kunde'/><V41ForecastDetail cid={cid}/></>
 if(view==='revenue_share')return <><CentralCustomerSelector store={store} cid={cid} setCid={role==='admin'?setCid:undefined} title='Revenue Share · Kunde'/><V41RevenueShareDetail cid={cid}/></>
 if(view==='package_recommendations')return <V40PackageDeals cid={cid}/>
 if(view==='package_matrix')return <V41PackageMatrixDetail cid={cid}/>
 if(view==='timeline_events')return <V40TimelineView cid={cid}/>
 const [items,setItems]=useState<any[]>([])
 const [form,setForm]=useState<any>({})
 const [loading,setLoading]=useState(false)
 const [msg,setMsg]=useState('')
 const [verify,setVerify]=useState('')
 const [verifyResult,setVerifyResult]=useState<any>(null)

 useEffect(()=>{
  const initial=safeLocalStorageGet(v33LocalKey(view,cid),cfg.defaults.map((x:any)=>({customer_id:cid,...x})))
  setItems(initial)
  const f:any={}
  cfg.fields.forEach((k:string)=>f[k]=k==='points'||k==='score'||k==='quantity'||k==='unit'||k==='expected'||k==='confidence'||k==='gross'||k==='percent'||k==='tools'||k==='price'?0:`Neue ${cfg.title}`)
  setForm(f)
  setLoading(true)
  v33FunctionalClient.listRecords(cfg.resource,cid)
   .then((r:any)=>{
    const serverItems=(r.records||[]).map((x:any)=>({id:x.local_id||x.id,customer_id:x.customer_id,...(x.payload||{})}))
    if(serverItems.length){setItems(serverItems);safeLocalStorageSet(v33LocalKey(view,cid),serverItems)}
   })
   .catch(()=>null)
   .finally(()=>setLoading(false))
 },[view,cid])

 function persist(next:any[]){setItems(next);safeLocalStorageSet(v33LocalKey(view,cid),next)}
 function add(){
  const row={id:uid(),customer_id:cid,...form,active:true}
  const next=[row,...items]
  persist(next)
  setMsg('Lokal gespeichert – sende an Backend...')
  store?.create?.(cfg.resource,row).catch(()=>null);v33FunctionalClient.createRecord(cfg.resource,row).then(()=>setMsg('In Supabase/Backend gespeichert')).catch((e:any)=>setMsg(`Lokal gespeichert · Backend: ${e.message}`))
 }
 function patch(id:string,patch:any){
  const row=items.find((x:any)=>x.id===id)||{}
  const nextRow={...row,...patch}
  persist(items.map((x:any)=>x.id===id?nextRow:x))
  v33FunctionalClient.updateRecord(cfg.resource,id,nextRow).then(()=>setMsg('Backend aktualisiert')).catch((e:any)=>setMsg(`Lokal aktualisiert · Backend: ${e.message}`))
 }
 function remove(id:string){
  persist(items.filter((x:any)=>x.id!==id))
  v33FunctionalClient.deleteRecord(cfg.resource,id,cid).then(()=>setMsg('Backend gelöscht')).catch((e:any)=>setMsg(`Lokal gelöscht · Backend: ${e.message}`))
 }
 function testStaff(){
  v33FunctionalClient.verifyStaffCode({customer_id:cid,code:verify}).then(()=>setVerifyResult(true)).catch(()=>setVerifyResult(false))
 }
 function runAction(row:any){
  // v35_engine_action_patch
  if(view==='staff_codes')return testStaff()
  if(view==='reviews')return v33FunctionalClient.engineReview(cid,{rating:row.rating,text:row.text||row.feedback_text,name:row.name}).then(()=>setMsg('Review Engine: gespeichert, analysiert und ggf. eskaliert')).catch((e:any)=>setMsg(e.message))
  if(view==='loyalty_rewards')return v33FunctionalClient.redeemRewardEngine(cid,row.id,{staff_code:verify,member_name:'Demo Member'}).then(()=>setMsg('Reward Engine: Einlösung, Codeprüfung, Timeline und Scores berechnet')).catch((e:any)=>setMsg(e.message))
  if(view==='smart_automation')return v33FunctionalClient.runAutomation(cid,row).then((r:any)=>{patch(row.id,{runs:Number(row.runs||0)+1,last_run_at:new Date().toISOString()});setMsg(`Automation Engine: ${r.actions?.length||0} Aktionen erzeugt`)}).catch((e:any)=>setMsg(e.message))
  if(view==='marketing_automation')return v33FunctionalClient.runMarketing(cid,row).then(()=>{patch(row.id,{status:'Gestartet'});setMsg('Marketing Engine: Kampagne gestartet und Timeline erzeugt')}).catch((e:any)=>setMsg(e.message))
  if(view==='dynamic_billing')return v33FunctionalClient.calculateBilling(cid).then((r:any)=>setMsg(`Billing Engine: ${r.total} € Usage berechnet`)).catch((e:any)=>setMsg(e.message))
  if(view==='revenue_forecasting'||view==='customer_health'||view==='customer_intelligence'||view==='revenue_share'||view==='package_recommendations')return v33FunctionalClient.recalculateCustomer(cid).then((r:any)=>setMsg(`Business Engine neu berechnet: Health ${r.snapshot?.health}, Upsell ${r.snapshot?.upsell}`)).catch((e:any)=>setMsg(e.message))
  if(view==='package_recommendations')return patch(row.id,{status:'angenommen'})
  return patch(row.id,{active:!row.active})
 }
 const active=items.filter((x:any)=>x.active!==false).length
 const numericSum=items.reduce((s:number,x:any)=>s+Number(x.points||x.score||x.quantity||x.expected||x.gross||x.uplift||0),0)
 return <><Head title={cfg.title} sub={`${cfg.category} · echte Backend/Supabase-Anbindung mit Demo-Fallback`}/>{role==='admin'&&['loyalty_rewards','loyalty_rules','staff_codes','loyalty','public_landing','smart_loyalty','loyalty_segments'].includes(view)&&<CentralCustomerSelector store={store} cid={cid} setCid={setCid} title={`${cfg.title} · Kunde`} sub='QR & Loyalty zeigt nur Kampagnen und Daten des ausgewählten Kunden.'/>}<div className="grid4"><Metric label="Einträge" value={items.length}/><Metric label="Aktiv" value={active}/><Metric label="Summe/KPI" value={numericSum}/><Metric label="Sync" value={loading?'lädt':'bereit'}/></div><div className="grid2"><Card title={`${cfg.title} verwalten`} action={<Badge type="green">{cfg.category}</Badge>}>{items.map((x:any)=><div className="item" key={x.id}><div><b>{x.title||x.name||x.label||x.period||x.type||cfg.title}</b><div className="sub">{cfg.fields.map((k:string)=>x[k]!==undefined?`${k}: ${x[k]}`:null).filter(Boolean).join(' · ')}</div></div><Badge type={x.active!==false?'green':'gray'}>{x.status||x.severity||x.sentiment||(x.active!==false?'aktiv':'inaktiv')}</Badge><button onClick={()=>runAction(x)}>{view==='smart_automation'?'Testlauf':view==='marketing_automation'?'Starten':view==='loyalty_rewards'?'Einlösen':'Umschalten'}</button><button onClick={()=>remove(x.id)}>Löschen</button></div>)}</Card><Card title="Neu anlegen / Backend Sync">{cfg.fields.map((k:string)=>k==='qr_campaign_id'?<select key={k} className="input" value={form[k]??''} onChange={e=>setForm({...form,[k]:e.target.value})}><option value="">QR-Kampagne des Kunden auswählen</option>{campaignOptionsForCustomer(store,cid).map((q:any)=><option key={q.id} value={q.id}>{q.title||q.name||q.slug}</option>)}</select>:<input key={k} className="input" placeholder={k==='title'?'Titel / Bezeichnung':k==='name'?'Name / Regelbezeichnung':k==='points'?'Benötigte oder zu vergebende Punkte':k==='type'?'Typ / Kategorie':k==='condition'?'Bedingung, z. B. 08:00-12:00':k==='trigger'?'Auslöser, z. B. QR Scan':k} value={form[k]??''} onChange={e=>setForm({...form,[k]:['points','score','quantity','unit','expected','confidence','gross','percent','tools','price'].includes(k)?Number(e.target.value):e.target.value})}/>) }<button className="btn" onClick={add}>Speichern</button>{(view==='staff_codes'||view==='loyalty_rewards')&&<><hr/><input className="input" placeholder="Mitarbeitercode testen / einlösen" value={verify} onChange={e=>setVerify(e.target.value)}/><button className="btn secondary" onClick={testStaff}>Code gegen Backend prüfen</button>{verifyResult!==null&&<Badge type={verifyResult?'green':'red'}>{verifyResult?'Code gültig':'Code ungültig'}</Badge>}</>}<div className="sub">{msg||'Aktionen speichern lokal und senden zusätzlich an /api/v33-functional.'}</div></Card></div></>
}

function CustomerPackages({store,cid}:any){
 const active=cpkg(store.data,cid)
 async function request(p:string){await store.create('package_requests',{customer_id:cid,package_name:p,status:'Angefragt'});await store.create('notifications',{customer_id:cid,title:'Paketanfrage',message:`${cname(store.data,cid)} hat ${p} angefragt.`,type:'package_request',actor_name:cname(store.data,cid)})}
 async function cancel(){await store.create('notifications',{customer_id:cid,title:'Kündigungswunsch',message:`${cname(store.data,cid)} möchte ${active} kündigen.`,type:'cancel_request',actor_name:cname(store.data,cid)})}
 return <><Head title="Pakete & Billing"/><Card title="Rechnungen aus dem Admintool">{store.data.invoices.filter((i:any)=>i.customer_id===cid).map((i:any)=><div className="item" key={i.id}><div><b>{i.invoice_number}</b><div className="sub">{eur(i.amount)} · {i.status}</div></div><button className="btn secondary" onClick={()=>i.pdf_url||i.pdf_base64?openInvoicePdf(i):generateInvoicePdf(store,i)}>PDF öffnen</button></div>)}</Card><div className="grid3">{Object.keys(packageDefs).map(p=>{const req=store.data.package_requests.find((r:any)=>r.customer_id===cid&&r.package_name===p&&r.status==='Angefragt');return <Card key={p} title={p} action={active===p?<Badge type="green">Aktiv</Badge>:req?<Badge>angefragt</Badge>:null}><div className="metricValue">{eur(pprice(p))}</div><div className="featureList">{packageDefs[p].tools.map((t:string)=><div className="featureItem" key={t}>{t} <InfoI text={featureDescriptions[t]||'Optional verfügbar'}/></div>)}</div>{active===p?<button className="btn secondary" onClick={cancel}>Kündigen</button>:req?<button className="btn secondary" disabled>Angefragt</button>:<button className="btn" onClick={()=>request(p)}>Paket anfragen</button>}</Card>})}</div></>
}
