
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { API_BASE, hasSupabase, supabase } from '@/lib/supabase'

type Role='guest'|'admin'|'customer'
type FileType='invoices'|'contracts'|'media'|'documents'|'reports'

const uid=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2)
const eur=(v:any)=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(v||0))

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

const packageDefs:any={
  Starter:{
    price:199,
    base:null,
    displayFeatures:['CRM','Tickets','Rechnungen','Media Center'],
    tools:['CRM','Tickets','Rechnungen','Media Center']
  },
  Growth:{
    price:499,
    base:'Starter',
    displayFeatures:['Alles aus Starter-Paket','SEO','Booking','Pipeline','Integrationen','Reports'],
    tools:['CRM','Tickets','Rechnungen','Media Center','SEO','Booking','Pipeline','Integrationen','Reports']
  },
  Premium:{
    price:899,
    base:'Growth',
    displayFeatures:['Alles aus Growth-Paket','Automationen','Workflows','Rechte','Review Funnel'],
    tools:['CRM','Tickets','Rechnungen','Media Center','SEO','Booking','Pipeline','Integrationen','Reports','Automationen','Workflows','Rechte','Review Funnel']
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
 const tables=['customers','customer_subscriptions','customer_tool_access','package_requests','invoices','tickets','ticket_messages','appointments','customer_clients','offers','automations','workflow_runs','activity_logs','customer_notes','integrations','seo_snapshots','customer_files','notifications']
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
function QRCodes({store,cid,setCid}:any){
 const [customer,setCustomer]=useState(cid)
 const [f,setF]=useState({title:'Bewertungs QR',internal_email:'',internal_from:1,internal_to:3,google_from:4,google_to:5,google_review_url:''})
 async function create(){await store.create('qr_campaigns',{customer_id:customer,...f,status:'Aktiv'});await store.create('notifications',{customer_id:customer,title:'QR Kampagne erstellt',message:`Für ${cname(store.data,customer)} wurde ein Bewertungs-QR erstellt.`,type:'admin_change',actor_name:'DominiqueMM'})}
 return <><Head title="QR Codes" sub="Bewertungslogik mit internem Feedback und Google Weiterleitung." action={<button className="btn" onClick={create}>QR Code erstellen</button>}/><div className="grid2"><Card title="Kunde & Ziel"><Search items={store.data.customers} value={customer} onChange={(id:string)=>{setCustomer(id);setCid?.(id)}} placeholder="Kunde suchen"/><input className="input" placeholder="Titel" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/><input className="input" placeholder="Interne Feedback E-Mail" value={f.internal_email} onChange={e=>setF({...f,internal_email:e.target.value})}/><input className="input" placeholder="Google Bewertungslink" value={f.google_review_url} onChange={e=>setF({...f,google_review_url:e.target.value})}/></Card><Card title="Sterne-Regeln"><div className="row"><input className="input" type="number" min="1" max="5" value={f.internal_from} onChange={e=>setF({...f,internal_from:Number(e.target.value)})}/><input className="input" type="number" min="1" max="5" value={f.internal_to} onChange={e=>setF({...f,internal_to:Number(e.target.value)})}/></div><div className="sub">Sternebereich für internes Feedback</div><div className="row"><input className="input" type="number" min="1" max="5" value={f.google_from} onChange={e=>setF({...f,google_from:Number(e.target.value)})}/><input className="input" type="number" min="1" max="5" value={f.google_to} onChange={e=>setF({...f,google_to:Number(e.target.value)})}/></div><div className="sub">Sternebereich für Google Weiterleitung</div></Card></div><Card title="QR Kampagnen">{(store.data.qr_campaigns||[]).filter((q:any)=>q.customer_id===customer).map((q:any)=><div className="item" key={q.id}><b>{q.title}</b><span>{q.internal_from}-{q.internal_to} intern · {q.google_from}-{q.google_to} Google</span></div>)}</Card></>
}

export default function App(){
 const store=useStore()
 const [role,setRole]=useState<Role>('guest')
 const [view,setView]=useState('dashboard')
 const [cid,setCid]=useState(ids.barber)
 const [activeAdmin,setActiveAdmin]=useState('DominiqueMM')
 const [adminAvatars,setAdminAvatars]=useState<any>({DominiqueMM:'',JanneMM:''})
 useEffect(()=>{const p=new URLSearchParams(window.location.search);const c=p.get('customer');if(c){setRole('customer');setCid(c);setView('dashboard')}},[])
 const admin=['dashboard','crm','finance','tickets','booking','pipeline','automations','workflows','media','qr','demo_customers']
 const customer=['dashboard','finance','tickets','booking','integrations','media','packages']
 const labels:any={dashboard:'Dashboard',crm:'CRM',finance:'Rechnungen',tickets:'Tickets',booking:'Booking',pipeline:'Pipeline',automations:'Automationen',workflows:'Workflows',activity:'Aktivitäten',media:'Media Center',qr:'QR Codes',demo_customers:'Demo Kunden',integrations:'Integrationen',packages:'Pakete & Billing'}
 if(role==='guest')return <div className="landing"><div className="landingNav"><div className="logo"><div className="mark">M</div>MecklenburgMarketingOS</div><div className="row"><button className="btn" onClick={()=>{setRole('admin');setActiveAdmin('DominiqueMM')}}>Admin Login</button><button className="btn secondary" onClick={()=>{setRole('customer');setCid(ids.barber)}}>Kunden Login</button></div></div><section className="hero"><h1>MecklenburgMarketingOS</h1><p>Die All-in-One-Plattform für Kundenmanagement, SEO, Rechnungen, Termine, Dateien und digitale Abläufe. Kunden sehen Fortschritt, Dokumente und offene Aufgaben zentral an einem Ort – du steuerst alles sauber im Adminbereich.</p></section><div className="grid3 packageGrid">{Object.keys(packageDefs).map(p=><Card key={p} title={p}><div className="metricValue">{eur(pprice(p))}</div><div className="sub">monatlich</div><FeatureList pkg={p}/></Card>)}</div></div>
 const nav=role==='admin'?admin:customer
 return <div className="app"><aside className="side"><div className="logo"><div className="mark">M</div>MMOS</div>{role==='admin'&&view!=='demo_customers'&&<Search items={store.data.customers} value={cid} onChange={setCid} placeholder="Kundensuche"/>}{nav.map(k=><button key={k} className={`nav ${view===k?'active':''}`} onClick={()=>setView(k)}>{labels[k]}</button>)}<button className="nav" onClick={()=>setRole('guest')}>Logout</button></aside><main className="main"><div className="top"><GlobalCustomerSearch store={store} role={role} setCid={setCid} setView={setView}/><div className="topActions"><NotificationBell store={store} cid={cid} role={role} activeAdmin={activeAdmin} adminAvatars={adminAvatars}/>{role==='admin'&&<AdminToggle activeAdmin={activeAdmin} setActiveAdmin={setActiveAdmin}/>}<ProfileUpload activeAdmin={role==='admin'?activeAdmin:cname(store.data,cid)} setAdminAvatars={setAdminAvatars} adminAvatars={adminAvatars}/><Badge>{role==='admin'?activeAdmin:'Kundenportal'} · {role==='customer'?cname(store.data,cid):'Global'}</Badge></div></div><Toast m={store.toast}/>
 {view==='dashboard'&&<Dashboard store={store} cid={cid} role={role} setCid={setCid} setView={setView} activeAdmin={activeAdmin}/>}
 {view==='crm'&&role==='admin'&&<CRM store={store} cid={cid} activeAdmin={activeAdmin} adminAvatars={adminAvatars}/>}
 {view==='finance'&&<Finance store={store} cid={cid} role={role} activeAdmin={activeAdmin}/>}
 {view==='tickets'&&<Tickets store={store} cid={cid} role={role} activeAdmin={activeAdmin}/>}
 {view==='booking'&&<Booking store={store} cid={cid} role={role}/>}
 {view==='pipeline'&&role==='admin'&&<Pipeline store={store} cid={cid}/>}
 {view==='automations'&&role==='admin'&&<Automations store={store}/>}
 {view==='workflows'&&role==='admin'&&<Workflows store={store} cid={cid}/>}
 
 {view==='media'&&<MediaCenter store={store} cid={cid} setCid={setCid} role={role} activeAdmin={activeAdmin}/>}
 {view==='qr'&&role==='admin'&&<QRCodes store={store} cid={cid} setCid={setCid}/>}
 {view==='demo_customers'&&role==='admin'&&<DemoCustomers store={store}/>}
 {view==='integrations'&&role==='customer'&&<Integrations store={store} cid={cid}/>}
 {view==='packages'&&role==='customer'&&<CustomerPackages store={store} cid={cid}/>}
 </main></div>
}

function Dashboard({store,cid,role,setCid,setView,activeAdmin}:any){
 const inv=role==='admin'?store.data.invoices:store.data.invoices.filter((i:any)=>i.customer_id===cid)
 const open=store.data.tickets.filter((t:any)=>(role==='admin'||t.customer_id===cid)&&t.status!=='Geschlossen').length
 const pending=store.data.package_requests.filter((p:any)=>p.status==='Angefragt')
 const seo=store.data.seo_snapshots.filter((s:any)=>s.customer_id===cid)
 const growth=seo.length>=2?Math.round(((seo.at(-1).organic_traffic-seo[0].organic_traffic)/seo[0].organic_traffic)*100):0
 const revenue=inv.filter((i:any)=>i.status==='Bezahlt'&&!isDemoCustomer(store.data,i.customer_id)&&!i.is_demo).reduce((s:number,i:any)=>s+Number(i.amount||0),0)
 return <><Head title={role==='admin'?'Dashboard':'Dashboard'} sub={role==='admin'?`Herzlich Willkommen ${activeAdmin}`:'Willkommen in deinem Kundenbereich'}/><div className="grid4"><Metric label="Umsatz" value={eur(revenue)} sub="ohne Demo-Kunden"/><Metric label="Offene Tickets" value={open}/><Metric label="SEO Growth 7 Tage" value={`${growth>=0?'+':''}${growth}%`}/><Metric label="Paketanfragen" value={pending.length}/></div>{role==='admin'&&<Card title="Paketanfragen">{pending.map((p:any)=><div className="item" key={p.id}><div><b>{cname(store.data,p.customer_id)}</b><div className="sub">möchte {p.package_name}</div></div><button className="btn secondary" onClick={()=>{setCid(p.customer_id);setView('crm')}}>CRM öffnen</button></div>)}</Card>}</>
}

function CRM({store,cid,activeAdmin,adminAvatars}:any){return <><Head title="CRM Detail" sub={cname(store.data,cid)}/><CustomerInfo store={store} cid={cid}/><PackageControl store={store} cid={cid} activeAdmin={activeAdmin}/><QuickCRM store={store} cid={cid}/><div className="grid2"><CRMInvoices store={store} cid={cid}/><CRMNotes store={store} cid={cid} activeAdmin={activeAdmin}/></div><div className="grid2"><Card title="Verträge"><FileList store={store} cid={cid} type="contracts"/></Card><Card title="Media"><FileList store={store} cid={cid}/></Card></div></>}
function CustomerInfo({store,cid}:any){const c=cobj(store.data,cid);const [f,setF]=useState(c);if(!c)return null;return <Card title="Kundeninfos bearbeiten" action={<button className="btn" onClick={()=>store.update('customers',cid,f)}>Speichern</button>}><div className="grid2"><input className="input" value={f.name||''} onChange={e=>setF({...f,name:e.target.value})}/><input className="input" value={f.phone||''} onChange={e=>setF({...f,phone:e.target.value})}/><input className="input" value={f.email||''} onChange={e=>setF({...f,email:e.target.value})}/><input className="input" value={f.address||''} onChange={e=>setF({...f,address:e.target.value})}/><input className="input" placeholder="Ansprechpartner" value={f.contact_person||''} onChange={e=>setF({...f,contact_person:e.target.value})}/></div></Card>}

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

function Finance({store,cid,role,activeAdmin}:any){const [target,setTarget]=useState(cid);const [service,setService]=useState('Paketgebühr');const [amount,setAmount]=useState(pprice(cpkg(store.data,target)));async function createInv(){await store.create('invoices',{customer_id:target,invoice_number:invName(store.data,target),service_type:service,amount,status:'Offen',is_demo:isDemoCustomer(store.data,target)}); if(role==='admin') await store.create('notifications',{customer_id:target,title:`${activeAdmin} hat Rechnung erstellt`,message:`${activeAdmin} hat ${service} für ${cname(store.data,target)} erstellt.`,type:'admin_change',actor_name:activeAdmin})}return <><Head title="Rechnungen" action={<button className="btn" onClick={createInv}>Rechnung erzeugen</button>}/><div className="grid2"><Card title="Neue Rechnung">{role==='admin'&&<Search items={store.data.customers} value={target} onChange={(id:string)=>{setTarget(id);setAmount(pprice(cpkg(store.data,id)))}} placeholder="Kunde suchen"/>}<select className="input" value={service} onChange={e=>setService(e.target.value)}><option>Paketgebühr</option><option>Google Business Optimierung</option><option>SEO Betreuung</option><option>Webseite / Landingpage</option><option>Review Funnel</option><option>Individuelle Dienstleistung</option></select><input className="input" placeholder="Freitext Dienstleistung" value={service} onChange={e=>setService(e.target.value)}/><input className="input" type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))}/><div className="sub">Nächster Name: {invName(store.data,target)}</div></Card><Card title="Rechnungsvorlage Word/Keynote"><StorageUploader store={store} cid={target} fileType="documents" refTable="invoice_templates" title="Rechnungsvorlage hochladen" activeAdmin={activeAdmin}/><div className="sub"><b>Platzhalter:</b> {'{{KUNDENNAME}}'}, {'{{ADRESSE}}'}, {'{{RECHNUNGSNUMMER}}'}, {'{{BETRAG}}'}, {'{{LEISTUNG}}'}, {'{{DATUM}}'}, {'{{FAELLIGKEIT}}'}</div><div className="sub">Word-Dateien können als Vorlage gespeichert werden. Echte Word→PDF-Konvertierung benötigt LibreOffice/Gotenberg im Backend.</div></Card></div><Card title="Rechnungen">{store.data.invoices.filter((i:any)=>role==='admin'||i.customer_id===cid).map((i:any)=><div className="item" key={i.id}><b>{i.invoice_number}</b><span>{cname(store.data,i.customer_id)} · {eur(i.amount)} · {i.status}</span></div>)}</Card></>}
function Tickets({store,cid,role,activeAdmin}:any){const rows=store.data.tickets.filter((t:any)=>role==='admin'||t.customer_id===cid);const open=rows.filter((t:any)=>t.status!=='Geschlossen');const closed=rows.filter((t:any)=>t.status==='Geschlossen');const [active,setActive]=useState<any>(null);const [msg,setMsg]=useState('');const [newTicket,setNewTicket]=useState({title:'',description:'',priority:'Mittel'});async function createTicket(){if(!newTicket.title)return;await store.create('tickets',{customer_id:cid,...newTicket,status:'Offen'});await store.create('notifications',{customer_id:cid,title:'Neues Ticket',message:`${cname(store.data,cid)} hat ${newTicket.title} erstellt.`,type:'ticket',actor_name:cname(store.data,cid)});setNewTicket({title:'',description:'',priority:'Mittel'})}async function answer(){if(!active||!msg)return;await store.create('ticket_messages',{ticket_id:active.id,customer_id:active.customer_id,sender_role:role==='admin'?activeAdmin:role,message:msg});await store.update('tickets',active.id,{status:'Geschlossen',closed_at:new Date().toISOString(),customer_id:active.customer_id});if(role==='admin') await store.create('notifications',{customer_id:active.customer_id,title:`${activeAdmin} hat Ticket beantwortet`,message:`${activeAdmin} hat das Ticket „${active.title}“ erledigt.`,type:'admin_change',actor_name:activeAdmin});setMsg('')}return <><Head title="Tickets"/>{role==='customer'&&<Card title="Neues Ticket erstellen"><input className="input" placeholder="Titel" value={newTicket.title} onChange={e=>setNewTicket({...newTicket,title:e.target.value})}/><textarea className="input textarea" placeholder="Beschreibung" value={newTicket.description} onChange={e=>setNewTicket({...newTicket,description:e.target.value})}/><select className="input" value={newTicket.priority} onChange={e=>setNewTicket({...newTicket,priority:e.target.value})}><option>Niedrig</option><option>Mittel</option><option>Hoch</option></select><button className="btn" onClick={createTicket}>Ticket erstellen</button></Card>}<Card title={role==='admin'?'Offene Tickets':'Meine Tickets'}>{open.map((t:any)=><div className="item" key={t.id}><div><b>{t.title}</b><div className="sub">{cname(store.data,t.customer_id)} · {t.description}</div></div><button className="btn secondary" onClick={()=>setActive(t)}>Öffnen</button></div>)}</Card>{active&&<Card title={`Ticket: ${active.title}`}><div className="sub">{active.description}</div>{store.data.ticket_messages.filter((m:any)=>m.ticket_id===active.id).map((m:any)=><div className="item" key={m.id}><b>{adminProfiles.some((a:any)=>a.name===m.sender_role)?m.sender_role:'Kunde'}</b><span>{m.message}</span></div>)}{role==='admin'&&<><textarea className="input textarea" placeholder="Feedback / Antwort. Speichern schließt Ticket." value={msg} onChange={e=>setMsg(e.target.value)}/><button className="btn" onClick={answer}>Antwort speichern & schließen</button></>}</Card>}<Card title="Ticketarchiv">{closed.map((t:any)=><div className="item" key={t.id}><b>{t.title}</b><button className="btn secondary" onClick={()=>setActive(t)}>{role==='customer'?'Erledigt ansehen':'Archiv öffnen'}</button></div>)}</Card></>}


function Booking({store,cid,role}:any){
 const [selectedCid,setSelectedCid]=useState(cid)
 const [day,setDay]=useState('')
 const [active,setActive]=useState<any>(null)
 const [client,setClient]=useState('')
 const [q,setQ]=useState('')
 const [f,setF]=useState({client_name:'',appointment_date:new Date().toISOString().slice(0,10),start_time:'10:00',end_time:'11:00',notes:''})
 const target=role==='admin'?selectedCid:cid
 const rows=store.data.appointments.filter((a:any)=>a.customer_id===target)
 async function addClient(){if(client)await store.create('customer_clients',{customer_id:target,name:client})}
 async function create(){await store.create('appointments',{customer_id:target,...f,client_name:f.client_name||client||cname(store.data,target),status:'Geplant'})}
 const clients=store.data.customer_clients.filter((c:any)=>c.customer_id===target&&c.name.toLowerCase().includes(q.toLowerCase()))
 return <><Head title="Booking" action={<button className="btn" onClick={create}>Termin anlegen</button>}/><div className="grid2"><Card title="Termin erstellen">{role==='admin'&&<Search items={store.data.customers} value={selectedCid} onChange={setSelectedCid} placeholder="Kunde suchen"/>}{role==='customer'&&<><input className="input" placeholder="Neuen Kunden anlegen" value={client} onChange={e=>setClient(e.target.value)}/><button className="btn secondary" onClick={addClient}>Kunde speichern</button><input className="input" placeholder="Kunden suchen" value={q} onChange={e=>setQ(e.target.value)}/>{clients.map((c:any)=><button className="nav" key={c.id} onClick={()=>setF({...f,client_name:c.name})}>{c.name}</button>)}</>}<input className="input" placeholder="Terminname/Kunde" value={f.client_name} onChange={e=>setF({...f,client_name:e.target.value})}/><input className="input" type="date" value={f.appointment_date} onChange={e=>setF({...f,appointment_date:e.target.value})}/><input className="input" placeholder="Startzeit" value={f.start_time} onChange={e=>setF({...f,start_time:e.target.value})}/><input className="input" placeholder="Endzeit" value={f.end_time} onChange={e=>setF({...f,end_time:e.target.value})}/><textarea className="input textarea" placeholder="Text zum Termin" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/></Card><Card title={day?`Termine am ${day}`:'Tagesdetails'}>{day?rows.filter((a:any)=>String(a.appointment_date).slice(-2)===day).map((a:any)=><div className="item" key={a.id}><b>{a.start_time} {a.client_name}</b><button className="btn secondary" onClick={()=>setActive(a)}>Details</button></div>):<div className="sub">Klicke auf einen Tag.</div>}</Card></div><div className="calendar">{Array.from({length:31},(_,i)=>String(i+1).padStart(2,'0')).map(d=><button className="day" key={d} onClick={()=>setDay(d)}><b>{Number(d)}</b>{rows.filter((a:any)=>String(a.appointment_date).slice(-2)===d).map((a:any)=><div className="event" key={a.id}>{a.start_time} {a.client_name}</div>)}</button>)}</div>{active&&<Card title={`Termin: ${active.client_name}`}><div>{active.appointment_date} · {active.start_time}-{active.end_time}</div><p>{active.notes||'Kein Text hinterlegt.'}</p></Card>}</>
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

function CustomerPackages({store,cid}:any){
 const active=cpkg(store.data,cid)
 async function request(p:string){await store.create('package_requests',{customer_id:cid,package_name:p,status:'Angefragt'});await store.create('notifications',{customer_id:cid,title:'Paketanfrage',message:`${cname(store.data,cid)} hat ${p} angefragt.`,type:'package_request',actor_name:cname(store.data,cid)})}
 async function cancel(){await store.create('notifications',{customer_id:cid,title:'Kündigungswunsch',message:`${cname(store.data,cid)} möchte ${active} kündigen.`,type:'cancel_request',actor_name:cname(store.data,cid)})}
 return <><Head title="Pakete & Billing"/><Card title="Rechnungen aus dem Admintool">{store.data.invoices.filter((i:any)=>i.customer_id===cid).map((i:any)=><div className="item" key={i.id}><b>{i.invoice_number}</b><span>{eur(i.amount)} · {i.status}</span></div>)}</Card><div className="grid3">{Object.keys(packageDefs).map(p=>{const req=store.data.package_requests.find((r:any)=>r.customer_id===cid&&r.package_name===p&&r.status==='Angefragt');return <Card key={p} title={p} action={active===p?<Badge type="green">Aktiv</Badge>:req?<Badge>angefragt</Badge>:null}><div className="metricValue">{eur(pprice(p))}</div><div className="featureList">{packageDefs[p].tools.map((t:string)=><div className="featureItem" key={t}>{t} <InfoI text={featureDescriptions[t]}/></div>)}</div>{active===p?<button className="btn secondary" onClick={cancel}>Kündigen</button>:req?<button className="btn secondary" disabled>Angefragt</button>:<button className="btn" onClick={()=>request(p)}>Paket anfragen</button>}</Card>})}</div></>
}
