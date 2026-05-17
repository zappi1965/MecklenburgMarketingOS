
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

type Role='guest'|'admin'|'customer'
type FileType='invoices'|'contracts'|'media'|'documents'|'reports'

const uid=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2)
const eur=(v:any)=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(v||0))

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
 return <img src={urls[idx]} alt="QR Code" onError={()=>setIdx(Math.min(idx+1,urls.length-1))}/>
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
  'Review Intelligence':'Sentiment, Themen, Antwortvorschläge und Eskalation.',
  'Antwortvorlagen':'Vorlagen für positive, neutrale und negative Bewertungen.',
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
  'Timeline Events':'Chronologische Verknüpfung aus QR, Loyalty, Reviews, Billing und Tickets.'
})

const packageDefs:any={
  Starter:{
    price:199,
    base:null,
    displayFeatures:['CRM','Tickets','Rechnungen','Booking'],
    tools:['Dashboard','Rechnungen','Tickets','Booking','Pakete & Billing']
  },
  Growth:{
    price:499,
    base:'Starter',
    displayFeatures:['Alles aus Starter-Paket','QR Kampagnen','Loyalty Programm','Reviews','Öffentliche Landingpage'],
    tools:[
      'Dashboard','Rechnungen','Tickets','Booking','Pakete & Billing',
      'QR Kampagnen','Öffentliche /l/[slug] Seite','Loyalty Programm','Rewards','Reviews'
    ]
  },
  Premium:{
    price:899,
    base:'Growth',
    displayFeatures:['Alles aus Growth-Paket','Smart Loyalty V2','Review Intelligence','Automation','AI','Revenue'],
    tools:[
      'Dashboard','Rechnungen','Tickets','Booking','Pakete & Billing',
      'QR Kampagnen','Öffentliche /l/[slug] Seite','Loyalty Programm','Rewards','Reward Regeln',
      'Mitarbeiter-Bestätigungscode','Loyalty Segmente','Smart Loyalty V2',
      'Reviews','Review Intelligence','Antwortvorlagen',
      'Smart Automation','Marketing Automation','AI Business Assistant',
      'Customer Health','Customer Intelligence',
      'Dynamic Billing','Revenue Forecasting','Revenue Share','Package Recommendations',
      'Paket-Matrix','Pipeline','Timeline Events'
    ]
  }
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
 ]
}

function useStore(){
 const [data,setData]=useState<any>(seed)
 const [toast,setToast]=useState('')
 const tables=['customers','customer_subscriptions','customer_tool_access','package_requests','invoices','tickets','ticket_messages','appointments','customer_clients','offers','automations','workflow_runs','activity_logs','customer_notes','integrations','seo_snapshots','customer_files','notifications','customer_service_categories','customer_seo_metrics','review_funnel_stats','client_success_events']
 function notify(m:string){setToast(m);setTimeout(()=>setToast(''),2500)}
 async function load(){
  if(!hasSupabase||!supabase)return
  const r:any={}
  for(const t of tables){const {data}=await supabase.from(t).select('*');r[t]=data||[]}
  setData((p:any)=>({...p,...r}))
 }
 useEffect(()=>{load()},[])
 async function create(table:string,row:any){
  try{
   const payload={...row,created_at:row.created_at||new Date().toISOString()}
   if(hasSupabase&&supabase){const {error}=await supabase.from(table).insert(payload);if(error)throw error;await load()}
   else setData((p:any)=>({...p,[table]:[{...payload,id:uid()},...(p[table]||[])]}))
   notify('Gespeichert')
  }catch(e:any){alert(e.message||'Fehler')}
 }
 async function update(table:string,id:string,row:any){
  try{
   if(hasSupabase&&supabase){const {error}=await supabase.from(table).update(row).eq('id',id);if(error)throw error;await load()}
   else setData((p:any)=>({...p,[table]:(p[table]||[]).map((x:any)=>x.id===id?{...x,...row}:x)}))
   notify('Aktualisiert')
  }catch(e:any){alert(e.message||'Fehler')}
 }
 async function remove(table:string,id:string){
  try{
   if(hasSupabase&&supabase){const {error}=await supabase.from(table).delete().eq('id',id);if(error)throw error;await load()}
   else setData((p:any)=>({...p,[table]:(p[table]||[]).filter((x:any)=>x.id!==id)}))
   notify('Gelöscht')
  }catch(e:any){alert(e.message||'Fehler')}
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
function Toast({m}:any){return m?<div className="toast green">{m}</div>:null}
function Badge({children,type='purple'}:any){return <span className={`badge ${type}`}>{children}</span>}
function Card({title,children,action}:any){return <section className="card"><div className="row between"><h2>{title}</h2>{action}</div>{children}</section>}
function Head({title,sub,action}:any){return <div className="head"><div><h1>{title}</h1>{sub&&<div className="sub">{sub}</div>}</div>{action}</div>}
function Metric({label,value,sub}:any){return <div className="metric"><div className="metricLabel">{label}</div><div className="metricValue">{value}</div>{sub&&<div className="delta">{sub}</div>}</div>}
function Search({items,value,onChange,placeholder}:any){const [q,setQ]=useState('');const s=items.find((x:any)=>x.id===value);const list=items.filter((x:any)=>(x.name+x.branch+x.email).toLowerCase().includes(q.toLowerCase()));return <div style={{position:'relative'}}><input className="input" placeholder={placeholder} value={s&&!q?s.name:q} onChange={e=>{setQ(e.target.value);if(s)onChange('')}}/>{q&&<div className="card floating">{list.map((x:any)=><button className="nav" key={x.id} onClick={()=>{onChange(x.id);setQ('')}}>{x.name}<div className="sub">{x.branch} · {x.package_name}</div></button>)}</div>}</div>}

function Avatar({name,src,size=34}:any){return src?<img className="avatar" style={{width:size,height:size}} src={src}/>:<div className="avatar fallback" style={{width:size,height:size}}>{String(name||'?').slice(0,1)}</div>}
function NotificationBell({store,cid,role,activeAdmin,adminAvatars}:any){
 const [open,setOpen]=useState(false)
 const rows=store.data.notifications.filter((n:any)=>role==='admin'||n.customer_id===cid).sort((a:any,b:any)=>String(b.created_at).localeCompare(String(a.created_at)))
 return <div className="notifWrap"><button className="bellBtn" onClick={()=>setOpen(!open)}>🔔<span>{rows.length}</span></button>{open&&<div className="notifPanel"><h2>Benachrichtigungen</h2>{rows.length===0&&<div className="sub">Keine Benachrichtigungen.</div>}{rows.map((n:any)=><div className="notifItem" key={n.id}><Avatar name={n.actor_name||activeAdmin} src={n.actor_avatar||adminAvatars[n.actor_name]||''}/><div><b>{n.title}</b><div className="sub">{n.message}</div><div className="sub">{new Date(n.created_at).toLocaleString('de-DE')}</div></div></div>)}</div>}</div>
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
  if(!API_BASE){alert('NEXT_PUBLIC_API_BASE fehlt. Profilbild ist nur als Preview gesetzt.');return}
  const fd=new FormData(); fd.append('file',file); fd.append('display_name',activeAdmin)
  setBusy(true)
  try{const res=await fetch(`${API_BASE}/api/avatars/upload`,{method:'POST',body:fd});const j=await res.json();if(!j.ok)throw new Error(j.error||'Upload fehlgeschlagen');setAdminAvatars((p:any)=>({...p,[activeAdmin]:j.data.avatar_url}))}catch(e:any){alert(e.message||'Avatar Upload fehlgeschlagen')}finally{setBusy(false)}
 }
 return <div className="profileWrap"><button className="profileBtn" onClick={()=>setOpen(!open)}><Avatar name={activeAdmin} src={current} size={38}/></button>{open&&<div className="profilePanel"><h2>{activeAdmin}</h2><Avatar name={activeAdmin} src={current} size={72}/><input className="input" type="file" accept="image/*" onChange={pick}/><div className="sub">{busy?'Speichert...':'Profilbild wird bei Backend-Verbindung dauerhaft gespeichert.'}</div></div>}</div>
}

function StorageUploader({store,cid,fileType='documents',refTable,refId,title='Datei hochladen',activeAdmin='DominiqueMM'}:any){
 const input=useRef<HTMLInputElement|null>(null); const [drag,setDrag]=useState(false); const [selected,setSelected]=useState<File|null>(null)
 async function upload(file:File|null=selected){
  if(!file)return alert('Bitte Datei auswählen')
  if(API_BASE){
   const fd=new FormData(); fd.append('file',file); fd.append('customer_id',cid); fd.append('file_type',fileType); if(refTable)fd.append('ref_table',refTable); if(refId)fd.append('ref_id',refId)
   try{const res=await fetch(`${API_BASE}/api/storage/upload`,{method:'POST',body:fd});const j=await res.json(); if(!j.ok)throw new Error(j.error||'Upload fehlgeschlagen'); await store.load()}catch(e:any){alert(e.message)}
  } else {
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
 const customers=store.data.customers.filter((c:any)=>(c.name+c.branch+c.email).toLowerCase().includes(q.toLowerCase()))
 if(role!=='admin') return <input className="search" placeholder="Suche..."/>
 return <div className="globalSearch"><input className="search" placeholder="Globale Kundensuche..." value={q} onChange={e=>setQ(e.target.value)}/>{q&&<div className="card globalResults">{customers.map((c:any)=><button className="nav" key={c.id} onClick={()=>{setCid(c.id);setView('crm');setQ('')}}>{c.name}<div className="sub">{c.branch} · {c.package_name}</div></button>)}</div>}</div>
}
function QRCodes({store,cid,setCid,role='admin'}:any){
 const [customer,setCustomer]=useState(cid)
 const [f,setF]=useState({title:'Bewertungs QR',internal_email:'',internal_from:1,internal_to:3,google_from:4,google_to:5,google_review_url:''})
 async function create(){await store.create('qr_campaigns',{customer_id:customer,...f,status:'Aktiv'});await store.create('notifications',{customer_id:customer,title:'QR Kampagne erstellt',message:`Für ${cname(store.data,customer)} wurde ein Bewertungs-QR erstellt.`,type:'admin_change',actor_name:'DominiqueMM'})}
 
 async function v34CreateQrCampaign(){
  try{
   const r=await v33FunctionalClient.createQrCampaign(customer,{title:f.title||'Neue Loyalty QR Kampagne',purpose:'loyalty',points_per_scan:10})
   store.toast?.(`QR/Loyalty Kampagne erstellt: ${r.public_url_path}`)
   setF({...f,title:''})
   setCid?.(customer)
  }catch(e:any){
   store.toast?.(`Backend-QR konnte nicht erstellt werden: ${e.message}`)
  }
 }
return <><Head title="QR Codes" sub="Bewertungslogik mit internem Feedback und Google Weiterleitung." action={<button className="btn" onClick={()=>createDemoQr()}>QR Kampagne erstellen</button>}/><div className="grid2"><Card title="Kunde & Ziel">{role==='admin'?<Search items={store.data.customers} value={customer} onChange={(id:string)=>{setCustomer(id);setCid?.(id)}} placeholder="Kunde suchen"/>:<div className="item"><b>Kunde</b><span>{cname(store.data,cid)}</span></div>}<input className="input" placeholder="Titel" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/><input className="input" placeholder="Interne Feedback E-Mail" value={f.internal_email} onChange={e=>setF({...f,internal_email:e.target.value})}/><input className="input" placeholder="Google Bewertungslink" value={f.google_review_url} onChange={e=>setF({...f,google_review_url:e.target.value})}/></Card><Card title="Sterne-Regeln"><div className="row"><input className="input" type="number" min="1" max="5" value={f.internal_from} onChange={e=>setF({...f,internal_from:Number(e.target.value)})}/><input className="input" type="number" min="1" max="5" value={f.internal_to} onChange={e=>setF({...f,internal_to:Number(e.target.value)})}/></div><div className="sub">Sternebereich für internes Feedback</div><div className="row"><input className="input" type="number" min="1" max="5" value={f.google_from} onChange={e=>setF({...f,google_from:Number(e.target.value)})}/><input className="input" type="number" min="1" max="5" value={f.google_to} onChange={e=>setF({...f,google_to:Number(e.target.value)})}/></div><div className="sub">Sternebereich für Google Weiterleitung</div></Card></div><Card title="QR Kampagnen">{(store.data.qr_campaigns||[]).filter((q:any)=>q.customer_id===customer).map((q:any)=><div className="item" key={q.id}><b>{q.title}</b><span>{q.internal_from}-{q.internal_to} intern · {q.google_from}-{q.google_to} Google</span></div>)}</Card></>
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
   const mode=typeof window!=='undefined'?localStorage.getItem('mmos_mode'):''
   if(mode==='demo') return localCreate(table,row)
   try{return oldCreate?await oldCreate(table,row):await localCreate(table,row)}catch(e){return localCreate(table,row)}
 }
 store.update=async(table:string,rowId:string,patch:any)=>{
   const mode=typeof window!=='undefined'?localStorage.getItem('mmos_mode'):''
   if(mode==='demo') return localUpdate(table,rowId,patch)
   try{return oldUpdate?await oldUpdate(table,rowId,patch):await localUpdate(table,rowId,patch)}catch(e){return localUpdate(table,rowId,patch)}
 }
 store.remove=async(table:string,rowId:string)=>{
   const mode=typeof window!=='undefined'?localStorage.getItem('mmos_mode'):''
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
    alert(`Enterprise Aktion gestartet: ${preset}`)
    return result
  }catch(e:any){
    alert(e.message||'Enterprise Fehler')
  }
}
async function planEnterpriseBackup(){
  try{
    const result = await enterpriseClient.planBackup({label:'Manueller Restore Point', backup_type:'database'})
    alert('Backup Restore Point geplant')
    return result
  }catch(e:any){ alert(e.message||'Backup Fehler') }
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

export default function App(){
 const store=applyDemoSandboxStorePatch(useStore())
 const [role,setRole]=useState<Role>('guest')
 const [view,setView]=useState('dashboard')
 const [cid,setCid]=useState(ids.barber)
 const [activeAdmin,setActiveAdmin]=useState('DominiqueMM')
 const [mobileNavOpen,setMobileNavOpen]=useState(false)
 const [liveAuthChecked,setLiveAuthChecked]=useState(false)
 useEffect(()=>{(async()=>{try{const profile=await getCurrentUserProfile(); if(profile){markLiveMode();setRole(profile.role==='admin'?'admin':'customer'); if(profile.customer_id)setCid(profile.customer_id); setView('dashboard')}}finally{setLiveAuthChecked(true)}})()},[])
 const [adminAvatars,setAdminAvatars]=useState<any>({DominiqueMM:'',JanneMM:''})
 useEffect(()=>{const p=new URLSearchParams(window.location.search);const c=p.get('customer');if(c){setRole('customer');setCid(c);setView('dashboard')}},[])
 const admin=[
   'dashboard','crm','finance','tickets','booking','pipeline','automations','workflows','media','qr','demo_customers',
   'public_landing','loyalty','loyalty_rewards','loyalty_rules','staff_codes','loyalty_segments','smart_loyalty',
   'reviews','review_intelligence','review_templates','smart_automation','marketing_automation','ai_assistant',
   'customer_health','customer_intelligence','dynamic_billing','revenue_forecasting','revenue_share','package_recommendations','package_matrix','timeline_events'
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
   'Timeline Events':'timeline_events'
 }
 const customerBase=['dashboard','finance','tickets','booking','packages']
 const customer=[...new Set([...customerBase,...(packageDefs[cpkg(store.data,cid)]?.tools||[]).map((t:string)=>packageToolRoutes[t]).filter(Boolean)])]
 const labels:any={
   dashboard:'Dashboard',crm:'CRM',finance:'Rechnungen',tickets:'Tickets',booking:'Booking',pipeline:'Pipeline',automations:'Automationen',workflows:'Workflows',activity:'Aktivitäten',media:'Media Center',qr:'QR Kampagnen',demo_customers:'Demo Kunden',integrations:'Integrationen',packages:'Pakete & Billing',
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
   seo:'SEO Dashboard',review:'Review Funnel',customer_automations:'Automationen',customer_workflows:'Workflows',roles:'Rechte',kpi:'KPI Analytics',heatmap:'SEO Heatmap',success:'Client Success Score',advanced_reports:'Advanced Reports'
 }
 const visibleNavKeys=role==='admin'?admin:customer
 const adminNavGroups=[
   {label:'Übersicht',hint:'Start & Demo',tools:['dashboard','demo_customers']},
   {label:'CRM & Betrieb',hint:'Kunden, Termine, Tickets',tools:['crm','finance','tickets','booking','pipeline','media','timeline_events']},
   {label:'QR & Loyalty',hint:'QR-Code, Endkundenseite, Punkte, Rewards',tools:['qr','public_landing','loyalty','loyalty_rewards','loyalty_rules','staff_codes','loyalty_segments','smart_loyalty']},
   {label:'Reviews',hint:'Feedback, KI-Auswertung, Vorlagen',tools:['reviews','review_intelligence','review_templates']},
   {label:'Automation & Marketing',hint:'Kampagnen, Regeln, AI Assistant',tools:['automations','workflows','smart_automation','marketing_automation','ai_assistant']},
   {label:'Analytics & Billing',hint:'Health, Forecasting, Pakete',tools:['customer_health','customer_intelligence','dynamic_billing','revenue_forecasting','revenue_share','package_recommendations','package_matrix']}
 ]
 const customerNavGroups=[
   {label:'Übersicht',hint:'Portalstart',tools:['dashboard']},
   {label:'QR & Loyalty',hint:'QR, Endkundenseite, Punkte, Rewards',tools:['qr','public_landing','loyalty','loyalty_rewards','loyalty_rules','staff_codes','loyalty_segments','smart_loyalty']},
   {label:'Reviews',hint:'Bewertungen & Antworten',tools:['reviews','review_intelligence','review_templates']},
   {label:'Marketing & Automation',hint:'Kampagnen & AI',tools:['smart_automation','marketing_automation','ai_assistant']},
   {label:'Betrieb',hint:'Termine, Rechnungen, Tickets',tools:['booking','finance','tickets','packages']},
   {label:'Analytics',hint:'Health & Intelligence',tools:['customer_health','customer_intelligence']}
 ]
 const navGroups=(role==='admin'?adminNavGroups:customerNavGroups)
   .map((g:any)=>({...g,tools:g.tools.filter((k:string)=>visibleNavKeys.includes(k))}))
   .filter((g:any)=>g.tools.length>0)
 if(role==='guest')return <div className="landing"><div className="landingNav"><div className="logo"><div className="mark">M</div>MecklenburgMarketingOS</div><div className="row"><button className="btn" onClick={()=>{window.location.href='/auth'}}>Anmelden</button><button className="btn secondary" onClick={()=>{markDemoMode();setRole('admin');setActiveAdmin('DominiqueMM')}}>Demo</button></div></div><section className="hero"><h1>MecklenburgMarketingOS</h1><p>Die All-in-One-Plattform für Kundenmanagement, SEO, Rechnungen, Termine, Dateien und digitale Abläufe. Kunden sehen Fortschritt, Dokumente und offene Aufgaben zentral an einem Ort – du steuerst alles sauber im Adminbereich.</p></section><div className="grid3 packageGrid">{Object.keys(packageDefs).map(p=><Card key={p} title={p}><div className="metricValue">{eur(pprice(p))}</div><div className="sub">monatlich</div><FeatureList pkg={p}/></Card>)}</div></div>
 const nav=role==='admin'?admin:customer
 return <div className={`app ${mobileNavOpen?'navOpen':''}`}><button className="mobileMenuBtn" onClick={()=>setMobileNavOpen(!mobileNavOpen)}>{mobileNavOpen?'✕':'☰'}</button><div className="mobileOverlay" onClick={()=>setMobileNavOpen(false)}></div><aside className="side"><div className="logo"><div className="mark">M</div>MMOS</div><div className="demoModeBadge">DEMO MODE</div>{role==='admin'&&view!=='demo_customers'&&<Search items={store.data.customers} value={cid} onChange={setCid} placeholder="Kundensuche"/>}<div className="navGroups">{navGroups.map((g:any)=><div className="navGroup" key={g.label}><div className="navGroupHead"><span>{g.label}</span><small>{g.hint}</small></div>{g.tools.map((k:string)=><button key={k} className={`nav ${view===k?'active':''}`} onClick={()=>{setView(k);setMobileNavOpen(false)}}>{labels[k]}</button>)}</div>)}</div><button className="nav" onClick={()=>{clearDemoSandbox();location.reload()}}>Demo zurücksetzen</button><button className="nav" onClick={async()=>{await supabaseAuth.auth.signOut();localStorage.removeItem('mmos_mode');setRole('guest')}}>Logout</button></aside><main className="main"><div className="top"><GlobalCustomerSearch store={store} role={role} setCid={setCid} setView={setView}/><div className="topActions"><NotificationBell store={store} cid={cid} role={role} activeAdmin={activeAdmin} adminAvatars={adminAvatars}/>{role==='admin'&&<AdminToggle activeAdmin={activeAdmin} setActiveAdmin={setActiveAdmin}/>}<ProfileUpload activeAdmin={role==='admin'?activeAdmin:cname(store.data,cid)} setAdminAvatars={setAdminAvatars} adminAvatars={adminAvatars}/><Badge>{role==='admin'?activeAdmin:'Kundenportal'} · {role==='customer'?cname(store.data,cid):'Global'}</Badge></div></div><Toast m={store.toast}/>
 {view==='dashboard'&&role==='admin'&&<ProductionStatusCard/>}
 {view==='dashboard'&&<Dashboard store={store} cid={cid} role={role} setCid={setCid} setView={setView} activeAdmin={activeAdmin}/>}
 {view==='crm'&&role==='admin'&&<CRM store={store} cid={cid} activeAdmin={activeAdmin} adminAvatars={adminAvatars}/>}
 {view==='finance'&&<Finance store={store} cid={cid} role={role} activeAdmin={activeAdmin}/>}
 {view==='tickets'&&<Tickets store={store} cid={cid} role={role} activeAdmin={activeAdmin}/>}
 {view==='booking'&&<Booking store={store} cid={cid} role={role}/>}
 {view==='pipeline'&&role==='admin'&&<Pipeline store={store} cid={cid}/>}
 {view==='automations'&&role==='admin'&&<Automations store={store}/>}
 {view==='workflows'&&role==='admin'&&<Workflows store={store} cid={cid}/>}
 
 {view==='media'&&<MediaCenter store={store} cid={cid} setCid={setCid} role={role} activeAdmin={activeAdmin}/>}
 {view==='qr'&&<QRCodes store={store} cid={cid} setCid={role==='admin'?setCid:undefined} role={role}/>}
 {view==='demo_customers'&&role==='admin'&&<DemoCustomers store={store}/>}
 {/* V30.1: Demo tool modules visible in Admin and Customer UI */}
 {['public_landing','loyalty','loyalty_rewards','loyalty_rules','staff_codes','loyalty_segments','smart_loyalty','reviews','review_intelligence','review_templates','smart_automation','marketing_automation','ai_assistant','customer_health','customer_intelligence','dynamic_billing','revenue_forecasting','revenue_share','package_recommendations','package_matrix','timeline_events'].includes(view)&&<V40ErrorBoundary moduleName={view}><V30ToolModule view={view} store={store} cid={cid} role={role}/></V40ErrorBoundary>}
 {view==='integrations'&&role==='customer'&&<Integrations store={store} cid={cid}/>}
 {view==='packages'&&role==='customer'&&<CustomerPackages store={store} cid={cid}/>} 
 {view==='seo'&&role==='customer'&&<CustomerSEO store={store} cid={cid}/>}
 {view==='review'&&role==='customer'&&<CustomerReview store={store} cid={cid}/>}
 {view==='customer_automations'&&role==='customer'&&<CustomerAutomations/>}
 {view==='customer_workflows'&&role==='customer'&&<CustomerWorkflows store={store} cid={cid}/>}
 {view==='roles'&&role==='customer'&&<CustomerRoles store={store} cid={cid}/>}
 {view==='kpi'&&role==='customer'&&<CustomerKPI store={store} cid={cid}/>}
 {view==='heatmap'&&role==='customer'&&<CustomerHeatmap/>}
 {view==='success'&&role==='customer'&&<CustomerSuccess/>}
 {view==='advanced_reports'&&role==='customer'&&<CustomerAdvancedReports/>}

 </main></div>
}











function V42BackendStatus(){
 const [status,setStatus]=useState<any>(null)
 const [msg,setMsg]=useState('')
 useEffect(()=>{v33FunctionalClient.health().then((r:any)=>setStatus(r)).catch((e:any)=>setMsg(e.message))},[])
 return <Card title="Backend Verbindung"><div className="sub">{status?.ok?'Backend erreichbar':msg||'Prüfe Verbindung...'}</div>{!status?.ok&&<div className="v42Warning">Wenn überall „fetch failed“ erscheint: NEXT_PUBLIC_BACKEND_URL in Vercel muss auf deine Railway Backend URL zeigen.</div>}</Card>
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

function V42ReviewsHub({cid}:any){
 const [data,setData]=useState<any>(null),[msg,setMsg]=useState('')
 async function load(){try{const r=await v33FunctionalClient.reviewsHub(cid);setData(r);setMsg('Reviews geladen')}catch(e:any){setMsg(e.message)}}
 useEffect(()=>{load()},[cid])
 return <><Head title="Reviews" sub="Reviews · Intelligence · Antwortvorlagen zusammengeführt"/><div className="grid4"><Metric label="Gesamt" value={data?.stats?.total??'-'}/><Metric label="Positiv" value={data?.stats?.positive??'-'}/><Metric label="Negativ" value={data?.stats?.negative??'-'}/><Metric label="Tickets" value={data?.stats?.open_tickets??'-'}/></div><Card title="Review Inbox">{(data?.reviews||[]).map((r:any)=><div className="item" key={r.id}><b>{r.reviewer_name||'Gast'} · {r.rating||'-'} Sterne</b><span>{r.feedback_text||r.comment||'Keine Nachricht'}</span><Badge type={Number(r.rating||0)<=2?'red':'green'}>{r.sentiment||'neu'}</Badge></div>)}{msg&&<div className="sub">{msg}</div>}</Card></>
}

function V42PackageRecommendations({cid}:any){
 const [data,setData]=useState<any>(null)
 useEffect(()=>{v33FunctionalClient.packageRecommendations(cid).then((r:any)=>setData(r)).catch(()=>{})},[cid])
 const r=data?.recommendation
 return <><Head title="Package Recommendations" sub="Kunde · Add-on · Begründung"/>{r&&<Card title={`Empfehlung für ${r.customer_name}`}><div className="v40Deal"><b>{r.addon}</b><strong>{eur(r.price)}</strong><span>Confidence: {r.confidence}%</span>{r.reason.map((x:string)=><p key={x}>✓ {x}</p>)}</div></Card>}</>
}

function V42PackageMatrixEditor({cid}:any){
 const [packages,setPackages]=useState<any[]>([])
 const [msg,setMsg]=useState('')
 async function load(){try{const r=await v33FunctionalClient.getPackageMatrix(cid);setPackages(r.packages||[])}catch(e:any){setMsg(e.message)}}
 useEffect(()=>{load()},[cid])
 function patch(i:number,k:string,v:any){const next=[...packages];next[i]={...next[i],[k]:v};setPackages(next)}
 async function save(){try{await v33FunctionalClient.savePackageMatrix(cid,{packages});setMsg('Paket-Matrix gespeichert');await load()}catch(e:any){setMsg(e.message)}}
 function add(){setPackages([...packages,{id:`package_${Date.now()}`,name:'',price:'',billing_interval:'month',features:[],visible_on_landing:true,visible_to_customer:true,active:true}])}
 return <><Head title="Paket-Matrix" sub="Preise und Inhalte einstellen · Landingpage · Kunde · Billing"/><Card title="Pakete bearbeiten" action={<button className="btn secondary" onClick={add}>Paket hinzufügen</button>}>{packages.map((p:any,i:number)=><div className="v42PackageEdit" key={p.id||i}><input className="input" value={p.name||''} onChange={e=>patch(i,'name',e.target.value)} placeholder="Paketname, z. B. Growth"/><input className="input" type="number" value={p.price||''} onChange={e=>patch(i,'price',e.target.value)} placeholder="Preis, z. B. 499"/><textarea className="input" value={(p.features||[]).join('\n')} onChange={e=>patch(i,'features',e.target.value.split('\n').filter(Boolean))} placeholder="Inhalte, je Zeile ein Feature"/><label><input type="checkbox" checked={p.visible_on_landing!==false} onChange={e=>patch(i,'visible_on_landing',e.target.checked)}/> Auf Landingpage anzeigen</label><label><input type="checkbox" checked={p.visible_to_customer!==false} onChange={e=>patch(i,'visible_to_customer',e.target.checked)}/> Im Kundenbereich/Billing anzeigen</label></div>)}<button className="btn" onClick={save}>Paket-Matrix speichern</button>{msg&&<div className="sub">{msg}</div>}</Card></>
}

function V42AnalyticsBilling({cid}:any){
 const [data,setData]=useState<any>(null),[msg,setMsg]=useState('')
 async function load(){try{const r=await v33FunctionalClient.analyticsBilling(cid);setData(r);setMsg('Analytics & Billing geladen')}catch(e:any){setMsg(e.message)}}
 useEffect(()=>{load()},[cid])
 const a=data?.analytics||{}
 return <><Head title="Analytics & Billing" sub="Live Kennzahlen · Usage · Billing"/><div className="grid4"><Metric label="QR Scans" value={a.qr_scans??'-'}/><Metric label="Leads" value={a.leads??'-'}/><Metric label="Health" value={a.health??'-'}/><Metric label="Forecast" value={a.forecast??'-'}/></div><Card title="Billing Berechnung"><div className="item"><b>Usage Total</b><span>{data?.billing?.total??'-'} €</span></div><div className="item"><b>Revenue Share</b><span>{a.revenue_share??'-'} €</span></div>{msg&&<div className="sub">{msg}</div>}</Card></>
}

function V41DeepModuleShell({cid,children,title,sub}:any){
 return <><Head title={title} sub={sub}/><V40ErrorBoundary moduleName={title}>{children}</V40ErrorBoundary></>
}

function V41ForecastDetail({cid}:any){
 const [data,setData]=useState<any>(null),[msg,setMsg]=useState('')
 async function load(){try{const r=await v33FunctionalClient.deepModules(cid);setData(r.detail);setMsg('Forecast geladen')}catch(e:any){setMsg(e.message)}}
 useEffect(()=>{load()},[cid])
 const f=data?.forecast
 return <V41DeepModuleShell cid={cid} title="Revenue Forecasting Detail" sub="Forecast · Monatsvergleich · Annahmen · Confidence"><div className="grid2"><Card title="6-Monats Forecast" action={<button className="btn secondary" onClick={load}>Neu berechnen</button>}><div className="v41ForecastChart">{(f?.series||[]).map((m:any)=><div key={m.month}><b>{m.month}</b><div className="v41ForecastBars"><span style={{height:`${Math.max(10,Math.min(100,m.conservative/20))}%`}}></span><span style={{height:`${Math.max(10,Math.min(100,m.expected/20))}%`}}></span><span style={{height:`${Math.max(10,Math.min(100,m.optimistic/20))}%`}}></span></div><em>{eur(m.expected)}</em></div>)}</div><div className="sub">Dunkel = konservativ · Gold = erwartet · hell = optimistisch</div></Card><Card title="Annahmen & Confidence">{(f?.assumptions||[]).map((a:string)=><div className="item" key={a}><b>✓</b><span>{a}</span></div>)}{(f?.series||[]).map((m:any)=><div className="item" key={m.month}><b>{m.month}</b><span>Confidence {m.confidence}% · Erwartet {eur(m.expected)}</span></div>)}{msg&&<div className="sub">{msg}</div>}</Card></div></V41DeepModuleShell>
}

function V41RevenueShareDetail({cid}:any){
 const [data,setData]=useState<any>(null)
 useEffect(()=>{v33FunctionalClient.deepModules(cid).then((r:any)=>setData(r.detail)).catch(()=>{})},[cid])
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
 useEffect(()=>{v33FunctionalClient.deepModules(cid).then((r:any)=>setData(r.detail)).catch(()=>{})},[cid])
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
 async function load(){const r=await v33FunctionalClient.deepModules(cid);setData(r.detail)}
 useEffect(()=>{load().catch(()=>{})},[cid])
 async function ask(){try{const r=await v33FunctionalClient.aiMessage(cid,{message:input});setMsg(r.answer);await load()}catch(e:any){setMsg(e.message)}}
 const ai=data?.ai
 return <V41DeepModuleShell cid={cid} title="AI Business Assistant Detail" sub="Chat · Insight-Verlauf · Warum-Erklärung"><div className="grid2"><Card title="AI Insight Verlauf">{(ai?.insights||[]).map((x:any)=><div className="v41AiBubble" key={x.title}><div className="v40Avatar">AI</div><div><b>{x.title}</b><p>{x.message}</p>{(x.reasons||[]).map((r:string)=><Badge key={r}>{r}</Badge>)}<em>Aktion: {x.action}</em></div></div>)}</Card><Card title="Demo Chat"><textarea className="input" value={input} onChange={e=>setInput(e.target.value)}/><button className="btn" onClick={ask}>Assistant fragen</button>{msg&&<div className="v41AiAnswer">{msg}</div>}</Card></div></V41DeepModuleShell>
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
 const triggers=['QR Scan','Neuer Lead','Reward eingelöst','VIP Level-Up','Negative Review','Inaktiv 30 Tage','Upsell > 80']
 const actions=['Ticket','Pipeline Lead','AI Hinweis','Marketing Kampagne','Punktebonus','Reward freischalten']
 async function create(t:string,a:string){setMsg('Speichere Flow...');try{await v33FunctionalClient.createRecord('smart_automations',{customer_id:cid,id:uid(),name:`${t} → ${a}`,trigger:t,action:a,active:true,runs:0});setMsg('Flow gespeichert')}catch(e:any){setMsg(e.message)}}
 return <><Head title="Smart Automation Studio" sub="Automation · Flow Builder · Trigger-Bibliothek"/><div className="v40Flow"><div className="v40FlowCol"><h3>Trigger</h3>{triggers.map(t=><button key={t} onClick={()=>create(t,'AI Hinweis')}>{t}</button>)}</div><div className="v40FlowArrow">→</div><div className="v40FlowCol"><h3>Aktionen</h3>{actions.map(a=><button key={a} onClick={()=>create('Neuer Lead',a)}>{a}</button>)}</div><div className="v40FlowCol result"><h3>Engine</h3><button onClick={()=>v33FunctionalClient.runAutomation(cid,{}).then(()=>setMsg('Automation Engine gelaufen')).catch((e:any)=>setMsg(e.message))}>Worker starten</button><span>{msg||'Wähle Trigger oder Aktion.'}</span></div></div></>
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

function V40HealthRadar({cid,mode='health'}:any){
 const [data,setData]=useState<any>(null)
 useEffect(()=>{v33FunctionalClient.customer360(cid).then((r:any)=>setData(r)).catch(()=>{})},[cid])
 const s=data?.snapshot||{}
 const vals=[s.health||0,100-(s.risk||0),s.upsell||0,s.success||0]
 return <><Head title={mode==='health'?'Customer Health Radar':'Customer Intelligence Radar'} sub="Analytics · Score-Radar · Risiken & Chancen"/><Card title="Score Radar"><div className="v40Radar">{vals.map((v,i)=><div key={i} style={{height:`${Math.max(8,v)}%`}}><span>{v}</span></div>)}</div><div className="grid4"><Metric label="Health" value={s.health??'-'}/><Metric label="Risk" value={s.risk??'-'}/><Metric label="Upsell" value={s.upsell??'-'}/><Metric label="Success" value={s.success??'-'}/></div></Card></>
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
 return <Card title="V39 Stability & Schema Guard" action={<button className="btn secondary" disabled={!!busy} onClick={()=>run('Schema Health',()=>v33FunctionalClient.schemaHealth())}>Schema prüfen</button>}><div className="sub">Prüft Migrationen, härtet Demo gegen fehlende Tabellen ab und zeigt konkrete Fix-Hinweise.</div><div className="toolbarActions"><button className="btn secondary" disabled={!!busy} onClick={()=>run('Safe Provisioning',()=>v33FunctionalClient.provisionSafe(cid,{}))}>Idempotent provisionieren</button><button className="btn secondary" disabled={!!busy} onClick={()=>run('Testscan',()=>v33FunctionalClient.simulateScan(cid,{name:'V39 Testscan'}))}>Doppelklick-sicherer Testscan</button></div>{msg&&<div className="sub">{msg}</div>}{schema&&<div className="grid4"><Metric label="Ready" value={schema.ready?'Ja':'Nein'}/><Metric label="Fehlend" value={missing.length}/><Metric label="Hinweis" value={schema.ready?'OK':'0050 SQL'}/><Metric label="Status" value={busy||'bereit'}/></div>}{missing.map((m:any)=><div className="item" key={m.table}><b>⚠️ {m.table}</b><span>{m.hint}</span><Badge type="red">0050 ausführen</Badge></div>)}</Card>
}

function V38Customer360({cid}:any){
 const [data,setData]=useState<any>(null),[msg,setMsg]=useState('')
 async function load(){setMsg('Lade Kundenakte...');try{const r=await v33FunctionalClient.customer360(cid);setData(r);setMsg('Kundenakte geladen')}catch(e:any){setMsg(e.message)}}
 async function scan(){setMsg('Simuliere Testscan...');try{await v33FunctionalClient.simulateScan(cid,{name:'Demo Testscan',email:`testscan-${Date.now()}@demo.local`});await load();setMsg('Testscan erzeugt Lead, Member, Punkte und Scores')}catch(e:any){setMsg(e.message)}}
 useEffect(()=>{load()},[cid])
 const c=data?.counts||{}, ai=data?.ai_explanations||[]
 return <Card title="CRM 360 Kundenakte" action={<button className="btn secondary" onClick={load}>Aktualisieren</button>}><div className="grid4"><Metric label="QR Scans" value={c.qrScans??'-'}/><Metric label="Leads" value={c.leads??'-'}/><Metric label="Members" value={c.members??'-'}/><Metric label="Pipeline" value={c.pipelineValue??'-'}/></div><div className="toolbarActions"><button className="btn" onClick={scan}>Testscan simulieren</button><button className="btn secondary" onClick={()=>v33FunctionalClient.qaChecklist(cid).then((r:any)=>{setData({...data,checklist:r.checklist});setMsg(r.ready?'QA bereit':'QA prüfen')}).catch((e:any)=>setMsg(e.message))}>QA-Checkliste</button></div>{ai.map((x:any)=><div className="item" key={x.title}><b>{x.title}</b><span>{(x.reason||[]).join(' · ')}</span><Badge type={x.severity==='warn'?'red':'green'}>Warum?</Badge></div>)}{data?.checklist&&data.checklist.map((x:any)=><div className="item" key={x.key}><b>{x.ok?'✅':'⚠️'} {x.label}</b><span>{x.url||''}</span></div>)}{msg&&<div className="sub">{msg}</div>}</Card>
}
function V38RewardHistory({cid}:any){
 const [data,setData]=useState<any>(null),[msg,setMsg]=useState('')
 async function load(){try{const r=await v33FunctionalClient.rewardHistory(cid);setData(r);setMsg('Reward-Historie geladen')}catch(e:any){setMsg(e.message)}}
 useEffect(()=>{load()},[cid])
 return <Card title="Reward-Historie & Limit-Auslastung" action={<button className="btn secondary" onClick={load}>Laden</button>}>{(data?.rewards||[]).map((r:any)=><div className="item" key={r.id}><b>{r.title}</b><span>{r.total_used}/{r.max_redemptions||'∞'} Einlösungen · täglich {r.daily_limit||'∞'} · wöchentlich {r.weekly_limit||'∞'} · gültig bis {r.expires_at||'offen'}</span><Badge type={r.status==='expired'?'red':'green'}>{r.status}</Badge></div>)}{(data?.history||[]).slice(0,6).map((h:any)=><div className="item" key={h.id}><b>{h.action||h.resource}</b><span>{h.description||h.created_at}</span></div>)}{msg&&<div className="sub">{msg}</div>}</Card>
}
function V38BillingRevenueHub({cid}:any){
 const [data,setData]=useState<any>(null),[msg,setMsg]=useState('')
 async function load(){setMsg('Berechne Billing & Revenue...');try{const r=await v33FunctionalClient.billingRevenue(cid);setData(r);setMsg('Billing & Revenue berechnet')}catch(e:any){setMsg(e.message)}}
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
function V38PublicPreview({cid}:any){
 const [data,setData]=useState<any>(null)
 useEffect(()=>{v33FunctionalClient.qaReport(cid).then((r:any)=>setData(r.report)).catch(()=>{})},[cid])
 const slug=data?.qr_campaigns?.[0]?.slug, url=slug?`/l/${slug}`:''
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
 return <Card title="V36 Demo QA & Worker" action={<button className="btn secondary" onClick={()=>run('Statuscheck',()=>v33FunctionalClient.systemStatus())}>API-Status</button>}><div className="sub">Prüft Backend/Supabase, erzeugt QA-Report, startet Worker und setzt Kundendemo bei Bedarf zurück.</div><div className="toolbarActions"><button className="btn secondary" onClick={()=>run('QA Report',()=>v33FunctionalClient.qaReport(cid))}>QA Report laden</button><button className="btn secondary" onClick={()=>run('Automation Worker',()=>v33FunctionalClient.runWorker(cid,{run_marketing:true}))}>Worker starten</button><button className="btn secondary" onClick={()=>run('Demo Reset',()=>v33FunctionalClient.resetDemoData(cid))}>Kundendemo zurücksetzen</button></div>{msg&&<div className="sub">{msg}</div>}{status&&<div className="grid4"><Metric label="Backend" value={status.checks?.backend?'OK':'Fehler'}/><Metric label="Supabase" value={status.checks?.supabase?'OK':'Warnung'}/><Metric label="Status" value={status.status}/><Metric label="Zeit" value="Live"/></div>}{report&&<div className="grid4"><Metric label="QR" value={report.counts.qr_campaigns}/><Metric label="Leads" value={report.counts.leads}/><Metric label="Members" value={report.counts.loyalty_members}/><Metric label="Engine Runs" value={report.counts.engine_runs}/></div>}{report?.qr_campaigns?.[0]?.slug&&<V36QrExport slug={report.qr_campaigns[0].slug}/>}</Card>
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
 return <Card title="V35 Business Engine" action={<button className="btn secondary" onClick={()=>run(()=>v33FunctionalClient.recalculateCustomer(cid),'Recalculate')}>Alles neu berechnen</button>}><div className="sub">Produktionsnahe Demo-Engine: Health, Intelligence, Billing, Forecast, Revenue Share, Recommendations und AI-Hinweise werden aus echten Kundensignalen berechnet.</div><div className="toolbarActions"><button className="btn secondary" onClick={()=>run(()=>v33FunctionalClient.runAutomation(cid,{}),'Automation Engine')}>Automation Engine</button><button className="btn secondary" onClick={()=>run(()=>v33FunctionalClient.runMarketing(cid,{name:'Demo Booster'}),'Marketing Engine')}>Marketing Engine</button><button className="btn secondary" onClick={()=>run(()=>v33FunctionalClient.calculateBilling(cid),'Billing Engine')}>Billing Engine</button></div>{msg&&<div className="sub">{msg}</div>}{snapshot&&<div className="grid4"><Metric label="Health" value={snapshot.health??snapshot.snapshot?.health??'-'}/><Metric label="Risk" value={snapshot.risk??snapshot.snapshot?.risk??'-'}/><Metric label="Upsell" value={snapshot.upsell??snapshot.snapshot?.upsell??'-'}/><Metric label="Forecast" value={snapshot.forecast??snapshot.snapshot?.forecast??'-'}/></div>}</Card>
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

function Dashboard({store,cid,role,setCid,setView,activeAdmin}:any){
 const inv=role==='admin'?store.data.invoices:store.data.invoices.filter((i:any)=>i.customer_id===cid)
 const open=store.data.tickets.filter((t:any)=>(role==='admin'||t.customer_id===cid)&&t.status!=='Geschlossen').length
 const pending=store.data.package_requests.filter((p:any)=>p.status==='Angefragt')
 const seo=store.data.seo_snapshots.filter((s:any)=>s.customer_id===cid)
 const growth=seo.length>=2?Math.round(((seo.at(-1).organic_traffic-seo[0].organic_traffic)/seo[0].organic_traffic)*100):0
 const revenue=inv.filter((i:any)=>i.status==='Bezahlt'&&!isDemoCustomer(store.data,i.customer_id)&&!i.is_demo).reduce((s:number,i:any)=>s+Number(i.amount||0),0)
 return <><Head title={role==='admin'?'Dashboard':'Dashboard'} sub={role==='admin'?`Herzlich Willkommen ${activeAdmin}`:'Willkommen in deinem Kundenbereich'}/><div className="grid4"><Metric label="Umsatz" value={eur(revenue)} sub="ohne Demo-Kunden"/><Metric label="Offene Tickets" value={open}/><Metric label="SEO Growth 7 Tage" value={`${growth>=0?'+':''}${growth}%`}/><Metric label="Paketanfragen" value={pending.length}/></div>{role==='admin'&&<div className="grid2"><V34CustomerProvisioning cid={cid}/><V33LeadQuickCheck cid={cid}/></div>}{role==='admin'&&<><V35BusinessEnginePanel cid={cid}/><V36DemoQaPanel cid={cid}/><V39StabilityPanel cid={cid}/><V40QualityPanel cid={cid}/></>}<div className="grid2"><V38Customer360 cid={cid}/><V38PublicPreview cid={cid}/></div><div className="grid2"><V38BillingRevenueHub cid={cid}/><V38ResetControls cid={cid}/></div>{role==='admin'&&<Card title="Paketanfragen">{pending.map((p:any)=><div className="item" key={p.id}><div><b>{cname(store.data,p.customer_id)}</b><div className="sub">möchte {p.package_name}</div></div><button className="btn secondary" onClick={()=>{setCid(p.customer_id);setView('crm')}}>CRM öffnen</button></div>)}</Card>}</>
}

function CRM({store,cid,activeAdmin,adminAvatars}:any){return <><Head title="CRM Detail" sub={cname(store.data,cid)}/><CustomerInfo store={store} cid={cid}/><PackageControl store={store} cid={cid} activeAdmin={activeAdmin}/><QuickCRM store={store} cid={cid}/><div className="grid2"><CRMInvoices store={store} cid={cid}/><CRMNotes store={store} cid={cid} activeAdmin={activeAdmin}/></div><div className="grid2"><Card title="Verträge"><FileList store={store} cid={cid} type="contracts"/></Card><Card title="Media"><FileList store={store} cid={cid}/></Card></div></>}
function CustomerInfo({store,cid}:any){const c=cobj(store.data,cid);const [f,setF]=useState(c);if(!c)return null;return <Card title="Kundeninfos bearbeiten" action={<button className="btn" onClick={()=>store.update('customers',cid,f)}>Speichern</button>}><div className="grid2"><input className="input" value={f.name||''} onChange={e=>setF({...f,name:e.target.value})}/><input className="input" value={f.phone||''} onChange={e=>setF({...f,phone:e.target.value})}/><input className="input" value={f.email||''} onChange={e=>setF({...f,email:e.target.value})}/><input className="input" value={f.address||''} onChange={e=>setF({...f,address:e.target.value})}/><input className="input" placeholder="Ansprechpartner" value={f.contact_person||''} onChange={e=>setF({...f,contact_person:e.target.value})}/><input className="input" placeholder="Ansprechpartner" value={f.contact_person||''} onChange={e=>setF({...f,contact_person:e.target.value})}/></div></Card>}

function PackageControl({store,cid,activeAdmin}:any){
 async function apply(pkg:string){
  const current=store.data.customer_subscriptions.find((s:any)=>s.customer_id===cid)
  if(current) await store.update('customer_subscriptions',current.id,{package_name:pkg,status:'active',price_monthly:pprice(pkg),customer_id:cid})
  else await store.create('customer_subscriptions',{customer_id:cid,package_name:pkg,status:'active',price_monthly:pprice(pkg)})
  const allTools=Object.values(packageDefs).flatMap((p:any)=>p.tools)
  for(const t of allTools){const row=store.data.customer_tool_access.find((x:any)=>x.customer_id===cid&&x.tool_key===t);const enabled=packageDefs[pkg].tools.includes(t);if(row) await store.update('customer_tool_access',row.id,{enabled,customer_id:cid});else await store.create('customer_tool_access',{customer_id:cid,tool_key:t,enabled})}
  for(const r of store.data.package_requests.filter((x:any)=>x.customer_id===cid&&x.status==='Angefragt')) await store.update('package_requests',r.id,{status:r.package_name===pkg?'Freigegeben':'Abgelehnt',customer_id:cid})
  await store.create('notifications',{customer_id:cid,title:`${activeAdmin} hat Paket freigeschaltet`,message:`${activeAdmin} hat ${pkg} für ${cname(store.data,cid)} aktiviert.`,type:'admin_change',actor_name:activeAdmin})
 }
 async function toggleTool(t:string){
  const row=store.data.customer_tool_access.find((x:any)=>x.customer_id===cid&&x.tool_key===t)
  if(row) await store.update('customer_tool_access',row.id,{enabled:!row.enabled,customer_id:cid})
  else await store.create('customer_tool_access',{customer_id:cid,tool_key:t,enabled:true})
 }
 const allTools=[...new Set(Object.values(packageDefs).flatMap((p:any)=>p.tools))]
 return <><Card title="Paketfreigabe">{Object.keys(packageDefs).map(p=><div className="item" key={p}><div><b>{p}</b><div className="sub">{eur(pprice(p))}</div></div><button className="btn secondary" onClick={()=>apply(p)}>{cpkg(store.data,cid)===p?'Aktiv':'Freischalten'}</button></div>)}</Card><Card title="Einzelne Tools individuell freischalten">{allTools.map((t:any)=>{const row=store.data.customer_tool_access.find((x:any)=>x.customer_id===cid&&x.tool_key===t);const enabled=row?row.enabled:packageDefs[cpkg(store.data,cid)]?.tools.includes(t);return <div className="item" key={t}><span>{t}</span><button className="btn secondary" onClick={()=>toggleTool(t)}>{enabled?'Freigegeben':'Gesperrt'}</button></div>})}</Card></>
}
function QuickCRM({store,cid}:any){return <Card title="Smart Quick Actions"><button className="btn secondary" onClick={()=>store.create('invoices',{customer_id:cid,invoice_number:invName(store.data,cid),service_type:'Quick Rechnung',amount:199,status:'Offen',is_demo:isDemoCustomer(store.data,cid)})}>Rechnung erstellen</button> <button className="btn secondary" onClick={()=>store.create('tickets',{customer_id:cid,title:'Neues Ticket',description:'Interner Vorgang',status:'Offen',priority:'Mittel'})}>Ticket erstellen</button></Card>}
function CRMInvoices({store,cid}:any){const rows=store.data.invoices.filter((i:any)=>i.customer_id===cid).sort((a:any,b:any)=>String(b.created_at).localeCompare(String(a.created_at)));return <Card title="Aktuelle Rechnungen"><div className="scrollBox">{rows.map((i:any)=><div className="item" key={i.id}><div><b>{i.invoice_number}</b><div className="sub">{i.service_type} · {eur(i.amount)} · {i.status}</div></div><button className="btn secondary" onClick={()=>store.update('invoices',i.id,{status:i.status==='Bezahlt'?'Offen':'Bezahlt'})}>{i.status}</button></div>)}</div><div className="sub">Hochgeladene Rechnungs-PDFs:</div><FileList store={store} cid={cid} type="invoices"/></Card>}
function CRMNotes({store,cid,activeAdmin}:any){const [note,setNote]=useState('');return <Card title="Notizen" action={<button className="btn" onClick={()=>{if(note)store.create('customer_notes',{customer_id:cid,note,actor_name:activeAdmin});setNote('')}}>Notiz speichern</button>}><textarea className="input textarea" value={note} onChange={e=>setNote(e.target.value)} placeholder="Neue Notiz"/>{store.data.customer_notes.filter((n:any)=>n.customer_id===cid).map((n:any)=><div className="item" key={n.id}><span>{n.note}</span><div className="sub">{n.actor_name||'Unbekannt'} · {new Date(n.created_at).toLocaleString('de-DE')}</div></div>)}</Card>}

function Finance({store,cid,role,activeAdmin}:any){const [target,setTarget]=useState(cid);const [service,setService]=useState('Paketgebühr');const [amount,setAmount]=useState(pprice(cpkg(store.data,target)));async function createInv(){await store.create('invoices',{customer_id:target,invoice_number:invName(store.data,target),service_type:service,amount,status:'Offen',is_demo:isDemoCustomer(store.data,target)}); if(role==='admin') await store.create('notifications',{customer_id:target,title:`${activeAdmin} hat Rechnung erstellt`,message:`${activeAdmin} hat ${service} für ${cname(store.data,target)} erstellt.`,type:'admin_change',actor_name:activeAdmin})}return <><Head title="Rechnungen" action={<button className="btn" onClick={createInv}>Rechnung erzeugen</button>}/><div className="grid2"><Card title="Neue Rechnung">{role==='admin'&&<Search items={store.data.customers} value={target} onChange={(id:string)=>{setTarget(id);setAmount(pprice(cpkg(store.data,id)))}} placeholder="Kunde suchen"/>}<select className="input" value={service} onChange={e=>setService(e.target.value)}><option>Paketgebühr</option><option>Google Business Optimierung</option><option>SEO Betreuung</option><option>Webseite / Landingpage</option><option>Review Funnel</option><option>Individuelle Dienstleistung</option></select><input className="input" placeholder="Freitext Dienstleistung" value={service} onChange={e=>setService(e.target.value)}/><input className="input" type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))}/><div className="sub">Nächster Name: {invName(store.data,target)}</div></Card><Card title="Rechnungsvorlage Word/Keynote"><StorageUploader store={store} cid={target} fileType="documents" refTable="invoice_templates" title="Rechnungsvorlage hochladen" activeAdmin={activeAdmin}/><div className="sub"><b>Platzhalter:</b> {'{{KUNDENNAME}}'}, {'{{ADRESSE}}'}, {'{{RECHNUNGSNUMMER}}'}, {'{{BETRAG}}'}, {'{{LEISTUNG}}'}, {'{{DATUM}}'}, {'{{FAELLIGKEIT}}'}</div><div className="sub">Word-Dateien können als Vorlage gespeichert werden. Echte Word→PDF-Konvertierung benötigt LibreOffice/Gotenberg im Backend.</div></Card></div><Card title="Rechnungen">{store.data.invoices.filter((i:any)=>role==='admin'||i.customer_id===cid).map((i:any)=><div className="item" key={i.id}><b>{i.invoice_number}</b><span>{cname(store.data,i.customer_id)} · {eur(i.amount)} · {i.status}</span></div>)}</Card>{role==='customer'&&<CustomerServiceCategories store={store} cid={cid}/>}</>}
function Tickets({store,cid,role,activeAdmin}:any){const rows=store.data.tickets.filter((t:any)=>role==='admin'||t.customer_id===cid);const open=rows.filter((t:any)=>t.status!=='Geschlossen');const closed=rows.filter((t:any)=>t.status==='Geschlossen');const [active,setActive]=useState<any>(null);const [msg,setMsg]=useState('');const [newTicket,setNewTicket]=useState({title:'',description:'',priority:'Mittel'});async function createTicket(){if(!newTicket.title)return;await store.create('tickets',{customer_id:cid,...newTicket,status:'Offen'});await store.create('notifications',{customer_id:cid,title:'Neues Ticket',message:`${cname(store.data,cid)} hat ${newTicket.title} erstellt.`,type:'ticket',actor_name:cname(store.data,cid)});setNewTicket({title:'',description:'',priority:'Mittel'})}async function answer(){if(!active||!msg)return;await store.create('ticket_messages',{ticket_id:active.id,customer_id:active.customer_id,sender_role:role==='admin'?activeAdmin:role,message:msg});await store.update('tickets',active.id,{status:'Geschlossen',closed_at:new Date().toISOString(),customer_id:active.customer_id});if(role==='admin') await store.create('notifications',{customer_id:active.customer_id,title:`${activeAdmin} hat Ticket beantwortet`,message:`${activeAdmin} hat das Ticket „${active.title}“ erledigt.`,type:'admin_change',actor_name:activeAdmin});setMsg('')}return <><Head title="Tickets"/>{role==='customer'&&<Card title="Neues Ticket erstellen"><input className="input" placeholder="Titel" value={newTicket.title} onChange={e=>setNewTicket({...newTicket,title:e.target.value})}/><textarea className="input textarea" placeholder="Beschreibung" value={newTicket.description} onChange={e=>setNewTicket({...newTicket,description:e.target.value})}/><select className="input" value={newTicket.priority} onChange={e=>setNewTicket({...newTicket,priority:e.target.value})}><option>Niedrig</option><option>Mittel</option><option>Hoch</option></select><button className="btn" onClick={createTicket}>Ticket erstellen</button></Card>}<Card title={role==='admin'?'Offene Tickets':'Meine Tickets'}>{open.map((t:any)=><div className="item" key={t.id}><div><b>{t.title}</b><div className="sub">{cname(store.data,t.customer_id)} · {t.description}</div></div><button className="btn secondary" onClick={()=>setActive(t)}>Öffnen</button></div>)}</Card>{active&&<Card title={`Ticket: ${active.title}`}><div className="sub">{active.description}</div>{store.data.ticket_messages.filter((m:any)=>m.ticket_id===active.id).map((m:any)=><div className="item" key={m.id}><b>{adminProfiles.some((a:any)=>a.name===m.sender_role)?m.sender_role:'Kunde'}</b><span>{m.message}</span></div>)}{role==='admin'&&<><textarea className="input textarea" placeholder="Feedback / Antwort. Speichern schließt Ticket." value={msg} onChange={e=>setMsg(e.target.value)}/><button className="btn" onClick={answer}>Antwort speichern & schließen</button></>}</Card>}<Card title="Ticketarchiv">{closed.map((t:any)=><div className="item" key={t.id}><b>{t.title}</b><button className="btn secondary" onClick={()=>setActive(t)}>{role==='customer'?'Erledigt ansehen':'Archiv öffnen'}</button></div>)}</Card></>}



function Booking({store,cid,role}:any){
 const [selectedCid,setSelectedCid]=useState(cid)
 const [currentMonth,setCurrentMonth]=useState(new Date())
 const [selectedDate,setSelectedDate]=useState(new Date().toISOString().slice(0,10))
 const [active,setActive]=useState<any>(null)
 const [client,setClient]=useState('')
 const [q,setQ]=useState('')
 const [f,setF]=useState({client_name:'',appointment_date:new Date().toISOString().slice(0,10),start_time:'10:00',end_time:'11:00',notes:''})
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
 return <><Head title="Booking" sub={role==='admin'?`Termine für ${cname(store.data,target)}`:'Deine Termine'} action={<button className="btn" onClick={create}>Termin anlegen</button>}/><div className="grid2"><Card title="Termin erstellen">{role==='admin'&&<Search items={store.data.customers} value={selectedCid} onChange={setSelectedCid} placeholder="Kunde suchen"/>}{role==='customer'&&<><input className="input" placeholder="Neuen Kunden anlegen" value={client} onChange={e=>setClient(e.target.value)}/><button className="btn secondary" onClick={addClient}>Kunde speichern</button><input className="input" placeholder="Kunden suchen" value={q} onChange={e=>setQ(e.target.value)}/>{clients.map((c:any)=><button className="nav" key={c.id} onClick={()=>setF({...f,client_name:c.name})}>{c.name}</button>)}</>}<input className="input" placeholder="Terminname/Kunde" value={f.client_name} onChange={e=>setF({...f,client_name:e.target.value})}/><input className="input" type="date" value={f.appointment_date} onChange={e=>{setF({...f,appointment_date:e.target.value});setSelectedDate(e.target.value)}}/><input className="input" placeholder="Startzeit" value={f.start_time} onChange={e=>setF({...f,start_time:e.target.value})}/><input className="input" placeholder="Endzeit" value={f.end_time} onChange={e=>setF({...f,end_time:e.target.value})}/><textarea className="input textarea" placeholder="Text zum Termin" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/></Card><Card title={`Termine am ${new Date(selectedDate).toLocaleDateString('de-DE')}`}>{dayRows(selectedDate).length===0&&<div className="sub">Keine Termine für diesen Tag.</div>}{dayRows(selectedDate).map((a:any)=><div className="item" key={a.id}><div><b>{a.start_time} {a.client_name}</b><div className="sub">{a.end_time} · {a.notes||'Kein Text hinterlegt'}</div></div><button className="btn secondary" onClick={()=>setActive(a)}>Details</button></div>)}</Card></div><Card title="Kalender" action={<div className="row"><button className="btn secondary" onClick={()=>{setCurrentMonth(new Date(year,month-1,1));setActive(null)}}>←</button><b>{monthName}</b><button className="btn secondary" onClick={()=>{setCurrentMonth(new Date(year,month+1,1));setActive(null)}}>→</button></div>}><div className="weekHead"><b>Mo</b><b>Di</b><b>Mi</b><b>Do</b><b>Fr</b><b>Sa</b><b>So</b></div><div className="calendar">{days.map((d:any,i:number)=>d?<button className={`day ${selectedDate===iso(d)?'selectedDay':''}`} key={i} onClick={()=>{setSelectedDate(iso(d));setF({...f,appointment_date:iso(d)})}}><b>{d}</b>{dayRows(iso(d)).map((a:any)=><div className="event" key={a.id} onClick={(e)=>{e.stopPropagation();setActive(a)}}>{a.start_time} {a.client_name}</div>)}</button>:<div className="day emptyDay" key={i}></div>)}</div></Card>{active&&<Card title={`Termindetails: ${active.client_name}`} action={<button className="btn secondary" onClick={()=>setActive(null)}>Schließen</button>}><div className="item"><b>Datum</b><span>{new Date(active.appointment_date).toLocaleDateString('de-DE')}</span></div><div className="item"><b>Uhrzeit</b><span>{active.start_time}–{active.end_time}</span></div><div className="item"><b>Status</b><span>{active.status}</span></div><p>{active.notes||'Kein Termintext hinterlegt.'}</p></Card>}</>
}
function Pipeline({store,cid}:any){const [f,setF]=useState({customer_id:cid,title:'',package_name:'Growth',amount:499,status:'Offen',probability:50});return <><Head title="Pipeline" action={<button className="btn" onClick={()=>store.create('offers',f)}>Deal erstellen</button>}/><Card title="Neuer Deal"><input className="input" placeholder="Titel" onChange={e=>setF({...f,title:e.target.value})}/><select className="input" value={f.package_name} onChange={e=>{const p=e.target.value;setF({...f,package_name:p,amount:pprice(p)})}}>{Object.keys(packageDefs).map(p=><option key={p}>{p}</option>)}</select><input className="input" type="number" value={f.amount} onChange={e=>setF({...f,amount:Number(e.target.value)})}/></Card><Card title="Deals">{store.data.offers.map((o:any)=><div className="item" key={o.id}><b>{o.title}</b><span>{cname(store.data,o.customer_id)} · {eur(o.amount)} · {o.probability}%</span></div>)}</Card></>}
function Automations({store}:any){const [f,setF]=useState({name:'',trigger_type:'Rechnung überfällig',action_type:'Benachrichtigung erstellen',enabled:true});return <><Head title="Automationen" action={<button className="btn" onClick={()=>store.create('automations',f)}>Automation erstellen</button>}/><Card title="Neue Automation"><input className="input" placeholder="Name" onChange={e=>setF({...f,name:e.target.value})}/><select className="input" onChange={e=>setF({...f,trigger_type:e.target.value})}>{automationLabels.map(a=><option key={a}>{a}</option>)}</select></Card><Card title="Regeln">{store.data.automations.map((a:any)=><div className="item" key={a.id}><b>{a.name}</b><button className="btn secondary" onClick={()=>store.update('automations',a.id,{enabled:!a.enabled})}>{a.enabled?'Aktiv':'Inaktiv'}</button></div>)}</Card></>}
function Workflows({store,cid}:any){return <><Head title="Workflows"/><Card title="Workflow starten">{automationLabels.map(a=><button key={a} className="btn secondary" onClick={async()=>{await store.create('workflow_runs',{customer_id:cid,workflow_name:a,status:'completed'});await store.create('notifications',{customer_id:cid,title:'Workflow erfüllt',message:`Workflow ${a} wurde erfüllt.`,type:'workflow'})}}>{a}</button>)}</Card><Card title="Läufe">{store.data.workflow_runs.map((w:any)=><div className="item" key={w.id}><b>{w.workflow_name}</b><Badge>{w.status}</Badge></div>)}</Card></>}
function Activity({store,cid}:any){return <><Head title="Aktivitäten"/><Card title="Timeline">{store.data.activity_logs.filter((a:any)=>!a.customer_id||a.customer_id===cid).map((a:any)=><div className="item" key={a.id}><b>{a.action}</b><span>{a.message}</span></div>)}</Card></>}

function MediaCenter({store,cid,setCid,role,activeAdmin}:any){
 const [type,setType]=useState<FileType>('media')
 const [selectedCid,setSelectedCid]=useState(cid)
 const target=role==='admin'?selectedCid:cid
 return <><Head title="Media Center" sub="Dateien landen je nach Typ im passenden CRM-Bereich."/><div className="grid2"><Card title="Ziel auswählen">{role==='admin'&&<Search items={store.data.customers} value={target} onChange={(id:string)=>{setSelectedCid(id);setCid?.(id)}} placeholder="Kunde für Upload suchen"/>}<select className="input" value={type} onChange={e=>setType(e.target.value as FileType)}><option value="invoices">Rechnung</option><option value="contracts">Vertrag</option><option value="media">Bilder / Medien</option><option value="documents">Dokument</option><option value="reports">Report</option></select></Card><StorageUploader store={store} cid={target} fileType={type} title="Datei hochladen" activeAdmin={activeAdmin}/></div><Card title={`Gespeicherte Dateien für ${cname(store.data,target)}`}><FileList store={store} cid={target}/></Card></>
}
function DemoCustomers({store}:any){function open(c:any){window.open(`${window.location.origin}${window.location.pathname}?customer=${c.id}`,'_blank')}return <><Head title="Demo Kunden" sub="Öffnet direkt die Kundenumgebung."/><Card title="Demo Kunden">{store.data.demo_customers.map((c:any)=><div className="item" key={c.id}><div><b>{c.name}</b><div className="sub">{c.package_name}</div></div><button className="btn" onClick={()=>open(c)}>Kundenumgebung öffnen</button></div>)}</Card></>}
function Integrations({store,cid}:any){const [f,setF]=useState({customer_id:cid,name:'Google Business Profile',api_key:'',status:'Verbunden'});return <><Head title="Integrationen" action={<button className="btn" onClick={()=>store.create('integrations',f)}>Speichern</button>}/><Card title="Tool verbinden"><select className="input" value={f.name} onChange={e=>setF({...f,name:e.target.value})}><option>Google Business Profile</option><option>Google Search Console</option><option>Google Analytics</option><option>Meta Business Suite</option></select><input className="input" placeholder="API Key" onChange={e=>setF({...f,api_key:e.target.value})}/></Card><Card title="Verbindungen">{store.data.integrations.filter((i:any)=>i.customer_id===cid).map((i:any)=><div className="item" key={i.id}><b>{i.name}</b><Badge>{i.status}</Badge></div>)}</Card></>}


function CustomerServiceCategories({store,cid}:any){
 const [f,setF]=useState({name:'',price:0,description:''})
 const cats=(store.data.customer_service_categories||[]).filter((c:any)=>c.customer_id===cid)
 async function save(){if(!f.name)return;await store.create('customer_service_categories',{customer_id:cid,...f,price:Number(f.price||0)});setF({name:'',price:0,description:''})}
 async function invoice(cat:any){await store.create('invoices',{customer_id:cid,invoice_number:invName(store.data,cid),service_type:cat.name,amount:Number(cat.price||0),status:'Offen',is_demo:isDemoCustomer(store.data,cid)})}
 return <Card title="Eigene Kategorien & Preise"><div className="grid2"><input className="input" placeholder="Kategorie / Dienstleistung" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/><input className="input" type="number" placeholder="Preis" value={f.price} onChange={e=>setF({...f,price:Number(e.target.value)})}/></div><textarea className="input textarea" placeholder="Beschreibung" value={f.description} onChange={e=>setF({...f,description:e.target.value})}/><button className="btn" onClick={save}>Kategorie speichern</button>{cats.map((c:any)=><div className="item" key={c.id}><div><b>{c.name}</b><div className="sub">{eur(c.price)} · {c.description}</div></div><button className="btn secondary" onClick={()=>invoice(c)}>Rechnung erstellen</button></div>)}</Card>
}
function CustomerToolPage({title,children}:any){return <><Head title={title}/><Card title={title}>{children}</Card></>}
function CustomerSEO({store,cid}:any){const data=(store.data.customer_seo_metrics||store.data.seo_snapshots||[]).filter((s:any)=>s.customer_id===cid);return <CustomerToolPage title="SEO Dashboard"><div className="grid4"><Metric label="Sichtbarkeit" value={data.at(-1)?.visibility||data.at(-1)?.visibility_score||72}/><Metric label="Klicks" value={data.at(-1)?.clicks||1450}/><Metric label="Impressionen" value={data.at(-1)?.impressions||42000}/><Metric label="Top Keywords" value={data.length||18}/></div><div className="chartLine">{Array.from({length:12},(_,i)=><span key={i} style={{height:`${30+(i*7)%58}px`}} />)}</div><div className="sub">Live-Werte erscheinen nach Google API Sync.</div></CustomerToolPage>}
function CustomerReview({store,cid}:any){return <CustomerToolPage title="Review Funnel"><div className="grid4"><Metric label="Positive Reviews" value="24"/><Metric label="Internes Feedback" value="6"/><Metric label="Google Redirects" value="18"/><Metric label="Ø Sterne" value="4.6"/></div><div className="sub">QR-Kampagnen werden im Adminbereich erstellt und hier ausgewertet.</div></CustomerToolPage>}
function CustomerAutomations(){return <CustomerToolPage title="Automationen">{automationLabels.map(a=><div className="item" key={a}><b>{a}</b><Badge>vorbereitet</Badge></div>)}</CustomerToolPage>}
function CustomerWorkflows({store,cid}:any){return <CustomerToolPage title="">{(store.data.workflow_runs||[]).filter((w:any)=>w.customer_id===cid).map((w:any)=><div className="item" key={w.id}><b>{w.workflow_name}</b><Badge>{w.status}</Badge></div>)}<div className="sub">Workflow-Ergebnisse und erfüllte Aufgaben werden hier angezeigt.</div></CustomerToolPage>}
function CustomerRoles({store,cid}:any){return <CustomerToolPage title=""><div className="item"><b>Aktives Paket</b><span>{cpkg(store.data,cid)}</span></div><div className="item"><b>Zugriff</b><span>Kundenrechte aktiv</span></div></CustomerToolPage>}
function CustomerKPI({store,cid}:any){return <CustomerToolPage title="KPI Analytics"><div className="grid4"><Metric label="Leads" value="37"/><Metric label="Conversion" value="12%"/><Metric label="Tickets offen" value={(store.data.tickets||[]).filter((t:any)=>t.customer_id===cid&&t.status!=='Geschlossen').length}/><Metric label="Umsatz" value={eur((store.data.invoices||[]).filter((i:any)=>i.customer_id===cid&&i.status==='Bezahlt').reduce((s:number,i:any)=>s+Number(i.amount||0),0))}/></div><div className="chartLine">{Array.from({length:16},(_,i)=><span key={i} style={{height:`${20+(i*11)%70}px`}} />)}</div></CustomerToolPage>}
function CustomerHeatmap(){return <CustomerToolPage title="SEO Heatmap"><div className="mapMock"><b>Lokale SEO Heatmap</b><span>Live-Karte wird nach Google/Maps API Sync befüllt.</span></div></CustomerToolPage>}
function CustomerSuccess(){return <CustomerToolPage title="Client Success Score"><div className="successCircle">84</div><div className="sub">Score aus Tickets, SEO, Rechnungen, Aktivität und Review-Funnel.</div></CustomerToolPage>}
function CustomerAdvancedReports(){return <CustomerToolPage title="Advanced Reports"><div className="item"><b>Monatsreport</b><button className="btn secondary">PDF vorbereiten</button></div><div className="item"><b>SEO Report</b><button className="btn secondary">Report ansehen</button></div></CustomerToolPage>}



const v33ToolConfigs:any={
 qr:{title:'QR Kampagnen',category:'QR & Loyalty',resource:'qr_campaigns',fields:['title','purpose','points_per_scan'],defaults:[{id:'qr_local_1',title:'Neue Loyalty QR Kampagne',purpose:'loyalty',points_per_scan:10,active:true}],special:'qr'},
 public_landing:{title:'Öffentliche /l/[slug] Seite',category:'QR & Loyalty',resource:'public_landing_pages',fields:['title','slug','headline','mode'],defaults:[{id:'lp1',title:'Frühstücks-Loyalty Landingpage',slug:'demo-cafe-morgenlicht',headline:'Willkommen im Bonusclub',mode:'loyalty',active:true},{id:'lp2',title:'Google Review Landingpage',slug:'demo-review-morgenlicht',headline:'Wie war dein Besuch?',mode:'review',active:true}]},
 loyalty:{title:'Loyalty Programm',category:'QR & Loyalty',resource:'loyalty_programs',fields:['name','qr_campaign_id','points_per_scan'],defaults:[{id:'loy1',name:'Morgenlicht Bonusclub',qr_campaign_id:'22222222-2222-2222-2222-222222222222',points_per_scan:10,active:true}]},
 loyalty_rewards:{title:'Rewards',category:'QR & Loyalty',resource:'loyalty_rewards',fields:['title','type','points'],defaults:[{id:'rew1',title:'Gratis Cappuccino',type:'Gratisprodukt',points:100,active:true},{id:'rew2',title:'10% Frühstücksrabatt',type:'Rabatt',points:180,active:true}]},
 loyalty_rules:{title:'Reward Regeln',category:'QR & Loyalty',resource:'loyalty_reward_rules',fields:['name','trigger','condition','points','multiplier'],defaults:[{id:'rule1',name:'Doppelte Punkte am Vormittag',trigger:'QR Scan',condition:'08:00-11:00 Uhr',points:0,multiplier:2,active:true}]},
 staff_codes:{title:'Mitarbeiter-Bestätigungscode',category:'QR & Loyalty',resource:'staff_codes',fields:['label','code'],defaults:[{id:'code1',label:'Demo Thekencode',code:'2468',uses:0,active:true}],special:'staff'},
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
function V30ToolModule({view,store,cid,role}:any){
 const cfg=v33ToolConfigs[view]||{title:view,category:'Tool',resource:view,fields:['title'],defaults:[]}
 // v40_ui_polish_router
 // v42_router_patch
 if(view==='reviews'||view==='review_intelligence'||view==='review_templates')return <V42ReviewsHub cid={cid}/>
 if(view==='package_recommendations')return <V42PackageRecommendations cid={cid}/>
 if(view==='package_matrix')return <V42PackageMatrixEditor cid={cid}/>
 if(view==='dynamic_billing')return <V42AnalyticsBilling cid={cid}/>
 if(view==='smart_automation')return <V40AutomationStudio cid={cid}/>
 if(view==='marketing_automation')return <V41MarketingDetail cid={cid}/>
 if(view==='ai_assistant')return <V41AiAssistantDetail cid={cid}/>
 if(view==='customer_health')return <V40HealthRadar cid={cid} mode="health"/>
 if(view==='customer_intelligence')return <V41CustomerIntelligenceDetail cid={cid}/>
 if(view==='dynamic_billing')return <V40RevenueChart cid={cid} mode="billing"/>
 if(view==='revenue_forecasting')return <V41ForecastDetail cid={cid}/>
 if(view==='revenue_share')return <V41RevenueShareDetail cid={cid}/>
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
  const local=typeof window!=='undefined'?localStorage.getItem(v33LocalKey(view,cid)):null
  const initial=local?JSON.parse(local):cfg.defaults.map((x:any)=>({customer_id:cid,...x}))
  setItems(initial)
  const f:any={}
  cfg.fields.forEach((k:string)=>f[k]=k==='points'||k==='score'||k==='quantity'||k==='unit'||k==='expected'||k==='confidence'||k==='gross'||k==='percent'||k==='tools'||k==='price'?0:`Neue ${cfg.title}`)
  setForm(f)
  setLoading(true)
  v33FunctionalClient.listRecords(cfg.resource,cid)
   .then((r:any)=>{
    const serverItems=(r.records||[]).map((x:any)=>({id:x.local_id||x.id,customer_id:x.customer_id,...(x.payload||{})}))
    if(serverItems.length){setItems(serverItems);localStorage.setItem(v33LocalKey(view,cid),JSON.stringify(serverItems))}
   })
   .catch(()=>null)
   .finally(()=>setLoading(false))
 },[view,cid])

 function persist(next:any[]){setItems(next);try{localStorage.setItem(v33LocalKey(view,cid),JSON.stringify(next))}catch{}}
 function add(){
  const row={id:uid(),customer_id:cid,...form,active:true}
  const next=[row,...items]
  persist(next)
  setMsg('Lokal gespeichert – sende an Backend...')
  v33FunctionalClient.createRecord(cfg.resource,row).then(()=>setMsg('In Supabase/Backend gespeichert')).catch((e:any)=>setMsg(`Lokal gespeichert · Backend: ${e.message}`))
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
 return <><Head title={cfg.title} sub={`${cfg.category} · echte Backend/Supabase-Anbindung mit Demo-Fallback`}/><div className="grid4"><Metric label="Einträge" value={items.length}/><Metric label="Aktiv" value={active}/><Metric label="Summe/KPI" value={numericSum}/><Metric label="Sync" value={loading?'lädt':'bereit'}/></div><div className="grid2"><Card title={`${cfg.title} verwalten`} action={<Badge type="green">{cfg.category}</Badge>}>{items.map((x:any)=><div className="item" key={x.id}><div><b>{x.title||x.name||x.label||x.period||x.type||cfg.title}</b><div className="sub">{cfg.fields.map((k:string)=>x[k]!==undefined?`${k}: ${x[k]}`:null).filter(Boolean).join(' · ')}</div></div><Badge type={x.active!==false?'green':'gray'}>{x.status||x.severity||x.sentiment||x.active!==false?'aktiv':'inaktiv'}</Badge><button onClick={()=>runAction(x)}>{view==='smart_automation'?'Testlauf':view==='marketing_automation'?'Starten':view==='loyalty_rewards'?'Einlösen':'Umschalten'}</button><button onClick={()=>remove(x.id)}>Löschen</button></div>)}</Card><Card title="Neu anlegen / Backend Sync">{cfg.fields.map((k:string)=><input key={k} className="input" placeholder={k} value={form[k]??''} onChange={e=>setForm({...form,[k]:['points','score','quantity','unit','expected','confidence','gross','percent','tools','price'].includes(k)?Number(e.target.value):e.target.value})}/>) }<button className="btn" onClick={add}>Speichern</button>{(view==='staff_codes'||view==='loyalty_rewards')&&<><hr/><input className="input" placeholder="Mitarbeitercode testen / einlösen" value={verify} onChange={e=>setVerify(e.target.value)}/><button className="btn secondary" onClick={testStaff}>Code gegen Backend prüfen</button>{verifyResult!==null&&<Badge type={verifyResult?'green':'red'}>{verifyResult?'Code gültig':'Code ungültig'}</Badge>}</>}<div className="sub">{msg||'Aktionen speichern lokal und senden zusätzlich an /api/v33-functional.'}</div></Card></div></>
}

function CustomerPackages({store,cid}:any){
 const active=cpkg(store.data,cid)
 async function request(p:string){await store.create('package_requests',{customer_id:cid,package_name:p,status:'Angefragt'});await store.create('notifications',{customer_id:cid,title:'Paketanfrage',message:`${cname(store.data,cid)} hat ${p} angefragt.`,type:'package_request',actor_name:cname(store.data,cid)})}
 async function cancel(){await store.create('notifications',{customer_id:cid,title:'Kündigungswunsch',message:`${cname(store.data,cid)} möchte ${active} kündigen.`,type:'cancel_request',actor_name:cname(store.data,cid)})}
 return <><Head title="Pakete & Billing"/><Card title="Rechnungen aus dem Admintool">{store.data.invoices.filter((i:any)=>i.customer_id===cid).map((i:any)=><div className="item" key={i.id}><b>{i.invoice_number}</b><span>{eur(i.amount)} · {i.status}</span></div>)}</Card><div className="grid3">{Object.keys(packageDefs).map(p=>{const req=store.data.package_requests.find((r:any)=>r.customer_id===cid&&r.package_name===p&&r.status==='Angefragt');return <Card key={p} title={p} action={active===p?<Badge type="green">Aktiv</Badge>:req?<Badge>angefragt</Badge>:null}><div className="metricValue">{eur(pprice(p))}</div><div className="featureList">{packageDefs[p].tools.map((t:string)=><div className="featureItem" key={t}>{t} <InfoI text={featureDescriptions[t]||'Optional verfügbar'}/></div>)}</div>{active===p?<button className="btn secondary" onClick={cancel}>Kündigen</button>:req?<button className="btn secondary" disabled>Angefragt</button>:<button className="btn" onClick={()=>request(p)}>Paket anfragen</button>}</Card>})}</div></>
}
