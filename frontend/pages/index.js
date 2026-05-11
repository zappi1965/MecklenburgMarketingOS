import { openInvoicePdf, openReminderPdf, openReportPdf } from '../lib/pdfClient'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

function viewLabel(v){
  const map={
    dashboard:'📊 Dashboard',
    users:'👥 Benutzer',
    customers:'🏢 Kunden',
    leadMeetings:'📅 Lead Gespräche',
    booking:'🗓️ Booking',
    tickets:'🎫 Tickets',
    templates:'✉️ E-Mail Vorlagen',
    invoices:'💶 Rechnungen',
    leadSearches:'🔎 Lead Scraper',
    qr:'▦ QR Kampagnen',
    integrations:'🔌 Integrationen'
  }
  return map[v] || v
}


function Modal({ title, onClose, children }) {
  return <div className="modalBg"><div className="modal"><div className="row" style={{justifyContent:'space-between'}}><h2>{title}</h2><button className="btn secondary" onClick={onClose}>×</button></div>{children}</div></div>
}

function Login({ onSession }) {
  const [email, setEmail] = useState('admin@agentur.local')
  const [password, setPassword] = useState('')
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
      <p className="muted">Echter Supabase Login – keine Dummy Prüfung.</p>
      <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-Mail" />
      <input className="input" value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Passwort" />
      {error && <p style={{color:'#ef4444'}}>{error}</p>}
      <button className="btn" onClick={login}>Einloggen</button>
    </div>
  </main>
}

export default function Home() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [view, setView] = useState('dashboard')
  const [theme, setTheme] = useState('light')
  const [customers, setCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) return
    loadBase()
  }, [session])

  async function loadBase() {
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    setProfile(prof)

    if (prof?.role === 'admin' || prof?.role === 'employee') {
      const { data } = await supabase.from('customers').select('*').order('created_at', { ascending:false })
      setCustomers(data || [])
      setSelectedCustomer((data || [])[0] || null)
    } else {
      const { data } = await supabase.from('user_customer_access').select('customers(*)').eq('user_id', session.user.id)
      const list = (data || []).map(x => x.customers).filter(Boolean)
      setCustomers(list)
      setSelectedCustomer(list[0] || null)
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    setSession(null); setProfile(null)
  }

  if (!session) return <Login onSession={setSession} />
  if (!profile) return <main className="login"><div className="box">Lade Profil...</div></main>

  const adminViews = ['dashboard','users','customers','leadMeetings','booking','tickets','templates','invoices','leadSearches','qr','integrations']
  const customerViews = ['dashboard','booking','tickets','templates','invoices','integrations']
  const views = profile.role === 'customer' ? customerViews : adminViews

  return <div className="page" data-theme={theme}>
    <div className="app">
      <aside className="side">
        <h2>MM OS</h2>
        <p>{profile.full_name}<br/><span className="muted">{profile.role}</span></p>
        {views.map(v => <button key={v} className={view===v?'btn':'btn secondary'} onClick={()=>setView(v)}>{viewLabel(v)}</button>)}
        <button className="btn secondary" onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?'Light':'Dark'} Mode</button>
        <button className="btn red" onClick={logout}>Logout</button>
      </aside>
      <main className="main">
        <div className="top">
          <div>
            <h1>{viewLabel(view)}</h1>
            {selectedCustomer && <p className="muted">Aktueller Kunde: {selectedCustomer.name}</p>}
          </div>
          <select className="input" style={{maxWidth:360}} value={selectedCustomer?.id || ''} onChange={e=>setSelectedCustomer(customers.find(c=>c.id===e.target.value))}>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {view==='dashboard' && <Dashboard customers={customers} selectedCustomer={selectedCustomer} />}
        {view==='users' && <Users customers={customers} />}
        {view==='customers' && <Customers reload={loadBase} />}
        {view==='leadMeetings' && <LeadMeetings customers={customers} />}
        {view==='booking' && <Booking customer={selectedCustomer} />}
        {view==='tickets' && <Tickets customer={selectedCustomer} profile={profile} />}
        {view==='templates' && <Templates />}
        {view==='invoices' && <Invoices customer={selectedCustomer} admin={profile.role!=='customer'} customers={customers} />}
        {view==='leadSearches' && <LeadSearches />}
        {view==='qr' && <QRCampaigns customers={customers} />}
        {view==='integrations' && <Integrations customer={selectedCustomer} />}
      </main>
    </div>
  </div>
}

function Dashboard({ customers, selectedCustomer }) {
  return <div className="grid">
    <div className="card"><h2>Kunden</h2><b>{customers.length}</b></div>
    <div className="card"><h2>Ausgewählt</h2><b>{selectedCustomer?.name || '-'}</b></div>
    <div className="card"><h2>Persistenz</h2><p>Alle Module speichern in Supabase und bleiben nach Reload/Login erhalten.</p></div>
  </div>
}

function Customers({ reload }) {
  const [name,setName]=useState('')
  const [branch,setBranch]=useState('Beauty')
  async function add() {
    await supabase.from('customers').insert({ name, branch, status:'Lead', rating:0 })
    setName('')
    reload()
  }
  return <div className="card">
    <h2>Kunde anlegen</h2>
    <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Name" />
    <input className="input" value={branch} onChange={e=>setBranch(e.target.value)} placeholder="Branche" />
    <button className="btn" onClick={add}>Speichern</button>
  </div>
}

function Users({ customers }) {
  const [users,setUsers]=useState([])
  const [open,setOpen]=useState(false)
  const [form,setForm]=useState({ full_name:'', email:'', password:'', role:'customer', customer_id:'' })

  useEffect(()=>{ load() },[])
  async function load(){ const {data}=await supabase.from('profiles').select('*').order('created_at',{ascending:false}); setUsers(data||[]) }
  async function createUser(){
    const res = await fetch(API+'/api/users/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
    const data = await res.json()
    if(!data.ok) return alert(data.error || 'Fehler')
    alert('Benutzer erstellt. Temporäres Passwort: '+data.temporary_password)
    setOpen(false); load()
  }

  return <div>
    <button className="btn" onClick={()=>setOpen(true)}>Benutzer anlegen</button>
    <div className="card"><table className="table"><tbody>{users.map(u=><tr key={u.id}><td>{u.full_name}</td><td>{u.email}</td><td>{u.role}</td></tr>)}</tbody></table></div>
    {open&&<Modal title="Benutzer anlegen" onClose={()=>setOpen(false)}>
      <input className="input" placeholder="Name" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/>
      <input className="input" placeholder="E-Mail" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
      <input className="input" placeholder="Passwort" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
      <select className="input" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option>customer</option><option>employee</option><option>admin</option></select>
      <select className="input" value={form.customer_id} onChange={e=>setForm({...form,customer_id:e.target.value})}><option value="">Kunde wählen</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <button className="btn" onClick={createUser}>Erstellen</button>
    </Modal>}
  </div>
}

function LeadMeetings({ customers }) {
  const [items,setItems]=useState([])
  const [form,setForm]=useState({ customer_id:'', meeting_date:new Date().toISOString().slice(0,10), start_time:'10:00', end_time:'11:00', goal:'' })
  useEffect(()=>{ load() },[])
  async function load(){ const {data}=await supabase.from('lead_meetings').select('*, customers(*)').order('meeting_date',{ascending:true}); setItems(data||[]) }
  async function add(){ await supabase.from('lead_meetings').insert(form); setForm({...form,goal:''}); load() }
  return <div className="grid">
    <div className="card">
      <h2>Lead Gespräch anlegen</h2>
      <select className="input" value={form.customer_id} onChange={e=>setForm({...form,customer_id:e.target.value})}><option value="">Kunde wählen</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <input className="input" type="date" value={form.meeting_date} onChange={e=>setForm({...form,meeting_date:e.target.value})}/>
      <input className="input" value={form.start_time} onChange={e=>setForm({...form,start_time:e.target.value})}/>
      <input className="input" value={form.end_time} onChange={e=>setForm({...form,end_time:e.target.value})}/>
      <textarea className="input" rows="4" placeholder="Gesprächsziel" value={form.goal} onChange={e=>setForm({...form,goal:e.target.value})}/>
      <button className="btn" onClick={add}>Speichern</button>
    </div>
    <div className="card"><h2>Gespeichert</h2><div className="list">{items.map(i=><div className="item" key={i.id}><b>{i.customers?.name}</b><br/>{i.meeting_date} {i.start_time}-{i.end_time}<br/>{i.goal}</div>)}</div></div>
  </div>
}

function Booking({ customer }) {
  const [cats,setCats]=useState([])
  const [apps,setApps]=useState([])
  const [catName,setCatName]=useState('')
  const [price,setPrice]=useState(0)
  const [form,setForm]=useState({ client_name:'', appointment_date:new Date().toISOString().slice(0,10), start_time:'09:00', end_time:'10:00', service_category_id:'' })

  useEffect(()=>{ if(customer) load() },[customer])
  async function load(){
    const {data:cat}=await supabase.from('service_categories').select('*').eq('customer_id',customer.id)
    const {data:app}=await supabase.from('appointments').select('*, service_categories(*)').eq('customer_id',customer.id).order('appointment_date',{ascending:true})
    setCats(cat||[]); setApps(app||[])
  }
  async function addCat(){ await supabase.from('service_categories').insert({customer_id:customer.id,name:catName,price}); setCatName(''); load() }
  async function addApp(){ await supabase.from('appointments').insert({...form,customer_id:customer.id}); setForm({...form,client_name:''}); load() }
  if(!customer) return null
  return <div className="grid">
    <div className="card"><h2>Kategorie</h2><input className="input" value={catName} onChange={e=>setCatName(e.target.value)} placeholder="Kategorie"/><input className="input" type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Preis"/><button className="btn" onClick={addCat}>Kategorie speichern</button></div>
    <div className="card"><h2>Termin</h2><input className="input" value={form.client_name} onChange={e=>setForm({...form,client_name:e.target.value})} placeholder="Name"/><input className="input" type="date" value={form.appointment_date} onChange={e=>setForm({...form,appointment_date:e.target.value})}/><input className="input" value={form.start_time} onChange={e=>setForm({...form,start_time:e.target.value})}/><input className="input" value={form.end_time} onChange={e=>setForm({...form,end_time:e.target.value})}/><select className="input" value={form.service_category_id} onChange={e=>setForm({...form,service_category_id:e.target.value})}><option value="">Kategorie wählen</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name} {c.price}€</option>)}</select><button className="btn" onClick={addApp}>Termin speichern</button></div>
    <div className="card"><h2>Termine</h2>{apps.map(a=><div className="item" key={a.id}>{a.appointment_date} {a.start_time}-{a.end_time}<br/>{a.client_name} · {a.service_categories?.name}</div>)}</div>
  </div>
}

function Tickets({ customer, profile }) {
  const [tickets,setTickets]=useState([])
  const [detail,setDetail]=useState(null)
  const [title,setTitle]=useState('')
  const [desc,setDesc]=useState('')
  const [feedback,setFeedback]=useState('')
  useEffect(()=>{ if(customer) load() },[customer])
  async function load(){ const {data}=await supabase.from('tickets').select('*, ticket_messages(*)').eq('customer_id',customer.id).order('created_at',{ascending:false}); setTickets(data||[]) }
  async function add(){ await supabase.from('tickets').insert({customer_id:customer.id,title,description:desc,created_by:profile.id}); setTitle('');setDesc('');load() }
  async function updateStatus(id,status){ await supabase.from('tickets').update({status}).eq('id',id); load() }
  async function addFeedback(){ await supabase.from('ticket_messages').insert({ticket_id:detail.id,author_id:profile.id,message:feedback,is_admin_feedback:profile.role!=='customer'}); setFeedback(''); setDetail(null); load() }
  if(!customer) return null
  return <div className="grid">
    <div className="card"><h2>Ticket erstellen</h2><input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Betreff"/><textarea className="input" rows="4" value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Beschreibung"/><button className="btn" onClick={add}>Ticket speichern</button></div>
    <div className="card"><h2>Tickets</h2>{tickets.map(t=><div className="item" key={t.id} onClick={()=>setDetail(t)}><b>{t.title}</b> <span className="badge">{t.status}</span><br/>{t.description}</div>)}</div>
    {detail&&<Modal title={detail.title} onClose={()=>setDetail(null)}><p>{detail.description}</p><p>Status: {detail.status}</p>{detail.ticket_messages?.map(m=><div className="item" key={m.id}>{m.message}</div>)}{profile.role!=='customer'&&<select className="input" value={detail.status} onChange={e=>updateStatus(detail.id,e.target.value)}><option>angekommen</option><option>in Bearbeitung</option><option>erledigt</option></select>}<textarea className="input" rows="4" value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="Nachricht/Feedback"/><button className="btn" onClick={addFeedback}>Speichern</button></Modal>}
  </div>
}

function Templates() {
  const [cats,setCats]=useState([])
  const [tpl,setTpl]=useState([])
  const [catName,setCatName]=useState('')
  const [form,setForm]=useState({category_id:'',name:'',body:''})
  useEffect(()=>{ load() },[])
  async function load(){ const {data:c}=await supabase.from('email_template_categories').select('*'); const {data:t}=await supabase.from('email_templates').select('*, email_template_categories(*)'); setCats(c||[]); setTpl(t||[]) }
  async function addCat(){ await supabase.from('email_template_categories').insert({name:catName}); setCatName(''); load() }
  async function addTpl(){ await supabase.from('email_templates').insert(form); setForm({category_id:'',name:'',body:''}); load() }
  return <div className="grid">
    <div className="card"><h2>Kategorie</h2><input className="input" value={catName} onChange={e=>setCatName(e.target.value)} /><button className="btn" onClick={addCat}>Kategorie speichern</button></div>
    <div className="card"><h2>Vorlage</h2><select className="input" value={form.category_id} onChange={e=>setForm({...form,category_id:e.target.value})}><option value="">Kategorie wählen</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Name"/><textarea className="input" rows="5" value={form.body} onChange={e=>setForm({...form,body:e.target.value})}/><button className="btn" onClick={addTpl}>Vorlage speichern</button></div>
    <div className="card"><h2>Gespeicherte Vorlagen</h2>{tpl.map(t=><div className="item" key={t.id}><b>{t.name}</b><br/>{t.email_template_categories?.name}<br/>{t.body}</div>)}</div>
  </div>
}

function Invoices({ customer, admin, customers }) {
  const [items,setItems]=useState([])
  const [form,setForm]=useState({customer_id:customer?.id||'',amount:0,service:''})
  useEffect(()=>{ load() },[customer])
  async function load(){ let q=supabase.from('invoices').select('*, customers(*)').order('created_at',{ascending:false}); if(customer&&!admin) q=q.eq('customer_id',customer.id); const {data}=await q; setItems(data||[]) }
  async function add(){ const due=new Date(); due.setDate(due.getDate()+14); await supabase.from('invoices').insert({invoice_number:'RE-'+Date.now(),customer_id:form.customer_id||customer.id,amount:form.amount,service:form.service,due_date:due.toISOString().slice(0,10),status:'Offen'}); load() }
  return <div className="grid">
    <div className="card"><h2>Rechnung erstellen</h2>{admin&&<select className="input" value={form.customer_id} onChange={e=>setForm({...form,customer_id:e.target.value})}><option value="">Kunde wählen</option>{customers.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select>}<input className="input" type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/><input className="input" value={form.service} onChange={e=>setForm({...form,service:e.target.value})} placeholder="Leistung"/><button className="btn" onClick={add}>Speichern</button></div>
    <div className="card"><h2>Rechnungen</h2><table className="table"><tbody>{items.map(i=><tr key={i.id}><td>{i.invoice_number}</td><td>{i.customers?.name}</td><td>{i.amount}€</td><td>{i.status}</td><td><button className="btn small secondary" onClick={()=>openInvoicePdf(i.id)}>PDF</button></td></tr>)}</tbody></table></div>
  </div>
}

function LeadSearches() {
  const [items,setItems]=useState([])
  const [detail,setDetail]=useState(null)
  const [form,setForm]=useState({name:'',branch:'',area:''})
  const [contact,setContact]=useState({name:'',company:'',email:'',phone:''})
  useEffect(()=>{ load() },[])
  async function load(){ const {data}=await supabase.from('lead_searches').select('*, lead_contacts(*)').order('created_at',{ascending:false}); setItems(data||[]) }
  async function add(){ await supabase.from('lead_searches').insert({name:(form.name+' '+form.area).trim(),branch:form.branch,area:form.area,status:'Aktiv'}); setForm({name:'',branch:'',area:''}); load() }
  async function addContact(){ await supabase.from('lead_contacts').insert({...contact,lead_search_id:detail.id}); setContact({name:'',company:'',email:'',phone:''}); setDetail(null); load() }
  return <div className="grid">
    <div className="card"><h2>Suche hinzufügen</h2><input className="input" placeholder="Suchname" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input className="input" placeholder="Branche" value={form.branch} onChange={e=>setForm({...form,branch:e.target.value})}/><input className="input" placeholder="Ort" value={form.area} onChange={e=>setForm({...form,area:e.target.value})}/><button className="btn" onClick={add}>Speichern</button></div>
    <div className="card"><h2>Suchen</h2>{items.map(i=><div className="item" key={i.id} onClick={()=>setDetail(i)}>{i.name}<br/>{i.branch} · {i.area}<br/>Kontakte: {i.lead_contacts?.length||0}</div>)}</div>
    {detail&&<Modal title={detail.name} onClose={()=>setDetail(null)}><p>{detail.branch} · {detail.area}</p><input className="input" placeholder="Name" value={contact.name} onChange={e=>setContact({...contact,name:e.target.value})}/><input className="input" placeholder="Firma" value={contact.company} onChange={e=>setContact({...contact,company:e.target.value})}/><input className="input" placeholder="E-Mail" value={contact.email} onChange={e=>setContact({...contact,email:e.target.value})}/><input className="input" placeholder="Telefon" value={contact.phone} onChange={e=>setContact({...contact,phone:e.target.value})}/><button className="btn" onClick={addContact}>Kontakt speichern</button></Modal>}
  </div>
}

function QRCampaigns({ customers }) {
  const [items,setItems]=useState([])
  const [customer,setCustomer]=useState('')
  const [mail,setMail]=useState('')
  useEffect(()=>{ load() },[])
  async function load(){ const {data}=await supabase.from('qr_campaigns').select('*, customers(*)'); setItems(data||[]) }
  async function add(){ const c=customers.find(x=>x.id===customer); await supabase.from('qr_campaigns').insert({customer_id:customer,name:c?.name||'QR Kampagne',target_url:'/review/'+customer,negative_feedback_email:mail||c?.email}); setCustomer('');setMail('');load() }
  return <div className="grid">
    <div className="card"><h2>QR Kampagne</h2><select className="input" value={customer} onChange={e=>setCustomer(e.target.value)}><option value="">Kunde wählen</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input className="input" placeholder="Feedback Mail" value={mail} onChange={e=>setMail(e.target.value)}/><button className="btn" onClick={add}>Speichern</button></div>
    <div className="card"><h2>Kampagnen</h2>{items.map(i=><div className="item" key={i.id}>{i.name}<br/>{i.customers?.name}<br/>{i.negative_feedback_email}</div>)}</div>
  </div>
}

function Integrations({ customer }) {
  const [items,setItems]=useState([])
  const [platform,setPlatform]=useState('Google Business')
  const [key,setKey]=useState('')
  useEffect(()=>{ if(customer) load() },[customer])
  async function load(){ const {data}=await supabase.from('integrations').select('*').eq('customer_id',customer.id); setItems(data||[]) }
  async function add(){ await supabase.from('integrations').upsert({customer_id:customer.id,platform,api_key:key},{onConflict:'customer_id,platform'}); setKey(''); load() }
  if(!customer) return null
  return <div className="grid">
    <div className="card"><h2>Integration hinzufügen</h2><select className="input" value={platform} onChange={e=>setPlatform(e.target.value)}>{['Google Business','Meta','Search Console','Google Analytics','Stripe','DATEV','WhatsApp API'].map(p=><option key={p}>{p}</option>)}</select><input className="input" value={key} onChange={e=>setKey(e.target.value)} placeholder="API Key"/><button className="btn" onClick={add}>Speichern</button></div>
    <div className="card"><h2>Gespeichert</h2>{items.map(i=><div className="item" key={i.id}><b>{i.platform}</b><br/>{i.api_key}</div>)}</div>
  </div>
}
