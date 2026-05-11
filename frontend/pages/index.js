
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

function viewLabel(v){
  const map={
    dashboard:'📊 Dashboard',profile:'👤 Profil',crm:'🏢 Kunden CRM',customerDemo:'🧪 Kundendemo',users:'👥 Benutzer',customers:'🏢 Kunden',
    leadMeetings:'📅 Lead Gespräche',booking:'🗓️ Booking',tickets:'🎫 Tickets',
    templates:'✉️ E-Mail Vorlagen',invoices:'💶 Rechnungen',leadSearches:'🔎 Lead Scraper',
    qr:'▦ QR Kampagnen',integrations:'🔌 Integrationen',tools:'🧰 Neue Tools',audit:'🕵️ Audit Log'
  }
  return map[v] || v
}
function initials(name){return (name||'?').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase()}
function today(){return new Date().toISOString().slice(0,10)}
function plus14(){let d=new Date();d.setDate(d.getDate()+14);return d.toISOString().slice(0,10)}
function money(v){return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(v||0))}
function Modal({ title, onClose, children }) {
  return <div className="modalBg"><div className="modal"><div className="row" style={{justifyContent:'space-between'}}><h2>{title}</h2><button className="btn secondary" onClick={onClose}>×</button></div>{children}</div></div>
}
function Login({ onSession }) {
  const [email, setEmail] = useState('admin@agentur.local')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  async function login() {
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return setError(error.message)
    onSession(data.session)
  }
  return <main className="login">
    <div className="box">
      <h1>Mecklenburg Marketing OS</h1>
      <p>Echter Login mit Passwort-Abfrage über Supabase Auth.</p>
      <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-Mail" />
      <div className="row" style={{gap:0}}>
        <input className="input" style={{flex:1}} value={password} onChange={e=>setPassword(e.target.value)} type={show?'text':'password'} placeholder="Passwort" />
        <button className="btn secondary" onClick={()=>setShow(!show)}>{show?'🙈':'👁️'}</button>
      </div>
      {error && <p style={{color:'#ef4444'}}>{error}</p>}
      <button className="btn" onClick={login}>🔐 Einloggen</button>
    </div>
  </main>
}

export default function Home(){
  const [session,setSession]=useState(null),[profile,setProfile]=useState(null),[view,setView]=useState('dashboard')
  const [theme,setTheme]=useState('light'),[customers,setCustomers]=useState([]),[selectedCustomer,setSelectedCustomer]=useState(null)
  useEffect(()=>{supabase.auth.getSession().then(({data})=>setSession(data.session));const {data:sub}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>sub.subscription.unsubscribe()},[])
  useEffect(()=>{if(session?.user)loadBase()},[session])
  async function loadBase(){
    const {data:prof,error}=await supabase.from('profiles').select('*').eq('id',session.user.id).single()
    if(error){setProfile(null);return}
    setProfile(prof)
    if(prof.role==='admin'||prof.role==='employee'){
      const {data}=await supabase.from('customers').select('*').order('created_at',{ascending:false})
      setCustomers(data||[]);setSelectedCustomer((data||[])[0]||null)
    } else {
      const {data}=await supabase.from('user_customer_access').select('customers(*)').eq('user_id',session.user.id)
      const list=(data||[]).map(x=>x.customers).filter(Boolean);setCustomers(list);setSelectedCustomer(list[0]||null)
    }
  }
  async function logout(){await supabase.auth.signOut();setSession(null);setProfile(null)}
  if(!session)return <Login onSession={setSession}/>
  if(!profile)return <main className="login"><div className="box"><h1>Profil fehlt</h1><p>Dein Auth-User existiert, aber kein Eintrag in profiles.</p></div></main>
  const adminViews=['dashboard','profile','crm','customerDemo','users','customers','leadMeetings','booking','tickets','templates','invoices','leadSearches','qr','integrations','tools','audit']
  const customerViews=['dashboard','profile','booking','tickets','templates','invoices','integrations']
  const views=profile.role==='customer'?customerViews:adminViews
  return <div data-theme={theme} className="page"><div className="app">
    <aside className="side"><h2>MM OS</h2><p><b>{profile.full_name}</b><br/><span>{profile.role}</span></p>{views.map(v=><button key={v} className={view===v?'btn':'btn secondary'} onClick={()=>setView(v)}>{viewLabel(v)}</button>)}<button className="btn secondary" onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?'☀️ Light':'🌙 Dark'}</button><button className="btn red" onClick={logout}>🚪 Logout</button></aside>
    <main className="main"><div className="top"><div><h1>{viewLabel(view)}</h1>{selectedCustomer&&<p className="muted">Aktueller Kunde: {selectedCustomer.name}</p>}</div><select className="input" style={{maxWidth:360}} value={selectedCustomer?.id||''} onChange={e=>setSelectedCustomer(customers.find(c=>c.id===e.target.value))}>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      {view==='dashboard'&&<Dashboard customers={customers} selectedCustomer={selectedCustomer} profile={profile}/>}
      {view==='profile'&&<Profile profile={profile} customer={selectedCustomer}/>} 
      {view==='crm'&&<CRM customers={customers} reload={loadBase} setSelectedCustomer={setSelectedCustomer}/>} 
      {view==='customerDemo'&&<CustomerDemo customers={customers} selectedCustomer={selectedCustomer} setSelectedCustomer={setSelectedCustomer}/>}
      {view==='users'&&<Users customers={customers}/>}
      {view==='customers'&&<Customers reload={loadBase}/>}
      {view==='leadMeetings'&&<LeadMeetings customers={customers}/>}
      {view==='booking'&&<Booking customer={selectedCustomer}/>}
      {view==='tickets'&&<Tickets customer={selectedCustomer} profile={profile}/>}
      {view==='templates'&&<Templates/>}
      {view==='invoices'&&<Invoices customer={selectedCustomer} admin={profile.role!=='customer'} customers={customers}/>}
      {view==='leadSearches'&&<LeadSearches/>}
      {view==='qr'&&<QRCampaigns customers={customers}/>}
      {view==='integrations'&&<Integrations customer={selectedCustomer}/>}
      {view==='tools'&&<NewTools/>}
      {view==='audit'&&<Audit/>}
    </main>
  </div></div>
}
function Dashboard({customers,selectedCustomer,profile}){const demoCustomer=customers.find(c=>c.name==='Demo Friseur Rostock')||selectedCustomer;const realCustomer=customers.find(c=>c.name==='Echter Kunde Mustermann');return <><div className="hero"><h1>Willkommen, {profile.full_name}</h1><p>Admin-Arbeitsprofil mit Demo-KPIs, Demo-Kunde mit Dummy-Daten und echter Kunde nur mit Kontaktdaten.</p></div><div className="grid"><div className="card"><h2>Admin Profil</h2><div className="profileCard"><div className="avatar">{initials(profile.full_name)}</div><div><b>{profile.full_name}</b><br/><span>{profile.email}</span><br/><span className="badge">Arbeitsprofil</span></div></div><p className="muted">Demo-KPIs für deine Agenturansicht:</p><div className="kpi">42</div><p>Kunden-Pipeline · 18 Leads · 12.480€ Monatsumsatz</p></div><div className="card"><h2>Demo-Kunde</h2><div className="profileCard"><div className="avatar">{initials(demoCustomer?.name)}</div><div><b>{demoCustomer?.name||'Demo Kunde'}</b><br/><span>{demoCustomer?.email||'demo@example.de'}</span><br/><span>{demoCustomer?.phone||'0381 123456'}</span></div></div><p className="muted">Mit vollständigen Dummy-Daten für Dashboard, Rechnungen, Booking, Tickets und Integrationen.</p><div className="kpi">{money(demoCustomer?.revenue||2480)}</div><p>4.8★ · 128 Reviews · 12 Termine · 6 offene Leads</p></div><div className="card"><h2>Echter Kunde</h2><div className="profileCard"><div className="avatar">{initials(realCustomer?.name||'Echter Kunde')}</div><div><b>{realCustomer?.name||'Echter Kunde Mustermann'}</b><br/><span>{realCustomer?.email||'kontakt@mustermann.de'}</span><br/><span>{realCustomer?.phone||'0381 000000'}</span></div></div><p className="muted">Keine Dummy-KPIs. Nur Name und Kontaktdaten als Startprofil.</p><div className="kpi">0€</div><p>Keine Daten hinterlegt.</p></div></div></>}
function Profile({profile,customer}){const isDemo=customer?.name==='Demo Friseur Rostock';const isReal=customer?.name==='Echter Kunde Mustermann';return <div className="grid"><div className="card"><h2>Admin Arbeitsprofil</h2><div className="profileCard"><div className="avatar">{initials(profile.full_name)}</div><div><b>{profile.full_name}</b><br/><span>{profile.email}</span><br/><span className="badge">{profile.role}</span></div></div><p className="muted">Dieses Admin-Profil darf Demo-KPIs enthalten, damit das Dashboard gefüllt und verkaufsfähig aussieht.</p><div className="item">📊 Demo Umsatz: 12.480€</div><div className="item">🔎 Demo Leads: 18</div><div className="item">🎫 Demo Tickets: 4</div></div>{customer&&<div className="card"><h2>{isDemo?'Demo-Kundenprofil':isReal?'Echter Kunde ohne Dummy-KPIs':'Kundenprofil'}</h2><div className="profileCard"><div className="avatar">{initials(customer.name)}</div><div><b>{customer.name}</b><br/><span>{customer.email||'kontakt@example.de'}</span><br/><span>{customer.phone||'0381 000000'}</span></div></div>{isDemo?<><p className="muted">Dieser Kunde ist bewusst mit Dummy-Daten gefüllt, damit alle Module live befüllt aussehen.</p><div className="item">⭐ 4.8 Sterne · 128 Bewertungen</div><div className="item">💶 2.480€ Monatsumsatz</div><div className="item">🗓️ 12 Termine</div></>:<><p className="muted">Dieses Profil enthält nur Name und Kontaktdaten. Keine Demo-KPIs, keine Umsätze, keine Fake-Bewertungen.</p><div className="item">Name: {customer.name}</div><div className="item">E-Mail: {customer.email||'nicht hinterlegt'}</div><div className="item">Telefon: {customer.phone||'nicht hinterlegt'}</div></>}</div>}</div>}
function Customers({reload}){const[items,setItems]=useState([]),[name,setName]=useState(''),[email,setEmail]=useState(''),[phone,setPhone]=useState(''),[branch,setBranch]=useState('');useEffect(()=>{load()},[]);async function load(){const{data}=await supabase.from('customers').select('*').order('created_at',{ascending:false});setItems(data||[])}async function add(){await supabase.from('customers').insert({name,email,phone,branch,status:'Lead',rating:0,revenue:0});setName('');setEmail('');setPhone('');await load();reload&&reload()}async function del(c){if(!confirm('Kunde wirklich aus der Datenbank löschen? '+c.name))return;const{error}=await supabase.from('customers').delete().eq('id',c.id);if(error)return alert(error.message);await load();reload&&reload()}return <div className="grid"><div className="card"><h2>Kundenprofil anlegen</h2><input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Name"/><input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-Mail"/><input className="input" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Telefon"/><input className="input" value={branch} onChange={e=>setBranch(e.target.value)} placeholder="Branche"/><button className="btn" onClick={add}>💾 Speichern</button></div><div className="card"><h2>Kunden löschen</h2>{items.map(c=><div className="item" key={c.id}><b>{c.name}</b><br/>{c.email||'-'} · {c.phone||'-'}<br/><button className="btn red" onClick={()=>del(c)}>🗑️ Aus Datenbank löschen</button></div>)}</div></div>}
function Users({customers}){const[users,setUsers]=useState([]),[open,setOpen]=useState(false),[form,setForm]=useState({full_name:'',email:'',password:'',role:'customer',customer_id:''});useEffect(()=>{load()},[]);async function load(){const{data}=await supabase.from('profiles').select('*').order('created_at',{ascending:false});setUsers(data||[])}async function createUser(){const res=await fetch(API+'/api/users/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});const data=await res.json();if(!data.ok)return alert(data.error||'Fehler');alert('Benutzer erstellt. Temporäres Passwort: '+data.temporary_password);setOpen(false);load()}return <><button className="btn" onClick={()=>setOpen(true)}>➕ Benutzer anlegen</button><div className="card"><table className="table"><tbody>{users.map(u=><tr key={u.id}><td>{u.full_name}</td><td>{u.email}</td><td>{u.role}</td></tr>)}</tbody></table></div>{open&&<Modal title="Benutzer anlegen" onClose={()=>setOpen(false)}><input className="input" placeholder="Name" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/><input className="input" placeholder="E-Mail" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/><input className="input" placeholder="Passwort" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/><select className="input" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option>customer</option><option>employee</option><option>admin</option></select><select className="input" value={form.customer_id} onChange={e=>setForm({...form,customer_id:e.target.value})}><option value="">Kunde wählen</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="btn" onClick={createUser}>🔐 Erstellen</button></Modal>}</>}
function LeadMeetings({customers}){const[items,setItems]=useState([]),[form,setForm]=useState({customer_id:'',meeting_date:today(),start_time:'10:00',end_time:'11:00',goal:''});useEffect(()=>{load()},[]);async function load(){const{data}=await supabase.from('lead_meetings').select('*, customers(*)').order('meeting_date',{ascending:true});setItems(data||[])}async function add(){await supabase.from('lead_meetings').insert(form);setForm({...form,goal:''});load()}return <div className="grid"><div className="card"><h2>Gespräch anlegen</h2><select className="input" value={form.customer_id} onChange={e=>setForm({...form,customer_id:e.target.value})}><option value="">Kunde wählen</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input className="input" type="date" value={form.meeting_date} onChange={e=>setForm({...form,meeting_date:e.target.value})}/><input className="input" value={form.start_time} onChange={e=>setForm({...form,start_time:e.target.value})}/><input className="input" value={form.end_time} onChange={e=>setForm({...form,end_time:e.target.value})}/><textarea className="input" rows="4" placeholder="Gesprächsziel" value={form.goal} onChange={e=>setForm({...form,goal:e.target.value})}/><button className="btn" onClick={add}>💾 Speichern</button></div><div className="card"><h2>Gespeichert</h2><div className="list">{items.map(i=><div className="item" key={i.id}><b>{i.customers?.name}</b><br/>{i.meeting_date} {i.start_time}-{i.end_time}<br/>{i.goal}</div>)}</div></div></div>}
function Booking({customer}){const[cats,setCats]=useState([]),[apps,setApps]=useState([]),[catName,setCatName]=useState(''),[price,setPrice]=useState(0),[form,setForm]=useState({client_name:'',appointment_date:today(),start_time:'09:00',end_time:'10:00',service_category_id:''});useEffect(()=>{if(customer)load()},[customer]);async function load(){const{data:cat}=await supabase.from('service_categories').select('*').eq('customer_id',customer.id);const{data:app}=await supabase.from('appointments').select('*, service_categories(*)').eq('customer_id',customer.id).order('appointment_date',{ascending:true});setCats(cat||[]);setApps(app||[])}async function addCat(){await supabase.from('service_categories').insert({customer_id:customer.id,name:catName,price});setCatName('');load()}async function addApp(){await supabase.from('appointments').insert({...form,customer_id:customer.id});setForm({...form,client_name:''});load()}if(!customer)return null;return <div className="grid"><div className="card"><h2>Kategorie</h2><input className="input" value={catName} onChange={e=>setCatName(e.target.value)} placeholder="Kategorie"/><input className="input" type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Preis"/><button className="btn" onClick={addCat}>💾 Speichern</button></div><div className="card"><h2>Termin</h2><input className="input" value={form.client_name} onChange={e=>setForm({...form,client_name:e.target.value})} placeholder="Name"/><input className="input" type="date" value={form.appointment_date} onChange={e=>setForm({...form,appointment_date:e.target.value})}/><input className="input" value={form.start_time} onChange={e=>setForm({...form,start_time:e.target.value})}/><input className="input" value={form.end_time} onChange={e=>setForm({...form,end_time:e.target.value})}/><select className="input" value={form.service_category_id} onChange={e=>setForm({...form,service_category_id:e.target.value})}><option value="">Kategorie wählen</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name} {c.price}€</option>)}</select><button className="btn" onClick={addApp}>💾 Termin speichern</button></div><div className="card"><h2>Termine</h2>{apps.map(a=><div className="item" key={a.id}>{a.appointment_date} {a.start_time}-{a.end_time}<br/>{a.client_name} · {a.service_categories?.name}</div>)}</div></div>}
function Tickets({customer,profile}){const[tickets,setTickets]=useState([]),[detail,setDetail]=useState(null),[title,setTitle]=useState(''),[desc,setDesc]=useState(''),[feedback,setFeedback]=useState('');useEffect(()=>{if(customer)load()},[customer]);async function load(){const{data}=await supabase.from('tickets').select('*, ticket_messages(*)').eq('customer_id',customer.id).order('created_at',{ascending:false});setTickets(data||[])}async function add(){await supabase.from('tickets').insert({customer_id:customer.id,title,description:desc,created_by:profile.id});setTitle('');setDesc('');load()}async function updateStatus(id,status){await supabase.from('tickets').update({status}).eq('id',id);load()}async function addFeedback(){await supabase.from('ticket_messages').insert({ticket_id:detail.id,author_id:profile.id,message:feedback,is_admin_feedback:profile.role!=='customer'});setFeedback('');setDetail(null);load()}if(!customer)return null;return <div className="grid"><div className="card"><h2>Ticket erstellen</h2><input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Betreff"/><textarea className="input" rows="4" value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Beschreibung"/><button className="btn" onClick={add}>🎫 Speichern</button></div><div className="card"><h2>Tickets</h2>{tickets.map(t=><div className="item" key={t.id} onClick={()=>setDetail(t)}><b>{t.title}</b> <span className="badge">{t.status}</span><br/>{t.description}</div>)}</div>{detail&&<Modal title={detail.title} onClose={()=>setDetail(null)}><p>{detail.description}</p><p>Status: {detail.status}</p>{detail.ticket_messages?.map(m=><div className="item" key={m.id}>{m.message}</div>)}{profile.role!=='customer'&&<select className="input" value={detail.status} onChange={e=>updateStatus(detail.id,e.target.value)}><option>angekommen</option><option>in Bearbeitung</option><option>erledigt</option></select>}<textarea className="input" rows="4" value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="Nachricht/Feedback"/><button className="btn" onClick={addFeedback}>💾 Speichern</button></Modal>}</div>}
function Templates(){const[cats,setCats]=useState([]),[tpl,setTpl]=useState([]),[catName,setCatName]=useState(''),[form,setForm]=useState({category_id:'',name:'',body:''});useEffect(()=>{load()},[]);async function load(){const{data:c}=await supabase.from('email_template_categories').select('*');const{data:t}=await supabase.from('email_templates').select('*, email_template_categories(*)');setCats(c||[]);setTpl(t||[])}async function addCat(){await supabase.from('email_template_categories').insert({name:catName});setCatName('');load()}async function addTpl(){await supabase.from('email_templates').insert(form);setForm({category_id:'',name:'',body:''});load()}return <div className="grid"><div className="card"><h2>Kategorie</h2><input className="input" value={catName} onChange={e=>setCatName(e.target.value)}/><button className="btn" onClick={addCat}>💾 Kategorie</button></div><div className="card"><h2>Vorlage</h2><select className="input" value={form.category_id} onChange={e=>setForm({...form,category_id:e.target.value})}><option value="">Kategorie wählen</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Name"/><textarea className="input" rows="5" value={form.body} onChange={e=>setForm({...form,body:e.target.value})}/><button className="btn" onClick={addTpl}>💾 Vorlage</button></div><div className="card"><h2>Gespeichert</h2>{tpl.map(t=><div className="item" key={t.id}><b>{t.name}</b><br/>{t.email_template_categories?.name}<br/>{t.body}</div>)}</div></div>}
function Invoices({customer,admin,customers}){const[items,setItems]=useState([]),[form,setForm]=useState({customer_id:customer?.id||'',amount:0,service:''});useEffect(()=>{load()},[customer]);async function load(){let q=supabase.from('invoices').select('*, customers(*)').order('created_at',{ascending:false});if(customer&&!admin)q=q.eq('customer_id',customer.id);const{data}=await q;setItems(data||[])}async function add(){await supabase.from('invoices').insert({invoice_number:'RE-'+Date.now(),customer_id:form.customer_id||customer.id,amount:form.amount,service:form.service,due_date:plus14(),status:'Offen'});load()}return <div className="grid"><div className="card"><h2>Rechnung erstellen</h2>{admin&&<select className="input" value={form.customer_id} onChange={e=>setForm({...form,customer_id:e.target.value})}><option value="">Kunde wählen</option>{customers.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select>}<input className="input" type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/><input className="input" value={form.service} onChange={e=>setForm({...form,service:e.target.value})} placeholder="Leistung"/><button className="btn" onClick={add}>💶 Speichern</button></div><div className="card"><h2>Rechnungen</h2><table className="table"><tbody>{items.map(i=><tr key={i.id}><td>{i.invoice_number}</td><td>{i.customers?.name}</td><td>{money(i.amount)}</td><td>{i.status}</td></tr>)}</tbody></table></div></div>}
function LeadSearches(){const[items,setItems]=useState([]),[detail,setDetail]=useState(null),[form,setForm]=useState({name:'',branch:'',area:''}),[contact,setContact]=useState({name:'',company:'',email:'',phone:''});useEffect(()=>{load()},[]);async function load(){const{data}=await supabase.from('lead_searches').select('*, lead_contacts(*)').order('created_at',{ascending:false});setItems(data||[])}async function add(){await supabase.from('lead_searches').insert({name:(form.name+' '+form.area).trim(),branch:form.branch,area:form.area,status:'Aktiv'});setForm({name:'',branch:'',area:''});load()}async function addContact(){await supabase.from('lead_contacts').insert({...contact,lead_search_id:detail.id});setContact({name:'',company:'',email:'',phone:''});setDetail(null);load()}return <div className="grid"><div className="card"><h2>Suche hinzufügen</h2><input className="input" placeholder="Suchname" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input className="input" placeholder="Branche" value={form.branch} onChange={e=>setForm({...form,branch:e.target.value})}/><input className="input" placeholder="Ort" value={form.area} onChange={e=>setForm({...form,area:e.target.value})}/><button className="btn" onClick={add}>🔎 Speichern</button></div><div className="card"><h2>Suchen</h2>{items.map(i=><div className="item" key={i.id} onClick={()=>setDetail(i)}>{i.name}<br/>{i.branch} · {i.area}<br/>Kontakte: {i.lead_contacts?.length||0}</div>)}</div>{detail&&<Modal title={detail.name} onClose={()=>setDetail(null)}><p>{detail.branch} · {detail.area}</p><input className="input" placeholder="Name" value={contact.name} onChange={e=>setContact({...contact,name:e.target.value})}/><input className="input" placeholder="Firma" value={contact.company} onChange={e=>setContact({...contact,company:e.target.value})}/><input className="input" placeholder="E-Mail" value={contact.email} onChange={e=>setContact({...contact,email:e.target.value})}/><input className="input" placeholder="Telefon" value={contact.phone} onChange={e=>setContact({...contact,phone:e.target.value})}/><button className="btn" onClick={addContact}>💾 Kontakt</button></Modal>}</div>}
function QRCampaigns({customers}){const[items,setItems]=useState([]),[customer,setCustomer]=useState(''),[mail,setMail]=useState('');useEffect(()=>{load()},[]);async function load(){const{data}=await supabase.from('qr_campaigns').select('*, customers(*)');setItems(data||[])}async function add(){const c=customers.find(x=>x.id===customer);await supabase.from('qr_campaigns').insert({customer_id:customer,name:c?.name||'QR Kampagne',target_url:'/review/'+customer,negative_feedback_email:mail||c?.email});setCustomer('');setMail('');load()}return <div className="grid"><div className="card"><h2>QR Kampagne</h2><select className="input" value={customer} onChange={e=>setCustomer(e.target.value)}><option value="">Kunde wählen</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input className="input" placeholder="Feedback Mail" value={mail} onChange={e=>setMail(e.target.value)}/><button className="btn" onClick={add}>▦ Speichern</button></div><div className="card"><h2>Kampagnen</h2>{items.map(i=><div className="item" key={i.id}>{i.name}<br/>{i.customers?.name}<br/>{i.negative_feedback_email}</div>)}</div></div>}
function Integrations({customer}){const[items,setItems]=useState([]),[platform,setPlatform]=useState('Google Business'),[key,setKey]=useState('');useEffect(()=>{if(customer)load()},[customer]);async function load(){const{data}=await supabase.from('integrations').select('*').eq('customer_id',customer.id);setItems(data||[])}async function add(){await supabase.from('integrations').upsert({customer_id:customer.id,platform,api_key:key},{onConflict:'customer_id,platform'});setKey('');load()}if(!customer)return null;return <div className="grid"><div className="card"><h2>Integration hinzufügen</h2><select className="input" value={platform} onChange={e=>setPlatform(e.target.value)}>{['Google Business','Meta','Search Console','Google Analytics','Stripe','DATEV','WhatsApp API'].map(p=><option key={p}>{p}</option>)}</select><input className="input" value={key} onChange={e=>setKey(e.target.value)} placeholder="API Key"/><button className="btn" onClick={add}>🔌 Speichern</button></div><div className="card"><h2>Gespeichert</h2>{items.map(i=><div className="item" key={i.id}><b>{i.platform}</b><br/>{i.api_key}</div>)}</div></div>}

function CRM({customers,reload,setSelectedCustomer}){
  const [filter,setFilter]=useState('Alle')
  const [detail,setDetail]=useState(null)
  const [newOpen,setNewOpen]=useState(false)
  const list=filter==='Alle'?customers:customers.filter(c=>c.status===filter)
  async function del(c){
    if(!confirm('Kunde wirklich löschen? Alle zugehörigen Daten werden entfernt: '+c.name))return
    const {error}=await supabase.from('customers').delete().eq('id',c.id)
    if(error)return alert(error.message)
    reload&&reload()
  }
  if(detail)return <CRMDetail customer={detail} onBack={()=>setDetail(null)} reload={reload}/>
  return <div>
    <div className="hero"><h1>Kunden CRM</h1><p>Technisch wieder mit CRM-Detail, Tabs, Kontakten, Notizen, Dateien, Verlauf, Rechnungen, Angeboten und Tool-Datenzentrale.</p></div>
    <div className="row" style={{marginBottom:14}}>
      {['Alle','Aktiv','Lead','Inaktiv'].map(s=><button key={s} className={filter===s?'btn':'btn secondary'} onClick={()=>setFilter(s)}>{s}</button>)}
      <button className="btn" onClick={()=>setNewOpen(true)}>➕ Neuer Kunde</button>
    </div>
    <div className="card">
      <table className="table">
        <thead><tr><th>Kunde</th><th>Kontakt</th><th>Status</th><th>Umsatz</th><th>Aktion</th></tr></thead>
        <tbody>{list.map(c=><tr key={c.id}>
          <td><b>{c.name}</b><br/><span className="muted">{c.branch||'Keine Branche'}</span></td>
          <td>{c.email||'-'}<br/>{c.phone||'-'}</td>
          <td><span className="badge">{c.status}</span></td>
          <td>{money(c.revenue)}</td>
          <td>
            <button className="btn secondary" onClick={()=>setDetail(c)}>Öffnen</button>
            <button className="btn secondary" onClick={()=>setSelectedCustomer(c)}>Als Kundendemo</button>
            <button className="btn red" onClick={()=>del(c)}>Löschen</button>
          </td>
        </tr>)}</tbody>
      </table>
    </div>
    {newOpen&&<NewCustomerModal onClose={()=>setNewOpen(false)} reload={reload}/>}
  </div>
}
function NewCustomerModal({onClose,reload}){
  const [form,setForm]=useState({name:'',contact_name:'',email:'',phone:'',status:'Lead',branch:''})
  async function save(){
    await supabase.from('customers').insert({...form,revenue:0,rating:0})
    onClose(); reload&&reload()
  }
  return <Modal title="Neuen Kunden anlegen" onClose={onClose}>
    <input className="input" placeholder="Unternehmensname" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
    <input className="input" placeholder="Kontaktperson" value={form.contact_name} onChange={e=>setForm({...form,contact_name:e.target.value})}/>
    <input className="input" placeholder="E-Mail" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
    <input className="input" placeholder="Telefon" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
    <input className="input" placeholder="Branche" value={form.branch} onChange={e=>setForm({...form,branch:e.target.value})}/>
    <select className="input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Aktiv</option><option>Lead</option><option>Inaktiv</option></select>
    <button className="btn" onClick={save}>💾 Kunde speichern</button>
  </Modal>
}
function CRMDetail({customer,onBack,reload}){
  const [tab,setTab]=useState('Übersicht')
  const tabs=['Übersicht','Kontakte','Notizen','Dateien','Verlauf','Rechnungen','Angebote','Tool Datenzentrale']
  return <div>
    <div className="row" style={{justifyContent:'space-between'}}>
      <button className="btn secondary" onClick={onBack}>← Zurück</button>
      <h1 style={{margin:0}}>{customer.name}</h1>
    </div>
    <div className="row" style={{margin:'14px 0'}}>
      {tabs.map(t=><button key={t} className={tab===t?'btn':'btn secondary'} onClick={()=>setTab(t)}>{t}</button>)}
    </div>
    {tab==='Übersicht'&&<CRMOverview customer={customer}/>}
    {tab==='Kontakte'&&<CRMContacts customer={customer}/>}
    {tab==='Notizen'&&<CRMNotes customer={customer}/>}
    {tab==='Dateien'&&<CRMFiles customer={customer}/>}
    {tab==='Verlauf'&&<CRMHistory customer={customer}/>}
    {tab==='Rechnungen'&&<CRMInvoices customer={customer}/>}
    {tab==='Angebote'&&<CRMOffers customer={customer}/>}
    {tab==='Tool Datenzentrale'&&<CRMToolCenter customer={customer}/>}
  </div>
}
function CRMOverview({customer}){
  return <div className="grid">
    <div className="card"><h2>Unternehmensdaten</h2><div className="profileCard"><div className="avatar">{initials(customer.name)}</div><div><b>{customer.name}</b><br/><span>{customer.email||'keine Mail'}</span><br/><span>{customer.phone||'keine Telefonnummer'}</span></div></div></div>
    <div className="card"><h2>KPIs</h2><div className="kpi">{money(customer.revenue)}</div><p className="muted">Umsatz gesamt / Demo falls Demo-Kunde</p><div className="item">⭐ Bewertung: {customer.rating||0}</div><div className="item">🏷️ Status: {customer.status}</div></div>
    <div className="card"><h2>Kurzzusammenfassung</h2><button className="btn secondary">📞 Kontakt öffnen</button><button className="btn secondary">💶 Rechnung erstellen</button><button className="btn secondary">📊 Report ziehen</button></div>
  </div>
}
function CRMContacts({customer}){
  const [items,setItems]=useState([])
  const [form,setForm]=useState({name:'',email:'',phone:'',role:''})
  useEffect(()=>{load()},[customer])
  async function load(){const {data}=await supabase.from('customer_contacts').select('*').eq('customer_id',customer.id).order('created_at',{ascending:false});setItems(data||[])}
  async function add(){await supabase.from('customer_contacts').insert({...form,customer_id:customer.id});setForm({name:'',email:'',phone:'',role:''});load()}
  return <div className="grid"><div className="card"><h2>Kontakt hinzufügen</h2><input className="input" placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input className="input" placeholder="E-Mail" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/><input className="input" placeholder="Telefon" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/><input className="input" placeholder="Rolle/Funktion" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}/><button className="btn" onClick={add}>💾 Kontakt speichern</button></div><div className="card"><h2>Kontakte</h2>{items.length===0&&<p className="muted">Noch keine Kontakte.</p>}{items.map(i=><div className="item" key={i.id}><b>{i.name}</b><br/>{i.email}<br/>{i.phone}<br/>{i.role}</div>)}</div></div>
}
function CRMNotes({customer}){
  const [items,setItems]=useState([])
  const [note,setNote]=useState('')
  useEffect(()=>{load()},[customer])
  async function load(){const {data}=await supabase.from('customer_notes').select('*, profiles(full_name)').eq('customer_id',customer.id).order('created_at',{ascending:false});setItems(data||[])}
  async function add(){const {data:{user}}=await supabase.auth.getUser();await supabase.from('customer_notes').insert({customer_id:customer.id,note,author_id:user?.id});setNote('');load()}
  return <div className="grid"><div className="card"><h2>Notiz schreiben</h2><textarea className="input" rows="6" placeholder="Notiz..." value={note} onChange={e=>setNote(e.target.value)}/><button className="btn" onClick={add}>💾 Notiz speichern</button></div><div className="card"><h2>Gespeicherte Notizen</h2>{items.map(i=><div className="item" key={i.id}>{i.note}<br/><span className="muted">{i.profiles?.full_name||'User'} · {new Date(i.created_at).toLocaleString('de-DE')}</span></div>)}</div></div>
}
function CRMFiles({customer}){
  return <div className="card"><h2>Dateien</h2><input className="input" type="file"/><button className="btn">📁 Datei vormerken</button><div className="item"><b>Mustervertrag.pdf</b><br/>PDF<br/><button className="btn secondary" onClick={()=>alert('Demo: Datei öffnen')}>Öffnen</button></div></div>
}
function CRMHistory({customer}){
  const items=['Kunde angelegt','Erstgespräch geführt','Angebot vorbereitet','Rechnung erstellt','Report versendet']
  return <div className="card"><h2>Verlauf</h2>{items.map((i,idx)=><div className="item" key={i}>{i}<br/><span className="muted">{idx+1}. Aktivität</span></div>)}</div>
}
function CRMInvoices({customer}){
  const [items,setItems]=useState([])
  useEffect(()=>{supabase.from('invoices').select('*').eq('customer_id',customer.id).order('created_at',{ascending:false}).then(({data})=>setItems(data||[]))},[customer])
  return <div className="card"><h2>Rechnungen</h2>{items.map(i=><div className="item" key={i.id}>{i.invoice_number} · {money(i.amount)} · {i.status}</div>)}{items.length===0&&<p className="muted">Keine Rechnungen vorhanden.</p>}</div>
}
function CRMOffers({customer}){
  return <div className="card"><h2>Angebote</h2><div className="item">ANG-DEMO-001 · Website + Review Paket · 799€</div><div className="item">ANG-DEMO-002 · SEO Betreuung · 499€/Monat</div></div>
}
function CRMToolCenter({customer}){
  return <div className="grid"><div className="card"><h2>SEO Daten einspeisen</h2><input className="input" placeholder="Organischer Traffic"/><input className="input" placeholder="Keywords Top 10"/><button className="btn">📊 Speichern</button></div><div className="card"><h2>Review Daten einspeisen</h2><input className="input" placeholder="Google Bewertungen"/><input className="input" placeholder="Ø Bewertung"/><button className="btn">⭐ Speichern</button></div><div className="card"><h2>API Tokens</h2><input className="input" placeholder="Google Business API Key"/><button className="btn">🔌 Speichern</button></div></div>
}
function CustomerDemo({customers,selectedCustomer,setSelectedCustomer}){
  const demo=customers.find(c=>c.name==='Demo Friseur Rostock')||customers.find(c=>c.name==='Friseur Profi')||customers[0]
  return <div><div className="hero"><h1>Kundendemo wechseln</h1><p>Hier kannst du direkt auf den Demo-Kunden wechseln und alle Kundentools mit befüllten Daten prüfen.</p></div><div className="grid"><div className="card"><h2>Demo-Kunde</h2><p>{demo?.name}</p><p className="muted">{demo?.email}<br/>{demo?.phone}</p><button className="btn" onClick={()=>demo&&setSelectedCustomer(demo)}>🧪 Zur Kundendemo wechseln</button></div><div className="card"><h2>Aktuell aktiv</h2><p>{selectedCustomer?.name}</p><p className="muted">Alle Kundentools nutzen den aktuell ausgewählten Kunden.</p></div><div className="card"><h2>Kundenbereich öffnen</h2><p className="muted">Im Sidebar-Umschalter kannst du dich auch als Kundennutzer einloggen. Diese Kundendemo setzt hier nur den aktiven Kunden.</p></div></div></div>
}

function NewTools(){return <div className="grid"><div className="card"><h2>White Label</h2><input className="input" placeholder="Kundenfarbe #7c3aed"/><button className="btn">🎨 Speichern</button></div><div className="card"><h2>Smart Notifications</h2><div className="item">Negative Bewertung erkannt</div><div className="item">Rechnung überfällig</div></div><div className="card"><h2>Analytics</h2><div className="item">Meistgenutztes Modul: SEO</div><div className="item">Aktivster Kunde: Kundenprofil</div></div></div>}
function Audit(){const[logs,setLogs]=useState([]);useEffect(()=>{supabase.from('audit_logs').select('*').order('created_at',{ascending:false}).then(({data})=>setLogs(data||[]))},[]);return <div className="card"><h2>Audit Log</h2>{logs.length===0&&<p className="muted">Noch keine Audit-Einträge.</p>}{logs.map(l=><div className="item" key={l.id}>{l.action}<br/>{l.entity}<br/>{l.created_at}</div>)}</div>}
