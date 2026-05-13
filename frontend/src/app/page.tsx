
'use client'

import { useEffect, useRef, useState } from 'react'
import { API_BASE, hasSupabase, supabase } from '@/lib/supabase'

type Role='guest'|'admin'|'customer'
const uid=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2)
const eur=(v:any)=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(v||0))
const ids={barber:'11111111-1111-1111-1111-111111111111',roof:'22222222-2222-2222-2222-222222222222',restaurant:'33333333-3333-3333-3333-333333333333'}
const dids={barber:'aaaaaaaa-1111-1111-1111-111111111111',roof:'aaaaaaaa-2222-2222-2222-222222222222',restaurant:'aaaaaaaa-3333-3333-3333-333333333333'}
const adminProfiles=[
  {name:'DominiqueMM', email:'dominique@mm.local', role:'admin', avatar:''},
  {name:'JanneMM', email:'janne@mm.local', role:'admin', avatar:''}
]
const packageDefs:any={
  Starter:{
    price:199,
    tools:['CRM','Tickets','Rechnungen','Media Center'],
    descriptions:{
      CRM:'Kundendaten, Kontaktinfos und zentrale Kundenübersicht.',
      Tickets:'Support-Tickets erstellen, beantworten und archivieren.',
      Rechnungen:'Rechnungen ansehen, erstellen und Status verfolgen.',
      'Media Center':'Dateien, PDFs, Bilder und Dokumente zentral verwalten.'
    }
  },
  Growth:{
    price:499,
    tools:['CRM','Tickets','Rechnungen','Media Center','SEO','Booking','Pipeline','Integrationen','Reports'],
    descriptions:{
      CRM:'Kundendaten, Kontaktinfos und zentrale Kundenübersicht.',
      Tickets:'Support-Tickets erstellen, beantworten und archivieren.',
      Rechnungen:'Rechnungen ansehen, erstellen und Status verfolgen.',
      'Media Center':'Dateien, PDFs, Bilder und Dokumente zentral verwalten.',
      SEO:'SEO-Werte, Sichtbarkeit und Wachstum im Kundenbereich anzeigen.',
      Booking:'Termine, Tagesansichten und Kundenbuchungen verwalten.',
      Pipeline:'Angebote, Deals und Verkaufschancen verwalten.',
      Integrationen:'Marketing-Tools wie Google Business oder Analytics hinterlegen.',
      Reports:'Monatsberichte und Auswertungen vorbereiten.'
    }
  },
  Premium:{
    price:899,
    tools:['CRM','Tickets','Rechnungen','Media Center','SEO','Booking','Pipeline','Integrationen','Reports','Automationen','Workflows','Rechte','Review Funnel'],
    descriptions:{
      CRM:'Kundendaten, Kontaktinfos und zentrale Kundenübersicht.',
      Tickets:'Support-Tickets erstellen, beantworten und archivieren.',
      Rechnungen:'Rechnungen ansehen, erstellen und Status verfolgen.',
      'Media Center':'Dateien, PDFs, Bilder und Dokumente zentral verwalten.',
      SEO:'SEO-Werte, Sichtbarkeit und Wachstum im Kundenbereich anzeigen.',
      Booking:'Termine, Tagesansichten und Kundenbuchungen verwalten.',
      Pipeline:'Angebote, Deals und Verkaufschancen verwalten.',
      Integrationen:'Marketing-Tools wie Google Business oder Analytics hinterlegen.',
      Reports:'Monatsberichte und Auswertungen vorbereiten.',
      Automationen:'Regeln und automatische Abläufe für wiederkehrende Prozesse.',
      Workflows:'Vordefinierte Abläufe starten und dokumentieren.',
      Rechte:'Toolzugriffe und Berechtigungen gezielt steuern.',
      'Review Funnel':'Bewertungsprozesse und Review-Anfragen automatisieren.'
    }
  }
}
const automationLabels=['Rechnung überfällig','Neues Ticket erstellt','SEO Rückgang erkannt','Paket angefragt','Monatsreport fällig','Review Funnel auslösen']

const seed:any={
 customers:[
  {id:ids.barber,name:'Barber Lounge Rostock',branch:'Friseur',email:'kontakt@barber.de',phone:'0381 123456',address:'Kröpeliner Str. 12',city:'Rostock',package_name:'Growth'},
  {id:ids.roof,name:'NordDach GmbH',branch:'Dachdecker',email:'kontakt@norddach.de',phone:'0385 987654',address:'Wismarsche Str. 88',city:'Schwerin',package_name:'Premium'},
  {id:ids.restaurant,name:'Alexas Inselblick',branch:'Restaurant',email:'kontakt@alexas.de',phone:'03991 123456',address:'Am See 4',city:'Waren',package_name:'Starter'}
 ],
 demo_customers:[
  {id:dids.restaurant,name:'DEMO Alexas Inselblick',branch:'Restaurant',package_name:'Starter'},
  {id:dids.barber,name:'DEMO Barber Lounge Rostock',branch:'Friseur',package_name:'Growth'},
  {id:dids.roof,name:'DEMO NordDach GmbH',branch:'Dachdecker',package_name:'Premium'}
 ],
 customer_subscriptions:[
  {id:'sub1',customer_id:ids.barber,package_name:'Growth',status:'active',price_monthly:499},
  {id:'sub2',customer_id:ids.roof,package_name:'Premium',status:'active',price_monthly:899},
  {id:'sub3',customer_id:ids.restaurant,package_name:'Starter',status:'active',price_monthly:199}
 ],
 customer_tool_access:[],
 package_requests:[{id:'pr1',customer_id:ids.restaurant,package_name:'Growth',status:'Angefragt',created_at:'2026-05-10'}],
 invoices:[
  {id:'i1',customer_id:ids.barber,invoice_number:'Re_Barber_Lounge_Rostock_1',service_type:'Growth Paketgebühr',amount:499,status:'Bezahlt',created_at:'2026-05-01'},
  {id:'i2',customer_id:ids.barber,invoice_number:'Re_Barber_Lounge_Rostock_2',service_type:'Google Business',amount:249,status:'Offen',created_at:'2026-05-10'},
  {id:'i3',customer_id:ids.roof,invoice_number:'Re_NordDach_GmbH_1',service_type:'Premium Paketgebühr',amount:899,status:'Offen',created_at:'2026-05-03'}
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
 notifications:[{id:'not1',customer_id:ids.restaurant,title:'Paketanfrage',message:'Alexas Inselblick hat Growth angefragt.',type:'package_request',created_at:'2026-05-10'}]
}

function useStore(){
 const [data,setData]=useState<any>(seed); const [toast,setToast]=useState('')
 const tables=['customers','customer_subscriptions','customer_tool_access','package_requests','invoices','tickets','ticket_messages','appointments','customer_clients','offers','automations','workflow_runs','activity_logs','customer_notes','integrations','seo_snapshots','customer_files','notifications']
 function notify(m:string){setToast(m);setTimeout(()=>setToast(''),2500)}
 async function load(){ if(!hasSupabase||!supabase)return; const r:any={}; for(const t of tables){const {data}=await supabase.from(t).select('*'); r[t]=data||[]} setData((p:any)=>({...p,...r}))}
 useEffect(()=>{load()},[])
 async function create(table:string,row:any){try{const payload={...row,created_at:row.created_at||new Date().toISOString()}; if(hasSupabase&&supabase){const {error}=await supabase.from(table).insert(payload); if(error)throw error; await load()} else setData((p:any)=>({...p,[table]:[{...payload,id:uid()},...(p[table]||[])]})); notify('Gespeichert')}catch(e:any){alert(e.message||'Fehler')}}
 async function update(table:string,id:string,row:any){try{if(hasSupabase&&supabase){const {error}=await supabase.from(table).update(row).eq('id',id); if(error)throw error; await load()} else setData((p:any)=>({...p,[table]:(p[table]||[]).map((x:any)=>x.id===id?{...x,...row}:x)})); notify('Aktualisiert')}catch(e:any){alert(e.message||'Fehler')}}
 async function remove(table:string,id:string){try{if(hasSupabase&&supabase){const {error}=await supabase.from(table).delete().eq('id',id); if(error)throw error; await load()} else setData((p:any)=>({...p,[table]:(p[table]||[]).filter((x:any)=>x.id!==id)})); notify('Gelöscht')}catch(e:any){alert(e.message||'Fehler')}}
 return {data,setData,create,update,remove,load,toast,notify}
}
function isDemoCustomer(d:any,id:string){return (d.demo_customers||[]).some((c:any)=>c.id===id)||String(cname(d,id)).startsWith('DEMO ')}
function realInvoices(d:any){return (d.invoices||[]).filter((i:any)=>!isDemoCustomer(d,i.customer_id))}
function cname(d:any,id:string){return [...d.customers,...d.demo_customers].find((c:any)=>c.id===id)?.name||'Kunde'}
function cobj(d:any,id:string){return [...d.customers,...d.demo_customers].find((c:any)=>c.id===id)}
function cpkg(d:any,id:string){return d.customer_subscriptions.find((s:any)=>s.customer_id===id)?.package_name||cobj(d,id)?.package_name||'Starter'}
function pprice(p:string){return packageDefs[p]?.price||199}
function invName(d:any,cid:string){const n=cname(d,cid).replace(/\s+/g,'_').replace(/[^\w_äöüÄÖÜß-]/g,''); return `Re_${n}_${d.invoices.filter((i:any)=>i.customer_id===cid).length+1}`}

function InfoI({text}:any){return <span className="infoi" title={text||'Weitere Informationen'}>i</span>}
function FeatureList({pkg}:any){const def=packageDefs[pkg];return <>{def.tools.map((t:string)=><div className="item featureItem" key={t}><span>{t} <InfoI text={def.descriptions?.[t]||'Feature im Paket enthalten.'}/></span><Badge type="green">inkl.</Badge></div>)}</>}


function adminShort(name:string){return name==='JanneMM'?'J':'D'}
function actorAvatar(profiles:any[], name:string, fallback=''){return profiles.find((p:any)=>p.name===name)?.avatar || fallback}
function NotificationBell({store,cid,role,activeAdmin,adminProfiles}:any){
  const [open,setOpen]=useState(false)
  const rows=store.data.notifications
    .filter((n:any)=>role==='admin'||n.customer_id===cid)
    .sort((a:any,b:any)=>String(b.created_at).localeCompare(String(a.created_at)))
  return <div className="notifWrap">
    <button className="bellBtn" onClick={()=>setOpen(!open)}>🔔<span>{rows.length}</span></button>
    {open&&<div className="notifPanel">
      <h2>Benachrichtigungen</h2>
      {rows.length===0&&<div className="sub">Keine Benachrichtigungen.</div>}
      {rows.map((n:any)=><div className="notifItem" key={n.id}>
        <Avatar name={n.actor_name||n.actor||activeAdmin} src={n.actor_avatar||actorAvatar(adminProfiles,n.actor_name||n.actor||'')}/>
        <div><b>{n.title}</b><div className="sub">{n.message}</div><div className="sub">{new Date(n.created_at).toLocaleString('de-DE')}</div></div>
      </div>)}
    </div>}
  </div>
}
function AdminToggle({activeAdmin,setActiveAdmin}:any){
  return <button className="adminSwitch" onClick={()=>setActiveAdmin(activeAdmin==='DominiqueMM'?'JanneMM':'DominiqueMM')} title="Adminprofil wechseln">
    <span className={activeAdmin==='DominiqueMM'?'on':''}>D</span><span className={activeAdmin==='JanneMM'?'on':''}>J</span>
  </button>
}
function Avatar({name,src,size=34}:any){
  return src?<img className="avatar" style={{width:size,height:size}} src={src}/>:<div className="avatar fallback" style={{width:size,height:size}}>{String(name||'?').slice(0,1)}</div>
}
function ProfileUpload({activeAdmin,setAdminAvatars,adminAvatars}:any){
  const [open,setOpen]=useState(false)
  const [busy,setBusy]=useState(false)
  const current=adminAvatars[activeAdmin]||''
  async function pick(e:any){
    const file=e.target.files?.[0]
    if(!file)return
    const preview=URL.createObjectURL(file)
    setAdminAvatars((p:any)=>({...p,[activeAdmin]:preview}))
    if(!API_BASE){alert('NEXT_PUBLIC_API_BASE fehlt. Profilbild ist nur als Preview gesetzt.'); return}
    const fd=new FormData()
    fd.append('file',file)
    fd.append('display_name',activeAdmin)
    setBusy(true)
    try{
      const res=await fetch(`${API_BASE}/api/avatars/upload`,{method:'POST',body:fd})
      const json=await res.json()
      if(!json.ok)throw new Error(json.error||'Avatar Upload fehlgeschlagen')
      setAdminAvatars((p:any)=>({...p,[activeAdmin]:json.data.avatar_url}))
    }catch(e:any){alert(e.message||'Avatar Upload fehlgeschlagen')}
    finally{setBusy(false)}
  }
  return <div className="profileWrap">
    <button className="profileBtn" onClick={()=>setOpen(!open)}><Avatar name={activeAdmin} src={current} size={38}/></button>
    {open&&<div className="profilePanel">
      <h2>{activeAdmin}</h2>
      <Avatar name={activeAdmin} src={current} size={72}/>
      <input className="input" type="file" accept="image/*" onChange={pick}/>
      <div className="sub">{busy?'Speichert...':'Profilbild wird dauerhaft im Supabase Storage Bucket avatars gespeichert, wenn Backend verbunden ist.'}</div>
    </div>}
  </div>
}

function Toast({m}:any){return m?<div className="toast green">{m}</div>:null}
function Badge({children,type='purple'}:any){return <span className={`badge ${type}`}>{children}</span>}
function Card({title,children,action}:any){return <section className="card"><div className="row between"><h2>{title}</h2>{action}</div>{children}</section>}
function Head({title,sub,action}:any){return <div className="head"><div><h1>{title}</h1>{sub&&<div className="sub">{sub}</div>}</div>{action}</div>}
function Metric({label,value,sub}:any){return <div className="metric"><div className="metricLabel">{label}</div><div className="metricValue">{value}</div>{sub&&<div className="delta">{sub}</div>}</div>}
function Search({items,value,onChange,placeholder}:any){const [q,setQ]=useState('');const s=items.find((x:any)=>x.id===value);const list=items.filter((x:any)=>(x.name+x.branch+x.email).toLowerCase().includes(q.toLowerCase()));return <div style={{position:'relative'}}><input className="input" placeholder={placeholder} value={s&&!q?s.name:q} onChange={e=>{setQ(e.target.value); if(s)onChange('')}}/>{q&&<div className="card floating">{list.map((x:any)=><button className="nav" key={x.id} onClick={()=>{onChange(x.id);setQ('')}}>{x.name}<div className="sub">{x.branch} · {x.package_name}</div></button>)}</div>}</div>}

function StorageUploader({store,cid,fileType='documents',refTable,refId,title='Datei hochladen',activeAdmin='DominiqueMM'}:any){
 const input=useRef<HTMLInputElement|null>(null); const [drag,setDrag]=useState(false); const [selected,setSelected]=useState<File|null>(null)
 async function upload(file:File|null=selected){
  if(!file)return alert('Bitte Datei auswählen')
  if(API_BASE){
   const fd=new FormData(); fd.append('file',file); fd.append('customer_id',cid); fd.append('file_type',fileType); if(refTable)fd.append('ref_table',refTable); if(refId)fd.append('ref_id',refId)
   try{const res=await fetch(`${API_BASE}/api/storage/upload`,{method:'POST',body:fd});const j=await res.json(); if(!j.ok)throw new Error(j.error||'Upload fehlgeschlagen'); await store.load(); return}catch(e:any){alert(e.message)}
  }
  await store.create('customer_files',{customer_id:cid,name:file.name,original_name:file.name,file_type:fileType,bucket:fileType,storage_path:'#',mime_type:file.type,size_bytes:file.size,version:1,ref_table:refTable,ref_id:refId,actor_name:'DominiqueMM',url:'#'})
 }
 return <Card title={title} action={<button className="btn" onClick={()=>upload()}>{selected?'Upload starten':'Datei speichern'}</button>}>
  <div className={`drop ${drag?'activeDrop':''}`} onClick={()=>input.current?.click()} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);setSelected(e.dataTransfer.files?.[0]||null)}}>
   <input ref={input} type="file" style={{display:'none'}} onChange={e=>setSelected(e.target.files?.[0]||null)}/>
   <b>{selected?selected.name:'Datei hier ablegen oder klicken'}</b>
   <div className="sub">Typ: {fileType}</div>
  </div>
  {selected&&<MiniPreview file={selected}/>}
 </Card>
}
function MiniPreview({file}:any){const url=URL.createObjectURL(file);return <div className="miniPreview"><b>{file.name}</b><div className="sub">{file.type||'Datei'} · {Math.round(file.size/1024)} KB</div>{file.type==='application/pdf'&&<iframe src={url}/>} {file.type?.startsWith('image/')&&<img src={url}/>}</div>}
function FileList({store,cid,type}:any){const rows=store.data.customer_files.filter((f:any)=>f.customer_id===cid&&(!type||f.file_type===type));return <div className="fileScroll">{rows.map((f:any)=><div className="fileMini" key={f.id} onClick={()=>f.url&&window.open(f.url,'_blank')}><div><b>{f.name}</b><div className="sub">{f.file_type} · {Math.round((f.size_bytes||0)/1024)} KB · V{f.version||1}</div><div className="sub">{f.actor_name||'System'} · {new Date(f.created_at).toLocaleDateString('de-DE')}</div></div><button className="btn secondary" onClick={(e)=>{e.stopPropagation();store.remove('customer_files',f.id)}}>Löschen</button></div>)}</div>}

export default function App(){
 const store=useStore(); const [role,setRole]=useState<Role>('guest'); const [view,setView]=useState('dashboard'); const [cid,setCid]=useState(ids.barber); const [activeAdmin,setActiveAdmin]=useState('DominiqueMM'); const [adminAvatars,setAdminAvatars]=useState<any>({DominiqueMM:'',JanneMM:''}); const activeAdminProfiles=adminProfiles.map((a:any)=>({...a,avatar:adminAvatars[a.name]||a.avatar||''}))
 useEffect(()=>{const p=new URLSearchParams(window.location.search); const c=p.get('customer'); if(c){setRole('customer');setCid(c);setView('dashboard')}},[])
 const admin=['dashboard','crm','finance','tickets','booking','pipeline','automations','workflows','activity','media','demo_customers']
 const customer=['dashboard','finance','tickets','booking','integrations','media','packages']
 const labels:any={dashboard:'Dashboard',crm:'CRM',finance:'Rechnungen',tickets:'Tickets',booking:'Booking',pipeline:'Pipeline',automations:'Automationen',workflows:'Workflows',activity:'Aktivitäten',media:'Media Center',demo_customers:'Demo Kunden',integrations:'Integrationen',packages:'Pakete & Billing'}
 if(role==='guest')return <div className="landing"><div className="landingNav"><div className="logo"><div className="mark">M</div>MMOS v18+</div><div className="row"><button className="btn" onClick={()=>setRole('admin')}>DominiqueMM Demo</button><button className="btn secondary" onClick={()=>{setRole('customer');setCid(ids.barber)}}>Kunde Demo</button></div></div><section className="hero"><h1>MMOS Storage CRM Flow Fix</h1><p>v18 mit E2E Upload, CRM-Flows, Paketfreigabe und Kundenportal-Fixes.</p></section><div className="grid3 packageGrid">{Object.keys(packageDefs).map(p=><Card key={p} title={p}><div className="metricValue">{eur(pprice(p))}</div><div className="sub">monatlich</div><FeatureList pkg={p}/></Card>)}</div></div>
 const nav=role==='admin'?admin:customer
 return <div className="app"><aside className="side"><div className="logo"><div className="mark">M</div>MMOS</div>{role==='admin'&&view!=='demo_customers'&&<Search items={store.data.customers} value={cid} onChange={setCid} placeholder="Kundensuche"/>}{nav.map(k=><button key={k} className={`nav ${view===k?'active':''}`} onClick={()=>setView(k)}>{labels[k]}</button>)}<button className="nav" onClick={()=>setRole('guest')}>Logout</button></aside><main className="main"><div className="top"><input className="search" placeholder="Suche..."/><div className="topActions"><NotificationBell store={store} cid={cid} role={role} activeAdmin={activeAdmin} adminProfiles={activeAdminProfiles}/>{role==='admin'&&<AdminToggle activeAdmin={activeAdmin} setActiveAdmin={setActiveAdmin}/>}<ProfileUpload activeAdmin={role==='admin'?activeAdmin:cname(store.data,cid)} setAdminAvatars={setAdminAvatars} adminAvatars={adminAvatars}/><Badge>{role==='admin'?activeAdmin:'Kundenportal'} · {role==='customer'?cname(store.data,cid):'Global'}</Badge></div></div><Toast m={store.toast}/>
 {view==='dashboard'&&<Dashboard store={store} cid={cid} role={role} setCid={setCid} setView={setView} activeAdmin={activeAdmin}/>}
 {view==='crm'&&role==='admin'&&<CRM store={store} cid={cid} activeAdmin={activeAdmin}/>}
 {view==='finance'&&<Finance store={store} cid={cid} role={role} activeAdmin={activeAdmin}/>}
 {view==='tickets'&&<Tickets store={store} cid={cid} role={role} activeAdmin={activeAdmin}/>}
 {view==='booking'&&<Booking store={store} cid={cid} role={role}/>}
 {view==='pipeline'&&role==='admin'&&<Pipeline store={store} cid={cid}/>}
 {view==='automations'&&role==='admin'&&<Automations store={store}/>}
 {view==='workflows'&&role==='admin'&&<Workflows store={store} cid={cid}/>}
 {view==='activity'&&role==='admin'&&<Activity store={store} cid={cid}/>}
 {view==='media'&&<MediaCenter store={store} cid={cid} activeAdmin={activeAdmin}/>}
 {view==='demo_customers'&&role==='admin'&&<DemoCustomers store={store}/>}
 {view==='integrations'&&role==='customer'&&<Integrations store={store} cid={cid}/>}
 {view==='packages'&&role==='customer'&&<CustomerPackages store={store} cid={cid}/>}
 </main></div>
}
function Dashboard({store,cid,role,setCid,setView,activeAdmin}:any){const inv=role==='admin'?store.data.invoices:store.data.invoices.filter((i:any)=>i.customer_id===cid);const open=store.data.tickets.filter((t:any)=>(role==='admin'||t.customer_id===cid)&&t.status!=='Geschlossen').length;const pending=store.data.package_requests.filter((p:any)=>p.status==='Angefragt');const seo=store.data.seo_snapshots.filter((s:any)=>s.customer_id===cid);const growth=seo.length>=2?Math.round(((seo.at(-1).organic_traffic-seo[0].organic_traffic)/seo[0].organic_traffic)*100):0;return <><Head title={role==='admin'?'Admin Dashboard':'Dashboard'} sub={role==='admin'?`Herzlich Willkommen ${activeAdmin}`:'Willkommen in deinem Kundenbereich'}/><div className="grid4"><Metric label="Umsatz" value={eur(inv.filter((i:any)=>i.status==='Bezahlt'&&!isDemoCustomer(store.data,i.customer_id)).reduce((s:number,i:any)=>s+Number(i.amount||0),0))}/><Metric label="Offene Tickets" value={open}/><Metric label="SEO Growth 7 Tage" value={`${growth>=0?'+':''}${growth}%`}/><Metric label="Paketanfragen" value={pending.length}/></div>{role==='admin'&&<Card title="Paketanfragen">{pending.map((p:any)=><div className="item" key={p.id} onClick={()=>{setCid(p.customer_id);setView('crm')}}><div><b>{cname(store.data,p.customer_id)}</b><div className="sub">möchte {p.package_name}</div></div><button className="btn secondary">CRM öffnen</button></div>)}</Card>}</>}
function CRM({store,cid,activeAdmin}:any){return <><Head title="CRM Detail" sub={cname(store.data,cid)}/><CustomerInfo store={store} cid={cid}/><PackageControl store={store} cid={cid} activeAdmin={activeAdmin} adminAvatars={adminAvatars}/><QuickCRM store={store} cid={cid}/><div className="grid2"><CRMInvoices store={store} cid={cid}/><CRMNotes store={store} cid={cid} activeAdmin={activeAdmin}/></div><div className="grid2"><Card title="Verträge"><FileList store={store} cid={cid} type="contracts"/></Card><Card title="Media"><FileList store={store} cid={cid}/></Card></div></>}
function CustomerInfo({store,cid}:any){const c=cobj(store.data,cid);const [f,setF]=useState(c);if(!c)return null;return <Card title="Kundeninfos bearbeiten" action={<button className="btn" onClick={()=>store.update('customers',cid,f)}>Speichern</button>}><div className="grid2"><input className="input" value={f.name||''} onChange={e=>setF({...f,name:e.target.value})}/><input className="input" value={f.phone||''} onChange={e=>setF({...f,phone:e.target.value})}/><input className="input" value={f.email||''} onChange={e=>setF({...f,email:e.target.value})}/><input className="input" value={f.address||''} onChange={e=>setF({...f,address:e.target.value})}/></div></Card>}
function PackageControl({store,cid,activeAdmin,adminAvatars}:any){async function apply(pkg:string){const current=store.data.customer_subscriptions.find((s:any)=>s.customer_id===cid); if(current) await store.update('customer_subscriptions',current.id,{package_name:pkg,status:'active',price_monthly:pprice(pkg),customer_id:cid}); else await store.create('customer_subscriptions',{customer_id:cid,package_name:pkg,status:'active',price_monthly:pprice(pkg)}); await store.create('notifications',{customer_id:cid,title:`${activeAdmin} hat Paket freigeschaltet`,message:`${activeAdmin} hat ${pkg} für ${cname(store.data,cid)} aktiviert.`,type:'admin_change',actor_name:activeAdmin,actor_avatar:adminAvatars?.[activeAdmin]||''}); const allTools=Object.values(packageDefs).flatMap((p:any)=>p.tools); for(const t of allTools){const row=store.data.customer_tool_access.find((x:any)=>x.customer_id===cid&&x.tool_key===t); const enabled=packageDefs[pkg].tools.includes(t); if(row) await store.update('customer_tool_access',row.id,{enabled,customer_id:cid}); else await store.create('customer_tool_access',{customer_id:cid,tool_key:t,enabled})} for(const r of store.data.package_requests.filter((x:any)=>x.customer_id===cid&&x.status==='Angefragt')) await store.update('package_requests',r.id,{status:r.package_name===pkg?'Freigegeben':'Abgelehnt',customer_id:cid})}return <Card title="Paket & Toolfreigabe">{Object.keys(packageDefs).map(p=><div className="item" key={p}><div><b>{p}</b><div className="sub">{eur(pprice(p))}</div><div className="sub">{packageDefs[p].tools.map((t:string)=><span key={t} className="featureChip">{t} <InfoI text={packageDefs[p].descriptions?.[t]}/></span>)}</div></div><button className="btn secondary" onClick={()=>apply(p)}>{cpkg(store.data,cid)===p?'Aktiv':'Freischalten'}</button></div>)}</Card>}
function QuickCRM({store,cid}:any){return <Card title="Smart Quick Actions"><button className="btn secondary" onClick={()=>store.create('invoices',{customer_id:cid,invoice_number:invName(store.data,cid),service_type:'Quick Rechnung',amount:199,status:'Offen'})}>Rechnung erstellen</button> <button className="btn secondary" onClick={()=>store.create('tickets',{customer_id:cid,title:'Neues Admin Ticket',description:'Interner Vorgang',status:'Offen',priority:'Mittel'})}>Ticket erstellen</button></Card>}
function CRMInvoices({store,cid}:any){const rows=store.data.invoices.filter((i:any)=>i.customer_id===cid).sort((a:any,b:any)=>String(b.created_at).localeCompare(String(a.created_at)));return <Card title="Aktuelle Rechnungen"><div className="scrollBox">{rows.map((i:any)=><div className="item" key={i.id}><div><b>{i.invoice_number}</b><div className="sub">{i.service_type} · {eur(i.amount)} · {i.status}</div></div><button className="btn secondary" onClick={()=>store.update('invoices',i.id,{status:i.status==='Bezahlt'?'Offen':'Bezahlt'})}>{i.status}</button></div>)}</div><div className="sub">Hochgeladene Rechnungs-PDFs:</div><FileList store={store} cid={cid} type="invoices"/></Card>}
function CRMNotes({store,cid,activeAdmin}:any){const [note,setNote]=useState('');return <Card title="Notizen" action={<button className="btn" onClick={()=>{if(note)store.create('customer_notes',{customer_id:cid,note,actor_name:'DominiqueMM'});setNote('')}}>Notiz speichern</button>}><textarea className="input textarea" value={note} onChange={e=>setNote(e.target.value)} placeholder="Neue Notiz"/>{store.data.customer_notes.filter((n:any)=>n.customer_id===cid).map((n:any)=><div className="item" key={n.id}><span>{n.note}</span><div className="sub">{n.actor_name||'Unbekannt'} · {new Date(n.created_at).toLocaleString('de-DE')}</div></div>)}</Card>}
function Finance({store,cid,role,activeAdmin}:any){const [target,setTarget]=useState(cid);const [service,setService]=useState('Paketgebühr');const [amount,setAmount]=useState(pprice(cpkg(store.data,target)));async function createInv(){await store.create('invoices',{customer_id:target,invoice_number:invName(store.data,target),service_type:service,amount,status:'Offen'}); if(role==='admin') await store.create('notifications',{customer_id:target,title:`${activeAdmin} hat Rechnung erstellt`,message:`${activeAdmin} hat ${service} für ${cname(store.data,target)} erstellt.`,type:'admin_change',actor_name:activeAdmin})}return <><Head title="Rechnungen" action={<button className="btn" onClick={createInv}>Rechnung erzeugen</button>}/><div className="grid2"><Card title="Neue Rechnung">{role==='admin'&&<Search items={store.data.customers} value={target} onChange={(id:string)=>{setTarget(id);setAmount(pprice(cpkg(store.data,id)))}} placeholder="Kunde suchen"/>}<input className="input" value={service} onChange={e=>setService(e.target.value)}/><input className="input" type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))}/><div className="sub">Nächster Name: {invName(store.data,target)}</div></Card><Card title="Rechnungsvorlage Word/Keynote"><StorageUploader store={store} cid={target} fileType="documents" refTable="invoice_templates" title="Rechnungsvorlage hochladen" activeAdmin={activeAdmin}/><div className="sub"><b>Platzhalter:</b> {'{{KUNDENNAME}}'}, {'{{ADRESSE}}'}, {'{{RECHNUNGSNUMMER}}'}, {'{{BETRAG}}'}, {'{{LEISTUNG}}'}, {'{{DATUM}}'}, {'{{FAELLIGKEIT}}'}</div><div className="sub">Hinweis: Word-Dateien können jetzt als Vorlage gespeichert werden. Die echte Word→PDF-Konvertierung benötigt weiterhin eine Server-Engine wie LibreOffice im Railway Backend; Platzhalter-Rendering ist vorbereitet.</div></Card></div><Card title="Rechnungen">{store.data.invoices.filter((i:any)=>role==='admin'||i.customer_id===cid).map((i:any)=><div className="item" key={i.id}><b>{i.invoice_number}</b><span>{cname(store.data,i.customer_id)} · {eur(i.amount)} · {i.status}</span></div>)}</Card></>}
function Tickets({store,cid,role,activeAdmin}:any){const rows=store.data.tickets.filter((t:any)=>role==='admin'||t.customer_id===cid);const open=rows.filter((t:any)=>t.status!=='Geschlossen');const closed=rows.filter((t:any)=>t.status==='Geschlossen');const [active,setActive]=useState<any>(null);const [msg,setMsg]=useState('');async function answer(){if(!active||!msg)return;await store.create('ticket_messages',{ticket_id:active.id,customer_id:active.customer_id,sender_role:role==='admin'?activeAdmin:role,message:msg});await store.update('tickets',active.id,{status:'Geschlossen',closed_at:new Date().toISOString(),customer_id:active.customer_id}); if(role==='admin') await store.create('notifications',{customer_id:active.customer_id,title:`${activeAdmin} hat Ticket beantwortet`,message:`${activeAdmin} hat das Ticket „${active.title}“ erledigt.`,type:'admin_change',actor_name:activeAdmin}); setMsg('')}return <><Head title="Tickets"/><Card title={role==='admin'?'Offene Tickets':'Meine Tickets'}>{open.map((t:any)=><div className="item" key={t.id}><div><b>{t.title}</b><div className="sub">{cname(store.data,t.customer_id)} · {t.description}</div></div><button className="btn secondary" onClick={()=>setActive(t)}>Öffnen</button></div>)}</Card>{active&&<Card title={`Ticket: ${active.title}`}><div className="sub">{active.description}</div>{store.data.ticket_messages.filter((m:any)=>m.ticket_id===active.id).map((m:any)=><div className="item" key={m.id}><b>{adminProfiles.some((a:any)=>a.name===m.sender_role)?m.sender_role:'Kunde'}</b><span>{m.message}</span></div>)}{role==='admin'&&<><textarea className="input textarea" placeholder="Feedback / Antwort. Speichern schließt Ticket." value={msg} onChange={e=>setMsg(e.target.value)}/><button className="btn" onClick={answer}>Antwort speichern & schließen</button></>}</Card>}<Card title="Ticketarchiv">{closed.map((t:any)=><div className="item" key={t.id}><b>{t.title}</b><button className="btn secondary" onClick={()=>setActive(t)}>{role==='customer'?'Erledigt ansehen':'Archiv öffnen'}</button></div>)}</Card></>}
function Booking({store,cid,role}:any){const [day,setDay]=useState('');const [active,setActive]=useState<any>(null);const [client,setClient]=useState('');const [q,setQ]=useState('');const [f,setF]=useState({client_name:'',appointment_date:new Date().toISOString().slice(0,10),start_time:'10:00',end_time:'11:00',notes:''});const rows=store.data.appointments.filter((a:any)=>a.customer_id===cid);async function addClient(){if(client)await store.create('customer_clients',{customer_id:cid,name:client})}async function create(){await store.create('appointments',{customer_id:cid,...f,client_name:f.client_name||client||cname(store.data,cid),status:'Geplant'})}const clients=store.data.customer_clients.filter((c:any)=>c.customer_id===cid&&c.name.toLowerCase().includes(q.toLowerCase()));return <><Head title="Booking" action={<button className="btn" onClick={create}>Termin anlegen</button>}/><div className="grid2"><Card title="Termin erstellen">{role==='customer'&&<><input className="input" placeholder="Neuen Kunden anlegen" value={client} onChange={e=>setClient(e.target.value)}/><button className="btn secondary" onClick={addClient}>Kunde speichern</button><input className="input" placeholder="Kunden suchen" value={q} onChange={e=>setQ(e.target.value)}/>{clients.map((c:any)=><button className="nav" key={c.id} onClick={()=>setF({...f,client_name:c.name})}>{c.name}</button>)}</>}<input className="input" placeholder="Terminname/Kunde" value={f.client_name} onChange={e=>setF({...f,client_name:e.target.value})}/><input className="input" type="date" value={f.appointment_date} onChange={e=>setF({...f,appointment_date:e.target.value})}/><input className="input" value={f.start_time} onChange={e=>setF({...f,start_time:e.target.value})}/><input className="input" value={f.end_time} onChange={e=>setF({...f,end_time:e.target.value})}/><textarea className="input textarea" placeholder="Text zum Termin" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/></Card><Card title={day?`Termine am ${day}`:'Tagesdetails'}>{day?rows.filter((a:any)=>String(a.appointment_date).slice(-2)===day).map((a:any)=><div className="item" key={a.id}><b>{a.start_time} {a.client_name}</b><button className="btn secondary" onClick={()=>setActive(a)}>Details</button></div>):<div className="sub">Klicke auf einen Tag.</div>}</Card></div><div className="calendar">{Array.from({length:31},(_,i)=>String(i+1).padStart(2,'0')).map(d=><button className="day" key={d} onClick={()=>setDay(d)}><b>{Number(d)}</b>{rows.filter((a:any)=>String(a.appointment_date).slice(-2)===d).map((a:any)=><div className="event" key={a.id}>{a.start_time} {a.client_name}</div>)}</button>)}</div>{active&&<Card title={`Termin: ${active.client_name}`}><div>{active.appointment_date} · {active.start_time}-{active.end_time}</div><p>{active.notes||'Kein Text hinterlegt.'}</p></Card>}</>}
function Pipeline({store,cid}:any){const [f,setF]=useState({customer_id:cid,title:'',package_name:'Growth',amount:499,status:'Offen',probability:50});return <><Head title="Pipeline" action={<button className="btn" onClick={()=>store.create('offers',f)}>Deal erstellen</button>}/><Card title="Neuer Deal"><input className="input" placeholder="Titel" onChange={e=>setF({...f,title:e.target.value})}/><select className="input" value={f.package_name} onChange={e=>{const p=e.target.value;setF({...f,package_name:p,amount:pprice(p)})}}>{Object.keys(packageDefs).map(p=><option key={p}>{p}</option>)}</select><input className="input" type="number" value={f.amount} onChange={e=>setF({...f,amount:Number(e.target.value)})}/></Card><Card title="Deals">{store.data.offers.map((o:any)=><div className="item" key={o.id}><b>{o.title}</b><span>{cname(store.data,o.customer_id)} · {eur(o.amount)} · {o.probability}%</span></div>)}</Card></>}
function Automations({store}:any){const [f,setF]=useState({name:'',trigger_type:'Rechnung überfällig',action_type:'Benachrichtigung erstellen',enabled:true});return <><Head title="Automationen" action={<button className="btn" onClick={()=>store.create('automations',f)}>Automation erstellen</button>}/><Card title="Neue Automation"><input className="input" placeholder="Name" onChange={e=>setF({...f,name:e.target.value})}/><select className="input" onChange={e=>setF({...f,trigger_type:e.target.value})}>{automationLabels.map(a=><option key={a}>{a}</option>)}</select></Card><Card title="Regeln">{store.data.automations.map((a:any)=><div className="item" key={a.id}><b>{a.name}</b><button className="btn secondary" onClick={()=>store.update('automations',a.id,{enabled:!a.enabled})}>{a.enabled?'Aktiv':'Inaktiv'}</button></div>)}</Card></>}
function Workflows({store,cid}:any){return <><Head title="Workflows"/><Card title="Workflow starten">{automationLabels.map(a=><button key={a} className="btn secondary" onClick={()=>store.create('workflow_runs',{customer_id:cid,workflow_name:a,status:'completed'})}>{a}</button>)}</Card><Card title="Läufe">{store.data.workflow_runs.map((w:any)=><div className="item" key={w.id}><b>{w.workflow_name}</b><Badge>{w.status}</Badge></div>)}</Card></>}
function Activity({store,cid}:any){return <><Head title="Aktivitäten"/><Card title="Timeline">{store.data.activity_logs.filter((a:any)=>!a.customer_id||a.customer_id===cid).map((a:any)=><div className="item" key={a.id}><b>{a.action}</b><span>{a.message}</span></div>)}</Card></>}
function MediaCenter({store,cid,activeAdmin}:any){const [type,setType]=useState<any>('media');return <><Head title="Media Center" sub="Dateien landen je nach Typ im passenden CRM-Bereich."/><select className="input" value={type} onChange={e=>setType(e.target.value)}><option value="invoices">Rechnung</option><option value="contracts">Vertrag</option><option value="media">Bilder / Medien</option><option value="documents">Dokument</option><option value="reports">Report</option></select><StorageUploader store={store} cid={cid} fileType={type} title="Datei hochladen" activeAdmin={activeAdmin}/><Card title="Gespeicherte Dateien"><FileList store={store} cid={cid}/></Card></>}
function DemoCustomers({store}:any){function open(c:any){window.open(`${window.location.origin}${window.location.pathname}?customer=${c.id}`,'_blank')}return <><Head title="Demo Kunden" sub="Öffnet direkt die Kundenumgebung."/><Card title="Demo Kunden">{store.data.demo_customers.map((c:any)=><div className="item" key={c.id}><div><b>{c.name}</b><div className="sub">{c.package_name}</div></div><button className="btn" onClick={()=>open(c)}>Kundenumgebung öffnen</button></div>)}</Card></>}
function Integrations({store,cid}:any){const [f,setF]=useState({customer_id:cid,name:'Google Business Profile',api_key:'',status:'Verbunden'});return <><Head title="Integrationen" action={<button className="btn" onClick={()=>store.create('integrations',f)}>Speichern</button>}/><Card title="Tool verbinden"><select className="input" value={f.name} onChange={e=>setF({...f,name:e.target.value})}><option>Google Business Profile</option><option>Google Search Console</option><option>Google Analytics</option><option>Meta Business Suite</option></select><input className="input" placeholder="API Key" onChange={e=>setF({...f,api_key:e.target.value})}/></Card><Card title="Verbindungen">{store.data.integrations.filter((i:any)=>i.customer_id===cid).map((i:any)=><div className="item" key={i.id}><b>{i.name}</b><Badge>{i.status}</Badge></div>)}</Card></>}
function CustomerPackages({store,cid}:any){const active=cpkg(store.data,cid);async function request(p:string){await store.create('package_requests',{customer_id:cid,package_name:p,status:'Angefragt'});await store.create('notifications',{customer_id:cid,title:'Paketanfrage',message:`${cname(store.data,cid)} hat ${p} angefragt.`,type:'package_request',actor_name:cname(store.data,cid)})}async function cancel(){await store.create('notifications',{customer_id:cid,title:'Kündigungswunsch',message:`${cname(store.data,cid)} möchte ${active} kündigen.`,type:'cancel_request',actor_name:cname(store.data,cid)})}return <><Head title="Pakete & Billing"/><Card title="Rechnungen aus dem Admintool">{store.data.invoices.filter((i:any)=>i.customer_id===cid).map((i:any)=><div className="item" key={i.id}><b>{i.invoice_number}</b><span>{eur(i.amount)} · {i.status}</span></div>)}</Card><div className="grid3">{Object.keys(packageDefs).map(p=>{const req=store.data.package_requests.find((r:any)=>r.customer_id===cid&&r.package_name===p&&r.status==='Angefragt');return <Card key={p} title={p} action={active===p?<Badge type="green">Aktiv</Badge>:req?<Badge>angefragt</Badge>:null}><div className="metricValue">{eur(pprice(p))}</div><FeatureList pkg={p}/>{active===p?<button className="btn secondary" onClick={cancel}>Kündigen</button>:req?<button className="btn secondary" disabled>Angefragt</button>:<button className="btn" onClick={()=>request(p)}>Paket anfragen</button>}</Card>})}</div></>}
