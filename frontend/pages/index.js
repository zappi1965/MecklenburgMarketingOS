
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
const hours = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00']
function viewLabel(v){return ({dashboard:'📊 Dashboard',profile:'👤 Profil',crm:'🏢 Kunden CRM',customerDemo:'🧪 Kundendemo',users:'👥 Benutzer',customers:'🏢 Kunden löschen/anlegen',leadMeetings:'📅 Lead Gespräche',tickets:'🎫 Tickets Admin',templates:'✉️ E-Mail Vorlagen',invoices:'💶 Rechnungen',leadSearches:'🔎 Lead Scraper',qr:'▦ QR Kampagnen',packages:'📦 Pakete verwalten',pipeline:'💰 Sales Pipeline',goalsAdmin:'🎯 Ziele',growthTools:'🧠 Growth Tools',notifications:'🔔 Benachrichtigungen',timeline:'🧾 Timeline',automations:'⚙️ Automationen',search:'🔎 Suche',smart:'🧠 Smart Dashboard',roles:'🔐 Rollen',design:'🎨 Design wechseln',audit:'🕵️ Audit Log',salesPage:'💼 Verkaufsseite',customerDashboard:'🏠 Kunden Dashboard',booking:'🗓️ Booking',customerTickets:'🎫 Support',seo:'📈 SEO Dashboard',reviewAI:'🤖 Review KI',goals:'🎯 Ziele',referralsAdmin:'🎁 Empfehlungen',competitorAds:'🕵️ Konkurrenz Ads',locations:'📍 Standorte',reminders:'📨 Mahnungen',integrations:'🔌 Integrationen'}[v]||v)}
function today(){return new Date().toISOString().slice(0,10)}
function plus14(){let d=new Date();d.setDate(d.getDate()+14);return d.toISOString().slice(0,10)}
function money(v){return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(v||0))}


const TOOL_LABELS = {reviews:'Reviews',qr:'QR Kampagnen',reports:'Reporting',tickets:'Tickets/Support',seo:'SEO Dashboard',booking:'Booking',invoices:'Rechnungen',integrations:'Integrationen',reminders:'Mahnungen',templates:'E-Mail Vorlagen',heatmap:'Local SEO Heatmap',goals:'Zielsystem',ai_insights:'AI Insights',referrals:'Empfehlungen',competitor_ads:'Konkurrenz Ads Anzeige',multi_locations:'Multi Standort'}
const CUSTOMER_TOOL_VIEW_MAP = {seo:'seo',booking:'booking',tickets:'customerTickets',invoices:'invoices',integrations:'integrations',reminders:'reminders',templates:'templates',goals:'goals',competitor_ads:'competitorAds',multi_locations:'locations',reviews:'reviewAI',heatmap:'seo',reports:'customerDashboard',qr:'customerDashboard'}
async function getEnabledToolViews(customerId){if(!customerId)return[];const{data}=await supabase.from('customer_tool_access').select('*').eq('customer_id',customerId).eq('enabled',true);return[...new Set((data||[]).map(x=>CUSTOMER_TOOL_VIEW_MAP[x.tool_key]).filter(Boolean))]}
async function metricValue(customerId, metric){if(!customerId)return 0;if(metric==='rating'){const{data}=await supabase.from('customers').select('rating').eq('id',customerId).single();return Number(data?.rating||0)}if(metric==='monthly_booking_revenue'){const{data}=await supabase.from('appointments').select('*, service_categories(price)').eq('customer_id',customerId);return(data||[]).reduce((s,a)=>s+Number(a.service_categories?.price||0),0)}if(['organic_traffic','impressions','ctr','top10_keywords'].includes(metric)){const{data}=await supabase.from('seo_traffic').select(metric).eq('customer_id',customerId).order('created_at',{ascending:false}).limit(1);return Number(data?.[0]?.[metric]||0)}if(metric==='bookings'){const{data}=await supabase.from('appointments').select('id').eq('customer_id',customerId);return(data||[]).length}return 0}

const PACKAGE_CATALOG = {
  Starter:{price:199,tools:['reviews','qr','reports','tickets'],label:'Review-System, QR, Reports, Tickets'},
  Growth:{price:499,tools:['reviews','qr','reports','tickets','seo','booking','invoices'],label:'SEO, Booking, Reviews, Rechnungen, Reports'},
  Premium:{price:899,tools:['reviews','qr','reports','tickets','seo','booking','invoices','integrations','reminders','templates'],label:'Alle Kundentools inkl. Integrationen & Mahnungen'},
  Individuell:{price:0,tools:[],label:'Individuell durch Admin freischalten'}
}
async function unlockTools(customerId, packageName, customTools=[]){
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
  const [session,setSession]=useState(null),[profile,setProfile]=useState(null),[view,setView]=useState('dashboard'),[theme,setTheme]=useState('light'),[design,setDesign]=useState('purple'),[colorScheme,setColorScheme]=useState('violet')
  const [customers,setCustomers]=useState([]),[activeCustomer,setActiveCustomer]=useState(null),[crmCustomer,setCrmCustomer]=useState(null),[customerEnv,setCustomerEnv]=useState(false),[enabledViews,setEnabledViews]=useState([])
  useEffect(()=>{const saved=typeof window!=='undefined'?localStorage.getItem('mmos_design'):null;if(saved)setDesign(saved)},[])
  useEffect(()=>{const saved=typeof window!=='undefined'?localStorage.getItem('mmos_color_scheme'):null;if(saved)setColorScheme(saved)},[])
  useEffect(()=>{supabase.auth.getSession().then(({data})=>setSession(data.session));const{data:sub}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>sub.subscription.unsubscribe()},[])
  useEffect(()=>{if(session?.user)loadBase()},[session])
  useEffect(()=>{if(activeCustomer)getEnabledToolViews(activeCustomer.id).then(setEnabledViews);else setEnabledViews([])},[activeCustomer])
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
  function enterCustomer(c){setActiveCustomer(c);setCustomerEnv(true);setView((c?.revenue===0 && c?.rating===0)?'salesPage':'customerDashboard')}
  if(!session)return <Login onSession={setSession}/>
  if(!profile)return <main className="login"><div className="box"><h1>Profil fehlt</h1><p>Der Auth-User existiert, aber kein profiles-Eintrag.</p></div></main>
  const adminViews=['dashboard','crm','customerDemo','users','customers','leadMeetings','tickets','templates','invoices','reminders','leadSearches','qr','packages','pipeline','goalsAdmin','growthTools','referralsAdmin','notifications','timeline','automations','search','smart','roles','design','audit']
  const baseCustomerViews=(activeCustomer?.revenue===0 && activeCustomer?.rating===0)?['salesPage']:['customerDashboard']; const customerViews=[...new Set([...baseCustomerViews,...enabledViews])]
  const views=customerEnv?customerViews:adminViews
  return <div data-theme={theme} data-design={design} data-color={colorScheme} className="page fadeDesign"><div className="app"><aside className="side"><h2>MM OS</h2><p><b>{profile.full_name}</b><br/><span>{profile.role}</span>{activeCustomer&&<><br/><span>{customerEnv?'Kundenumgebung: ':'Aktiv: '}{activeCustomer.name}</span></>}</p>{profile.role!=='customer'&&customerEnv&&<button className="btn" onClick={()=>{setCustomerEnv(false);setView('dashboard')}}>⬅ Adminbereich</button>}{views.map(v=><button key={v} className={view===v?'btn':'btn secondary'} onClick={()=>setView(v)}>{viewLabel(v)}</button>)}<button className="btn secondary" onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?'☀️ Light':'🌙 Dark'}</button><button className="btn red" onClick={logout}>🚪 Logout</button></aside><main className="main"><div className="top"><div><h1>{viewLabel(view)}</h1>{activeCustomer&&<p className="muted">{customerEnv?'Kundenumgebung geöffnet':'Adminbereich'} · {activeCustomer.name}</p>}</div></div>
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
    {view==='referralsAdmin'&&<ReferralsAdmin customers={customers} openCrm={openCrm}/>}
    {view==='reviewAI'&&<ReviewAIAssistant customer={activeCustomer}/>}
    
    {view==='goals'&&<CustomerGoals customer={activeCustomer}/>}

    {view==='competitorAds'&&<CompetitorAds customer={activeCustomer}/>}
    {view==='locations'&&<MultiLocationManager customer={activeCustomer}/>}

    
    {view==='notifications'&&<NotificationsCenter customers={customers} openCrm={openCrm}/>}
    {view==='timeline'&&<GlobalTimeline customers={customers} openCrm={openCrm}/>}
    {view==='automations'&&<AutomationEngine customers={customers}/>}
    {view==='search'&&<GlobalSearch openCrm={openCrm}/>}
    {view==='smart'&&<SmartDashboard customers={customers} openCrm={openCrm}/>}
    {view==='roles'&&<RoleManager customers={customers}/>}

    {view==='design'&&<DesignSwitcher design={design} setDesign={setDesign} colorScheme={colorScheme} setColorScheme={setColorScheme}/>} 
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
      await unlockTools(r.customer_id,r.package_name,r.requested_tools||[])
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

function CRM({customers,reload,openCrm,setActiveCustomer,crmCustomer,setCrmCustomer}){const[filter,setFilter]=useState('Alle'),[newOpen,setNewOpen]=useState(false),[packageRequests,setPackageRequests]=useState([]);useEffect(()=>{loadPackageRequests()},[]);async function loadPackageRequests(){const{data}=await supabase.from('package_requests').select('*, customers(*)').eq('status','Neu').order('created_at',{ascending:false});setPackageRequests(data||[])}const list=filter==='Alle'?customers:customers.filter(c=>c.status===filter);async function del(c){if(!confirm('Kunde wirklich aus der Datenbank löschen? '+c.name))return;const{error}=await supabase.from('customers').delete().eq('id',c.id);if(error)return alert(error.message);setCrmCustomer(null);reload&&reload()}if(crmCustomer)return <CRMDetail customer={crmCustomer} onBack={()=>setCrmCustomer(null)}/>;return <div><div className="hero"><h1>Kunden CRM</h1><p>Statusfilter, CRM Detail, Kontakte, Notizen, Dateien, Verlauf, Rechnungen, Angebote und Datenzentrale.</p></div>{packageRequests?.length>0&&<div className="card" style={{border:'3px solid #f59e0b',animation:'pulse 1s infinite'}}><h2>🔔 Neue Paket-Anfragen</h2>{packageRequests.map(r=><div className="item" key={r.id}><b>{r.customers?.name}</b><br/>Paket: {r.package_name} · {money(r.requested_price)}<br/>Tools: {(r.requested_tools||[]).join(', ')}<br/><button className="btn" onClick={async()=>{await unlockTools(r.customer_id,r.package_name,r.requested_tools||[]);await supabase.from('package_requests').update({status:'Bearbeitet',handled_at:new Date().toISOString()}).eq('id',r.id);alert('Paket freigeschaltet');loadPackageRequests();}}>Tools freischalten</button></div>)}</div>}<div className="row">{['Alle','Aktiv','Lead','Inaktiv'].map(s=><button key={s} className={filter===s?'btn':'btn secondary'} onClick={()=>setFilter(s)}>{s}</button>)}<button className="btn" onClick={()=>setNewOpen(true)}>➕ Neuer Kunde</button></div><div className="card"><table className="table"><thead><tr><th>Kunde</th><th>Kontakt</th><th>Status</th><th>Umsatz</th><th>Aktion</th></tr></thead><tbody>{list.map(c=><tr key={c.id}><td><button className="btn secondary" onClick={()=>setCrmCustomer(c)}>{c.name}</button><br/><span className="muted">{c.branch||'Keine Branche'}</span></td><td>{c.email||'-'}<br/>{c.phone||'-'}</td><td><span className="badge">{c.status}</span><br/><span className="muted">{c.lifecycle_status||'Lead'}</span></td><td>{money(c.revenue)}</td><td><button className="btn secondary" onClick={()=>setCrmCustomer(c)}>CRM</button><select className="input" style={{width:120}} value={c.status} onChange={async e=>{await supabase.from('customers').update({status:e.target.value}).eq('id',c.id); reload&&reload()}}><option>Aktiv</option><option>Lead</option><option>Inaktiv</option></select><button className="btn red" onClick={()=>del(c)}>Löschen</button></td></tr>)}</tbody></table></div>{newOpen&&<NewCustomerModal onClose={()=>setNewOpen(false)} reload={reload}/>}</div>}
function NewCustomerModal({onClose,reload}){const[form,setForm]=useState({name:'',contact_name:'',email:'',phone:'',status:'Lead',branch:''});async function save(){await supabase.from('customers').insert({...form,revenue:0,rating:0});onClose();reload&&reload()}return <Modal title="Neuen Kunden anlegen" onClose={onClose}>{['name','contact_name','email','phone','branch'].map(k=><input key={k} className="input" placeholder={k} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/>) }<select className="input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Aktiv</option><option>Lead</option><option>Inaktiv</option></select><button className="btn" onClick={save}>💾 Kunde speichern</button></Modal>}
function CRMDetail({customer,onBack}){const[tab,setTab]=useState('Übersicht');const tabs=['Übersicht','Kontakte','Notizen','Dateien','Verlauf','Rechnungen','Angebote','Verträge','AI Insights','Ziele','Tool Datenzentrale','Integrationen','Timeline','Benachrichtigungen'];return <div><button className="btn secondary" onClick={onBack}>← Zurück</button><div className="hero"><h1>{customer.name}</h1><p>{customer.email} · {customer.phone}</p></div><div className="row">{tabs.map(t=><button key={t} className={tab===t?'btn':'btn secondary'} onClick={()=>setTab(t)}>{t}</button>)}</div>{tab==='Übersicht'&&<CRMOverview customer={customer}/>} {tab==='Kontakte'&&<CRMContacts customer={customer}/>} {tab==='Notizen'&&<CRMNotes customer={customer}/>} {tab==='Dateien'&&<CRMFiles/>} {tab==='Verlauf'&&<CRMHistory/>} {tab==='Rechnungen'&&<CRMInvoices customer={customer}/>} {tab==='Angebote'&&<CRMOffers customer={customer}/>} {tab==='Verträge'&&<Contracts customer={customer}/>} {tab==='AI Insights'&&<AIInsights customer={customer}/>} {tab==='Ziele'&&<CustomerGoals customer={customer}/>} {tab==='Tool Datenzentrale'&&<CRMToolCenter customer={customer}/>} {tab==='Integrationen'&&<Integrations customer={customer}/>} {tab==='Timeline'&&<CustomerTimeline customer={customer}/>} {tab==='Benachrichtigungen'&&<CustomerNotifications customer={customer}/>}</div>}
function CRMOverview({customer}){return <div className="grid"><UploadBox customer={customer} area="Kunden CRM"/><div className="card"><h2>Unternehmensdaten</h2><CustomerChip customer={customer}/></div><div className="card"><h2>KPIs</h2><div className="kpi">{money(customer.revenue)}</div><div className="item">⭐ Bewertung: {customer.rating||0}</div><div className="item">🏷️ Status: {customer.status}</div></div><div className="card"><h2>Schnellaktionen</h2><button className="btn secondary" onClick={()=>window.open((process.env.NEXT_PUBLIC_API_BASE||'http://localhost:4000')+'/api/report/customer','_blank')}>📊 Report PDF</button><button className="btn secondary" onClick={()=>alert('Tickets findest du im CRM-Tab Tickets/Admin Tickets')}>🎫 Tickets anzeigen</button><button className="btn secondary" onClick={()=>alert('Rechnungen sind im Tab Rechnungen sichtbar')}>💶 Rechnungen anzeigen</button></div></div>}
function CRMContacts({customer}){const[items,setItems]=useState([]),[form,setForm]=useState({name:'',email:'',phone:'',role:''});useEffect(()=>{load()},[customer]);async function load(){const{data}=await supabase.from('customer_contacts').select('*').eq('customer_id',customer.id).order('created_at',{ascending:false});setItems(data||[])}async function add(){await supabase.from('customer_contacts').insert({...form,customer_id:customer.id});setForm({name:'',email:'',phone:'',role:''});load()}return <div className="grid"><div className="card"><h2>Kontakt hinzufügen</h2>{['name','email','phone','role'].map(k=><input key={k} className="input" placeholder={k} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/>) }<button className="btn" onClick={add}>Speichern</button></div><div className="card"><h2>Kontakte</h2>{items.map(i=><div className="item" key={i.id}>{i.name}<br/>{i.email}<br/>{i.phone}<br/>{i.role}</div>)}</div></div>}
function CRMNotes({customer}){const[items,setItems]=useState([]),[note,setNote]=useState('');useEffect(()=>{load()},[customer]);async function load(){const{data}=await supabase.from('customer_notes').select('*, profiles(full_name)').eq('customer_id',customer.id).order('created_at',{ascending:false});setItems(data||[])}async function add(){const{data:{user}}=await supabase.auth.getUser();await supabase.from('customer_notes').insert({customer_id:customer.id,note,author_id:user?.id});setNote('');load()}return <div className="grid"><div className="card"><h2>Notiz</h2><textarea className="input" rows="6" value={note} onChange={e=>setNote(e.target.value)}/><button className="btn" onClick={add}>Speichern</button></div><div className="card"><h2>Notizen</h2>{items.map(i=><div className="item" key={i.id}>{i.note}<br/><span className="muted">{i.profiles?.full_name||'User'} · {new Date(i.created_at).toLocaleString('de-DE')}</span></div>)}</div></div>}
function CRMFiles(){return <div className="card"><h2>Dateien</h2><input className="input" type="file"/><button className="btn">Datei vormerken</button><div className="item">Mustervertrag.pdf<br/><button className="btn secondary">Öffnen</button></div></div>}
function CRMHistory(){return <div className="card"><h2>Verlauf</h2>{['Kunde angelegt','Erstgespräch','Angebot','Rechnung','Report'].map(i=><div className="item" key={i}>{i}</div>)}</div>}
function CRMInvoices({customer}){const[items,setItems]=useState([]);useEffect(()=>{supabase.from('invoices').select('*').eq('customer_id',customer.id).order('created_at',{ascending:false}).then(({data})=>setItems(data||[]))},[customer]);return <div className="card"><h2>Rechnungen</h2>{items.map(i=><div className="item" key={i.id}>{i.invoice_number} · {money(i.amount)} · {i.status}</div>)}</div>}

function CRMOffers({customer}){
  const [items,setItems]=useState([]),[file,setFile]=useState(null),[form,setForm]=useState({title:'',amount:PACKAGE_CATALOG.Starter.price,status:'Offen',package_name:'Starter',customTools:[]})
  useEffect(()=>{if(customer)load()},[customer])
  async function load(){const{data}=await supabase.from('offers').select('*').eq('customer_id',customer.id).order('created_at',{ascending:false});setItems(data||[])}
  async function add(){
    const tools=form.package_name==='Individuell'?(form.customTools||[]):PACKAGE_CATALOG[form.package_name].tools
    await supabase.from('offers').insert({offer_number:'ANG-'+Date.now(),customer_id:customer.id,title:form.title||(form.package_name+' Angebot'),amount:form.amount,status:form.status,package_name:form.package_name,package_price:form.amount,package_tools:tools,file_name:file?.name||null,file_url:'#',uploaded_at:file?new Date().toISOString():null})
    await unlockTools(customer.id,form.package_name,form.customTools||[])
    alert('Angebot gespeichert und Paket/Tools freigeschaltet.')
    setForm({title:'',amount:PACKAGE_CATALOG.Starter.price,status:'Offen',package_name:'Starter',customTools:[]});setFile(null);load()
  }
  async function updateStatus(id,status){await supabase.from('offers').update({status}).eq('id',id);load()}
  return <div className="grid"><div className="card"><h2>Angebot hochladen/erstellen</h2><select className="input" value={form.package_name} onChange={e=>{const p=e.target.value;setForm({...form,package_name:p,amount:PACKAGE_CATALOG[p]?.price||0})}}><option>Starter</option><option>Growth</option><option>Premium</option><option>Individuell</option></select>{form.package_name==='Individuell'&&<div className="card"><h2>Individuelle Tools</h2>{Object.keys(TOOL_LABELS).map(t=><label key={t} className="item"><input type="checkbox" checked={(form.customTools||[]).includes(t)} onChange={e=>{const arr=form.customTools||[];setForm({...form,customTools:e.target.checked?[...arr,t]:arr.filter(x=>x!==t)})}}/> {TOOL_LABELS[t]}</label>)}</div>}<input className="input" placeholder="Leistung / Titel" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><input className="input" type="number" placeholder="Preis / Monatsumsatz" value={form.amount} disabled={form.package_name!=='Individuell'} onChange={e=>setForm({...form,amount:e.target.value})}/><p className="muted">Starter/Growth/Premium haben feste Preise. Nur Individuell ist frei bepreisbar.</p><select className="input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Offen</option><option>Angenommen</option><option>Beauftragt</option><option>Gewonnen</option><option>Abgelehnt</option></select><input className="input" type="file" onChange={e=>setFile(e.target.files?.[0]||null)}/><button className="btn" onClick={add}>Angebot speichern</button></div><div className="card"><h2>Angebote</h2>{items.map(o=><div className="item" key={o.id}>{o.offer_number} · {o.package_name||'-'} · {o.title}<br/>{money(o.amount)}<br/><select className="input" value={o.status} onChange={e=>updateStatus(o.id,e.target.value)}><option>Offen</option><option>Angenommen</option><option>Beauftragt</option><option>Gewonnen</option><option>Abgelehnt</option></select>{o.file_name&&<p>Datei: {o.file_name}</p>}</div>)}</div></div>
}


function CRMToolCenter({customer}){const[seo,setSeo]=useState({month:'Aktuell',organic_traffic:0,impressions:0,clicks:0,ctr:0,avg_position:0,top10_keywords:0,backlinks:0,technical_score:0,local_visibility:0});async function saveSeo(){await supabase.from('seo_traffic').insert({...seo,customer_id:customer.id});alert('SEO Werte gespeichert.')}return <div className="grid"><div className="card"><h2>SEO Dashboard Werte einspeisen</h2>{Object.keys(seo).map(k=><input key={k} className="input" type={k==='month'?'text':'number'} placeholder={k} value={seo[k]} onChange={e=>setSeo({...seo,[k]:e.target.value})}/>) }<button className="btn" onClick={saveSeo}>📊 SEO Werte speichern</button></div><GoogleBusinessConnect customer={customer}/></div>}


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


function LocalSEOHeatmap({customer}){const[items,setItems]=useState([]),[form,setForm]=useState({area_name:'',keyword:'',rank_position:0,visibility_score:0,recommendation:''});useEffect(()=>{if(customer)load()},[customer]);async function load(){const{data}=await supabase.from('local_seo_heatmap').select('*').eq('customer_id',customer.id).order('visibility_score',{ascending:false});setItems(data||[])}async function add(){await supabase.from('local_seo_heatmap').insert({...form,customer_id:customer.id});setForm({area_name:'',keyword:'',rank_position:0,visibility_score:0,recommendation:''});load()}if(!customer)return null;return <div className="grid"><div className="card"><h2>Local SEO Karte</h2><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,background:'linear-gradient(135deg,#dbeafe,#f5f3ff)',padding:14,borderRadius:20}}>{items.map(i=><div key={i.id} className="item" style={{background:Number(i.visibility_score)>75?'#dcfce7':Number(i.visibility_score)>45?'#fef9c3':'#fee2e2'}}><b>{i.area_name}</b><br/>{i.keyword}<br/>Rang {i.rank_position}<br/>Sichtbarkeit {i.visibility_score}%</div>)}</div></div><div className="card"><h2>Heatmap Punkt hinzufügen</h2><label className="muted">Gebiet oder Stadtteil</label><input className="input" placeholder="z. B. Innenstadt" value={form.area_name} onChange={e=>setForm({...form,area_name:e.target.value})}/><label className="muted">Keyword</label><input className="input" placeholder="z. B. friseur rostock" value={form.keyword} onChange={e=>setForm({...form,keyword:e.target.value})}/><label className="muted">Ranking Position</label><input className="input" type="number" value={form.rank_position} onChange={e=>setForm({...form,rank_position:e.target.value})}/><label className="muted">Sichtbarkeit %</label><input className="input" type="number" value={form.visibility_score} onChange={e=>setForm({...form,visibility_score:e.target.value})}/><label className="muted">Empfehlung</label><textarea className="input" rows="3" value={form.recommendation} onChange={e=>setForm({...form,recommendation:e.target.value})}/><button className="btn" onClick={add}>Speichern</button></div></div>}


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
  const metrics=[['rating','Ø Bewertung'],['monthly_booking_revenue','Booking-Umsatz'],['organic_traffic','Organischer Traffic'],['impressions','Impressionen'],['ctr','CTR %'],['top10_keywords','Top-10 Keywords'],['bookings','Anzahl Bookings']]
  const [items,setItems]=useState([]),[form,setForm]=useState({goal_name:'',metric:'rating',target_value:'',start_date:today(),end_date:today(),status:'Aktiv'})
  useEffect(()=>{if(customer)load()},[customer])
  async function load(){const{data}=await supabase.from('customer_goals').select('*, profiles(full_name)').eq('customer_id',customer.id).order('created_at',{ascending:false});const enriched=[];for(const g of(data||[])){enriched.push({...g,current_value:await metricValue(customer.id,g.metric)})}setItems(enriched)}
  async function add(){const{data:{user}}=await supabase.auth.getUser();const current=await metricValue(customer.id,form.metric);await supabase.from('customer_goals').insert({...form,customer_id:customer.id,current_value:current,created_by:user?.id,auto_current:true});setForm({goal_name:'',metric:'rating',target_value:'',start_date:today(),end_date:today(),status:'Aktiv'});load()}
  return <div className="grid"><div className="card"><h2>Ziel erstellen</h2><input className="input" placeholder="Zielname, z. B. Bewertung auf 4.9 steigern" value={form.goal_name} onChange={e=>setForm({...form,goal_name:e.target.value})}/><select className="input" value={form.metric} onChange={e=>setForm({...form,metric:e.target.value})}>{metrics.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select><input className="input" type="number" placeholder="ZIELWERT EINTRAGEN, z. B. 4.9 / 1000 / 25" value={form.target_value} onChange={e=>setForm({...form,target_value:e.target.value})}/><label className="muted">Zeitraum Start</label><input className="input" type="date" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})}/><label className="muted">Zeitraum Ende / Deadline</label><input className="input" type="date" value={form.end_date} onChange={e=>setForm({...form,end_date:e.target.value})}/><button className="btn" onClick={add}>Ziel speichern</button></div><CrudList title="Ziele" items={items} render={i=><div className="item" key={i.id}><b>{i.goal_name}</b><br/>{metrics.find(m=>m[0]===i.metric)?.[1]||i.metric}: {i.current_value} / {i.target_value}<br/>Zeitraum: {i.start_date||'-'} bis {i.end_date||'-'}<br/>Erstellt von: {i.profiles?.full_name||'User'}</div>}/></div>
}


function GoalsAdmin({openCrm}){
  const[items,setItems]=useState([])
  useEffect(()=>{load()},[])
  async function load(){const{data}=await supabase.from('customer_goals').select('*, customers(*), profiles(full_name)').order('created_at',{ascending:false});const enriched=[];for(const g of(data||[])){enriched.push({...g,current_value:await metricValue(g.customer_id,g.metric)})}setItems(enriched)}
  return <div><div className="hero"><h1>Zielsystem Admin</h1><p>Alle Ziele mit Ersteller, Zeitraum und aktuellem KPI-Wert.</p></div><CrudList title="Alle Kundenziele" items={items} render={i=><div className="item" key={i.id} onClick={()=>openCrm(i.customers)}><b>{i.customers?.name}</b><br/>{i.goal_name}: {i.current_value}/{i.target_value}<br/>Zeitraum: {i.start_date||'-'} bis {i.end_date||'-'}<br/>Erstellt von: {i.profiles?.full_name||'User'}</div>}/></div>
}


function ReferralProgram({customer}){
  const [items,setItems]=useState([]),[form,setForm]=useState({program_name:'',reward:'',referrals:0,converted:0,status:'Aktiv'})
  useEffect(()=>{if(customer)load()},[customer])
  async function load(){const{data}=await supabase.from('referral_programs').select('*').eq('customer_id',customer.id).order('created_at',{ascending:false});setItems(data||[])}
  async function add(){await supabase.from('referral_programs').insert({...form,customer_id:customer.id});setForm({program_name:'',reward:'',referrals:0,converted:0,status:'Aktiv'});load()}
  return <div className="grid"><div className="card"><h2>Empfehlungsprogramm</h2><input className="input" placeholder="Programmname" value={form.program_name} onChange={e=>setForm({...form,program_name:e.target.value})}/><input className="input" placeholder="Belohnung" value={form.reward} onChange={e=>setForm({...form,reward:e.target.value})}/><button className="btn" onClick={add}>Programm speichern</button></div><CrudList title="Programme" items={items} render={i=><div className="item" key={i.id}>{i.program_name}<br/>{i.reward}<br/>Empfehlungen: {i.referrals} · Gewonnen: {i.converted}</div>}/></div>
}


function CompetitorAds({customer}){const[items,setItems]=useState([]);useEffect(()=>{if(customer)load()},[customer]);async function load(){const{data}=await supabase.from('competitor_ads').select('*').eq('customer_id',customer.id).order('created_at',{ascending:false});setItems(data||[])}return <div><div className="hero"><h1>Konkurrenz-ADS Scanner</h1><p>Nur Anzeige in der Kundenansicht. Später über Google/Meta API automatisierbar.</p></div><CrudList title="Erkannte Konkurrenzanzeigen" items={items} render={i=><div className="item" key={i.id}><b>{i.competitor_name}</b> · {i.platform}<br/>{i.headline}<br/>{i.offer_text}<br/><span className="muted">{i.notes}</span></div>}/></div>}



function CompetitorAdsAdmin({customer}){const[items,setItems]=useState([]),[form,setForm]=useState({competitor_name:'',platform:'Google',headline:'',offer_text:'',notes:''});useEffect(()=>{if(customer)load()},[customer]);async function load(){const{data}=await supabase.from('competitor_ads').select('*').eq('customer_id',customer.id).order('created_at',{ascending:false});setItems(data||[])}async function add(){await supabase.from('competitor_ads').insert({...form,customer_id:customer.id});setForm({competitor_name:'',platform:'Google',headline:'',offer_text:'',notes:''});load()}return <div className="grid"><div className="card"><h2>Konkurrenz-ADS erfassen</h2><input className="input" placeholder="Konkurrent" value={form.competitor_name} onChange={e=>setForm({...form,competitor_name:e.target.value})}/><select className="input" value={form.platform} onChange={e=>setForm({...form,platform:e.target.value})}><option>Google</option><option>Meta</option><option>TikTok</option></select><input className="input" placeholder="Headline" value={form.headline} onChange={e=>setForm({...form,headline:e.target.value})}/><textarea className="input" rows="3" placeholder="Angebot/Werbetext" value={form.offer_text} onChange={e=>setForm({...form,offer_text:e.target.value})}/><button className="btn" onClick={add}>Ad speichern</button></div><CrudList title="Gespeichert" items={items} render={i=><div className="item" key={i.id}><b>{i.competitor_name}</b> · {i.platform}<br/>{i.headline}<br/>{i.offer_text}</div>}/></div>}


function MultiLocationManager({customer}){const[items,setItems]=useState([]),[form,setForm]=useState({location_name:'',address:'',phone:'',google_profile_url:''}),[lastLogin,setLastLogin]=useState(null);useEffect(()=>{if(customer)load()},[customer]);async function load(){const{data}=await supabase.from('multi_locations').select('*').eq('customer_id',customer.id).order('created_at',{ascending:false});setItems(data||[])}async function add(){const{data:{user}}=await supabase.auth.getUser();const res=await fetch((process.env.NEXT_PUBLIC_API_BASE||'http://localhost:4000')+'/api/locations/create-user',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,customer_id:customer.id,creator_user_id:user?.id})});const data=await res.json();if(!data.ok)return alert(data.error||'Fehler');setLastLogin(data.login);setForm({location_name:'',address:'',phone:'',google_profile_url:''});load()}return <div className="grid"><div className="card"><h2>Multi-Standortverwaltung</h2><p className="muted">Beim Hinzufügen wird ein eigener Standort-Benutzer erstellt.</p><input className="input" placeholder="Standortname" value={form.location_name} onChange={e=>setForm({...form,location_name:e.target.value})}/><input className="input" placeholder="Adresse" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/><input className="input" placeholder="Telefon" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/><input className="input" placeholder="Google Profil URL" value={form.google_profile_url} onChange={e=>setForm({...form,google_profile_url:e.target.value})}/><button className="btn" onClick={add}>Standort + Benutzer erstellen</button>{lastLogin&&<div className="item"><b>Login erstellt</b><br/>{lastLogin.email}<br/>{lastLogin.password}</div>}</div><CrudList title="Standorte" items={items} render={i=><div className="item" key={i.id}>{i.location_name}<br/>{i.address}<br/>{i.phone}<br/>Login: {i.login_email}</div>}/></div>}


function GrowthToolsAdmin({customers}){
  const [customerId,setCustomerId]=useState('')
  const customer=customers.find(c=>c.id===customerId)||customers[0]
  return <div><div className="hero"><h1>Growth Tools Admin</h1><p>AI Insights, Verträge, Attribution und Wettbewerbsdaten pro Kunde pflegen.</p></div><select className="input" value={customer?.id||''} onChange={e=>setCustomerId(e.target.value)}>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>{customer&&<><AIInsights customer={customer}/><Contracts customer={customer}/><CampaignAttribution customer={customer}/><CompetitorAdsAdmin customer={customer}/><MultiLocationManager customer={customer}/></>}</div>
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



function GoogleBusinessConnect({customer}){const[conn,setConn]=useState({location_id:'',account_id:'',api_key:'',connected_email:''}),[logs,setLogs]=useState([]);useEffect(()=>{if(customer)load()},[customer]);async function load(){const{data}=await supabase.from('google_business_connections').select('*').eq('customer_id',customer.id).maybeSingle();if(data)setConn(data);const{data:l}=await supabase.from('google_business_sync_logs').select('*').eq('customer_id',customer.id).order('created_at',{ascending:false});setLogs(l||[])}async function save(){await supabase.from('google_business_connections').upsert({...conn,customer_id:customer.id,sync_enabled:true},{onConflict:'customer_id'});alert('Google Business Verbindung gespeichert.')}async function sync(){const res=await fetch((process.env.NEXT_PUBLIC_API_BASE||'http://localhost:4000')+'/api/google-business/mock-sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customer_id:customer.id})});const data=await res.json();if(!data.ok)return alert(data.error||'Fehler');alert('Demo-Sync ausgeführt: Keywords und KPIs wurden eingepflegt.');load()}return <div className="card"><h2>Google Business Profile verknüpfen</h2><p className="muted">Vorrichtung für spätere Google Business Profile API. Der Demo-Sync erzeugt Keywords und KPI-Werte automatisch.</p><input className="input" placeholder="Google Account ID" value={conn.account_id||''} onChange={e=>setConn({...conn,account_id:e.target.value})}/><input className="input" placeholder="Google Location ID" value={conn.location_id||''} onChange={e=>setConn({...conn,location_id:e.target.value})}/><input className="input" placeholder="verbundene E-Mail" value={conn.connected_email||''} onChange={e=>setConn({...conn,connected_email:e.target.value})}/><input className="input" placeholder="API Key / OAuth Token Platzhalter" value={conn.api_key||''} onChange={e=>setConn({...conn,api_key:e.target.value})}/><button className="btn" onClick={save}>Verbindung speichern</button><button className="btn secondary" onClick={sync}>Keywords & KPIs automatisch ziehen</button>{logs.map(l=><div className="item" key={l.id}>{l.status}: {l.message}</div>)}</div>}
function ReferralsAdmin({customers,openCrm}){const[customerId,setCustomerId]=useState(''),[customer,setCustomer]=useState(null);useEffect(()=>{setCustomer(customers.find(c=>c.id===customerId)||customers[0])},[customerId,customers]);return <div><div className="hero"><h1>Empfehlungsprogramme Admin</h1><p>Empfehlungen werden im Adminbereich gepflegt.</p></div><select className="input" value={customer?.id||''} onChange={e=>setCustomerId(e.target.value)}>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>{customer&&<ReferralProgram customer={customer}/>}</div>}


function CustomerNotifications({customer}){
  const[items,setItems]=useState([]),[form,setForm]=useState({title:'',message:'',priority:'Normal',type:'info'})
  useEffect(()=>{if(customer)load()},[customer])
  async function load(){const{data}=await supabase.from('notifications').select('*').eq('customer_id',customer.id).order('created_at',{ascending:false});setItems(data||[])}
  async function add(){await supabase.from('notifications').insert({...form,customer_id:customer.id});setForm({title:'',message:'',priority:'Normal',type:'info'});load()}
  return <div className="grid"><div className="card"><h2>Benachrichtigung erstellen</h2><input className="input" placeholder="Titel" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><textarea className="input" rows="3" placeholder="Nachricht" value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/><select className="input" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option>Niedrig</option><option>Normal</option><option>Hoch</option><option>Kritisch</option></select><button className="btn" onClick={add}>Speichern</button></div><CrudList title="Benachrichtigungen" items={items} render={i=><div className="item" key={i.id}><b>{i.title}</b> · {i.priority}<br/>{i.message}<br/>{new Date(i.created_at).toLocaleString('de-DE')}</div>}/></div>
}

function NotificationsCenter({customers,openCrm}){
  const[items,setItems]=useState([])
  useEffect(()=>{load()},[])
  async function load(){const{data}=await supabase.from('notifications').select('*, customers(*)').order('created_at',{ascending:false}).limit(80);setItems(data||[])}
  async function mark(id){await supabase.from('notifications').update({read:true}).eq('id',id);load()}
  return <div><div className="hero"><h1>Notifications Center</h1><p>Neue Paketanfragen, Tickets, überfällige Rechnungen, Ziele und Systemmeldungen.</p></div><CrudList title="Benachrichtigungen" items={items} render={i=><div className="item" key={i.id}><b>{i.title}</b> · {i.priority} · {i.read?'gelesen':'neu'}<br/>{i.customers?.name}<br/>{i.message}<br/><button className="btn secondary" onClick={()=>i.customers&&openCrm(i.customers)}>CRM öffnen</button><button className="btn secondary" onClick={()=>mark(i.id)}>Gelesen</button></div>}/></div>
}

function CustomerTimeline({customer}){
  const[items,setItems]=useState([]),[form,setForm]=useState({event_type:'Notiz',title:'',description:''})
  useEffect(()=>{if(customer)load()},[customer])
  async function load(){const{data}=await supabase.from('activity_timeline').select('*, profiles(full_name)').eq('customer_id',customer.id).order('created_at',{ascending:false});setItems(data||[])}
  async function add(){const{data:{user}}=await supabase.auth.getUser();await supabase.from('activity_timeline').insert({...form,customer_id:customer.id,user_id:user?.id});setForm({event_type:'Notiz',title:'',description:''});load()}
  return <div className="grid"><div className="card"><h2>Aktivität hinzufügen</h2><select className="input" value={form.event_type} onChange={e=>setForm({...form,event_type:e.target.value})}><option>Notiz</option><option>Rechnung</option><option>Ticket</option><option>SEO</option><option>Vertrag</option><option>Ziel</option></select><input className="input" placeholder="Titel" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><textarea className="input" rows="3" placeholder="Beschreibung" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/><button className="btn" onClick={add}>Speichern</button></div><CrudList title="Timeline" items={items} render={i=><div className="item" key={i.id}><b>{i.title}</b> · {i.event_type}<br/>{i.description}<br/>{i.profiles?.full_name||'System'} · {new Date(i.created_at).toLocaleString('de-DE')}</div>}/></div>
}

function GlobalTimeline({customers,openCrm}){
  const[items,setItems]=useState([])
  useEffect(()=>{supabase.from('activity_timeline').select('*, customers(*), profiles(full_name)').order('created_at',{ascending:false}).limit(100).then(({data})=>setItems(data||[]))},[])
  return <div><div className="hero"><h1>Activity Timeline</h1><p>Alle Kundenaktivitäten an einem Ort.</p></div><CrudList title="Aktivitäten" items={items} render={i=><div className="item" key={i.id} onClick={()=>i.customers&&openCrm(i.customers)}><b>{i.customers?.name}</b> · {i.event_type}<br/>{i.title}<br/>{i.description}<br/>{new Date(i.created_at).toLocaleString('de-DE')}</div>}/></div>
}

function AutomationEngine({customers}){
  const[items,setItems]=useState([]),[form,setForm]=useState({name:'',trigger_type:'offer_won',action_type:'unlock_tools',customer_id:'',enabled:true})
  useEffect(()=>{load()},[])
  async function load(){const{data}=await supabase.from('automation_rules').select('*, customers(*)').order('created_at',{ascending:false});setItems(data||[])}
  async function add(){await supabase.from('automation_rules').insert({...form,config:{}});setForm({name:'',trigger_type:'offer_won',action_type:'unlock_tools',customer_id:'',enabled:true});load()}
  async function toggle(i){await supabase.from('automation_rules').update({enabled:!i.enabled}).eq('id',i.id);load()}
  return <div><div className="hero"><h1>Automation Engine</h1><p>Wenn X passiert, dann Y ausführen. Zunächst regelbasiert und Supabase-gebunden.</p></div><div className="grid"><div className="card"><h2>Automation anlegen</h2><input className="input" placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><select className="input" value={form.trigger_type} onChange={e=>setForm({...form,trigger_type:e.target.value})}><option>offer_won</option><option>invoice_overdue</option><option>ticket_created</option><option>goal_reached</option></select><select className="input" value={form.action_type} onChange={e=>setForm({...form,action_type:e.target.value})}><option>unlock_tools</option><option>create_invoice</option><option>create_reminder</option><option>notify_admin</option><option>create_timeline</option></select><select className="input" value={form.customer_id} onChange={e=>setForm({...form,customer_id:e.target.value})}><option value="">Alle Kunden</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="btn" onClick={add}>Automation speichern</button></div><CrudList title="Regeln" items={items} render={i=><div className="item" key={i.id}><b>{i.name}</b><br/>{i.trigger_type} → {i.action_type}<br/>{i.customers?.name||'Alle Kunden'}<br/><button className={i.enabled?'btn':'btn secondary'} onClick={()=>toggle(i)}>{i.enabled?'Aktiv':'Inaktiv'}</button></div>}/></div></div>
}

function GlobalSearch({openCrm}){
  const[q,setQ]=useState(''),[results,setResults]=useState([])
  async function search(){const res=await fetch((process.env.NEXT_PUBLIC_API_BASE||'http://localhost:4000')+'/api/search/global?q='+encodeURIComponent(q));const data=await res.json();setResults(data.results||[])}
  return <div><div className="hero"><h1>Global Search</h1><p>Suche nach Kunden, Rechnungen, Tickets und Angeboten.</p></div><div className="card"><div className="row"><input className="input" style={{maxWidth:520}} placeholder="Suchen..." value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')search()}}/><button className="btn" onClick={search}>Suchen</button></div></div><CrudList title="Ergebnisse" items={results} render={(r,idx)=><div className="item" key={idx}><b>{r.type}</b> · {r.title}<br/>{r.subtitle}</div>}/></div>
}

function SmartDashboard({customers,openCrm}){
  const[openInvoices,setOpenInvoices]=useState([]),[tickets,setTickets]=useState([]),[goals,setGoals]=useState([]),[insights,setInsights]=useState([])
  useEffect(()=>{load()},[])
  async function load(){
    supabase.from('invoices').select('*, customers(*)').neq('status','Bezahlt').limit(10).then(({data})=>setOpenInvoices(data||[]))
    supabase.from('tickets').select('*, customers(*)').neq('status','erledigt').limit(10).then(({data})=>setTickets(data||[]))
    supabase.from('customer_goals').select('*, customers(*)').limit(10).then(({data})=>setGoals(data||[]))
    supabase.from('ai_business_insights').select('*, customers(*)').limit(10).then(({data})=>setInsights(data||[]))
  }
  return <div><div className="hero"><h1>Smart Dashboard</h1><p>Kritische Kunden, offene Rechnungen, Tickets, Ziele und AI Insights.</p></div><div className="grid"><CrudList title="Offene Rechnungen" items={openInvoices} render={i=><div className="item" key={i.id} onClick={()=>openCrm(i.customers)}>{i.invoice_number}<br/>{i.customers?.name}<br/>{money(i.amount)} · {i.status}</div>}/><CrudList title="Offene Tickets" items={tickets} render={t=><div className="item" key={t.id} onClick={()=>openCrm(t.customers)}>{t.title}<br/>{t.customers?.name}<br/>{t.status}</div>}/><CrudList title="Ziele" items={goals} render={g=><div className="item" key={g.id} onClick={()=>openCrm(g.customers)}>{g.goal_name}<br/>{g.customers?.name}<br/>{g.current_value}/{g.target_value}</div>}/><CrudList title="AI Insights" items={insights} render={i=><div className="item" key={i.id} onClick={()=>openCrm(i.customers)}>{i.title}<br/>{i.customers?.name}<br/>{i.severity}</div>}/></div></div>
}

function RoleManager({customers}){
  const[items,setItems]=useState([]),[users,setUsers]=useState([]),[form,setForm]=useState({user_id:'',customer_id:'',role_key:'kunde',permissions:[]})
  useEffect(()=>{load()},[])
  async function load(){supabase.from('customer_roles').select('*, profiles(full_name,email), customers(name)').then(({data})=>setItems(data||[]));supabase.from('profiles').select('*').then(({data})=>setUsers(data||[]))}
  async function add(){await supabase.from('customer_roles').upsert(form,{onConflict:'user_id,customer_id,role_key'});load()}
  return <div><div className="hero"><h1>Rollen & Rechte</h1><p>Admin, Support, Sales, SEO Manager, Standortleiter, Kunde.</p></div><div className="grid"><div className="card"><h2>Rolle vergeben</h2><select className="input" value={form.user_id} onChange={e=>setForm({...form,user_id:e.target.value})}><option value="">User wählen</option>{users.map(u=><option key={u.id} value={u.id}>{u.full_name} · {u.email}</option>)}</select><select className="input" value={form.customer_id} onChange={e=>setForm({...form,customer_id:e.target.value})}><option value="">Kunde wählen</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><select className="input" value={form.role_key} onChange={e=>setForm({...form,role_key:e.target.value})}><option>admin</option><option>support</option><option>sales</option><option>seo_manager</option><option>standortleiter</option><option>kunde</option></select><button className="btn" onClick={add}>Speichern</button></div><CrudList title="Rollen" items={items} render={i=><div className="item" key={i.id}>{i.profiles?.full_name}<br/>{i.customers?.name}<br/>{i.role_key}</div>}/></div></div>
}



function DesignSwitcher({design,setDesign,colorScheme,setColorScheme}){
  const colors=[
    {key:'violet',name:'Violet / Pink',hint:'Modern, auffällig, SaaS-Look'},
    {key:'blue',name:'Navy / Blue',hint:'Seriös, Tech, B2B'},
    {key:'emerald',name:'Emerald',hint:'Wachstum, Local Business, frisch'},
    {key:'amber',name:'Amber / Gold',hint:'Premium, warm, hochwertig'},
    {key:'rose',name:'Rose / Red',hint:'Energie, Sales, aufmerksamkeitsstark'},
    {key:'slate',name:'Slate Monochrome',hint:'Sehr clean, erwachsen, minimal'}
  ]
  function applyDesign(next){
    setDesign(next)
    if(typeof window!=='undefined') localStorage.setItem('mmos_design',next)
    fade()
  }
  function applyColor(next){
    setColorScheme(next)
    if(typeof window!=='undefined') localStorage.setItem('mmos_color_scheme',next)
    fade()
  }
  function fade(){
    document.body.classList.add('design-fade-now')
    setTimeout(()=>document.body.classList.remove('design-fade-now'),520)
  }
  return <div>
    <div className="hero"><h1>Design & Farbschema wechseln</h1><p>Wechsle live zwischen zwei Layout-Stilen und mehreren Farbschemata. Die Auswahl wird im Browser gespeichert.</p></div>
    <div className="grid">
      <div className="card">
        <h2>💜 Purple Premium</h2>
        <p className="muted">Moderner, auffälliger SaaS-Look mit mehr Marketing-Energie.</p>
        <button className={design==='purple'?'btn':'btn secondary'} onClick={()=>applyDesign('purple')}>{design==='purple'?'Aktiv':'Aktivieren'}</button>
      </div>
      <div className="card">
        <h2>🏛️ Executive Professional</h2>
        <p className="muted">Ruhiger, seriöser B2B-Look mit klaren Flächen und weniger verspielten Effekten.</p>
        <button className={design==='executive'?'btn':'btn secondary'} onClick={()=>applyDesign('executive')}>{design==='executive'?'Aktiv':'Aktivieren'}</button>
      </div>
    </div>

    <div className="card">
      <h2>Farbschema</h2>
      <div className="grid">
        {colors.map(c=><div className={'item color-choice '+(colorScheme===c.key?'active':'')} key={c.key} onClick={()=>applyColor(c.key)}>
          <div className={'color-dot color-'+c.key}></div>
          <b>{c.name}</b><br/>
          <span className="muted">{c.hint}</span>
        </div>)}
      </div>
    </div>

    <div className="card">
      <h2>Vorschau</h2>
      <div className="grid">
        <div className="card"><h2>KPI Karte</h2><div className="kpi">24.890€</div><p className="muted">Monatsumsatz</p><button className="btn">Primäraktion</button></div>
        <div className="card"><h2>CRM Modul</h2><div className="item">Demo Friseur Rostock<br/><span className="badge">Aktiv</span></div><button className="btn secondary">Sekundäraktion</button></div>
      </div>
    </div>
  </div>
}




function Audit(){const[logs,setLogs]=useState([]);useEffect(()=>{supabase.from('audit_logs').select('*').order('created_at',{ascending:false}).then(({data})=>setLogs(data||[]))},[]);return <div className="card"><h2>Audit Log</h2>{logs.length===0&&<p className="muted">Noch keine Audit-Einträge.</p>}{logs.map(l=><div className="item" key={l.id}>{l.action}<br/>{l.entity}<br/>{l.created_at}</div>)}</div>}
