
'use client'

import StorageUploader from '@/components/storage/StorageUploader'

import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase, hasSupabase } from '@/lib/supabase'

type Role='guest'|'admin'|'customer'
const uid=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2)
const eur=(v:any)=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(v||0))
const ids={barber:'11111111-1111-1111-1111-111111111111',roof:'22222222-2222-2222-2222-222222222222',restaurant:'33333333-3333-3333-3333-333333333333',fitness:'44444444-4444-4444-4444-444444444444'}
const dids={barber:'aaaaaaaa-1111-1111-1111-111111111111',roof:'aaaaaaaa-2222-2222-2222-222222222222',restaurant:'aaaaaaaa-3333-3333-3333-333333333333',fitness:'aaaaaaaa-4444-4444-4444-444444444444'}
const packageDefs:any={
 Starter:{price:199,tools:['CRM','Tickets','Rechnungen','Dateien']},
 Growth:{price:499,tools:['CRM','Tickets','Rechnungen','SEO','Booking','Reports','Integrationen','KPI']},
 Premium:{price:899,tools:['CRM','Tickets','Rechnungen','SEO','Booking','Reports','Integrationen','KPI','Automationen','Workflows','Rechte']}
}
const logins:any={
 'admin@mmos.local':{password:'Admin123!',role:'admin'},
 'barber@demo.local':{password:'Demo123!',role:'customer',customer_id:ids.barber},
 'dach@demo.local':{password:'Demo123!',role:'customer',customer_id:ids.roof},
 'restaurant@demo.local':{password:'Demo123!',role:'customer',customer_id:ids.restaurant},
 'fitness@demo.local':{password:'Demo123!',role:'customer',customer_id:ids.fitness},
 'demo-barber@mmos.local':{password:'Demo123!',role:'customer',customer_id:dids.barber,demo:true},
 'demo-dach@mmos.local':{password:'Demo123!',role:'customer',customer_id:dids.roof,demo:true},
 'demo-restaurant@mmos.local':{password:'Demo123!',role:'customer',customer_id:dids.restaurant,demo:true},
 'demo-fitness@mmos.local':{password:'Demo123!',role:'customer',customer_id:dids.fitness,demo:true}
}

const seed={
 customers:[
  {id:ids.barber,name:'Barber Lounge Rostock',branch:'Friseur',email:'kontakt@barber-lounge-rostock.de',phone:'0381 123456',address:'Kröpeliner Str. 12',zip:'18055',city:'Rostock',status:'Aktiv',package_name:'Growth'},
  {id:ids.roof,name:'NordDach GmbH',branch:'Dachdecker',email:'kontakt@norddach.de',phone:'0385 987654',address:'Wismarsche Str. 88',zip:'19053',city:'Schwerin',status:'Aktiv',package_name:'Premium'},
  {id:ids.restaurant,name:'Alexas Inselblick',branch:'Restaurant',email:'kontakt@alexas-inselblick.de',phone:'03991 123456',address:'Am See 4',zip:'17192',city:'Waren',status:'Aktiv',package_name:'Growth'},
  {id:ids.fitness,name:'Baltic Fitness Club',branch:'Fitnessstudio',email:'kontakt@baltic-fitness.de',phone:'03834 567890',address:'Markt 7',zip:'17489',city:'Greifswald',status:'Aktiv',package_name:'Premium'}
 ],
 demo_customers:[
  {id:dids.barber,name:'DEMO Barber Lounge Rostock',branch:'Friseur',email:'demo-barber@mmos.local',phone:'0381 000001',address:'Demo Straße 1',zip:'18055',city:'Rostock',status:'Demo',package_name:'Growth'},
  {id:dids.roof,name:'DEMO NordDach GmbH',branch:'Dachdecker',email:'demo-dach@mmos.local',phone:'0385 000002',address:'Demo Allee 2',zip:'19053',city:'Schwerin',status:'Demo',package_name:'Premium'},
  {id:dids.restaurant,name:'DEMO Alexas Inselblick',branch:'Restaurant',email:'demo-restaurant@mmos.local',phone:'03991 000003',address:'Demo Ufer 3',zip:'17192',city:'Waren',status:'Demo',package_name:'Growth'},
  {id:dids.fitness,name:'DEMO Baltic Fitness Club',branch:'Fitnessstudio',email:'demo-fitness@mmos.local',phone:'03834 000004',address:'Demo Ring 4',zip:'17489',city:'Greifswald',status:'Demo',package_name:'Premium'}
 ],
 invoices:[
  {id:'i1',customer_id:ids.barber,invoice_number:'RE-BAR-001',service_type:'Paketgebühr Growth',amount:499,status:'Bezahlt',created_at:'2026-03-01'},
  {id:'i2',customer_id:ids.roof,invoice_number:'RE-DACH-001',service_type:'Paketgebühr Premium',amount:899,status:'Offen',created_at:'2026-04-01'}
 ],
 demo_invoices:[
  {id:'di1',customer_id:dids.barber,invoice_number:'DEMO-BAR-001',service_type:'Google Business Optimierung',amount:499,status:'Bezahlt',document_name:'Demo-Rechnung-Barber.pdf'},
  {id:'di2',customer_id:dids.roof,invoice_number:'DEMO-DACH-001',service_type:'Premium Local SEO',amount:899,status:'Offen',document_name:'Demo-Rechnung-Dach.pdf'}
 ],
 invoice_categories:[
  {id:'cat1',customer_id:ids.barber,name:'Google Business Optimierung',price:249},
  {id:'cat2',customer_id:ids.barber,name:'SEO Betreuung monatlich',price:499}
 ],
 tickets:[
  {id:'t1',customer_id:ids.barber,title:'Neue Bewertungsaktion',description:'QR Karten für Stammkunden vorbereiten.',status:'Offen',priority:'Mittel'},
  {id:'t2',customer_id:ids.roof,title:'Leadformular prüfen',description:'Neue Dachsanierungsanfragen prüfen.',status:'In Bearbeitung',priority:'Hoch'}
 ],
 ticket_messages:[
  {id:'tm1',ticket_id:'t1',customer_id:ids.barber,sender_role:'customer',message:'Wir möchten mehr Google Bewertungen sammeln.',created_at:'2026-05-01'}
 ],
 seo_snapshots:[
  {id:'s1',customer_id:ids.barber,organic_traffic:3200,impressions:42000,clicks:1450,ctr:3.45,top10_keywords:18,visibility_score:72,created_at:'2026-05-01'},
  {id:'s2',customer_id:ids.roof,organic_traffic:5100,impressions:66000,clicks:2300,ctr:3.48,top10_keywords:24,visibility_score:81,created_at:'2026-05-01'},
  {id:'ds1',customer_id:dids.barber,organic_traffic:2800,impressions:36000,clicks:1200,ctr:3.3,top10_keywords:15,visibility_score:69,created_at:'2026-05-01'}
 ],
 appointments:[
  {id:'a1',customer_id:ids.barber,client_name:'Strategie Call',appointment_date:'2026-05-15',start_time:'10:00',end_time:'11:00',status:'Geplant'}
 ],
 demo_appointments:[
  {id:'da1',customer_id:dids.barber,client_name:'Demo Onboarding',appointment_date:'2026-05-15',start_time:'10:00',end_time:'11:00',status:'Geplant'}
 ],
 offers:[{id:'o1',customer_id:ids.barber,title:'Growth Paket',package_name:'Growth',amount:499,status:'Angebot',probability:70}],
 integrations:[{id:'int1',customer_id:ids.barber,name:'Google Business Profile',api_key:'demo-key',status:'Verbunden',seo_enabled:true}],
 package_requests:[{id:'pr1',customer_id:ids.restaurant,package_name:'Premium',status:'Angefragt',created_at:'2026-05-10'}],
 customer_tool_access:[{id:'ta1',customer_id:ids.barber,tool_key:'SEO',enabled:true}],
 contracts:[{id:'co1',customer_id:ids.barber,title:'Growth Vertrag',status:'Aktiv',package_name:'Growth',monthly_amount:499}],
 demo_contracts:[{id:'dco1',customer_id:dids.barber,title:'Demo Growth Vertrag',status:'Aktiv',package_name:'Growth',monthly_amount:499,document_name:'Demo-Vertrag-Barber.pdf'}],
 customer_files:[{id:'f1',customer_id:ids.barber,name:'Growth-Vertrag.pdf',file_type:'contract',url:'#',version:1}],
 demo_files:[{id:'df1',customer_id:dids.barber,name:'Demo-Rechnung-Barber.pdf',file_type:'invoice',url:'#',version:1}],
 customer_notes:[], demo_notes:[{id:'dn1',customer_id:dids.barber,note:'Kunde möchte mehr Bewertungen über QR-Karten sammeln.',created_at:'2026-05-01'}],
 notifications:[], activity_logs:[], automations:[], workflow_runs:[],
 customer_subscriptions:[
  {id:'sub1',customer_id:ids.barber,package_name:'Growth',status:'active',price_monthly:499},
  {id:'sub2',customer_id:ids.roof,package_name:'Premium',status:'active',price_monthly:899}
 ]
}

function useStore(){
 const [data,setData]=useState<any>(seed); const [toast,setToast]=useState('')
 const tables=['customers','invoices','invoice_categories','tickets','ticket_messages','seo_snapshots','appointments','offers','integrations','customer_tool_access','package_requests','contracts','customer_files','customer_notes','notifications','activity_logs','automations','workflow_runs','customer_subscriptions']
 function notify(m:string){setToast(m);setTimeout(()=>setToast(''),2200)}
 async function load(){if(!hasSupabase||!supabase)return;const r:any={};for(const t of tables){const {data}=await supabase.from(t).select('*');r[t]=data||[]}setData((p:any)=>({...p,...r}))}
 async function create(table:string,row:any){try{const payload={...row,created_at:row.created_at||new Date().toISOString()};if(hasSupabase&&supabase&&!table.startsWith('demo_')){const {error}=await supabase.from(table).insert(payload);if(error)throw error;await load()}else setData((p:any)=>({...p,[table]:[{...payload,id:uid()},...(p[table]||[])]}));notify('Gespeichert')}catch(e:any){alert(e.message||'Fehler')}}
 async function update(table:string,id:string,row:any){try{if(hasSupabase&&supabase&&!table.startsWith('demo_')){const {error}=await supabase.from(table).update(row).eq('id',id);if(error)throw error;await load()}else setData((p:any)=>({...p,[table]:(p[table]||[]).map((x:any)=>x.id===id?{...x,...row}:x)}));notify('Aktualisiert')}catch(e:any){alert(e.message||'Fehler')}}
 return {data,setData,create,update,load,toast,notify}
}
function cname(d:any,id:string){return [...d.customers,...d.demo_customers].find((c:any)=>c.id===id)?.name||'Kunde'}
function customerObj(d:any,id:string){return [...d.customers,...d.demo_customers].find((c:any)=>c.id===id)}
function cpkg(d:any,id:string){return d.customer_subscriptions.find((s:any)=>s.customer_id===id)?.package_name||customerObj(d,id)?.package_name||'Starter'}
function pprice(p:string){return packageDefs[p]?.price||199}
function Toast({m}:any){return m?<div className="toast green">{m}</div>:null}
function Badge({children,type='purple'}:any){return <span className={`badge ${type}`}>{children}</span>}
function Card({title,children,action}:any){return <section className="card"><div className="row between"><h2>{title}</h2>{action}</div>{children}</section>}
function Head({title,sub,action}:any){return <div className="head"><div><h1>{title}</h1>{sub&&<div className="sub">{sub}</div>}</div>{action}</div>}
function Metric({label,value}:any){return <div className="metric"><div className="metricLabel">{label}</div><div className="metricValue">{value}</div></div>}
function Search({items,value,onChange,placeholder}:any){const [q,setQ]=useState('');const s=items.find((x:any)=>x.id===value);const list=items.filter((x:any)=>(x.name+x.branch+x.email).toLowerCase().includes(q.toLowerCase()));return <div style={{position:'relative'}}><input className="input" placeholder={placeholder} value={s&&!q?s.name:q} onChange={e=>{setQ(e.target.value);if(s)onChange('')}}/>{q&&<div className="card" style={{position:'absolute',zIndex:50,width:'100%',padding:6,maxHeight:220,overflow:'auto'}}>{list.map((x:any)=><button className="nav" key={x.id} onClick={()=>{onChange(x.id);setQ('')}}>{x.name}<div className="sub">{x.branch} · {x.package_name}</div></button>)}</div>}</div>}
function SEOChart({rows}:any){return <div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={rows}><CartesianGrid stroke="#1e293b"/><XAxis dataKey="label" stroke="#8b9bb3"/><YAxis stroke="#8b9bb3"/><Tooltip contentStyle={{background:'#0d1420',border:'1px solid #243044',color:'#fff'}}/><Legend/><Area dataKey="traffic" name="Traffic" stroke="#38bdf8" fill="#38bdf844"/><Area dataKey="impressions" name="Impressionen" stroke="#7c3aed" fill="#7c3aed33"/><Area dataKey="keywords" name="Top10 Keywords" stroke="#22c55e" fill="#22c55e22"/></AreaChart></ResponsiveContainer></div>}

export default function App(){
 const store=useStore(); const [role,setRole]=useState<Role>('guest'); const [view,setView]=useState('dashboard'); const [cid,setCid]=useState(ids.barber); const [loginOpen,setLoginOpen]=useState(false); const [registerOpen,setRegisterOpen]=useState(false); const [email,setEmail]=useState(''); const [pw,setPw]=useState('')
 function login(){const u=logins[email];if(!u||u.password!==pw)return alert('Login ungültig');setRole(u.role);if(u.customer_id)setCid(u.customer_id);setLoginOpen(false);setView('dashboard')}
 const admin=['dashboard','crm','demo_customers','finance','tickets','seo','booking','pipeline','automations','packages','workflows','activity']; const cust=['dashboard','finance','tickets','seo','booking','integrations','packages','files']
 const labels:any={dashboard:'Dashboard',crm:'CRM',demo_customers:'Demo Kunden',finance:'Rechnungen',tickets:'Tickets',seo:'SEO',booking:'Booking',pipeline:'Pipeline',automations:'Automationen',packages:'Pakete & Billing',workflows:'Workflows',activity:'Aktivitäten',integrations:'Integrationen',files:'Dateien/PDF'}
 if(role==='guest')return <div className="landing"><div className="landingNav"><div className="logo"><div className="mark">M</div>MMOS v18</div><div className="row"><button className="btn secondary" onClick={()=>setLoginOpen(true)}>Login</button><button className="btn" onClick={()=>setRegisterOpen(true)}>Registrieren</button></div></div><section className="hero"><h1>Mecklenburg Marketing OS</h1><p>CRM, Google Business, SEO, Tickets, Billing und Kundenportal für lokale Unternehmen.</p></section><div className="grid3">{Object.keys(packageDefs).map(p=><Card key={p} title={p}><div className="metricValue">{pprice(p)}€</div><div className="sub">monatlich</div>{packageDefs[p].tools.map((t:string)=><div className="item" key={t}><span>{t}</span><Badge type="green">inkl.</Badge></div>)}</Card>)}</div>{loginOpen&&<div className="modal"><div className="card modalCard"><Head title="Login" sub="Admin: admin@mmos.local / Admin123!"/><input className="input" placeholder="E-Mail" value={email} onChange={e=>setEmail(e.target.value)}/><input className="input" placeholder="Passwort" type="password" value={pw} onChange={e=>setPw(e.target.value)}/><button className="btn" onClick={login}>Einloggen</button><button className="btn secondary" onClick={()=>setLoginOpen(false)}>Schließen</button><div className="sub">Demo-Kunden: barber@demo.local, dach@demo.local, restaurant@demo.local, fitness@demo.local · Passwort Demo123!</div></div></div>}{registerOpen&&<div className="modal"><div className="card modalCard"><Head title="Registrieren" sub="Registrierung ist vorbereitet, aber noch nicht aktiv."/><button className="btn secondary" onClick={()=>setRegisterOpen(false)}>Schließen</button></div></div>}</div>
 const nav=role==='admin'?admin:cust
 return <div className="app"><aside className="side"><div className="logo"><div className="mark">M</div>MMOS</div>{nav.map(k=><button key={k} className={`nav ${view===k?'active':''}`} onClick={()=>setView(k)}>{labels[k]}</button>)}<button className="nav" onClick={()=>setRole('guest')}>Logout</button></aside><main className="main"><div className="top"><input className="search" placeholder="Suche..."/><Badge>{role==='admin'?'Admintool':'Kundenportal'}</Badge></div><Toast m={store.toast}/>
 {view==='dashboard'&&<Dashboard store={store} cid={cid} role={role}/>}
 {view==='crm'&&role==='admin'&&<CRM store={store}/>}
 {view==='demo_customers'&&role==='admin'&&<DemoCustomers store={store}/>}
 {view==='finance'&&<Finance store={store} cid={cid} role={role}/>}
 {view==='tickets'&&<Tickets store={store} cid={cid} role={role}/>}
 {view==='seo'&&<SEO store={store} cid={cid}/>}
 {view==='booking'&&<Booking store={store} cid={cid} role={role}/>}
 {view==='pipeline'&&role==='admin'&&<Pipeline store={store}/>}
 {view==='automations'&&role==='admin'&&<Automations store={store}/>}
 {view==='packages'&&<Packages store={store} cid={cid} role={role}/>}
 {view==='integrations'&&role==='customer'&&<Integrations store={store} cid={cid}/>}
 {view==='files'&&role==='customer'&&<Files store={store} cid={cid}/>}
 {view==='workflows'&&role==='admin'&&<Workflows store={store}/>}
 {view==='activity'&&role==='admin'&&<Activity store={store}/>}
 </main></div>
}
function Dashboard({store,cid,role}:any){const inv=role==='admin'?store.data.invoices:store.data.invoices.filter((x:any)=>x.customer_id===cid);const pending=store.data.package_requests.filter((x:any)=>x.status==='Angefragt');const seo=store.data.seo_snapshots.filter((x:any)=>x.customer_id===cid);return <><Head title={role==='admin'?'Admintool Dashboard':'Dashboard'} sub={role==='admin'?'Gesamtübersicht ohne Kundenname im Header.':'Deine Kundendaten.'}/><div className="grid4"><Metric label="Umsatz" value={eur(inv.reduce((s:number,i:any)=>s+Number(i.amount||0),0))}/><Metric label="Offene Paketanfragen" value={pending.length}/><Metric label="Tickets" value={store.data.tickets.filter((t:any)=>role==='admin'||t.customer_id===cid).length}/><Metric label="Kunden" value={store.data.customers.length}/></div>{role==='admin'&&<Card title="Paketanfragen">{pending.map((p:any)=><div className="item" key={p.id}><div><b>{cname(store.data,p.customer_id)}</b><div className="sub">möchte {p.package_name}</div></div><Badge>{p.status}</Badge></div>)}</Card>}<Card title="SEO Verlauf"><SEOChart rows={seo.map((s:any)=>({label:new Date(s.created_at).toLocaleDateString('de-DE',{month:'short'}),traffic:s.organic_traffic,impressions:s.impressions,keywords:s.top10_keywords}))}/></Card></>}
function CRM({store}:any){const [cid,setCid]=useState(ids.barber);const [f,setF]=useState({name:'',branch:'',email:'',phone:'',address:'',zip:'',city:'',status:'Lead',package_name:'Starter'});return <><Head title="CRM" sub="Alle kundenspezifischen Daten liegen hier." action={<button className="btn" onClick={()=>f.name&&store.create('customers',f)}>Kunde speichern</button>}/><div className="grid2"><Card title="Neuer Kunde"><input className="input" placeholder="Name" onChange={e=>setF({...f,name:e.target.value})}/><input className="input" placeholder="Branche" onChange={e=>setF({...f,branch:e.target.value})}/><input className="input" placeholder="Telefonnummer" onChange={e=>setF({...f,phone:e.target.value})}/><input className="input" placeholder="Adresse" onChange={e=>setF({...f,address:e.target.value})}/><input className="input" placeholder="PLZ" onChange={e=>setF({...f,zip:e.target.value})}/><input className="input" placeholder="Ort" onChange={e=>setF({...f,city:e.target.value})}/><input className="input" placeholder="E-Mail" onChange={e=>setF({...f,email:e.target.value})}/></Card><Card title="Kundensuche"><Search items={store.data.customers} value={cid} onChange={setCid} placeholder="Kunde suchen"/>{store.data.customers.map((c:any)=><div className="item" key={c.id}><b>{c.name}</b><button className="btn secondary" onClick={()=>setCid(c.id)}>Öffnen</button></div>)}</Card></div><CustomerDetail store={store} cid={cid} demo={false}/></>}
function DemoCustomers({store}:any){function openCustomer(c:any){const url=`/?demoCustomer=${c.id}`; window.open(url,'_blank')}return <><Head title="Demo Kunden" sub="Öffnen startet direkt die Kundenumgebung in einem neuen Tab."/><Card title="Demo Accounts">{store.data.demo_customers.map((c:any)=><div className="item" key={c.id}><div><b>{c.name}</b><div className="sub">{c.email} · Passwort Demo123!</div></div><button className="btn" onClick={()=>openCustomer(c)}>Kundenumgebung öffnen</button></div>)}</Card></>}
function CustomerDetail({store,cid,demo}:any){const c=(demo?store.data.demo_customers:store.data.customers).find((x:any)=>x.id===cid);if(!c)return null;const [edit,setEdit]=useState({...c});const pkg=cpkg(store.data,cid);async function saveCustomer(){await store.update(demo?'demo_customers':'customers',cid,edit)}async function setPackage(p:string){await store.update(demo?'demo_customers':'customers',cid,{...edit,package_name:p});const sub=store.data.customer_subscriptions.find((s:any)=>s.customer_id===cid);if(sub) await store.update('customer_subscriptions',sub.id,{package_name:p,price_monthly:pprice(p),customer_id:cid});else await store.create('customer_subscriptions',{customer_id:cid,package_name:p,status:'active',price_monthly:pprice(p)});for(const t of packageDefs[p].tools)await store.create('customer_tool_access',{customer_id:cid,tool_key:t,enabled:true})}return <div style={{marginTop:14}}><Head title={c.name} sub="CRM Detailansicht" action={<button className="btn" onClick={saveCustomer}>Kundeninfos speichern</button>}/><div className="grid2"><Card title="Kundeninfos bearbeiten"><input className="input" value={edit.name||''} onChange={e=>setEdit({...edit,name:e.target.value})}/><input className="input" value={edit.phone||''} placeholder="Telefon" onChange={e=>setEdit({...edit,phone:e.target.value})}/><input className="input" value={edit.address||''} placeholder="Adresse" onChange={e=>setEdit({...edit,address:e.target.value})}/><input className="input" value={edit.email||''} placeholder="E-Mail" onChange={e=>setEdit({...edit,email:e.target.value})}/></Card><Card title="Paket anpassen/freischalten">{Object.keys(packageDefs).map(p=><div className="item" key={p}><b>{p}</b><button className="btn secondary" onClick={()=>setPackage(p)}>{pkg===p?'Aktiv':'Freischalten'}</button></div>)}</Card></div><Related store={store} cid={cid} demo={demo}/></div>}
function Related({store,cid,demo}:any){const inv=(demo?store.data.demo_invoices:store.data.invoices).filter((x:any)=>x.customer_id===cid);const con=(demo?store.data.demo_contracts:store.data.contracts).filter((x:any)=>x.customer_id===cid);const notes=(demo?store.data.demo_notes:store.data.customer_notes).filter((x:any)=>x.customer_id===cid);const [note,setNote]=useState('');return <div className="grid2"><StorageUploader customerId={cid} fileType="invoices" title="Rechnung / PDF hochladen"/><Card title="Rechnungen">{inv.map((i:any)=><div className="item" key={i.id}><div><b>{i.invoice_number}</b><div className="sub">{i.service_type} · {eur(i.amount)}</div></div><button className="btn secondary">PDF hochladen</button></div>)}</Card><StorageUploader customerId={cid} fileType="contracts" title="Vertrag hochladen"/><Card title="Verträge">{con.map((co:any)=><div className="item" key={co.id}><b>{co.title}</b><Badge>{co.status}</Badge></div>)}</Card><Card title="Notizen" action={<button className="btn" onClick={()=>{if(note)store.create(demo?'demo_notes':'customer_notes',{customer_id:cid,note});setNote('')}}>Notiz speichern</button>}><textarea className="input textarea" value={note} onChange={e=>setNote(e.target.value)}/>{notes.map((n:any)=><div className="item" key={n.id}>{n.note}</div>)}</Card></div>}
function Finance({store,cid,role}:any){const [target,setTarget]=useState(cid);const pkg=cpkg(store.data,target);const [f,setF]=useState({customer_id:target,service_type:`Paketgebühr ${pkg}`,amount:pprice(pkg),status:'Offen'});function selectCustomer(id:string){const p=cpkg(store.data,id);setTarget(id);setF({customer_id:id,service_type:`Paketgebühr ${p}`,amount:pprice(p),status:'Offen'})}return <><Head title="Rechnungen" action={<button className="btn" onClick={()=>store.create('invoices',{...f,invoice_number:'RE-'+Date.now()})}>Rechnung erzeugen</button>}/><div className="grid2"><Card title="Neue Rechnung">{role==='admin'&&<Search items={store.data.customers} value={target} onChange={selectCustomer} placeholder="Kunde suchen"/>}<div className="sub">Erkanntes Paket: {pkg} → Paketgebühr {eur(pprice(pkg))}</div><input className="input" value={f.service_type} onChange={e=>setF({...f,service_type:e.target.value})}/><input className="input" type="number" value={f.amount} onChange={e=>setF({...f,amount:Number(e.target.value)})}/></Card><Card title="Rechnungen">{store.data.invoices.filter((i:any)=>role==='admin'||i.customer_id===cid).map((i:any)=><div className="item" key={i.id}><div><b>{i.invoice_number}</b><div className="sub">{cname(store.data,i.customer_id)} · {i.service_type} · {eur(i.amount)}</div></div><button className="btn secondary" onClick={()=>store.update('invoices',i.id,{status:i.status==='Bezahlt'?'Offen':'Bezahlt'})}>{i.status}</button></div>)}</Card></div></>}
function Tickets({store,cid,role}:any){const rows=store.data.tickets.filter((t:any)=>role==='admin'||t.customer_id===cid);const [open,setOpen]=useState<any>(null);const [msg,setMsg]=useState('');async function add(){if(!open||!msg)return;await store.create('ticket_messages',{ticket_id:open.id,customer_id:open.customer_id,sender_role:role,message:msg});setMsg('')}return <><Head title="Tickets"/><Card title="Tickets">{rows.map((t:any)=><div className="item" key={t.id}><div><b>{t.title}</b><div className="sub">{cname(store.data,t.customer_id)} · {t.description}</div></div><button className="btn secondary" onClick={()=>setOpen(t)}>Öffnen</button></div>)}</Card>{open&&<Card title={`Ticket: ${open.title}`}><div className="sub">{open.description}</div>{store.data.ticket_messages.filter((m:any)=>m.ticket_id===open.id).map((m:any)=><div className="item" key={m.id}><b>{m.sender_role==='admin'?'Admin':'Kunde'}</b><span>{m.message}</span></div>)}<textarea className="input textarea" placeholder="Antwort / Feedback" value={msg} onChange={e=>setMsg(e.target.value)}/><button className="btn" onClick={add}>Antwort speichern</button></Card>}</>}
function Booking({store,cid,role}:any){const [target,setTarget]=useState(cid);const [f,setF]=useState({customer_id:cid,client_name:'',appointment_date:new Date().toISOString().slice(0,10),start_time:'10:00',end_time:'11:00',status:'Geplant'});const days=Array.from({length:31},(_,i)=>String(i+1).padStart(2,'0'));const rows=store.data.appointments.filter((a:any)=>role==='admin'||a.customer_id===cid);return <><Head title="Booking" action={<button className="btn" onClick={()=>store.create('appointments',{...f,customer_id:role==='admin'?target:cid})}>Termin anlegen</button>}/><Card title="Neuer Termin">{role==='admin'?<Search items={store.data.customers} value={target} onChange={(id:string)=>{setTarget(id);setF({...f,customer_id:id})}} placeholder="Kunde suchen"/>:<input className="input" value={cname(store.data,cid)} readOnly/>}<input className="input" placeholder="Termin Titel" value={f.client_name} onChange={e=>setF({...f,client_name:e.target.value})}/><input className="input" type="date" value={f.appointment_date} onChange={e=>setF({...f,appointment_date:e.target.value})}/><input className="input" placeholder="Startzeit" value={f.start_time} onChange={e=>setF({...f,start_time:e.target.value})}/><input className="input" placeholder="Endzeit" value={f.end_time} onChange={e=>setF({...f,end_time:e.target.value})}/></Card><div className="calendar">{days.map(d=><button className="day" key={d}><b>{Number(d)}</b>{rows.filter((a:any)=>String(a.appointment_date).slice(-2)===d).map((a:any)=><div className="event" key={a.id}>{a.start_time} {a.client_name}</div>)}</button>)}</div></>}
function SEO({store,cid}:any){const rows=store.data.seo_snapshots.filter((s:any)=>s.customer_id===cid);return <><Head title="SEO"/><div className="grid4"><Metric label="Traffic" value={rows.at(-1)?.organic_traffic||0}/><Metric label="Impressionen" value={rows.at(-1)?.impressions||0}/><Metric label="Klicks" value={rows.at(-1)?.clicks||0}/><Metric label="Top10 Keywords" value={rows.at(-1)?.top10_keywords||0}/></div><Card title="SEO Entwicklung"><SEOChart rows={rows.map((s:any)=>({label:new Date(s.created_at).toLocaleDateString('de-DE',{month:'short'}),traffic:s.organic_traffic,impressions:s.impressions,keywords:s.top10_keywords}))}/></Card></>}
function Pipeline({store}:any){return <Head title="Pipeline" sub="Pipeline bleibt im Admin vorhanden."/>}
function Automations({store}:any){return <Head title="Automationen" sub="Deutsche Automationslabels vorhanden."/>}
function Packages({store,cid,role}:any){const [target,setTarget]=useState(cid);async function apply(p:string){const sub=store.data.customer_subscriptions.find((s:any)=>s.customer_id===target);if(sub)await store.update('customer_subscriptions',sub.id,{package_name:p,price_monthly:pprice(p),customer_id:target});else await store.create('customer_subscriptions',{customer_id:target,package_name:p,status:'active',price_monthly:pprice(p)});for(const t of packageDefs[p].tools)await store.create('customer_tool_access',{customer_id:target,tool_key:t,enabled:true}); const req=store.data.package_requests.find((r:any)=>r.customer_id===target&&r.package_name===p&&r.status==='Angefragt'); if(req) await store.update('package_requests',req.id,{status:'Freigegeben',customer_id:target})}const active=cpkg(store.data,role==='admin'?target:cid);return <><Head title="Pakete & Billing"/>{role==='admin'&&<Card title="Kundenpaket freischalten"><Search items={store.data.customers} value={target} onChange={setTarget} placeholder="Kunde suchen"/></Card>}<div className="grid3">{Object.keys(packageDefs).map(p=><Card title={p} key={p} action={active===p?<Badge type="green">Aktiv</Badge>:null}><div className="metricValue">{eur(pprice(p))}</div>{role==='admin'?<button className="btn" onClick={()=>apply(p)}>Paket freischalten</button>:active!==p&&<button className="btn" onClick={()=>store.create('package_requests',{customer_id:cid,package_name:p,status:'Angefragt'})}>Paket anfragen</button>}</Card>)}</div></>}
function Integrations({store,cid}:any){return <Head title="Integrationen"/>}
function Files({store,cid}:any){return <><Head title="Media Center / Dateien" sub="Echte Storage Uploads mit Preview und signierten URLs"/><StorageUploader customerId={cid} fileType="documents" title="Dokument hochladen"/></>}
function Workflows({store}:any){return <Head title="Workflows"/>}
function Activity({store}:any){return <Head title="Aktivitäten"/>}
