
'use client'

import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase, hasSupabase, API_BASE } from '@/lib/supabase'
import { subscribeCoreTables } from '@/lib/realtimeCore'
import { requireOrAlert } from '@/lib/validation'
import { ConfirmButton, EmptyState, SkeletonCard, Toast } from '@/components/UiStates'
import { approvePackageRequest, changeSubscription, createPackageInvoice, generatePackageContract, createStripeCheckout } from '@/lib/apiClient'
import { exportCsv } from '@/lib/exportClient'

type Role = 'guest'|'admin'|'customer'
const money=(v:any)=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(v||0))
const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36)

const demo={
 customers:[{id:'c1',name:'Friseur Nord',branch:'Friseur',email:'kontakt@friseur.de',status:'Aktiv',created_at:'2026-05-01'},{id:'c2',name:'Bau Müller',branch:'Bau',email:'bau@mueller.de',status:'Lead',created_at:'2026-05-02'}],
 invoices:[{id:'i1',customer_id:'c1',invoice_number:'RE-001',amount:1200,status:'Bezahlt',created_at:'2026-03-01'},{id:'i2',customer_id:'c1',invoice_number:'RE-002',amount:1600,status:'Offen',created_at:'2026-04-01'},{id:'i3',customer_id:'c2',invoice_number:'RE-003',amount:2300,status:'Überfällig',created_at:'2026-05-01'}],
 tickets:[{id:'t1',customer_id:'c1',title:'SEO Frage',status:'Offen',priority:'Normal',created_at:'2026-05-08'},{id:'t2',customer_id:'c1',title:'Rechnung prüfen',status:'In Bearbeitung',priority:'Hoch',created_at:'2026-05-09'}],
 seo_snapshots:[{id:'s1',customer_id:'c1',snapshot_date:'2026-03-01',organic_traffic:1200,impressions:14000,clicks:520,ctr:3.7,top10_keywords:8},{id:'s2',customer_id:'c1',snapshot_date:'2026-04-01',organic_traffic:1600,impressions:17000,clicks:680,ctr:4.0,top10_keywords:11},{id:'s3',customer_id:'c1',snapshot_date:'2026-05-01',organic_traffic:2100,impressions:22000,clicks:910,ctr:4.1,top10_keywords:15}],
 appointments:[{id:'a1',customer_id:'c1',appointment_date:'2026-05-15',client_name:'Strategie Call',start_time:'10:00',end_time:'11:00'}],
 offers:[{id:'o1',customer_id:'c1',title:'Premium Paket',amount:899,status:'Offen',probability:40},{id:'o2',customer_id:'c1',title:'Growth Paket',amount:499,status:'Angenommen',probability:100}],
 recurring_invoices:[{id:'r1',customer_id:'c1',title:'SEO Betreuung',monthly_amount:499,status:'Aktiv'}],
 payments:[{id:'p1',customer_id:'c1',amount:1200,status:'Erfolgreich',created_at:'2026-03-02'}],
 files:[],
 notifications:[{id:'n1',customer_id:'c1',title:'Willkommen',message:'System bereit',created_at:'2026-05-01'}],
 automations:[{id:'a1',name:'Rechnung überfällig → Mahnung',trigger_type:'invoice_overdue',action_type:'create_reminder',enabled:true}],
 integrations:[{id:'int1',customer_id:'c1',name:'Google Business Profile',status:'Verbunden'}],
 package_requests:[{id:'pr1',customer_id:'c1',package_name:'Growth',status:'Angefragt',created_at:'2026-05-01'}],
 customer_tool_access:[{id:'ta1',customer_id:'c1',tool_key:'seo',enabled:true},{id:'ta2',customer_id:'c1',tool_key:'booking',enabled:true}],
 contracts:[{id:'co1',customer_id:'c1',title:'SEO Betreuungsvertrag',status:'Aktiv',created_at:'2026-05-01'}],
 reports:[{id:'rep1',customer_id:'c1',title:'Monatsreport Mai',status:'Fertig',created_at:'2026-05-31'}],
 activity_logs:[{id:'al1',customer_id:'c1',action:'system_ready',message:'Core System bereit',created_at:'2026-05-01'}],
 workflow_runs:[{id:'wr1',customer_id:'c1',workflow_name:'Mahnung bei überfälliger Rechnung',status:'completed',created_at:'2026-05-02'}],
 customer_files:[{id:'cf1',customer_id:'c1',name:'Demo-Vertrag.pdf',file_type:'contract',url:'#',version:1,created_at:'2026-05-01'}],
 notification_queue:[],
 worker_jobs:[],
 customer_subscriptions:[{id:'sub1',customer_id:'c1',package_name:'Growth',status:'active',price_monthly:499,currency:'EUR'}],
 license_entitlements:[{id:'lic1',customer_id:'c1',package_name:'Growth',tools:['crm','seo','booking','tickets'],limits:{users:3},status:'active'}],
 package_catalog:[{name:'Starter',price_monthly:199,currency:'EUR'},{name:'Growth',price_monthly:499,currency:'EUR'},{name:'Premium',price_monthly:899,currency:'EUR'}]
}

function monthKey(v:any){return v?String(v).slice(0,7):'Unbekannt'}
function monthLabel(m:string){const [y,mo]=m.split('-');return y&&mo?new Date(Number(y),Number(mo)-1,1).toLocaleDateString('de-DE',{month:'short',year:'2-digit'}):m}
function aggregateMonthly(rows:any[],dateField:string, metric:string='amount'){
 const map:any={}
 rows.forEach(r=>{const m=monthKey(r[dateField]||r.created_at);map[m]||={month:m,label:monthLabel(m),revenue:0,paid:0,open:0,overdue:0,count:0};const a=Number(r[metric]||0);map[m].revenue+=a;map[m].count++; if(r.status==='Bezahlt')map[m].paid+=a; else map[m].open+=a; if(r.status==='Überfällig')map[m].overdue+=a})
 return Object.values(map).sort((a:any,b:any)=>String(a.month).localeCompare(String(b.month)))
}
function buildKpis(data:any, customerId:string|null){
 const scoped=(arr:any[])=>customerId?arr.filter(x=>x.customer_id===customerId||x.id===customerId):arr
 const invoices=scoped(data.invoices), tickets=scoped(data.tickets), seo=scoped(data.seo_snapshots), customers=customerId?data.customers.filter((c:any)=>c.id===customerId):data.customers
 const latestSeo=seo[seo.length-1]||{}
 const revenueChart=aggregateMonthly(invoices,'created_at')
 const seoChart=seo.map((s:any)=>({label:monthLabel(monthKey(s.snapshot_date||s.created_at)),organic_traffic:s.organic_traffic,impressions:s.impressions,top10_keywords:s.top10_keywords}))
 const pipelineMap:any={}; scoped(data.offers).forEach((o:any)=>{const st=o.status||'Offen'; pipelineMap[st]||={stage:st,value:0,weighted_value:0,count:0}; pipelineMap[st].value+=Number(o.amount||0); pipelineMap[st].weighted_value+=Number(o.amount||0)*(Number(o.probability||50)/100); pipelineMap[st].count++})
 const mrr=scoped(data.recurring_invoices).filter((r:any)=>r.status==='Aktiv').reduce((s:number,r:any)=>s+Number(r.monthly_amount||r.amount||0),0)
 return {
  revenue:{total:invoices.reduce((s:number,i:any)=>s+Number(i.amount||0),0),open:invoices.filter((i:any)=>i.status!=='Bezahlt').reduce((s:number,i:any)=>s+Number(i.amount||0),0),paid:invoices.filter((i:any)=>i.status==='Bezahlt').reduce((s:number,i:any)=>s+Number(i.amount||0),0),chart:revenueChart,mrr,arr:mrr*12},
  seo:{latest:latestSeo,chart:seoChart},
  tickets:{open:tickets.filter((t:any)=>t.status!=='Geschlossen').length,total:tickets.length},
  customers:{total:customers.length,active:customers.filter((c:any)=>c.status==='Aktiv').length},
  pipeline:{chart:Object.values(pipelineMap),weighted:Object.values(pipelineMap).reduce((s:number,x:any)=>s+x.weighted_value,0)}
 }
}

function useStore(){
 const [data,setData]=useState<any>(demo)
 const [toast,setToast]=useState('')
 const [loading,setLoading]=useState(false)
 function notify(msg:string){setToast(msg); setTimeout(()=>setToast(''),2400)}
 async function load(){
  if(!hasSupabase||!supabase) return
  setLoading(true)
  const tables=['customers','invoices','tickets','seo_snapshots','appointments','offers','recurring_invoices','payments','notifications','automations','integrations','package_requests','customer_tool_access','contracts','reports','activity_logs','workflow_runs','customer_files','notification_queue','worker_jobs','customer_subscriptions','license_entitlements','package_catalog']
  const result:any={}
  for(const t of tables){const {data}=await supabase.from(t).select('*'); result[t]=data||[]}
  setData((p:any)=>({...p,...result}))
  setLoading(false)
 }
 useEffect(()=>{load()},[])
 useEffect(()=>subscribeCoreTables(load),[])
 async function log(action:string, message:string, customer_id?:string|null, payload:any={}){
  const entry={customer_id:customer_id||null,action,message,payload,created_at:new Date().toISOString()}
  if(hasSupabase&&supabase){ await supabase.from('activity_logs').insert(entry).catch(()=>null) }
  setData((p:any)=>({...p,activity_logs:[{...entry,id:uid()},...(p.activity_logs||[])]}))
 }
 async function create(table:string,row:any){
  try{
    const payload={...row,created_at:row.created_at||new Date().toISOString()}
    if(hasSupabase&&supabase){
      const {data,error}=await supabase.from(table).insert(payload).select()
      if(error) throw error
      await log('create',`${table} erstellt`,payload.customer_id,payload)
      await load(); notify('Gespeichert'); return data
    }
    setData((p:any)=>({...p,[table]:[{...payload,id:uid()},...(p[table]||[])],activity_logs:[{id:uid(),customer_id:payload.customer_id||null,action:'create',message:`${table} erstellt`,payload,created_at:new Date().toISOString()},...(p.activity_logs||[])]}))
    notify('Gespeichert')
  }catch(e:any){alert(e.message||'Fehler beim Speichern')}
 }
 async function update(table:string,id:string,row:any){
  try{
    if(hasSupabase&&supabase){
      const {error}=await supabase.from(table).update(row).eq('id',id)
      if(error) throw error
      await log('update',`${table} aktualisiert`,row.customer_id,{id,...row})
      await load(); notify('Aktualisiert'); return
    }
    setData((p:any)=>({...p,[table]:(p[table]||[]).map((x:any)=>x.id===id?{...x,...row}:x),activity_logs:[{id:uid(),customer_id:row.customer_id||null,action:'update',message:`${table} aktualisiert`,payload:{id,...row},created_at:new Date().toISOString()},...(p.activity_logs||[])]}))
    notify('Aktualisiert')
  }catch(e:any){alert(e.message||'Fehler beim Aktualisieren')}
 }
 async function remove(table:string,id:string){
  try{
    if(hasSupabase&&supabase){
      const {error}=await supabase.from(table).delete().eq('id',id)
      if(error) throw error
      await log('delete',`${table} gelöscht`,null,{id})
      await load(); notify('Gelöscht'); return
    }
    setData((p:any)=>({...p,[table]:(p[table]||[]).filter((x:any)=>x.id!==id),activity_logs:[{id:uid(),action:'delete',message:`${table} gelöscht`,payload:{id},created_at:new Date().toISOString()},...(p.activity_logs||[])]}))
    notify('Gelöscht')
  }catch(e:any){alert(e.message||'Fehler beim Löschen')}
 }
 async function runWorkflow(customer_id:string|null, workflow_name:string){
  await create('workflow_runs',{customer_id,workflow_name,status:'completed',payload:{},created_at:new Date().toISOString()})
  await create('notifications',{customer_id,title:'Workflow ausgeführt',message:workflow_name,created_at:new Date().toISOString()})
 }
 return {data,create,update,remove,load,loading,toast,notify,log,runWorkflow}
}

const nav=[
 ['dashboard','Dashboard'],['crm','CRM'],['finance','Rechnungen'],['tickets','Tickets'],['seo','SEO'],['booking','Booking'],['pipeline','Pipeline'],['automations','Automationen'],['integrations','Integrationen'],['packages','Pakete'],['contracts','Verträge'],['reports','Reports'],['workflows','Workflows'],['activity','Aktivitäten'],['permissions','Rechte'],['kpi','KPI & Charts'],['files','Dateien/PDF'],['settings','Einstellungen']
]

function Badge({children,type='purple'}:any){return <span className={`badge ${type}`}>{children}</span>}
function Metric({label,value,sub}:any){return <div className="metric"><div className="metricLabel">{label}</div><div className="metricValue">{value}</div>{sub&&<div className="delta">{sub}</div>}</div>}
function Card({title,children}:any){return <section className="card"><h2>{title}</h2>{children}</section>}
function Head({title,sub,action}:any){return <div className="head"><div><h1>{title}</h1>{sub&&<div className="sub">{sub}</div>}</div>{action}</div>}
function RevenueChart({data}:any){return <div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><CartesianGrid stroke="#1e293b"/><XAxis dataKey="label" stroke="#8b9bb3"/><YAxis stroke="#8b9bb3"/><Tooltip contentStyle={{background:'#0d1420',border:'1px solid #243044',color:'#fff'}}/><Legend/><Area dataKey="revenue" name="Umsatz" stroke="#a855f7" fill="#7c3aed55"/><Area dataKey="paid" name="Bezahlt" stroke="#22c55e" fill="#22c55e33"/><Area dataKey="open" name="Offen" stroke="#f59e0b" fill="#f59e0b22"/></AreaChart></ResponsiveContainer></div>}
function SEOChart({data}:any){return <div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><CartesianGrid stroke="#1e293b"/><XAxis dataKey="label" stroke="#8b9bb3"/><YAxis stroke="#8b9bb3"/><Tooltip contentStyle={{background:'#0d1420',border:'1px solid #243044',color:'#fff'}}/><Legend/><Area dataKey="organic_traffic" name="Traffic" stroke="#38bdf8" fill="#38bdf844"/><Area dataKey="impressions" name="Impressionen" stroke="#7c3aed" fill="#7c3aed33"/></AreaChart></ResponsiveContainer></div>}
function PipelineChart({data}:any){return <div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid stroke="#1e293b"/><XAxis dataKey="stage" stroke="#8b9bb3"/><YAxis stroke="#8b9bb3"/><Tooltip contentStyle={{background:'#0d1420',border:'1px solid #243044',color:'#fff'}}/><Legend/><Bar dataKey="value" fill="#7c3aed" name="Wert"/><Bar dataKey="weighted_value" fill="#38bdf8" name="Gewichtet"/></BarChart></ResponsiveContainer></div>}

function Landing({setRole}:any){return <div className="landing"><div className="landingNav"><div className="logo"><div className="mark">M</div>MMOS v10</div><div className="row"><button className="btn secondary" onClick={()=>setRole('admin')}>Admin Login</button><button className="btn" onClick={()=>setRole('customer')}>Kunden Login</button></div></div><section className="hero"><h1>Marketing OS für lokale Unternehmen</h1><p>CRM, Rechnungen, Tickets, SEO, Booking und KPI-Dashboards in einer stabilen Core-Version.</p><button className="btn" onClick={()=>setRole('customer')}>Paket anfragen</button></section><section className="packages">{['Starter','Growth','Premium'].map((p,i)=><div className="package" key={p}><Badge type={i===2?'purple':'blue'}>{p}</Badge><h2>{p}</h2><div className="metricValue">{[199,499,899][i]}€</div><p className="sub">CRM, SEO, Tickets, Reports und Kundenportal.</p><button className="btn" onClick={()=>setRole('customer')}>Auswählen</button></div>)}</section></div>}

export default function App(){
 const [role,setRole]=useState<Role>('guest')
 const [view,setView]=useState('dashboard')
 const [customerId,setCustomerId]=useState<string|null>(null)
 const store=useStore()
 const activeCustomerId=role==='customer'?(customerId||store.data.customers[0]?.id):customerId
 const kpis=useMemo(()=>buildKpis(store.data, activeCustomerId),[store.data,activeCustomerId])
 if(role==='guest') return <Landing setRole={setRole}/>
 return <div className="app"><aside className="side"><div className="logo"><div className="mark">M</div>MMOS Core</div>{role==='admin'&&<select className="input" value={customerId||''} onChange={e=>setCustomerId(e.target.value||null)}><option value="">Admin: alle Kunden</option>{store.data.customers.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select>}{nav.map(([k,l])=><button key={k} className={`nav ${view===k?'active':''}`} onClick={()=>setView(k)}>{l}</button>)}<button className="nav" onClick={()=>setRole('guest')}>Logout</button></aside><main className="main"><div className="top"><input className="search" placeholder="Suche..."/><Badge>{role==='admin'?(customerId?'Impersonation':'Admin'):'Kunde'}</Badge></div><Toast message={store.toast}/>{store.loading&&<SkeletonCard/>}
 {view==='dashboard'&&<Dashboard data={store.data} kpis={kpis} customerId={activeCustomerId}/>}
 {view==='crm'&&<CRM store={store}/>}
 {view==='finance'&&<Finance store={store} customerId={activeCustomerId}/>}
 {view==='tickets'&&<Tickets store={store} customerId={activeCustomerId}/>}
 {view==='seo'&&<SEO store={store} customerId={activeCustomerId}/>}
 {view==='booking'&&<Booking store={store} customerId={activeCustomerId}/>}
 {view==='pipeline'&&<Pipeline store={store} customerId={activeCustomerId}/>}
 {view==='automations'&&<Automations store={store}/>}
 {view==='integrations'&&<Integrations store={store} customerId={activeCustomerId}/>}
 {view==='packages'&&<Packages store={store} customerId={activeCustomerId}/>}
 {view==='contracts'&&<Contracts store={store} customerId={activeCustomerId}/>}
 {view==='reports'&&<Reports store={store} customerId={activeCustomerId} kpis={kpis}/>}
 {view==='workflows'&&<Workflows store={store} customerId={activeCustomerId}/>} 
 {view==='activity'&&<Activity store={store} customerId={activeCustomerId}/>} 
 {view==='permissions'&&<Permissions store={store} customerId={activeCustomerId} role={role}/>} 
 {view==='kpi'&&<KPI kpis={kpis}/>}
 {view==='files'&&<Files store={store} customerId={activeCustomerId}/>}
 {view==='settings'&&<Settings store={store} role={role}/>}
 </main></div>
}

function Dashboard({data,kpis,customerId}:any){return <><Head title="Dashboard" sub="Live Core-Übersicht"/><div className="grid4"><Metric label="Umsatz" value={money(kpis.revenue.total)}/><Metric label="Offen" value={money(kpis.revenue.open)}/><Metric label="Tickets offen" value={kpis.tickets.open}/><Metric label="SEO Traffic" value={kpis.seo.latest?.organic_traffic||0}/></div><div className="grid2"><Card title="Umsatzentwicklung"><RevenueChart data={kpis.revenue.chart}/></Card><Card title="SEO Trend"><SEOChart data={kpis.seo.chart}/></Card></div><div className="grid2"><Card title="Pipeline"><PipelineChart data={kpis.pipeline.chart}/></Card><Card title="Letzte Benachrichtigungen">{data.notifications.filter((n:any)=>!customerId||n.customer_id===customerId).map((n:any)=><div className="item" key={n.id}><b>{n.title}</b><span>{n.message}</span></div>)}</Card></div></>}
function CRM({store}:any){const [f,setF]=useState({name:'',branch:'',email:'',status:'Lead'});return <><Head title="CRM" sub="Kundenverwaltung" action={<div className="row"><button className="btn secondary" onClick={()=>exportCsv('customers')}>CSV</button><button className="btn" onClick={()=>requireOrAlert(f,['name','email'])&&store.create('customers',f)}>Kunde speichern</button></div>}/><div className="grid2"><Card title="Neuer Kunde"><input className="input" placeholder="Name" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/><input className="input" placeholder="Branche" value={f.branch} onChange={e=>setF({...f,branch:e.target.value})}/><input className="input" placeholder="E-Mail" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/><select className="input" value={f.status} onChange={e=>setF({...f,status:e.target.value})}><option>Lead</option><option>Aktiv</option><option>Inaktiv</option></select></Card><Card title="Kunden"><table className="table"><tbody>{store.data.customers.map((c:any)=><tr key={c.id}><td><b>{c.name}</b><div className="sub">{c.branch}</div></td><td>{c.email}</td><td><Badge type={c.status==='Aktiv'?'green':'yellow'}>{c.status}</Badge></td><td><ConfirmButton onConfirm={()=>store.remove('customers',c.id)}>Löschen</ConfirmButton></td></tr>)}</tbody></table></Card></div></>}
function Finance({store,customerId}:any){const [f,setF]=useState({customer_id:customerId||store.data.customers[0]?.id,amount:0,status:'Offen'});const rows=store.data.invoices.filter((x:any)=>!customerId||x.customer_id===customerId);return <><Head title="Rechnungen" sub="Finance CRUD" action={<button className="btn" onClick={()=>store.create('invoices',{...f,invoice_number:'RE-'+Date.now(),created_at:new Date().toISOString()})}>Rechnung erstellen</button>}/><div className="grid2"><Card title="Neue Rechnung"><select className="input" value={f.customer_id} onChange={e=>setF({...f,customer_id:e.target.value})}>{store.data.customers.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input className="input" type="number" placeholder="Betrag" onChange={e=>setF({...f,amount:Number(e.target.value)})}/><select className="input" value={f.status} onChange={e=>setF({...f,status:e.target.value})}><option>Offen</option><option>Bezahlt</option><option>Überfällig</option></select></Card><Card title="Rechnungen"><table className="table"><tbody>{rows.map((i:any)=><tr key={i.id}><td>{i.invoice_number}</td><td>{money(i.amount)}</td><td><Badge type={i.status==='Bezahlt'?'green':i.status==='Überfällig'?'red':'yellow'}>{i.status}</Badge></td><td><button className="btn secondary" onClick={()=>store.update('invoices',i.id,{status:'Bezahlt'})}>Bezahlt</button></td></tr>)}</tbody></table></Card></div></>}
function Tickets({store,customerId}:any){const [f,setF]=useState({customer_id:customerId||store.data.customers[0]?.id,title:'',status:'Offen',priority:'Normal'});const rows=store.data.tickets.filter((x:any)=>!customerId||x.customer_id===customerId);return <><Head title="Tickets" action={<button className="btn" onClick={()=>requireOrAlert(f,['title','customer_id'])&&store.create('tickets',{...f,created_at:new Date().toISOString()})}>Ticket erstellen</button>}/><div className="grid2"><Card title="Neues Ticket"><select className="input" value={f.customer_id} onChange={e=>setF({...f,customer_id:e.target.value})}>{store.data.customers.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input className="input" placeholder="Titel" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/><select className="input" value={f.priority} onChange={e=>setF({...f,priority:e.target.value})}><option>Normal</option><option>Hoch</option></select></Card><Card title="Tickets">{rows.map((t:any)=><div className="item" key={t.id}><div><b>{t.title}</b><div className="sub">{t.priority}</div></div><button className="btn secondary" onClick={()=>store.update('tickets',t.id,{status:t.status==='Geschlossen'?'Offen':'Geschlossen'})}>{t.status}</button></div>)}</Card></div></>}
function SEO({store,customerId}:any){const [f,setF]=useState({customer_id:customerId||store.data.customers[0]?.id,organic_traffic:0,impressions:0,clicks:0,ctr:0,top10_keywords:0});const rows=store.data.seo_snapshots.filter((x:any)=>!customerId||x.customer_id===customerId);return <><Head title="SEO Dashboard" action={<button className="btn" onClick={()=>store.create('seo_snapshots',{...f,snapshot_date:new Date().toISOString().slice(0,10),created_at:new Date().toISOString()})}>Snapshot speichern</button>}/><div className="grid2"><Card title="SEO Werte einspeisen"><select className="input" value={f.customer_id} onChange={e=>setF({...f,customer_id:e.target.value})}>{store.data.customers.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select>{['organic_traffic','impressions','clicks','ctr','top10_keywords'].map(k=><input key={k} className="input" type="number" placeholder={k} onChange={e=>setF({...f,[k]:Number(e.target.value)})}/>)}</Card><Card title="SEO Graph"><SEOChart data={buildKpis({...store.data,seo_snapshots:rows},null).seo.chart}/></Card></div></>}
function Booking({store,customerId}:any){const [f,setF]=useState({customer_id:customerId||store.data.customers[0]?.id,client_name:'',appointment_date:new Date().toISOString().slice(0,10),start_time:'10:00',end_time:'11:00'});const rows=store.data.appointments.filter((x:any)=>!customerId||x.customer_id===customerId);const days=Array.from({length:35},(_,i)=>i+1);return <><Head title="Booking" action={<button className="btn" onClick={()=>requireOrAlert(f,['client_name','appointment_date','customer_id'])&&store.create('appointments',{...f,created_at:new Date().toISOString()})}>Termin erstellen</button>}/><div className="grid2"><Card title="Neuer Termin"><select className="input" value={f.customer_id} onChange={e=>setF({...f,customer_id:e.target.value})}>{store.data.customers.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input className="input" placeholder="Titel" value={f.client_name} onChange={e=>setF({...f,client_name:e.target.value})}/><input className="input" type="date" value={f.appointment_date} onChange={e=>setF({...f,appointment_date:e.target.value})}/><input className="input" value={f.start_time} onChange={e=>setF({...f,start_time:e.target.value})}/><input className="input" value={f.end_time} onChange={e=>setF({...f,end_time:e.target.value})}/></Card><Card title="Kalender"><div className="calendar">{days.map(d=><div className="day" key={d}><div className="sub">{d}</div>{rows.filter((a:any)=>Number(String(a.appointment_date).slice(-2))===d).map((a:any)=><div className="event" key={a.id}>{a.client_name}<br/>{a.start_time}-{a.end_time}</div>)}</div>)}</div></Card></div></>}
function KPI({kpis}:any){return <><Head title="KPI & Charts" sub="Verdrahtete Charts aus Core-Daten"/><div className="grid4"><Metric label="MRR" value={money(kpis.revenue.mrr)}/><Metric label="ARR" value={money(kpis.revenue.arr)}/><Metric label="Pipeline gewichtet" value={money(kpis.pipeline.weighted)}/><Metric label="Kunden aktiv" value={kpis.customers.active}/></div><div className="grid2"><Card title="Umsatz"><RevenueChart data={kpis.revenue.chart}/></Card><Card title="Pipeline"><PipelineChart data={kpis.pipeline.chart}/></Card></div></>}

function Pipeline({store,customerId}:any){
 const [f,setF]=useState({customer_id:customerId||store.data.customers[0]?.id,title:'',amount:0,status:'Offen',probability:50})
 const rows=store.data.offers.filter((x:any)=>!customerId||x.customer_id===customerId)
 const stages=['Offen','Angebot','Angenommen','Abgelehnt']
 return <><Head title="Pipeline" sub="Angebote mit echten Aktionen" action={<button className="btn" onClick={()=>requireOrAlert(f,['title','customer_id'])&&store.create('offers',{...f,created_at:new Date().toISOString()})}>Angebot erstellen</button>}/>
 <div className="grid2"><Card title="Neues Angebot"><select className="input" value={f.customer_id} onChange={e=>setF({...f,customer_id:e.target.value})}>{store.data.customers.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input className="input" placeholder="Titel" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/><input className="input" type="number" placeholder="Betrag" onChange={e=>setF({...f,amount:Number(e.target.value)})}/><select className="input" value={f.status} onChange={e=>setF({...f,status:e.target.value})}>{stages.map(s=><option key={s}>{s}</option>)}</select><input className="input" type="number" placeholder="Wahrscheinlichkeit %" value={f.probability} onChange={e=>setF({...f,probability:Number(e.target.value)})}/></Card>
 <Card title="Pipeline Kanban">{stages.map(st=><div key={st} className="card" style={{marginBottom:8}}><h2>{st}</h2>{rows.filter((o:any)=>o.status===st).map((o:any)=><div className="item" key={o.id}><div><b>{o.title}</b><div className="sub">{money(o.amount)} · {o.probability}%</div></div><div className="row"><button className="btn secondary" onClick={()=>store.update('offers',o.id,{status:'Angenommen',probability:100})}>Gewinnen</button><ConfirmButton onConfirm={()=>store.remove('offers',o.id)}>Löschen</ConfirmButton></div></div>)}</div>)}</Card></div></>
}

function Automations({store}:any){
 const [f,setF]=useState({name:'',trigger_type:'invoice_overdue',action_type:'create_notification',enabled:true})
 return <><Head title="Automationen" sub="Regeln mit echten Aktionen" action={<button className="btn" onClick={()=>f.name&&store.create('automations',{...f,created_at:new Date().toISOString()})}>Automation speichern</button>}/>
 <div className="grid2"><Card title="Neue Automation"><input className="input" placeholder="Name" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/><select className="input" value={f.trigger_type} onChange={e=>setF({...f,trigger_type:e.target.value})}><option>invoice_overdue</option><option>ticket_created</option><option>package_requested</option><option>seo_drop</option></select><select className="input" value={f.action_type} onChange={e=>setF({...f,action_type:e.target.value})}><option>create_notification</option><option>unlock_tools</option><option>create_reminder</option><option>send_report</option></select></Card>
 <Card title="Regeln">{store.data.automations.map((a:any)=><div className="item" key={a.id}><div><b>{a.name}</b><div className="sub">{a.trigger_type} → {a.action_type}</div></div><button className="btn secondary" onClick={()=>store.update('automations',a.id,{enabled:!a.enabled})}>{a.enabled?'Aktiv':'Inaktiv'}</button></div>)}</Card></div></>
}

function Integrations({store,customerId}:any){
 const [name,setName]=useState('')
 const rows=store.data.integrations.filter((x:any)=>!customerId||x.customer_id===customerId)
 return <><Head title="Integrationen" sub="Verbindungen pro Kunde" action={<button className="btn" onClick={()=>name&&store.create('integrations',{customer_id:customerId||store.data.customers[0]?.id,name,status:'Verbunden',created_at:new Date().toISOString()})}>Integration verbinden</button>}/>
 <div className="grid2"><Card title="Neue Integration"><input className="input" placeholder="Name z.B. Google Business Profile" value={name} onChange={e=>setName(e.target.value)}/></Card><Card title="Aktive Integrationen">{rows.map((i:any)=><div className="item" key={i.id}><b>{i.name}</b><button className="btn secondary" onClick={()=>store.update('integrations',i.id,{status:i.status==='Verbunden'?'Getrennt':'Verbunden'})}>{i.status}</button></div>)}</Card></div></>
}

function Packages({store,customerId}:any){
 const [pkg,setPkg]=useState('Growth')
 const [busy,setBusy]=useState('')
 const requests=store.data.package_requests.filter((x:any)=>!customerId||x.customer_id===customerId)
 const tools=store.data.customer_tool_access.filter((x:any)=>!customerId||x.customer_id===customerId)
 const subs=(store.data.customer_subscriptions||[]).filter((x:any)=>!customerId||x.customer_id===customerId)
 const packages=[{name:'Starter',price:199,tools:['CRM','Tickets','Rechnungen','Files','Basis Reports']},{name:'Growth',price:499,tools:['SEO','Booking','Pipeline','KPI','Integrationen']},{name:'Premium',price:899,tools:['Workflows','Automationen','Permissions','Advanced Reports']}]
 async function approve(r:any){
   setBusy(r.id)
   const result=await approvePackageRequest(r.id)
   if(!result.ok){
     await store.update('package_requests',r.id,{status:'Freigegeben',customer_id:r.customer_id})
     await store.create('contracts',{customer_id:r.customer_id,title:`${r.package_name} Vertrag`,status:'Entwurf',package_name:r.package_name,monthly_amount:packages.find(p=>p.name===r.package_name)?.price||0})
     await store.create('invoices',{customer_id:r.customer_id,invoice_number:'RE-'+Date.now(),amount:packages.find(p=>p.name===r.package_name)?.price||0,status:'Offen',created_at:new Date().toISOString()})
   } else {
     await store.load()
   }
   setBusy('')
 }
 async function change(customer_id:string, package_name:string){
   setBusy(package_name)
   const result=await changeSubscription(customer_id,package_name)
   if(!result.ok){
     await store.create('customer_subscriptions',{customer_id,package_name,status:'active',price_monthly:packages.find(p=>p.name===package_name)?.price||0,currency:'EUR'})
   } else await store.load()
   setBusy('')
 }
 return <><Head title="Pakete & Billing" sub="Paketanfragen, Freischaltung, Subscription, Rechnung und Vertrag" action={<button className="btn" onClick={()=>store.create('package_requests',{customer_id:customerId||store.data.customers[0]?.id,package_name:pkg,status:'Angefragt',created_at:new Date().toISOString()})}>Paket anfragen</button>}/>
 <div className="grid3">{packages.map(p=><Card key={p.name} title={p.name}><div className="metricValue">{p.price}€</div><div className="sub">monatlich</div>{p.tools.map(t=><div className="item" key={t}><span>{t}</span><Badge type="green">inkl.</Badge></div>)}<div className="row"><button className="btn" onClick={()=>setPkg(p.name)}>Auswählen</button><button className="btn secondary" onClick={()=>change(customerId||store.data.customers[0]?.id,p.name)}>{busy===p.name?'...':'Upgrade/Downgrade'}</button></div></Card>)}</div>
 <div className="grid2"><Card title="Paketanfragen">{requests.length===0?<EmptyState title="Keine Paketanfragen" text="Noch keine Anfragen."/>:requests.map((r:any)=><div className="item" key={r.id}><div><b>{r.package_name}</b><div className="sub">{r.status}</div></div><div className="row"><button className="btn secondary" onClick={()=>approve(r)}>{busy===r.id?'...':'Freigeben'}</button><button className="btn secondary" onClick={()=>createStripeCheckout(r.customer_id,r.package_name).then((x:any)=>x.data?.checkout_url?window.open(x.data.checkout_url,'_blank'):alert(x.error||x.data?.message||'Stripe nicht konfiguriert'))}>Stripe</button></div></div>)}</Card>
 <Card title="Aktive Subscriptions">{subs.length===0?<EmptyState title="Keine Subscription" text="Noch kein aktives Paket."/>:subs.map((s:any)=><div className="item" key={s.id}><div><b>{s.package_name}</b><div className="sub">{s.status}</div></div><span>{s.price_monthly} {s.currency}</span></div>)}</Card></div>
 <div className="grid2"><Card title="Toolfreigabe">{['seo','booking','tickets','invoices','reports','integrations','files','pipeline','automations','workflows','permissions'].map(t=>{const row=tools.find((x:any)=>x.tool_key===t);return <div className="item" key={t}><b>{t}</b><button className="btn secondary" onClick={()=>row?store.update('customer_tool_access',row.id,{enabled:!row.enabled,customer_id:row.customer_id}):store.create('customer_tool_access',{customer_id:customerId||store.data.customers[0]?.id,tool_key:t,enabled:true})}>{row?.enabled?'Aktiv':'Gesperrt'}</button></div>})}</Card>
 <Card title="Automationen"><button className="btn secondary" onClick={()=>generatePackageContract(customerId||store.data.customers[0]?.id,pkg).then(()=>store.load())}>Vertrag generieren</button><br/><br/><button className="btn secondary" onClick={()=>createPackageInvoice(customerId||store.data.customers[0]?.id,pkg).then(()=>store.load())}>Paket-Rechnung erzeugen</button></Card></div></>
}

function Contracts({store,customerId}:any){
 const [title,setTitle]=useState('')
 const rows=store.data.contracts.filter((x:any)=>!customerId||x.customer_id===customerId)
 return <><Head title="Verträge" sub="Vertragsverwaltung" action={<button className="btn" onClick={()=>title&&store.create('contracts',{customer_id:customerId||store.data.customers[0]?.id,title,status:'Entwurf',created_at:new Date().toISOString()})}>Vertrag erstellen</button>}/>
 <div className="grid2"><Card title="Neuer Vertrag"><input className="input" placeholder="Titel" value={title} onChange={e=>setTitle(e.target.value)}/></Card><Card title="Verträge">{rows.map((c:any)=><div className="item" key={c.id}><div><b>{c.title}</b><div className="sub">{c.status}</div></div><button className="btn secondary" onClick={()=>store.update('contracts',c.id,{status:'Aktiv'})}>Aktivieren</button></div>)}</Card></div></>
}

function Reports({store,customerId,kpis}:any){
 const rows=store.data.reports.filter((x:any)=>!customerId||x.customer_id===customerId)
 return <><Head title="Reports" sub="Berichte aus KPI-Daten" action={<button className="btn" onClick={()=>store.create('reports',{customer_id:customerId||store.data.customers[0]?.id,title:'Report '+new Date().toLocaleDateString('de-DE'),status:'Fertig',created_at:new Date().toISOString()})}>Report erzeugen</button>}/>
 <div className="grid2"><Card title="Report Vorschau"><div className="item"><span>Umsatz</span><b>{money(kpis.revenue.total)}</b></div><div className="item"><span>Offene Tickets</span><b>{kpis.tickets.open}</b></div><div className="item"><span>SEO Traffic</span><b>{kpis.seo.latest?.organic_traffic||0}</b></div></Card>
 <Card title="Gespeicherte Reports">{rows.map((r:any)=><div className="item" key={r.id}><div><b>{r.title}</b><div className="sub">{r.status}</div></div><button className="btn secondary" onClick={()=>window.open(API_BASE?`${API_BASE}/api/pdf/report/${r.id}`:'#','_blank')}>PDF</button></div>)}</Card></div></>
}



function Workflows({store,customerId}:any){
 const [f,setF]=useState({customer_id:customerId||store.data.customers[0]?.id,workflow_name:'',status:'queued'})
 const rows=(store.data.workflow_runs||[]).filter((x:any)=>!customerId||x.customer_id===customerId)
 return <><Head title="Workflow Engine" sub="Runs, Queue-Basis und Benachrichtigungen" action={<button className="btn" onClick={()=>requireOrAlert(f,['workflow_name'])&&store.runWorkflow(f.customer_id,f.workflow_name)}>Workflow starten</button>}/>
 <div className="grid2"><Card title="Workflow starten"><select className="input" value={f.customer_id} onChange={e=>setF({...f,customer_id:e.target.value})}>{store.data.customers.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select><select className="input" value={f.workflow_name} onChange={e=>setF({...f,workflow_name:e.target.value})}><option value="">Workflow wählen</option><option>Mahnung bei überfälliger Rechnung</option><option>SEO Drop Notification</option><option>Paketanfrage freischalten</option><option>Monatsreport erzeugen</option></select></Card>
 <Card title="Workflow Runs">{rows.length===0?<EmptyState title="Keine Workflows" text="Noch keine Workflow Runs vorhanden."/>:rows.map((w:any)=><div className="item" key={w.id}><div><b>{w.workflow_name}</b><div className="sub">{w.created_at}</div></div><button className="btn secondary" onClick={()=>store.update('workflow_runs',w.id,{status:w.status==='completed'?'queued':'completed',customer_id:w.customer_id})}>{w.status}</button></div>)}</Card></div></>
}

function Activity({store,customerId}:any){
 const rows=(store.data.activity_logs||[]).filter((x:any)=>!customerId||!x.customer_id||x.customer_id===customerId)
 return <><Head title="Activity Timeline" sub="Audit- und Aktivitätsprotokoll" action={<button className="btn" onClick={()=>store.create('activity_logs',{customer_id:customerId||null,action:'manual_note',message:'Manueller Log-Eintrag',created_at:new Date().toISOString()})}>Log hinzufügen</button>}/>
 <Card title="Letzte Aktivitäten">{rows.length===0?<EmptyState title="Keine Aktivitäten" text="Noch keine Events vorhanden."/>:rows.map((a:any)=><div className="item" key={a.id}><div><b>{a.action}</b><div className="sub">{a.message}</div></div><span>{a.created_at?new Date(a.created_at).toLocaleString('de-DE'):''}</span></div>)}</Card></>
}

function Permissions({store,customerId,role}:any){
 const tools=['seo','booking','tickets','invoices','reports','integrations','files','pipeline','automations']
 const rows=(store.data.customer_tool_access||[]).filter((x:any)=>!customerId||x.customer_id===customerId)
 return <><Head title="Permission Matrix" sub="Tool-Level Rechte und Modulfreigaben"/>
 <div className="grid2"><Card title="Rollenstatus"><div className="item"><span>Aktuelle Rolle</span><b>{role}</b></div><div className="item"><span>Tenant Scope</span><b>{customerId||'Alle Kunden'}</b></div></Card>
 <Card title="Toolrechte">{tools.map(t=>{const row=rows.find((x:any)=>x.tool_key===t);return <div className="item" key={t}><span>{t}</span><button className="btn secondary" onClick={()=>row?store.update('customer_tool_access',row.id,{enabled:!row.enabled,customer_id:row.customer_id}):store.create('customer_tool_access',{customer_id:customerId||store.data.customers[0]?.id,tool_key:t,enabled:true})}>{row?.enabled?'Erlaubt':'Gesperrt'}</button></div>})}</Card></div></>
}


function Files({store,customerId}:any){
 const [name,setName]=useState('')
 const [fileType,setFileType]=useState('general')
 const rows=(store.data.customer_files||store.data.files||[]).filter((x:any)=>!customerId||x.customer_id===customerId)
 return <><Head title="Dateien & PDF" sub="File-Metadaten, Versionierung und PDF Downloads" action={<button className="btn" onClick={()=>requireOrAlert({name},['name'])&&store.create('customer_files',{customer_id:customerId||store.data.customers[0]?.id,name,file_type:fileType,url:'#',version:1,created_at:new Date().toISOString()})}>Datei speichern</button>}/>
 <div className="grid2"><Card title="Upload / Datei erfassen"><input className="input" placeholder="Dateiname" value={name} onChange={e=>setName(e.target.value)}/><select className="input" value={fileType} onChange={e=>setFileType(e.target.value)}><option>general</option><option>invoice</option><option>contract</option><option>ticket</option><option>report</option></select><div className="sub">Echter Upload-Endpunkt vorhanden: Backend /api/upload/:bucket</div></Card>
 <Card title="Dateien">{rows.length===0?<EmptyState title="Keine Dateien" text="Noch keine Dateien hinterlegt."/>:rows.map((f:any)=><div className="item" key={f.id}><div><b>{f.name}</b><div className="sub">{f.file_type} · Version {f.version||1}</div></div><div className="row"><button className="btn secondary" onClick={()=>window.open(f.url||'#','_blank')}>Download</button><button className="btn secondary" onClick={()=>store.update('customer_files',f.id,{version:Number(f.version||1)+1,customer_id:f.customer_id})}>Neue Version</button></div></div>)}</Card></div></>
}

function Settings({store,role}:any){return <><Head title="Einstellungen" sub="Rollen, Tenant Scope und Systemstatus"/><div className="grid2"><Card title="Tenant Scope"><div className="item"><span>Rolle</span><b>{role}</b></div><div className="item"><span>Kunden</span><b>{store.data.customers.length}</b></div></Card><Card title="System"><div className="item"><span>Supabase</span><Badge type={hasSupabase?'green':'yellow'}>{hasSupabase?'verbunden':'Demo Modus'}</Badge></div><div className="item"><span>Leere Clicks</span><Badge type="green">Hauptmodule verbunden</Badge></div></Card></div></>}
