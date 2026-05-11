
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
const hours = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00']
function viewLabel(v){return ({dashboard:'📊 Dashboard',profile:'👤 Profil',crm:'🏢 Kunden CRM',customerDemo:'🧪 Kundendemo',users:'👥 Benutzer',customers:'🏢 Kunden löschen/anlegen',leadMeetings:'📅 Lead Gespräche',tickets:'🎫 Tickets Admin',templates:'✉️ E-Mail Vorlagen',invoices:'💶 Rechnungen',leadSearches:'🔎 Lead Scraper',qr:'▦ QR Kampagnen',packages:'📦 Pakete verwalten',pipeline:'💰 Sales Pipeline',goalsAdmin:'🎯 Ziele',growthTools:'🧠 Growth Tools',audit:'🕵️ Audit Log',salesPage:'💼 Verkaufsseite',customerDashboard:'🏠 Kunden Dashboard',booking:'🗓️ Booking',customerTickets:'🎫 Support',seo:'📈 SEO Dashboard',reviewAI:'🤖 Review KI',attribution:'📊 Attribution',goals:'🎯 Ziele',referrals:'🎁 Empfehlungen',competitorAds:'🕵️ Konkurrenz Ads',locations:'📍 Standorte',reminders:'📨 Mahnungen',integrations:'🔌 Integrationen'}[v]||v)}
function today(){return new Date().toISOString().slice(0,10)}
function plus14(){let d=new Date();d.setDate(d.getDate()+14);return d.toISOString().slice(0,10)}
function money(v){return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(v||0))}

const PACKAGE_CATALOG = {
  Starter:{price:199,tools:['reviews','qr','reports','tickets'],label:'Review-System, QR, Reports, Tickets'},
  Growth:{price:499,tools:['reviews','qr','reports','tickets','seo','booking','invoices'],label:'SEO, Booking, Reviews, Rechnungen, Reports'},
  Premium:{price:899,tools:['reviews','qr','reports','tickets','seo','booking','invoices','integrations','reminders','templates'],label:'Alle Kundentools inkl. Integrationen & Mahnungen'},
  Individuell:{price:0,tools:[],label:'Individuell durch Admin freischalten'}
}
async function unlockPackageForCustomer(customerId, packageName, customTools=[]){
  const cfg = PACKAGE_CATALOG[packageName] || PACKAGE_CATALOG.Individuell
  const tools = packageName === 'Individuell' ? customTools : cfg.tools
  if(!customerId || !tools.length) return
  await Promise.all(tools.map(tool_key =>
    supabase.from('customer_tool_access').upsert({
      customer_id: customerId,
      tool_key,
      enabled: true,
      source_package: packageName
    }, { onConflict:'customer_id,tool_key' })
  ))
}

function monday(offset=0){const d=new Date();const day=d.getDay()||7;d.setDate(d.getDate()-day+1+offset*7);return d}
function weekDays(offset=0){const m=monday(offset);return Array.from({length:7},(_,i)=>{const d=new Date(m);d.setDate(m.getDate()+i);const iso=d.toISOString().slice(0,10);return {iso,label:d.toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'})}})}
function initials(name){return (name||'?').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase()}
function Modal({ title, onClose, children }){return <div className="modalBg"><div className="modal"><div className="row" style={{justifyContent:'space-between'}}><h2>{title}</h2><button className="btn secondary" onClick={onClose}>×</button></div>{children}</div></div>}
function CustomerChip({customer,onOpen}){if(!customer)return null;return <button className="item" onClick={()=>onOpen&&onOpen(customer)}><b>{customer.name}</b><br/><span className="muted">{customer.email||'-'} · {customer.phone||'-'}</span></button>}

function Login({ onSession }){
  const [email,setEmail]=useState('admin@agentur.local'),[password,setPassword]=useState(''),[show,setShow]=useState(false),[error,setError]=useState(''),[registerOpen,setRegisterOpen]=useState(false)
  async function login(){setError('');const{data,error}=await supabase.auth.signInWithPassword({email,password});if(error)return setError(error.message);onSession(data.session)}
  return <main className="login"><div className="box"><h1>Mecklenburg Marketing OS</h1><p>Echter Login mit Passwort-Abfrage.</p><input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-Mail"/><div className="row" style={{gap:0}}><input className="input" style={{flex:1}} value={password} onChange={e=>setPassword(e.target.value)} type={show?'text':'password'} placeholder="Passwort"/><button className="btn secondary" onClick={()=>setShow(!show)}>{show?'🙈':'👁️'}</button></div>{error&&<p style={{color:'#ef4444'}}>{error}</p>}<button className="btn" onClick={login}>🔐 Einloggen</button><button className="btn secondary" onClick={()=>setRegisterOpen(true)}>📝 Registrieren</button><div className="card" style={{marginTop:18}}><b>Testlogins nach Bootstrap:</b><br/>Admin: admin@agentur.local / AdminDemo123!<br/>Demo-Kunde: kunde.demo@agentur.local / KundeDemo123!<br/>Echter Kunde: kunde.echt@agentur.local / KundeEcht123!</div></div>{registerOpen&&<RegisterModal onClose={()=>setRegisterOpen(false)} onRegistered={async (mail,pw)=>{setEmail(mail);setPassword(pw);setRegisterOpen(false); const {data,error}=await supabase.auth.signInWithPassword({email:mail,password:pw}); if(error){setError(error.message)} else {onSession(data.session)}}}/>}</main>
}

export default function Home(){
  const [session,setSession]=useState(null),[profile,setProfile]=useState(null),[view,setView]=useState('dashboard'),[theme,setTheme]=useState('light')
  const [customers,setCustomers]=useState([]),[activeCustomer,setActiveCustomer]=useState(null),[crmCustomer,setCrmCustomer]=useState(null),[customerEnv,setCustomerEnv]=useState(false)
  useEffect(()=>{supabase.auth.getSession().then(({data})=>setSession(data.session));const{data:sub}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>sub.subscription.unsubscribe()},[])
  useEffect(()=>{if(session?.user)loadBase()},[session])
  async function loadBase(){
    const {data:prof,error}=await supabase.from('profiles').select('*').eq('id',session.user.id).single()
    if(error){setProfile(null);return}
    setProfile(prof)
    if(prof.role==='admin'||prof.role==='employee'){
      const {data}=await supabase.from('customers').select('*').order('created_at',{ascending:false})
      setCustomers(data||[]);setActiveCustomer((data||[]).find(c=>c.name==='Demo Friseur Rostock')||(data||[])[0]||null)
    } else {
      const {data}=await supabase.from('user_customer_access').select('customers(*)').eq('user_id',session.user.id)
      const list=(data||[]).map(x=>x.customers).filter(Boolean);setCustomers(list);setActiveCustomer(list[0]||null);setCustomerEnv(true);setView((list[0]?.revenue===0 && list[0]?.rating===0)?'salesPage':'customerDashboard')
    }
  }
  async function logout(){await supabase.auth.signOut();setSession(null);setProfile(null)}
  function openCrm(c){setCrmCustomer(c);setView('crm');setCustomerEnv(false)}
  function enterCustomer(c){setActiveCustomer(c);setCustomerEnv(true);setView((list[0]?.revenue===0 && list[0]?.rating===0)?'salesPage':'customerDashboard')}
  if(!session)return <Login onSession={setSession}/>
  if(!profile)return <main className="login"><div className="box"><h1>Profil fehlt</h1><p>Der Auth-User existiert, aber kein profiles-Eintrag.</p></div></main>
  const adminViews=['dashboard','crm','customerDemo','users','customers','leadMeetings','tickets','templates','invoices','reminders','leadSearches','qr','packages','pipeline','goalsAdmin','growthTools','audit']
  const customerViews=(activeCustomer?.revenue===0 && activeCustomer?.rating===0)?['salesPage']:['customerDashboard','booking','seo','reviewAI','customerTickets','templates','invoices','attribution','goals','referrals','competitorAds','locations','reminders','integrations']
  const views=customerEnv?customerViews:adminViews
  return <div data-theme={theme} className="page"><div className="app"><aside className="side"><h2>MM OS</h2><p><b>{profile.full_name}</b><br/><span>{profile.role}</span>{activeCustomer&&<><br/><span>{customerEnv?'Kundenumgebung: ':'Aktiv: '}{activeCustomer.name}</span></>}</p>{profile.role!=='customer'&&customerEnv&&<button className="btn" onClick={()=>{setCustomerEnv(false);setView('dashboard')}}>⬅ Adminbereich</button>}{views.map(v=><button key={v} className={view===v?'btn':'btn secondary'} onClick={()=>setView(v)}>{viewLabel(v)}</button>)}<button className="btn secondary" onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?'☀️ Light':'🌙 Dark'}</button><button className="btn red" onClick={logout}>🚪 Logout</button></aside><main className="main"><div className="top"><div><h1>{viewLabel(view)}</h1>{activeCustomer&&<p className="muted">{customerEnv?'Kundenumgebung geöffnet':'Adminbereich'} · {activeCustomer.name}</p>}</div></div>
    {view==='dashboard'&&<AdminDashboard customers={customers}/>}
    {view==='crm'&&<CRM customers={customers} reload={loadBase} openCrm={openCrm} setActiveCustomer={setActiveCustomer} crmCustomer={crmCustomer} setCrmCustomer={setCrmCustomer}/>}
    {view==='customerDemo'&&<CustomerDemo customers={customers} activeCustomer={activeCustomer} enterCustomer={enterCustomer}/>}
    {view==='users'&&<Users customers={customers}/>}
    {view==='customers'&&<Customers reload={loadBase}/>}
    {view==='leadMeetings'&&<LeadMeetings customers={customers} openCrm={openCrm}/>}
    {view==='tickets'&&<AdminTickets openCrm={openCrm}/>}
    {view==='templates'&&<Templates/>}
    {view==='invoices'&&<Invoices customer={activeCustomer} admin={!customerEnv} customers={customers}/>}
    {view==='leadSearches'&&<LeadSearches/>}
    {view==='qr'&&<QRCampaigns customers={customers} openCrm={openCrm}/>}
    {view==='packages'&&<PackageManager/>}
    
    {view==='pipeline'&&<SalesPipeline customers={customers} openCrm={openCrm}/>}
    {view==='goalsAdmin'&&<GoalsAdmin openCrm={openCrm}/>}
    {view==='growthTools'&&<GrowthToolsAdmin customers={customers}/>}
    {view==='reviewAI'&&<ReviewAIAssistant customer={activeCustomer}/>}
    {view==='attribution'&&<CampaignAttribution customer={activeCustomer}/>}
    {view==='goals'&&<CustomerGoals customer={activeCustomer}/>}
    {view==='referrals'&&<ReferralProgram customer={activeCustomer}/>}
    {view==='competitorAds'&&<CompetitorAds customer={activeCustomer}/>}
    {view==='locations'&&<MultiLocationManager customer={activeCustomer}/>}

    {view==='audit'&&<Audit/>}
    {view==='salesPage'&&<SalesPage customer={activeCustomer}/>} 
    {view==='customerDashboard'&&<CustomerDashboard customer={activeCustomer} openCrm={openCrm}/>}
    {view==='booking'&&<Booking customer={activeCustomer}/>}
    {view==='customerTickets'&&<CustomerTickets customer={activeCustomer} profile={profile}/>}
    {view==='seo'&&<SEODashboard customer={activeCustomer}/>} 
    {view==='reminders'&&<Reminders customer={activeCustomer} admin={!customerEnv} customers={customers}/>} 
    {view==='integrations'&&<Integrations customer={activeCustomer}/>}
  </main></div></div>
}


function RegisterModal({onClose,onRegistered}){
  const [form,setForm]=useState({business_name:'',branch:'',contact_name:'',email:'',phone:'',password:''})
  const [loading,setLoading]=useState(false),[error,setError]=useState('')
  async function register(){
    setLoading(true);setError('')
    const res=await fetch((process.env.NEXT_PUBLIC_API_BASE||'http://localhost:4000')+'/api/register/customer',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(form)
    })
    const data=await res.json()
    setLoading(false)
  }
  async function submit(){
    setLoading(true);setError('')
    const res=await fetch((process.env.NEXT_PUBLIC_API_BASE||'http://localhost:4000')+'/api/register/customer',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(form)
    })
    const data=await res.json()
    setLoading(false)
    if(!data.ok)return setError(data.error||'Registrierung fehlgeschlagen')
    alert('Registrierung erfolgreich. Du kannst dich jetzt einloggen.')
    onRegistered(form.email,form.password)
  }
  return <Modal title="Registrieren" onClose={onClose}>
    <p className="muted">Erstellt einen neuen Kunden im CRM. Nach Login sieht dieser Kunde zunächst nur die Verkaufsseite.</p>
    <input className="input" placeholder="Betriebsname" value={form.business_name} onChange={e=>setForm({...form,business_name:e.target.value})}/>
    <input className="input" placeholder="Branche" value={form.branch} onChange={e=>setForm({...form,branch:e.target.value})}/>
    <input className="input" placeholder="Kontaktperson / Kontaktdaten" value={form.contact_name} onChange={e=>setForm({...form,contact_name:e.target.value})}/>
    <input className="input" placeholder="E-Mail" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
    <input className="input" placeholder="Telefonnummer" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
    <input className="input" type="password" placeholder="Passwort" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
    {error&&<p style={{color:'#ef4444'}}>{error}</p>}
    <button className="btn" disabled={loading} onClick={submit}>{loading?'Bitte warten...':'Konto registrieren'}</button>
  </Modal>
}

function SalesPage({customer}){
  const [sent,setSent]=useState('')
  async function requestPackage(packageName){
    const cfg=PACKAGE_CATALOG[packageName]
    const {error}=await supabase.from('package_requests').insert({
      customer_id:customer.id,
      package_name:packageName,
      status:'Neu',
      requested_price:cfg.price,
      requested_tools:cfg.tools
    })
    if(error)return alert(error.message)
    setSent(packageName)
    alert('Paket angefragt: '+packageName+'. Der Admin sieht jetzt eine Benachrichtigung im CRM.')
  }
  if(!customer)return null
  return <div>
    <div className="hero"><h1>Willkommen bei Mecklenburg Marketing OS</h1><p>{customer.name} · Deine Plattform ist angelegt. Wähle jetzt ein Paket aus, damit wir deine Tools freischalten können.</p></div>
    {sent&&<div className="card"><h2>Anfrage gesendet</h2><p>Deine Anfrage für <b>{sent}</b> wurde an den Admin übermittelt.</p></div>}
    <div className="grid">
      <div className="card"><h2>Starter</h2><div className="kpi">199€</div><p>{PACKAGE_CATALOG.Starter.label}</p><p><b>Fester Preis:</b> {money(PACKAGE_CATALOG.Starter.price)}/Monat</p><button className="btn" onClick={()=>requestPackage('Starter')}>Starter anfragen</button></div>
      <div className="card"><h2>Growth</h2><div className="kpi">499€</div><p>{PACKAGE_CATALOG.Growth.label}</p><p><b>Fester Preis:</b> {money(PACKAGE_CATALOG.Growth.price)}/Monat</p><button className="btn" onClick={()=>requestPackage('Growth')}>Growth anfragen</button></div>
      <div className="card"><h2>Premium</h2><div className="kpi">899€</div><p>{PACKAGE_CATALOG.Premium.label}</p><p><b>Fester Preis:</b> {money(PACKAGE_CATALOG.Premium.price)}/Monat</p><button className="btn" onClick={()=>requestPackage('Premium')}>Premium anfragen</button></div>
    </div>
    <div className="grid">
      <div className="card"><h2>Deine hinterlegten Daten</h2><p><b>Betrieb:</b> {customer.name}</p><p><b>E-Mail:</b> {customer.email}</p><p><b>Telefon:</b> {customer.phone}</p><p><b>Branche:</b> {customer.branch||'-'}</p></div>
      <div className="card"><h2>Nächster Schritt</h2><p>Nach Paketfreischaltung erscheinen hier deine Kundentools: SEO, Booking, Tickets, Rechnungen, Integrationen und Reports.</p></div>
    </div>
  </div>
}
function AdminDashboard({customers}){
  const [offerRevenue,setOfferRevenue]=useState(0)
  const [bookingRevenue,setBookingRevenue]=useState(0)
  const [offers,setOffers]=useState([])
  const [requests,setRequests]=useState([])
  useEffect(()=>{loadRevenue()},[])
  async function loadRevenue(){
    const {data:offerData}=await supabase.from('offers').select('*')
    const accepted=(offerData||[]).filter(o=>['Angenommen','Beauftragt','Gewonnen'].includes(o.status))
    setOffers(offerData||[])
    setOfferRevenue(accepted.reduce((s,o)=>s+Number(o.amount||0),0))

    const {data:bookingData}=await supabase
      .from('appointments')
      .select('*, service_categories(price)')
    setBookingRevenue((bookingData||[]).reduce((s,a)=>s+Number(a.service_categories?.price||0),0))
    const {data:reqs}=await supabase.from('package_requests').select('*, customers(*)').eq('status','Neu').order('created_at',{ascending:false}); setRequests(reqs||[])
  }
  const active=customers.filter(c=>c.status==='Aktiv').length
  const leads=customers.filter(c=>c.status==='Lead').length
  return <><div className="hero"><h1>Admin Dashboard</h1><p>Monatsumsatz = angenommene Angebote. Kundenumsatz = Booking-Termine mit Kategoriepreis.</p></div><div className="grid"><div className="card"><h2>Kunden insgesamt</h2><div className="kpi">{customers.length}</div><p className="muted">+12% zur Vorwoche</p></div><div className="card"><h2>Aktive Kunden</h2><div className="kpi">{active}</div><p className="muted">+8% zur Vorwoche</p></div><div className="card"><h2>Neue Leads</h2><div className="kpi">{leads}</div><p className="muted">+18% zur Vorwoche</p></div><div className="card"><h2>Monatsumsatz Angebote</h2><div className="kpi">{money(offerRevenue)}</div><p className="muted">aus angenommenen Angeboten</p></div><div className="card"><h2>Kundenumsatz Booking</h2><div className="kpi">{money(bookingRevenue)}</div><p className="muted">Termine × Kategoriepreis</p></div></div><div className="grid">{requests.length>0&&<div className="card" style={{border:'3px solid #f59e0b',animation:'pulse 1s infinite'}}><h2>🔔 Paket-Anfragen</h2>{requests.map(r=><div className="item" key={r.id}><b>{r.customers?.name}</b><br/>{r.package_name}<br/><button className="btn" onClick={async ()=>{
      await unlockPackageForCustomer(r.customer_id,r.package_name,r.requested_tools||[])
      await supabase.from('package_requests').update({status:'Bearbeitet',handled_at:new Date().toISOString()}).eq('id',r.id)
      alert('Tools für '+r.package_name+' wurden freigeschaltet.')
      loadRevenue()
    }}>Tools freischalten</button></div>)}</div>}<div className="card"><h2>Angebote</h2>{offers.map(o=><div className="item" key={o.id}>{o.offer_number} · {o.title}<br/>{money(o.amount)} · {o.status}</div>)}</div><div className="card"><h2>Umsatzentwicklung</h2><div className="item">Jan ▂ Feb ▃ Mär ▅ Apr ▆ Mai █</div></div></div></>
}
function CustomerDashboard({customer,openCrm}){
  const [bookingRevenue,setBookingRevenue]=useState(0)
  useEffect(()=>{if(customer)load()},[customer])
  async function load(){
    const {data}=await supabase
      .from('appointments')
      .select('*, service_categories(price)')
      .eq('customer_id',customer.id)
    setBookingRevenue((data||[]).reduce((s,a)=>s+Number(a.service_categories?.price||0),0))
  }
  if(!customer)return null
  return <><div className="hero"><h1>{customer.name}</h1><p>Kundenumgebung mit Kundentools.</p></div><div className="grid"><div className="card"><h2>Profil</h2><CustomerChip customer={customer} onOpen={openCrm}/></div><div className="card"><h2>Bewertung</h2><div className="kpi">{customer.rating||0}★</div></div><div className="card"><h2>Kundenumsatz</h2><div className="kpi">{money(bookingRevenue)}</div><p className="muted">aus Booking-Terminen und Kategoriepreisen</p></div></div></>
}
function CustomerDemo({customers,activeCustomer,enterCustomer}){const [selected,setSelected]=useState(activeCustomer?.id||'');const c=customers.find(x=>x.id===selected)||activeCustomer;return <div><div className="hero"><h1>Kundendemo öffnen</h1><p>Wähle den Kunden aus, in dessen Umgebung du gehen willst.</p></div><div className="grid"><div className="card"><h2>Kunde auswählen</h2><select className="input" value={selected} onChange={e=>setSelected(e.target.value)}>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="btn" onClick={()=>c&&enterCustomer(c)}>🧪 Zur Kundendemo wechseln</button></div><div className="card"><h2>Vorschau</h2><CustomerChip customer={c}/></div></div></div>}

function CRM({customers,reload,openCrm,setActiveCustomer,crmCustomer,setCrmCustomer}){const[filter,setFilter]=useState('Alle'),[newOpen,setNewOpen]=useState(false),[packageRequests,setPackageRequests]=useState([]);useEffect(()=>{loadPackageRequests()},[]);async function loadPackageRequests(){const{data}=await supabase.from('package_requests').select('*, customers(*)').eq('status','Neu').order('created_at',{ascending:false});setPackageRequests(data||[])}const list=filter==='Alle'?customers:customers.filter(c=>c.status===filter);async function del(c){if(!confirm('Kunde wirklich aus der Datenbank löschen? '+c.name))return;const{error}=await supabase.from('customers').delete().eq('id',c.id);if(error)return alert(error.message);setCrmCustomer(null);reload&&reload()}if(crmCustomer)return <CRMDetail customer={crmCustomer} onBack={()=>setCrmCustomer(null)}/>;return <div><div className="hero"><h1>Kunden CRM</h1><p>Statusfilter, CRM Detail, Kontakte, Notizen, Dateien, Verlauf, Rechnungen, Angebote und Datenzentrale.</p></div>{packageRequests?.length>0&&<div className="card" style={{border:'3px solid #f59e0b',animation:'pulse 1s infinite'}}><h2>🔔 Neue Paket-Anfragen</h2>{packageRequests.map(r=><div className="item" key={r.id}><b>{r.customers?.name}</b><br/>Paket: {r.package_name} · {money(r.requested_price)}<br/>Tools: {(r.requested_tools||[]).join(', ')}<br/><button className="btn" onClick={async()=>{await unlockPackageForCustomer(r.customer_id,r.package_name,r.requested_tools||[]);await supabase.from('package_requests').update({status:'Bearbeitet',handled_at:new Date().toISOString()}).eq('id',r.id);alert('Paket freigeschaltet');loadPackageRequests();}}>Tools freischalten</button></div>)}</div>}<div className="row">{['Alle','Aktiv','Lead','Inaktiv'].map(s=><button key={s} className={filter===s?'btn':'btn secondary'} onClick={()=>setFilter(s)}>{s}</button>)}<button className="btn" onClick={()=>setNewOpen(true)}>➕ Neuer Kunde</button></div><div className="card"><table className="table"><thead><tr><th>Kunde</th><th>Kontakt</th><th>Status</th><th>Umsatz</th><th>Aktion</th></tr></thead><tbody>{list.map(c=><tr key={c.id}><td><button className="btn secondary" onClick={()=>setCrmCustomer(c)}>{c.name}</button><br/><span className="muted">{c.branch||'Keine Branche'}</span></td><td>{c.email||'-'}<br/>{c.phone||'-'}</td><td><span className="badge">{c.status}</span></td><td>{money(c.revenue)}</td><td><button className="btn secondary" onClick={()=>setCrmCustomer(c)}>CRM</button><select className="input" style={{width:120}} value={c.status} onChange={async e=>{await supabase.from('customers').update({status:e.target.value}).eq('id',c.id); reload&&reload()}}><option>Aktiv</option><option>Lead</option><option>Inaktiv</option></select><button className="btn red" onClick={()=>del(c)}>Löschen</button></td></tr>)}</tbody></table></div>{newOpen&&<NewCustomerModal onClose={()=>setNewOpen(false)} reload={reload}/>}</div>}
function NewCustomerModal({onClose,reload}){const[form,setForm]=useState({name:'',contact_name:'',email:'',phone:'',status:'Lead',branch:''});async function save(){await supabase.from('customers').insert({...form,revenue:0,rating:0});onClose();reload&&reload()}return <Modal title="Neuen Kunden anlegen" onClose={onClose}>{['name','contact_name','email','phone','branch'].map(k=><input key={k} className="input" placeholder={k} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/>) }<select className="input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Aktiv</option><option>Lead</option><option>Inaktiv</option></select><button className="btn" onClick={save}>💾 Kunde speichern</button></Modal>}
function CRMDetail({customer,onBack}){const[tab,setTab]=useState('Übersicht');const tabs=['Übersicht','Kontakte','Notizen','Dateien','Verlauf','Rechnungen','Angebote','Verträge','AI Insights','Ziele','Tool Datenzentrale','Integrationen'];return <div><button className="btn secondary" onClick={onBack}>← Zurück</button><div className="hero"><h1>{customer.name}</h1><p>{customer.email} · {customer.phone}</p></div><div className="row">{tabs.map(t=><button key={t} className={tab===t?'btn':'btn secondary'} onClick={()=>setTab(t)}>{t}</button>)}</div>{tab==='Übersicht'&&<CRMOverview customer={customer}/>} {tab==='Kontakte'&&<CRMContacts customer={customer}/>} {tab==='Notizen'&&<CRMNotes customer={customer}/>} {tab==='Dateien'&&<CRMFiles/>} {tab==='Verlauf'&&<CRMHistory/>} {tab==='Rechnungen'&&<CRMInvoices customer={customer}/>} {tab==='Angebote'&&<CRMOffers customer={customer}/>} {tab==='Verträge'&&<Contracts customer={customer}/>} {tab==='AI Insights'&&<AIInsights customer={customer}/>} {tab==='Ziele'&&<CustomerGoals customer={customer}/>} {tab==='Tool Datenzentrale'&&<CRMToolCenter/>} {tab==='Integrationen'&&<Integrations customer={customer}/>}</div>}
function CRMOverview({customer}){return <div className="grid"><UploadBox customer={customer} area="Kunden CRM"/><div className="card"><h2>Unternehmensdaten</h2><CustomerChip customer={customer}/></div><div className="card"><h2>KPIs</h2><div className="kpi">{money(customer.revenue)}</div><div className="item">⭐ Bewertung: {customer.rating||0}</div><div className="item">🏷️ Status: {customer.status}</div></div><div className="card"><h2>Schnellaktionen</h2><button className="btn secondary" onClick={()=>window.open((process.env.NEXT_PUBLIC_API_BASE||'http://localhost:4000')+'/api/report/customer','_blank')}>📊 Report PDF</button><button className="btn secondary" onClick={()=>alert('Tickets findest du im CRM-Tab Tickets/Admin Tickets')}>🎫 Tickets anzeigen</button><button className="btn secondary" onClick={()=>alert('Rechnungen sind im Tab Rechnungen sichtbar')}>💶 Rechnungen anzeigen</button></div></div>}
function CRMContacts({customer}){const[items,setItems]=useState([]),[form,setForm]=useState({name:'',email:'',phone:'',role:''});useEffect(()=>{load()},[customer]);async function load(){const{data}=await supabase.from('customer_contacts').select('*').eq('customer_id',customer.id).order('created_at',{ascending:false});setItems(data||[])}async function add(){await supabase.from('customer_contacts').insert({...form,customer_id:customer.id});setForm({name:'',email:'',phone:'',role:''});load()}return <div className="grid"><div className="card"><h2>Kontakt hinzufügen</h2>{['name','email','phone','role'].map(k=><input key={k} className="input" placeholder={k} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/>) }<button className="btn" onClick={add}>Speichern</button></div><div className="card"><h2>Kontakte</h2>{items.map(i=><div className="item" key={i.id}>{i.name}<br/>{i.email}<br/>{i.phone}<br/>{i.role}</div>)}</div></div>}
function CRMNotes({customer}){const[items,setItems]=useState([]),[note,setNote]=useState('');useEffect(()=>{load()},[customer]);async function load(){const{data}=await supabase.from('customer_notes').select('*, profiles(full_name)').eq('customer_id',customer.id).order('created_at',{ascending:false});setItems(data||[])}async function add(){const{data:{user}}=await supabase.auth.getUser();await supabase.from('customer_notes').insert({customer_id:customer.id,note,author_id:user?.id});setNote('');load()}return <div className="grid"><div className="card"><h2>Notiz</h2><textarea className="input" rows="6" value={note} onChange={e=>setNote(e.target.value)}/><button className="btn" onClick={add}>Speichern</button></div><div className="card"><h2>Notizen</h2>{items.map(i=><div className="item" key={i.id}>{i.note}<br/><span className="muted">{i.profiles?.full_name||'User'} · {new Date(i.created_at).toLocaleString('de-DE')}</span></div>)}</div></div>}
function CRMFiles(){return <div className="card"><h2>Dateien</h2><input className="input" type="file"/><button className="btn">Datei vormerken</button><div className="item">Mustervertrag.pdf<br/><button className="btn secondary">Öffnen</button></div></div>}
function CRMHistory(){return <div className="card"><h2>Verlauf</h2>{['Kunde angelegt','Erstgespräch','Angebot','Rechnung','Report'].map(i=><div className="item" key={i}>{i}</div>)}</div>}
function CRMInvoices({customer}){const[items,setItems]=useState([]);useEffect(()=>{supabase.from('invoices').select('*').eq('customer_id',customer.id).order('created_at',{ascending:false}).then(({data})=>setItems(data||[]))},[customer]);return <div className="card"><h2>Rechnungen</h2>{items.map(i=><div className="item" key={i.id}>{i.invoice_number} · {money(i.amount)} · {i.status}</div>)}</div>}
function CRMOffers({customer}){
  const [items,setItems]=useState([])
  const [file,setFile]=useState(null)
  const [form,setForm]=useState({title:'',amount:PACKAGE_CATALOG.Starter.price,status:'Offen',package_name:'Starter',customTools:[]})
  useEffect(()=>{if(customer)load()},[customer])
  async function load(){
    const {data}=await supabase.from('offers').select('*').eq('customer_id',customer.id).order('created_at',{ascending:false})
    setItems(data||[])
  }
  async function add(){
    await supabase.from('offers').insert({
      offer_number:'ANG-'+Date.now(),
      customer_id:customer.id,
      title:form.title || (form.package_name+' Angebot'),
      amount:form.amount,
      status:form.status,
      package_name:form.package_name,
      package_price:form.amount,
      package_tools:form.package_name==='Individuell'?(form.customTools||[]):PACKAGE_CATALOG[form.package_name].tools,
      file_name:file?.name || null,
      file_url:'#',
      uploaded_at:file?new Date().toISOString():null
    })
    await unlockPackageForCustomer(customer.id,form.package_name,form.customTools||[])
    alert('Angebot gespeichert und Paket/Tools sofort freigeschaltet.')
    setForm({title:'',amount:PACKAGE_CATALOG.Starter.price,status:'Offen',package_name:'Starter',customTools:[]})
    setFile(null)
    load()
  }
  return <div className="grid"><div className="card"><h2>Angebot hochladen/erstellen</h2>
    <select className="input" value={form.package_name} onChange={e=>{const p=e.target.value;setForm({...form,package_name:p,amount:PACKAGE_CATALOG[p]?.price||0})}}><option>Starter</option><option>Growth</option><option>Premium</option><option>Individuell</option></select>
    {form.package_name==='Individuell'&&<div className="card"><h2>Individuelle Tools</h2>{['reviews','qr','reports','tickets','seo','booking','invoices','integrations','reminders','templates'].map(t=><label key={t} className="item"><input type="checkbox" checked={(form.customTools||[]).includes(t)} onChange={e=>{const arr=form.customTools||[];setForm({...form,customTools:e.target.checked?[...arr,t]:arr.filter(x=>x!==t)})}}/> {t}</label>)}</div>}<input className="input" placeholder="Leistung / Titel" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
    <input className="input" type="number" placeholder="Preis / Monatsumsatz" value={form.amount} disabled={form.package_name!=='Individuell'} onChange={e=>setForm({...form,amount:e.target.value})}/><p className="muted">Starter/Growth/Premium haben feste Preise. Nur Individuell ist frei bepreisbar.</p>
    <select className="input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Offen</option><option>Angenommen</option><option>Beauftragt</option><option>Gewonnen</option><option>Abgelehnt</option></select>
    <input className="input" type="file" onChange={e=>setFile(e.target.files?.[0]||null)}/>
    {file&&<p className="muted">Ausgewählt: {file.name}</p>}
    <button className="btn" onClick={add}>Angebot speichern</button>
  </div><div className="card"><h2>Angebote</h2>{items.map(o=><div className="item" key={o.id}>{o.offer_number} · {o.package_name||'-'} · {o.title}<br/>{money(o.amount)} · {o.status}<br/>{o.file_name&&<>Datei: {o.file_name}</>}</div>)}</div></div>
}
function CRMToolCenter(){return <div className="grid"><div className="card"><h2>SEO einspeisen</h2><input className="input" placeholder="Traffic"/><button className="btn">Speichern</button></div><div className="card"><h2>Reviews einspeisen</h2><input className="input" placeholder="Ø Bewertung"/><button className="btn">Speichern</button></div></div>}

function Calendar({items,onOpen}){const[week,setWeek]=useState(0);const days=weekDays(week);return <div><div className="row"><button className="btn secondary" onClick={()=>setWeek(week-1)}>← Woche</button><button className="btn secondary" onClick={()=>setWeek(week+1)}>Woche →</button><b>{days[0].label} bis {days[6].label}</b></div><div style={{overflow:'auto',maxHeight:560}}><div style={{display:'grid',gridTemplateColumns:'80px repeat(7,1fr)',minWidth:900}}><div className="item">Zeit</div>{days.map(d=><div className="item" key={d.iso}>{d.label}</div>)}{hours.map(h=><><div className="item" key={h}>{h}</div>{days.map(d=><div className="item" key={h+d.iso} style={{minHeight:80}}>{items.filter(i=>i.date===d.iso&&i.from===h).map((i,idx)=><button key={idx} className="btn secondary" onClick={()=>onOpen&&onOpen(i)}>{i.title}<br/>{i.goal||i.service}</button>)}</div>)}</>)}</div></div></div>}
function LeadMeetings({customers,openCrm}){const[items,setItems]=useState([]),[open,setOpen]=useState(false),[form,setForm]=useState({customer_id:'',meeting_date:today(),start_time:'10:00',end_time:'11:00',goal:''});useEffect(()=>{load()},[]);async function load(){const{data}=await supabase.from('lead_meetings').select('*, customers(*)').order('meeting_date',{ascending:true});setItems(data||[])}async function add(){await supabase.from('lead_meetings').insert(form);setOpen(false);load()}const cal=items.map(i=>({date:i.meeting_date,from:i.start_time?.slice(0,5),title:i.customers?.name,goal:i.goal,customer:i.customers}));return <div><button className="btn" onClick={()=>setOpen(true)}>➕ Lead Gespräch</button><div className="card"><Calendar items={cal} onOpen={i=>i.customer&&openCrm(i.customer)}/></div>{open&&<Modal title="Lead Gespräch anlegen" onClose={()=>setOpen(false)}><select className="input" value={form.customer_id} onChange={e=>setForm({...form,customer_id:e.target.value})}><option value="">Kunde wählen</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input className="input" type="date" value={form.meeting_date} onChange={e=>setForm({...form,meeting_date:e.target.value})}/><input className="input" value={form.start_time} onChange={e=>setForm({...form,start_time:e.target.value})}/><input className="input" value={form.end_time} onChange={e=>setForm({...form,end_time:e.target.value})}/><textarea className="input" rows="4" placeholder="Gesprächsziel" value={form.goal} onChange={e=>setForm({...form,goal:e.target.value})}/><button className="btn" onClick={add}>Speichern</button></Modal>}</div>}
function Booking({customer}){const[cats,setCats]=useState([]),[apps,setApps]=useState([]),[open,setOpen]=useState(false),[catOpen,setCatOpen]=useState(false),[cat,setCat]=useState({name:'',price:0}),[form,setForm]=useState({client_name:'',appointment_date:today(),start_time:'09:00',end_time:'10:00',service_category_id:''});useEffect(()=>{if(customer)load()},[customer]);async function load(){const{data:c}=await supabase.from('service_categories').select('*').eq('customer_id',customer.id);const{data:a}=await supabase.from('appointments').select('*, service_categories(*)').eq('customer_id',customer.id).order('appointment_date',{ascending:true});setCats(c||[]);setApps(a||[])}async function addCat(){await supabase.from('service_categories').insert({customer_id:customer.id,...cat});setCatOpen(false);load()}async function addApp(){await supabase.from('appointments').insert({...form,customer_id:customer.id});setOpen(false);load()}if(!customer)return null;const cal=apps.map(a=>({date:a.appointment_date,from:a.start_time?.slice(0,5),title:a.client_name,service:a.service_categories?.name||'Termin'}));return <div><div className="row"><button className="btn" onClick={()=>setOpen(true)}>➕ Termin</button><button className="btn secondary" onClick={()=>setCatOpen(true)}>➕ Kategorie</button></div><div className="card"><Calendar items={cal} onOpen={i=>alert(i.title+' · '+i.service+'\nRechnung über Rechnungen > Rechnung erstellen erzeugen.')}/></div>{open&&<Modal title="Termin erstellen" onClose={()=>setOpen(false)}><input className="input" value={form.client_name} onChange={e=>setForm({...form,client_name:e.target.value})} placeholder="Name"/><input className="input" type="date" value={form.appointment_date} onChange={e=>setForm({...form,appointment_date:e.target.value})}/><input className="input" value={form.start_time} onChange={e=>setForm({...form,start_time:e.target.value})}/><input className="input" value={form.end_time} onChange={e=>setForm({...form,end_time:e.target.value})}/><select className="input" value={form.service_category_id} onChange={e=>setForm({...form,service_category_id:e.target.value})}><option value="">Kategorie wählen</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name} {money(c.price)}</option>)}</select><button className="btn" onClick={addApp}>Speichern</button></Modal>}{catOpen&&<Modal title="Kategorie erstellen" onClose={()=>setCatOpen(false)}><input className="input" placeholder="Kategorie" value={cat.name} onChange={e=>setCat({...cat,name:e.target.value})}/><input className="input" type="number" placeholder="Preis" value={cat.price} onChange={e=>setCat({...cat,price:e.target.value})}/><button className="btn" onClick={addCat}>Speichern</button></Modal>}</div>}

function AdminTickets({openCrm}){const[items,setItems]=useState([]),[detail,setDetail]=useState(null),[feedback,setFeedback]=useState('');useEffect(()=>{load()},[]);async function load(){const{data}=await supabase.from('tickets').select('*, customers(*), ticket_messages(*)').order('created_at',{ascending:false});setItems(data||[])}async function status(id,s){await supabase.from('tickets').update({status:s}).eq('id',id);load()}async function msg(){const{data:{user}}=await supabase.auth.getUser();await supabase.from('ticket_messages').insert({ticket_id:detail.id,author_id:user?.id,message:feedback,is_admin_feedback:true});setFeedback('');setDetail(null);load()}return <div className="card"><h2>Tickets Admin</h2>{items.map(t=><div className="item" key={t.id} onClick={()=>setDetail(t)}><b>{t.title}</b> · {t.customers?.name} · <span className="badge">{t.status}</span></div>)}{detail&&<Modal title={detail.title} onClose={()=>setDetail(null)}><CustomerChip customer={detail.customers} onOpen={openCrm}/><p>{detail.description}</p><select className="input" value={detail.status} onChange={e=>status(detail.id,e.target.value)}><option>angekommen</option><option>in Bearbeitung</option><option>erledigt</option></select>{detail.ticket_messages?.map(m=><div className="item" key={m.id}>{m.message}</div>)}<textarea className="input" rows="4" value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="Admin Feedback"/><button className="btn" onClick={msg}>Feedback speichern</button></Modal>}</div>}
function CustomerTickets({customer,profile}){const[items,setItems]=useState([]),[detail,setDetail]=useState(null),[title,setTitle]=useState(''),[desc,setDesc]=useState('');useEffect(()=>{if(customer)load()},[customer]);async function load(){const{data}=await supabase.from('tickets').select('*, ticket_messages(*)').eq('customer_id',customer.id).order('created_at',{ascending:false});setItems(data||[])}async function add(){await supabase.from('tickets').insert({customer_id:customer.id,title,description:desc,created_by:profile.id});setTitle('');setDesc('');load()}if(!customer)return null;return <div className="grid"><UploadBox customer={customer} area="Support"/><div className="card"><h2>Ticket erstellen</h2><input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Betreff"/><textarea className="input" rows="4" value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Beschreibung"/><button className="btn" onClick={add}>Ticket speichern</button></div><div className="card"><h2>Letzte Tickets</h2>{items.map(t=><div className="item" key={t.id} onClick={()=>setDetail(t)}>{t.title} · <span className="badge">{t.status}</span></div>)}</div>{detail&&<Modal title={detail.title} onClose={()=>setDetail(null)}><p>{detail.description}</p><p>Status: {detail.status}</p>{detail.ticket_messages?.map(m=><div className="item" key={m.id}>{m.message}</div>)}</Modal>}</div>}
function Templates(){const[cats,setCats]=useState([]),[tpl,setTpl]=useState([]),[preview,setPreview]=useState(null),[catName,setCatName]=useState(''),[form,setForm]=useState({category_id:'',name:'',body:''});useEffect(()=>{load()},[]);async function load(){const{data:c}=await supabase.from('email_template_categories').select('*');const{data:t}=await supabase.from('email_templates').select('*, email_template_categories(*)');setCats(c||[]);setTpl(t||[])}async function addCat(){await supabase.from('email_template_categories').insert({name:catName});setCatName('');load()}async function addTpl(){await supabase.from('email_templates').insert(form);setForm({category_id:'',name:'',body:''});load()}return <div className="grid"><div className="card"><h2>Kategorie</h2><input className="input" value={catName} onChange={e=>setCatName(e.target.value)}/><button className="btn" onClick={addCat}>Kategorie speichern</button></div><div className="card"><h2>Vorlage</h2><select className="input" value={form.category_id} onChange={e=>setForm({...form,category_id:e.target.value})}><option value="">Kategorie wählen</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Name"/><textarea className="input" rows="5" value={form.body} onChange={e=>setForm({...form,body:e.target.value})}/><button className="btn" onClick={addTpl}>Vorlage speichern</button></div><div className="card"><h2>Gespeicherte Vorlagen</h2>{tpl.map(t=><div className="item" key={t.id} onClick={()=>setPreview(t)}><b>{t.name}</b><br/>{t.email_template_categories?.name}<br/>{(t.body||'').slice(0,80)}...</div>)}</div>{preview&&<Modal title={preview.name} onClose={()=>setPreview(null)}><p className="muted">{preview.email_template_categories?.name}</p><textarea className="input" rows="10" value={preview.body} readOnly/></Modal>}</div>}
function Invoices({customer,admin,customers}){const[items,setItems]=useState([]),[form,setForm]=useState({customer_id:customer?.id||'',amount:0,service:''});useEffect(()=>{load()},[customer]);async function load(){let q=supabase.from('invoices').select('*, customers(*)').order('created_at',{ascending:false});if(customer&&!admin)q=q.eq('customer_id',customer.id);const{data}=await q;setItems(data||[])}async function add(){await supabase.from('invoices').insert({invoice_number:'RE-'+Date.now(),customer_id:form.customer_id||customer.id,amount:form.amount,service:form.service,due_date:plus14(),status:'Offen'});load()}return <div className="grid"><div className="card"><h2>Rechnung erstellen</h2>{admin&&<select className="input" value={form.customer_id} onChange={e=>setForm({...form,customer_id:e.target.value})}><option value="">Kunde wählen</option>{customers.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select>}<input className="input" type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/><input className="input" value={form.service} onChange={e=>setForm({...form,service:e.target.value})} placeholder="Leistung"/><button className="btn" onClick={add}>Speichern</button></div><div className="card"><h2>Rechnungen</h2><table className="table"><tbody>{items.map(i=><tr key={i.id}><td>{i.invoice_number}</td><td>{i.customers?.name}</td><td>{money(i.amount)}</td><td><select className="input" value={i.status} onChange={async e=>{await supabase.from('invoices').update({status:e.target.value}).eq('id',i.id); load()}}><option>Offen</option><option>Bezahlt</option><option>Überfällig</option></select></td></tr>)}</tbody></table></div></div>}
function LeadSearches(){const[items,setItems]=useState([]),[form,setForm]=useState({name:'',branch:'',area:''});useEffect(()=>{load()},[]);async function load(){const{data}=await supabase.from('lead_searches').select('*').order('created_at',{ascending:false});setItems(data||[])}async function add(){await supabase.from('lead_searches').insert({name:(form.name+' '+form.area).trim(),branch:form.branch,area:form.area,status:'Aktiv'});setForm({name:'',branch:'',area:''});load()}return <div className="grid"><div className="card"><h2>Suche hinzufügen</h2><input className="input" placeholder="Suchname" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input className="input" placeholder="Branche" value={form.branch} onChange={e=>setForm({...form,branch:e.target.value})}/><input className="input" placeholder="Ort" value={form.area} onChange={e=>setForm({...form,area:e.target.value})}/><button className="btn" onClick={add}>Speichern</button></div><div className="card"><h2>Suchen</h2>{items.map(i=><div className="item" key={i.id}>{i.name}<br/>{i.branch} · {i.area}</div>)}</div></div>}
function QRCampaigns({customers,openCrm}){const[items,setItems]=useState([]),[customer,setCustomer]=useState(''),[mail,setMail]=useState(''),[preview,setPreview]=useState(null);useEffect(()=>{load()},[]);async function load(){const{data}=await supabase.from('qr_campaigns').select('*, customers(*)');setItems(data||[])}async function add(){const c=customers.find(x=>x.id===customer);await supabase.from('qr_campaigns').insert({customer_id:customer,name:c?.name||'QR Kampagne',target_url:'/review/'+customer,negative_feedback_email:mail||c?.email});setCustomer('');setMail('');load()}return <div className="grid"><div className="card"><h2>QR Kampagne</h2><select className="input" value={customer} onChange={e=>setCustomer(e.target.value)}><option value="">Kunde wählen</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input className="input" placeholder="Feedback Mail" value={mail} onChange={e=>setMail(e.target.value)}/><button className="btn" onClick={add}>Speichern</button></div><div className="card"><h2>Kampagnen</h2>{items.map(i=><div className="item" key={i.id} onClick={()=>setPreview(i)}>{i.name}<br/>{i.customers?.name}<br/>{i.negative_feedback_email}</div>)}</div>{preview&&<Modal title={'QR Preview · '+preview.name} onClose={()=>setPreview(null)}><CustomerChip customer={preview.customers} onOpen={openCrm}/><div style={{width:170,height:170,background:'repeating-linear-gradient(45deg,#111 0 8px,#fff 8px 16px)',border:'10px solid white',borderRadius:18,margin:'20px auto'}}></div><p>Ziel: {preview.target_url}</p><p>Schlechtes Feedback an: {preview.negative_feedback_email}</p><button className="btn" onClick={()=>location.href='/review/friseur-profi'}>Scan simulieren</button></Modal>}</div>}
function Integrations({customer}){const[items,setItems]=useState([]),[platform,setPlatform]=useState('Google Business'),[key,setKey]=useState('');useEffect(()=>{if(customer)load()},[customer]);async function load(){const{data}=await supabase.from('integrations').select('*').eq('customer_id',customer.id);setItems(data||[])}async function add(){await supabase.from('integrations').upsert({customer_id:customer.id,platform,api_key:key},{onConflict:'customer_id,platform'});setKey('');load()}if(!customer)return null;return <div className="grid"><div className="card"><h2>Integration hinzufügen</h2><select className="input" value={platform} onChange={e=>setPlatform(e.target.value)}>{['Google Business','Meta','Search Console','Google Analytics','Stripe','DATEV','WhatsApp API'].map(p=><option key={p}>{p}</option>)}</select><input className="input" value={key} onChange={e=>setKey(e.target.value)} placeholder="API Key"/><button className="btn" onClick={add}>Speichern</button></div><div className="card"><h2>Gespeichert</h2>{items.map(i=><div className="item" key={i.id}><b>{i.platform}</b><br/>{i.api_key}</div>)}</div></div>}

function Info({text}){return <span title={text} style={{display:'inline-grid',placeItems:'center',width:20,height:20,borderRadius:999,background:'rgba(124,58,237,.14)',color:'var(--accent)',fontWeight:900,marginLeft:6,cursor:'help'}}>i</span>}

function SEODashboard({customer}){
  const [traffic,setTraffic]=useState([]),[keywords,setKeywords]=useState([]),[checks,setChecks]=useState([]),[recs,setRecs]=useState([])
  useEffect(()=>{if(customer)load()},[customer])
  async function load(){
    const {data:t}=await supabase.from('seo_traffic').select('*').eq('customer_id',customer.id).order('month',{ascending:true})
    const {data:k}=await supabase.from('seo_keywords').select('*').eq('customer_id',customer.id).order('position',{ascending:true})
    const {data:c}=await supabase.from('seo_checks').select('*').eq('customer_id',customer.id)
    const {data:r}=await supabase.from('seo_recommendations').select('*').eq('customer_id',customer.id)
    setTraffic(t||[]);setKeywords(k||[]);setChecks(c||[]);setRecs(r||[])
  }
  const latest=traffic[traffic.length-1]||{}
  async function report(){
    const res=await fetch((process.env.NEXT_PUBLIC_API_BASE||'http://localhost:4000')+'/api/report/customer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customer_id:customer.id,kpis:['SEO','Keywords','Traffic','CTR','Content']})})
    const blob=await res.blob(); const url=URL.createObjectURL(blob); window.open(url,'_blank')
  }
  if(!customer)return null
  return <div><div className="hero"><h1>SEO Dashboard</h1><p>SEO KPIs der letzten 30 Tage, technische Checks, Content-Empfehlungen und KPI-PDF.</p></div><div className="grid">
    <div className="card"><h2>Organischer Traffic</h2><div className="kpi">{latest.organic_traffic||0}</div><p className="muted">letzte 30 Tage</p></div>
    <div className="card"><h2>Impressionen</h2><div className="kpi">{latest.impressions||0}</div></div>
    <div className="card"><h2>Klicks / CTR <Info text="CTR = Klickrate. Sie zeigt, welcher Anteil der Impressionen zu Klicks wurde."/></h2><div className="kpi">{latest.clicks||0} / {latest.ctr||0}%</div></div>
    <div className="card"><h2>Ø Position <Info text="Durchschnittliche Position deiner Keywords in den Suchergebnissen."/></h2><div className="kpi">{latest.avg_position||0}</div></div>
  </div><div className="grid">
    <div className="card"><h2>Traffic Verlauf</h2>{traffic.map(t=><div className="item" key={t.id}>{t.month}: {t.organic_traffic} Besucher · {t.clicks} Klicks</div>)}</div>
    <div className="card"><h2>Keyword Verteilung</h2>{keywords.map(k=><div className="item" key={k.id}>{k.keyword} · Pos. {k.position} · {k.clicks} Klicks</div>)}</div>
    <div className="card"><h2>KPI Report</h2><p className="muted">Erzeugt eine PDF/Print-Ansicht aus den SEO KPIs.</p><button className="btn" onClick={report}>📄 KPI PDF erzeugen</button></div>
  </div><div className="grid">
    <div className="card"><h2>Technische SEO Checks</h2>{checks.map(c=><div className="item" key={c.id}><b>{c.title}</b><br/>{c.status}<br/>{c.description}</div>)}</div>
    <div className="card"><h2>Content Empfehlungen</h2>{recs.map(r=><div className="item" key={r.id}><b>{r.title}</b><br/>{r.priority}<br/>{r.description}</div>)}</div>
  </div><LocalSEOHeatmap customer={customer}/></div>
}

function Reminders({customer,admin,customers}){
  const [items,setItems]=useState([]),[invoices,setInvoices]=useState([]),[form,setForm]=useState({invoice_id:'',level:'1. Mahnung',fee:15})
  useEffect(()=>{load()},[customer])
  async function load(){
    let q=supabase.from('invoices').select('*, customers(*)').order('created_at',{ascending:false})
    if(customer&&!admin)q=q.eq('customer_id',customer.id)
    const {data:i}=await q; setInvoices(i||[])
    let r=supabase.from('reminders').select('*, invoices(*), customers(*)').order('created_at',{ascending:false})
    if(customer&&!admin)r=r.eq('customer_id',customer.id)
    const {data:rem}=await r; setItems(rem||[])
  }
  async function createReminder(){
    const inv=invoices.find(i=>i.id===form.invoice_id)
    if(!inv)return alert('Rechnung wählen')
    await supabase.from('reminders').insert({invoice_id:inv.id,customer_id:inv.customer_id,reminder_number:'MA-'+Date.now(),level:form.level,fee:form.fee})
    load()
    window.open((process.env.NEXT_PUBLIC_API_BASE||'http://localhost:4000')+'/api/report/customer','_blank')
  }
  return <div className="grid"><div className="card"><h2>Mahnung erstellen</h2><select className="input" value={form.invoice_id} onChange={e=>setForm({...form,invoice_id:e.target.value})}><option value="">Rechnung wählen</option>{invoices.map(i=><option key={i.id} value={i.id}>{i.invoice_number} · {i.customers?.name} · {money(i.amount)}</option>)}</select><select className="input" value={form.level} onChange={e=>setForm({...form,level:e.target.value})}><option>1. Mahnung</option><option>2. Mahnung</option><option>Letzte Mahnung</option></select><input className="input" type="number" value={form.fee} onChange={e=>setForm({...form,fee:e.target.value})} placeholder="Mahnzuschlag"/><button className="btn" onClick={createReminder}>📨 Mahnung PDF erstellen</button></div><div className="card"><h2>Mahnungen</h2>{items.map(m=><div className="item" key={m.id}>{m.reminder_number} · {m.level}<br/>{m.customers?.name}<br/>Gebühr: {money(m.fee)}</div>)}</div></div>
}

function UploadBox({customer,area}){
  const [file,setFile]=useState(null),[items,setItems]=useState([])
  useEffect(()=>{if(customer)load()},[customer])
  async function load(){const{data}=await supabase.from('customer_uploads').select('*').eq('customer_id',customer.id).eq('area',area).order('created_at',{ascending:false});setItems(data||[])}
  async function save(){if(!file)return alert('Datei wählen');await supabase.from('customer_uploads').insert({customer_id:customer.id,area,file_name:file.name,file_url:'#'});setFile(null);load()}
  if(!customer)return null
  return <div className="card"><h2>Uploads · {area}</h2><input className="input" type="file" onChange={e=>setFile(e.target.files?.[0])}/><button className="btn" onClick={save}>Hochladen vormerken</button>{items.map(i=><div className="item" key={i.id}>{i.file_name}<br/>{new Date(i.created_at).toLocaleString('de-DE')}</div>)}</div>
}

function Users({customers}){const[users,setUsers]=useState([]),[open,setOpen]=useState(false),[form,setForm]=useState({full_name:'',email:'',password:'',role:'customer',customer_id:''});useEffect(()=>{load()},[]);async function load(){const{data}=await supabase.from('profiles').select('*').order('created_at',{ascending:false});setUsers(data||[])}async function createUser(){const res=await fetch(API+'/api/users/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});const data=await res.json();if(!data.ok)return alert(data.error||'Fehler');alert('Benutzer erstellt. Passwort: '+data.temporary_password);setOpen(false);load()}return <><button className="btn" onClick={()=>setOpen(true)}>➕ Benutzer anlegen</button><div className="card"><table className="table"><tbody>{users.map(u=><tr key={u.id}><td>{u.full_name}</td><td>{u.email}</td><td>{u.role}</td></tr>)}</tbody></table></div>{open&&<Modal title="Benutzer anlegen" onClose={()=>setOpen(false)}><input className="input" placeholder="Name" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/><input className="input" placeholder="E-Mail" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/><input className="input" placeholder="Passwort" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/><select className="input" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option>customer</option><option>employee</option><option>admin</option></select><select className="input" value={form.customer_id} onChange={e=>setForm({...form,customer_id:e.target.value})}><option value="">Kunde wählen</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="btn" onClick={createUser}>Erstellen</button></Modal>}</>}
function Customers({reload}){const[items,setItems]=useState([]),[name,setName]=useState(''),[email,setEmail]=useState(''),[phone,setPhone]=useState(''),[branch,setBranch]=useState('');useEffect(()=>{load()},[]);async function load(){const{data}=await supabase.from('customers').select('*').order('created_at',{ascending:false});setItems(data||[])}async function add(){await supabase.from('customers').insert({name,email,phone,branch,status:'Lead',rating:0,revenue:0});setName('');setEmail('');setPhone('');await load();reload&&reload()}async function del(c){if(!confirm('Kunde wirklich aus der Datenbank löschen? '+c.name))return;const{error}=await supabase.from('customers').delete().eq('id',c.id);if(error)return alert(error.message);await load();reload&&reload()}return <div className="grid"><div className="card"><h2>Kunde anlegen</h2><input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Name"/><input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-Mail"/><input className="input" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Telefon"/><input className="input" value={branch} onChange={e=>setBranch(e.target.value)} placeholder="Branche"/><button className="btn" onClick={add}>Speichern</button></div><div className="card"><h2>Kunden löschen</h2>{items.map(c=><div className="item" key={c.id}>{c.name}<br/>{c.email}<br/><button className="btn red" onClick={()=>del(c)}>Löschen</button></div>)}</div></div>}


function CrudList({title,items,render}){return <div className="card"><h2>{title}</h2>{items.length===0&&<p className="muted">Noch keine Einträge.</p>}{items.map(render)}</div>}

function ReviewAIAssistant({customer}){
  const [items,setItems]=useState([]),[form,setForm]=useState({reviewer_name:'',rating:5,review_text:'',tone:'professionell'})
  useEffect(()=>{if(customer)load()},[customer])
  async function load(){const{data}=await supabase.from('review_ai_replies').select('*').eq('customer_id',customer.id).order('created_at',{ascending:false});setItems(data||[])}
  function reply(){return Number(form.rating)<=3?'Vielen Dank für Ihr ehrliches Feedback. Es tut uns leid, dass Ihre Erfahrung nicht Ihren Erwartungen entsprochen hat. Wir möchten das gern persönlich klären.':'Vielen Dank für die tolle Bewertung! Wir freuen uns sehr über Ihr Feedback und begrüßen Sie jederzeit gerne wieder.'}
  async function add(){await supabase.from('review_ai_replies').insert({...form,customer_id:customer.id,suggested_reply:reply()});setForm({reviewer_name:'',rating:5,review_text:'',tone:'professionell'});load()}
  if(!customer)return null
  return <div className="grid"><div className="card"><h2>KI Antwort-Assistent</h2><input className="input" placeholder="Name Bewerter" value={form.reviewer_name} onChange={e=>setForm({...form,reviewer_name:e.target.value})}/><select className="input" value={form.rating} onChange={e=>setForm({...form,rating:e.target.value})}><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select><select className="input" value={form.tone} onChange={e=>setForm({...form,tone:e.target.value})}><option>professionell</option><option>locker</option><option>freundlich</option><option>luxuriös</option></select><textarea className="input" rows="4" placeholder="Bewertungstext" value={form.review_text} onChange={e=>setForm({...form,review_text:e.target.value})}/><button className="btn" onClick={add}>Antwort generieren</button></div><CrudList title="Antworten" items={items} render={i=><div className="item" key={i.id}><b>{i.reviewer_name} · {i.rating}★</b><br/>{i.review_text}<br/><b>Vorschlag:</b> {i.suggested_reply}</div>}/></div>
}

function LocalSEOHeatmap({customer}){
  const [items,setItems]=useState([]),[form,setForm]=useState({area_name:'',keyword:'',rank_position:0,visibility_score:0,recommendation:''})
  useEffect(()=>{if(customer)load()},[customer])
  async function load(){const{data}=await supabase.from('local_seo_heatmap').select('*').eq('customer_id',customer.id).order('visibility_score',{ascending:false});setItems(data||[])}
  async function add(){await supabase.from('local_seo_heatmap').insert({...form,customer_id:customer.id});setForm({area_name:'',keyword:'',rank_position:0,visibility_score:0,recommendation:''});load()}
  if(!customer)return null
  return <div className="grid"><CrudList title="Local SEO Heatmap" items={items} render={i=><div className="item" key={i.id}><b>{i.area_name}</b><br/>{i.keyword} · Rang {i.rank_position}<br/>Sichtbarkeit: {i.visibility_score}%<br/>{i.recommendation}</div>}/><div className="card"><h2>Heatmap Punkt hinzufügen</h2><input className="input" placeholder="Gebiet/Stadtteil" value={form.area_name} onChange={e=>setForm({...form,area_name:e.target.value})}/><input className="input" placeholder="Keyword" value={form.keyword} onChange={e=>setForm({...form,keyword:e.target.value})}/><input className="input" type="number" placeholder="Ranking Position" value={form.rank_position} onChange={e=>setForm({...form,rank_position:e.target.value})}/><input className="input" type="number" placeholder="Sichtbarkeit %" value={form.visibility_score} onChange={e=>setForm({...form,visibility_score:e.target.value})}/><textarea className="input" rows="3" placeholder="Empfehlung" value={form.recommendation} onChange={e=>setForm({...form,recommendation:e.target.value})}/><button className="btn" onClick={add}>Speichern</button></div></div>
}

function SalesPipeline({customers,openCrm}){
  const [items,setItems]=useState([]),[form,setForm]=useState({customer_id:'',deal_name:'',stage:'Lead',value:0,probability:25,expected_close_date:today(),notes:''})
  useEffect(()=>{load()},[])
  async function load(){const{data}=await supabase.from('sales_pipeline').select('*, customers(*)').order('created_at',{ascending:false});setItems(data||[])}
  async function add(){await supabase.from('sales_pipeline').insert(form);setForm({customer_id:'',deal_name:'',stage:'Lead',value:0,probability:25,expected_close_date:today(),notes:''});load()}
  const forecast=items.reduce((s,i)=>s+(Number(i.value||0)*Number(i.probability||0)/100),0)
  return <div><div className="hero"><h1>Sales Pipeline</h1><p>Forecast: {money(forecast)}</p></div><div className="grid"><div className="card"><h2>Deal anlegen</h2><select className="input" value={form.customer_id} onChange={e=>setForm({...form,customer_id:e.target.value})}><option value="">Kunde wählen</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input className="input" placeholder="Deal Name" value={form.deal_name} onChange={e=>setForm({...form,deal_name:e.target.value})}/><select className="input" value={form.stage} onChange={e=>setForm({...form,stage:e.target.value})}><option>Lead</option><option>Qualifiziert</option><option>Angebot</option><option>Verhandlung</option><option>Gewonnen</option><option>Verloren</option></select><input className="input" type="number" placeholder="Wert" value={form.value} onChange={e=>setForm({...form,value:e.target.value})}/><input className="input" type="number" placeholder="Wahrscheinlichkeit %" value={form.probability} onChange={e=>setForm({...form,probability:e.target.value})}/><button className="btn" onClick={add}>Deal speichern</button></div><CrudList title="Deals" items={items} render={i=><div className="item" key={i.id} onClick={()=>i.customers&&openCrm(i.customers)}><b>{i.deal_name}</b><br/>{i.customers?.name} · {i.stage}<br/>{money(i.value)} · {i.probability}%</div>}/></div></div>
}

function Contracts({customer}){
  const [items,setItems]=useState([]),[file,setFile]=useState(null),[form,setForm]=useState({contract_name:'',package_name:'Growth',monthly_value:0,start_date:today(),end_date:'',cancellation_notice_days:30,status:'Aktiv'})
  useEffect(()=>{if(customer)load()},[customer])
  async function load(){const{data}=await supabase.from('contracts').select('*').eq('customer_id',customer.id).order('created_at',{ascending:false});setItems(data||[])}
  async function add(){await supabase.from('contracts').insert({...form,customer_id:customer.id,file_name:file?.name||null,file_url:'#'});setFile(null);load()}
  return <div className="grid"><div className="card"><h2>Vertrag anlegen</h2><input className="input" placeholder="Vertragsname" value={form.contract_name} onChange={e=>setForm({...form,contract_name:e.target.value})}/><input className="input" placeholder="Paket" value={form.package_name} onChange={e=>setForm({...form,package_name:e.target.value})}/><input className="input" type="number" placeholder="Monatswert" value={form.monthly_value} onChange={e=>setForm({...form,monthly_value:e.target.value})}/><input className="input" type="date" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})}/><input className="input" type="file" onChange={e=>setFile(e.target.files?.[0]||null)}/><button className="btn" onClick={add}>Vertrag speichern</button></div><CrudList title="Verträge" items={items} render={i=><div className="item" key={i.id}>{i.contract_name}<br/>{i.package_name} · {money(i.monthly_value)}<br/>{i.status}<br/>{i.file_name}</div>}/></div>
}

function CampaignAttribution({customer}){
  const [items,setItems]=useState([]),[form,setForm]=useState({campaign_name:'',source:'Google',medium:'CPC',leads:0,bookings:0,revenue:0,cost:0})
  useEffect(()=>{if(customer)load()},[customer])
  async function load(){const{data}=await supabase.from('campaign_attribution').select('*').eq('customer_id',customer.id).order('created_at',{ascending:false});setItems(data||[])}
  async function add(){await supabase.from('campaign_attribution').insert({...form,customer_id:customer.id});setForm({campaign_name:'',source:'Google',medium:'CPC',leads:0,bookings:0,revenue:0,cost:0});load()}
  return <div className="grid"><div className="card"><h2>Kampagne erfassen</h2>{['campaign_name','source','medium','leads','bookings','revenue','cost'].map(k=><input key={k} className="input" placeholder={k} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/>) }<button className="btn" onClick={add}>Speichern</button></div><CrudList title="Attribution" items={items} render={i=><div className="item" key={i.id}><b>{i.campaign_name}</b><br/>{i.source}/{i.medium}<br/>Leads: {i.leads} · Bookings: {i.bookings}<br/>ROAS: {Number(i.cost)>0?(Number(i.revenue)/Number(i.cost)).toFixed(2):'∞'}</div>}/></div>
}

function CustomerGoals({customer}){
  const [items,setItems]=useState([]),[form,setForm]=useState({goal_name:'',metric:'rating',target_value:0,current_value:0,due_date:today(),status:'Aktiv'})
  useEffect(()=>{if(customer)load()},[customer])
  async function load(){const{data}=await supabase.from('customer_goals').select('*').eq('customer_id',customer.id).order('created_at',{ascending:false});setItems(data||[])}
  async function add(){await supabase.from('customer_goals').insert({...form,customer_id:customer.id});setForm({goal_name:'',metric:'rating',target_value:0,current_value:0,due_date:today(),status:'Aktiv'});load()}
  return <div className="grid"><div className="card"><h2>Ziel erstellen</h2><input className="input" placeholder="Zielname" value={form.goal_name} onChange={e=>setForm({...form,goal_name:e.target.value})}/><input className="input" placeholder="Metrik" value={form.metric} onChange={e=>setForm({...form,metric:e.target.value})}/><input className="input" type="number" placeholder="Zielwert" value={form.target_value} onChange={e=>setForm({...form,target_value:e.target.value})}/><input className="input" type="number" placeholder="Aktuell" value={form.current_value} onChange={e=>setForm({...form,current_value:e.target.value})}/><button className="btn" onClick={add}>Ziel speichern</button></div><CrudList title="Ziele" items={items} render={i=><div className="item" key={i.id}><b>{i.goal_name}</b><br/>{i.metric}: {i.current_value}/{i.target_value}</div>}/></div>
}
function GoalsAdmin({openCrm}){const[items,setItems]=useState([]);useEffect(()=>{supabase.from('customer_goals').select('*, customers(*)').order('created_at',{ascending:false}).then(({data})=>setItems(data||[]))},[]);return <div><div className="hero"><h1>Zielsystem Admin</h1></div><CrudList title="Alle Kundenziele" items={items} render={i=><div className="item" key={i.id} onClick={()=>openCrm(i.customers)}><b>{i.customers?.name}</b><br/>{i.goal_name}: {i.current_value}/{i.target_value}</div>}/></div>}

function AIInsights({customer}){
  const [items,setItems]=useState([]),[form,setForm]=useState({title:'',insight_text:'',severity:'Info'})
  useEffect(()=>{if(customer)load()},[customer])
  async function load(){const{data}=await supabase.from('ai_business_insights').select('*').eq('customer_id',customer.id).order('created_at',{ascending:false});setItems(data||[])}
  async function add(){await supabase.from('ai_business_insights').insert({...form,customer_id:customer.id});setForm({title:'',insight_text:'',severity:'Info'});load()}
  return <div className="grid"><div className="card"><h2>AI Insight erstellen</h2><input className="input" placeholder="Titel" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><select className="input" value={form.severity} onChange={e=>setForm({...form,severity:e.target.value})}><option>Info</option><option>Chance</option><option>Warnung</option><option>Kritisch</option></select><textarea className="input" rows="4" placeholder="Insight" value={form.insight_text} onChange={e=>setForm({...form,insight_text:e.target.value})}/><button className="btn" onClick={add}>Insight speichern</button></div><CrudList title="Insights" items={items} render={i=><div className="item" key={i.id}><b>{i.title}</b> · {i.severity}<br/>{i.insight_text}</div>}/></div>
}

function ReferralProgram({customer}){
  const [items,setItems]=useState([]),[form,setForm]=useState({program_name:'',reward:'',referrals:0,converted:0,status:'Aktiv'})
  useEffect(()=>{if(customer)load()},[customer])
  async function load(){const{data}=await supabase.from('referral_programs').select('*').eq('customer_id',customer.id).order('created_at',{ascending:false});setItems(data||[])}
  async function add(){await supabase.from('referral_programs').insert({...form,customer_id:customer.id});setForm({program_name:'',reward:'',referrals:0,converted:0,status:'Aktiv'});load()}
  return <div className="grid"><div className="card"><h2>Empfehlungsprogramm</h2><input className="input" placeholder="Programmname" value={form.program_name} onChange={e=>setForm({...form,program_name:e.target.value})}/><input className="input" placeholder="Belohnung" value={form.reward} onChange={e=>setForm({...form,reward:e.target.value})}/><button className="btn" onClick={add}>Programm speichern</button></div><CrudList title="Programme" items={items} render={i=><div className="item" key={i.id}>{i.program_name}<br/>{i.reward}<br/>Empfehlungen: {i.referrals} · Gewonnen: {i.converted}</div>}/></div>
}

function CompetitorAds({customer}){
  const [items,setItems]=useState([]),[form,setForm]=useState({competitor_name:'',platform:'Google',headline:'',offer_text:'',notes:''})
  useEffect(()=>{if(customer)load()},[customer])
  async function load(){const{data}=await supabase.from('competitor_ads').select('*').eq('customer_id',customer.id).order('created_at',{ascending:false});setItems(data||[])}
  async function add(){await supabase.from('competitor_ads').insert({...form,customer_id:customer.id});setForm({competitor_name:'',platform:'Google',headline:'',offer_text:'',notes:''});load()}
  return <div className="grid"><div className="card"><h2>Konkurrenz-ADS erfassen</h2><input className="input" placeholder="Konkurrent" value={form.competitor_name} onChange={e=>setForm({...form,competitor_name:e.target.value})}/><select className="input" value={form.platform} onChange={e=>setForm({...form,platform:e.target.value})}><option>Google</option><option>Meta</option><option>TikTok</option></select><input className="input" placeholder="Headline" value={form.headline} onChange={e=>setForm({...form,headline:e.target.value})}/><textarea className="input" rows="3" placeholder="Angebot/Werbetext" value={form.offer_text} onChange={e=>setForm({...form,offer_text:e.target.value})}/><button className="btn" onClick={add}>Ad speichern</button></div><CrudList title="Gescannt" items={items} render={i=><div className="item" key={i.id}><b>{i.competitor_name}</b> · {i.platform}<br/>{i.headline}<br/>{i.offer_text}</div>}/></div>
}

function MultiLocationManager({customer}){
  const [items,setItems]=useState([]),[form,setForm]=useState({location_name:'',address:'',phone:'',google_profile_url:'',enabled:true})
  useEffect(()=>{if(customer)load()},[customer])
  async function load(){const{data}=await supabase.from('multi_locations').select('*').eq('customer_id',customer.id).order('created_at',{ascending:false});setItems(data||[])}
  async function add(){await supabase.from('multi_locations').insert({...form,customer_id:customer.id});setForm({location_name:'',address:'',phone:'',google_profile_url:'',enabled:true});load()}
  return <div className="grid"><div className="card"><h2>Multi-Standortverwaltung</h2><p className="muted">Nur durch Admin freischaltbar über Paket/Toolzugriff.</p><input className="input" placeholder="Standortname" value={form.location_name} onChange={e=>setForm({...form,location_name:e.target.value})}/><input className="input" placeholder="Adresse" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/><input className="input" placeholder="Telefon" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/><input className="input" placeholder="Google Profil URL" value={form.google_profile_url} onChange={e=>setForm({...form,google_profile_url:e.target.value})}/><button className="btn" onClick={add}>Standort speichern</button></div><CrudList title="Standorte" items={items} render={i=><div className="item" key={i.id}>{i.location_name}<br/>{i.address}<br/>{i.phone}</div>}/></div>
}

function GrowthToolsAdmin({customers}){
  const [customerId,setCustomerId]=useState('')
  const customer=customers.find(c=>c.id===customerId)||customers[0]
  return <div><div className="hero"><h1>Growth Tools Admin</h1><p>AI Insights, Verträge, Attribution und Wettbewerbsdaten pro Kunde pflegen.</p></div><select className="input" value={customer?.id||''} onChange={e=>setCustomerId(e.target.value)}>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>{customer&&<><AIInsights customer={customer}/><Contracts customer={customer}/><CampaignAttribution customer={customer}/><CompetitorAds customer={customer}/><MultiLocationManager customer={customer}/></>}</div>
}

function PackageManager(){
  const toolOptions=[
    ['reviews','Reviews'],
    ['qr','QR Kampagnen'],
    ['reports','Reporting'],
    ['tickets','Tickets/Support'],
    ['seo','SEO Dashboard'],
    ['booking','Booking'],
    ['invoices','Rechnungen'],
    ['integrations','Integrationen'],
    ['reminders','Mahnungen'],
    ['templates','E-Mail Vorlagen']
  ]
  const [packages,setPackages]=useState([])
  const [selected,setSelected]=useState(null)
  const [form,setForm]=useState({package_name:'',monthly_price:0,description:'',tools:[],is_custom:false})

  useEffect(()=>{load()},[])

  async function load(){
    const {data,error}=await supabase.from('package_catalog').select('*').order('monthly_price',{ascending:true})
    if(error)return alert(error.message)
    setPackages(data||[])
  }

  function edit(pkg){
    setSelected(pkg)
    setForm({
      package_name:pkg.package_name,
      monthly_price:pkg.monthly_price,
      description:pkg.description||'',
      tools:pkg.tools||[],
      is_custom:pkg.is_custom||false
    })
  }

  async function save(){
    const {error}=await supabase.from('package_catalog').upsert({
      package_name:form.package_name,
      monthly_price:Number(form.monthly_price||0),
      description:form.description,
      tools:form.tools||[],
      is_custom:form.is_custom,
      updated_at:new Date().toISOString()
    },{onConflict:'package_name'})
    if(error)return alert(error.message)
    alert('Paket gespeichert.')
    setSelected(null)
    load()
  }

  async function createPackage(){
    setSelected({package_name:'Neues Paket'})
    setForm({package_name:'Neues Paket',monthly_price:0,description:'',tools:[],is_custom:false})
  }

  function toggleTool(tool){
    const list=form.tools||[]
    setForm({...form,tools:list.includes(tool)?list.filter(x=>x!==tool):[...list,tool]})
  }

  return <div>
    <div className="hero"><h1>Pakete verwalten</h1><p>Passe Preise, Beschreibung und freigeschaltete Tools für Starter, Growth, Premium und individuelle Pakete an.</p></div>
    <button className="btn" onClick={createPackage}>➕ Neues Paket</button>
    <div className="grid">
      {packages.map(p=><div className="card" key={p.id}>
        <h2>{p.package_name}</h2>
        <div className="kpi">{money(p.monthly_price)}</div>
        <p>{p.description}</p>
        <p className="muted">Tools: {(p.tools||[]).join(', ') || 'keine'}</p>
        <button className="btn" onClick={()=>edit(p)}>Bearbeiten</button>
      </div>)}
    </div>
    {selected&&<Modal title={'Paket bearbeiten · '+form.package_name} onClose={()=>setSelected(null)}>
      <input className="input" placeholder="Paketname" value={form.package_name} onChange={e=>setForm({...form,package_name:e.target.value})}/>
      <input className="input" type="number" placeholder="Monatspreis" value={form.monthly_price} onChange={e=>setForm({...form,monthly_price:e.target.value})}/>
      <textarea className="input" rows="4" placeholder="Beschreibung" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
      <label className="item"><input type="checkbox" checked={form.is_custom} onChange={e=>setForm({...form,is_custom:e.target.checked})}/> Individuelles Paket</label>
      <div className="card">
        <h2>Tools im Paket</h2>
        {toolOptions.map(([key,label])=><label className="item" key={key}>
          <input type="checkbox" checked={(form.tools||[]).includes(key)} onChange={()=>toggleTool(key)}/> {label}
        </label>)}
      </div>
      <button className="btn" onClick={save}>💾 Paket speichern</button>
    </Modal>}
  </div>
}


function Audit(){const[logs,setLogs]=useState([]);useEffect(()=>{supabase.from('audit_logs').select('*').order('created_at',{ascending:false}).then(({data})=>setLogs(data||[]))},[]);return <div className="card"><h2>Audit Log</h2>{logs.length===0&&<p className="muted">Noch keine Audit-Einträge.</p>}{logs.map(l=><div className="item" key={l.id}>{l.action}<br/>{l.entity}<br/>{l.created_at}</div>)}</div>}
