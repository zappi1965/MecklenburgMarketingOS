
import {useEffect,useState} from "react";
import {useRouter} from "next/router";
import {api, moduleLabels, downloadText} from "../../../src/lib/api";
import AppShell from "../../../src/components/AppShell";
import Kpi from "../../../src/components/Kpi";
import Locked from "../../../src/components/Locked";
import Modal from "../../../src/components/Modal";
import Toast from "../../../src/components/Toast";
import {BarChart,Donut} from "../../../src/components/Charts";

const stages=["Neu","Kontakt","Angebot","Verhandlung","Gewonnen"];

function Head({title,subtitle,action}){return <div className="page-head"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>}

function useData(path,deps=[]){
  const [data,setData]=useState([]);
  async function load(){setData(await api(path))}
  useEffect(()=>{if(path)load().catch(()=>{})},deps);
  return {data,setData,load};
}

function Dashboard({client}) {
  return <>
    <Head title="Dashboard" subtitle={`Willkommen zurück. Überblick für ${client.name}.`} action={<button className="btn" onClick={()=>window.print()}>Bericht drucken</button>} />
    <div className="grid" style={{marginBottom:16}}>
      <Kpi icon="€" label="Gesamtumsatz" value="€12.450" trend="↑ 12.5%"/>
      <Kpi icon="👥" label="Neue Leads" value="324" trend="↑ 24.3%"/>
      <Kpi icon="⭐" label="Bewertungen" value="128" trend="↑ 8.2%"/>
      <Kpi icon="☆" label="Google Rating" value="4.8" trend="↑ 0.3"/>
    </div>
    <div className="grid-2"><div className="card line-card"><h2>Umsatz Overview</h2><div className="fake-line"></div></div><div className="card"><h2>Kundenquellen</h2><Donut center="128" label="Leads"/></div></div>
  </>
}

function CRM({client}) {
  const {data:leads,load}=useData(`/api/client/${client.slug}/leads`,[client.slug]);
  const [modal,setModal]=useState(false);
  const [toast,setToast]=useState("");
  const [form,setForm]=useState({name:"",company:"",email:"",phone:"",status:"Neu",value:"€990",priority:"Mittel"});
  async function save(){await api(`/api/client/${client.slug}/leads`,{method:"POST",body:JSON.stringify(form)});setModal(false);setToast("Lead gespeichert");load()}
  async function del(row){await api(`/api/client/${client.slug}/leads/${row.id}`,{method:"DELETE"});setToast("Lead gelöscht");load()}
  return <>
    <Toast message={toast}/>
    <Head title="CRM" subtitle="Leads, Kontakte und Pipeline verwalten" action={<button className="btn" onClick={()=>setModal(true)}>＋ Neuer Lead</button>} />
    <div className="pipeline">{stages.map(s=><div className="lane" key={s}><div className="lane-head"><span>{s}</span><span>{leads.filter(l=>l.status===s).length}</span></div>{leads.filter(l=>l.status===s).map(l=><div className="deal" key={l.id}><div className="deal-title">{l.company||l.name}</div><div className="deal-sub">{l.name}<br/>{l.email}</div><b>{l.value}</b><br/><span className="badge warn">{l.priority}</span><p><button className="btn secondary mini" onClick={()=>del(l)}>Löschen</button></p></div>)}</div>)}</div>
    <Modal open={modal} onClose={()=>setModal(false)} title="Neuen Lead anlegen">
      <input className="input" placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
      <input className="input" placeholder="Firma" value={form.company} onChange={e=>setForm({...form,company:e.target.value})}/>
      <input className="input" placeholder="E-Mail" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
      <select className="input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{stages.map(s=><option key={s}>{s}</option>)}</select>
      <button className="btn" onClick={save}>Speichern</button>
    </Modal>
  </>
}

function Reviews({client}) {
  const {data:items,load}=useData(`/api/client/${client.slug}/reviews`,[client.slug]);
  async function createDemo(){await api("/api/public/reviews",{method:"POST",body:JSON.stringify({clientSlug:client.slug,rating:3,name:"Demo Kunde",message:"Interne Testbewertung"})});load()}
  return <>
    <Head title="Reviews Übersicht" subtitle="Bewertungen verwalten und Reputation verbessern" action={<button className="btn" onClick={createDemo}>＋ Review simulieren</button>} />
    <div className="grid"><Kpi icon="☆" label="Ø Bewertung" value="4.8" trend="+0.2"/><Kpi icon="💬" label="Gesamt" value={124+items.length} trend="+18%"/><Kpi icon="G" label="Google" value="68" trend="4.9 Sterne"/><Kpi icon="↩" label="Antworten" value="89%" trend="+12%"/></div>
    <div className="grid-2"><div className="card line-card"><h2>Bewertungsentwicklung</h2><div className="fake-line"></div></div><div className="card"><h2>Neue Bewertungen</h2>{items.map(r=><div className="mini-card" key={r.id}><b>{r.name||"Anonym"}</b><p>{r.message}</p><span className="stars">{"★".repeat(r.rating||3)}</span></div>)}</div></div>
  </>
}

function Booking({client}) {
  const {data:items,load}=useData(`/api/client/${client.slug}/bookings`,[client.slug]);
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({name:"",service:"Beratung",date:"2026-05-20",time:"09:00"});
  async function save(){await api(`/api/client/${client.slug}/bookings`,{method:"POST",body:JSON.stringify(form)});setModal(false);load()}
  const days=["Mo 20","Di 21","Mi 22","Do 23","Fr 24","Sa 25","So 26"];
  return <>
    <Head title="Booking / Termine" subtitle="Buchungen, Services und Verfügbarkeiten" action={<button className="btn" onClick={()=>setModal(true)}>＋ Neuer Termin</button>} />
    <div className="calendar-wrap"><div className="week-calendar"><div className="cal-cell cal-head"></div>{days.map(d=><div className="cal-cell cal-head" key={d}>{d}</div>)}{["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00"].map((h,ri)=><>{<div className="cal-cell" key={h}>{h}</div>}{days.map((d,di)=><div className="cal-cell" key={h+d}>{items.filter((_,i)=>i%7===di&&i%8===ri%4).slice(0,1).map(b=><div className="event" key={b.id}>{b.time}<br/><b>{b.name}</b><br/>{b.service}</div>)}</div>)}</>)}</div><div className="card"><h2>Nächste Termine</h2>{items.map(b=><p key={b.id}><b>{b.name}</b><br/><span className="muted">{b.date}, {b.time} – {b.service}</span></p>)}</div></div>
    <Modal open={modal} onClose={()=>setModal(false)} title="Termin erstellen"><input className="input" placeholder="Kunde" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input className="input" placeholder="Service" value={form.service} onChange={e=>setForm({...form,service:e.target.value})}/><input className="input" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/><input className="input" type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})}/><button className="btn" onClick={save}>Speichern</button></Modal>
  </>
}

function Social({client}) {
  const {data:posts,load}=useData(`/api/client/${client.slug}/social-posts`,[client.slug]);
  const [form,setForm]=useState({platform:"Instagram",content:"Neuer Beitrag ✂️",date:"2026-05-20",time:"10:00"});
  async function add(){await api(`/api/client/${client.slug}/social-posts`,{method:"POST",body:JSON.stringify(form)});load()}
  async function publish(p){await api(`/api/client/${client.slug}/social-posts/${p.id}/publish`,{method:"PATCH"});load()}
  return <><Head title="Social Media Scheduler" subtitle="Kostenloses Tool für alle Kunden" action={<button className="btn" onClick={add}>＋ Post planen</button>}/><div className="card"><div className="grid-4"><select className="input" value={form.platform} onChange={e=>setForm({...form,platform:e.target.value})}><option>Instagram</option><option>Facebook</option><option>LinkedIn</option><option>Google Business</option></select><input className="input" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/><input className="input" type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})}/><input className="input" value={form.content} onChange={e=>setForm({...form,content:e.target.value})}/></div></div><div className="grid">{posts.map(p=><div className="post" key={p.id}><b>{p.platform}</b><p>{p.content}</p><span className={p.status==="veröffentlicht"?"badge":"badge warn"}>{p.status||"geplant"}</span><p><button className="btn secondary mini" onClick={()=>publish(p)}>Veröffentlichen simulieren</button></p></div>)}</div></>
}

function Outreach({client}) {
  const {data:items,load}=useData(`/api/client/${client.slug}/outreach`,[client.slug]);
  const [form,setForm]=useState({subject:"Kostenlose Website-Analyse",recipient:"kunde@example.com",body:"Hallo, wir haben Verbesserungspotenzial gefunden."});
  async function send(){await api(`/api/client/${client.slug}/outreach`,{method:"POST",body:JSON.stringify(form)});load()}
  return <><Head title="Cold Outreach" subtitle="Kampagnen, Follow-ups und Vorlagen" action={<button className="btn" onClick={send}>Kampagne erstellen</button>} /><div className="grid-2"><div className="card"><input className="input" value={form.recipient} onChange={e=>setForm({...form,recipient:e.target.value})}/><input className="input" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/><textarea className="input" rows="6" value={form.body} onChange={e=>setForm({...form,body:e.target.value})}/></div><div className="card"><h2>Kampagnen</h2>{items.map(i=><p key={i.id}><b>{i.subject}</b><br/><span className="muted">{i.recipient} – {i.status}</span></p>)}</div></div></>
}

function Reputation({client}) {
  const {data:alerts,load}=useData(`/api/client/${client.slug}/reputation-alerts`,[client.slug]);
  async function resolve(a){await api(`/api/client/${client.slug}/reputation-alerts/${a.id}/resolve`,{method:"PATCH"});load()}
  return <><Head title="Reputation Shield" subtitle="Reputation überwachen und Alerts bearbeiten"/><div className="grid"><Kpi icon="🛡" label="Score" value="87/100" trend="Sehr gut"/><Kpi icon="💬" label="Erwähnungen" value="1.248" trend="+18%"/><Kpi icon="⚠" label="Alerts" value={alerts.length} trend="aktiv"/></div><div className="card">{alerts.map(a=><div className="mini-card" key={a.id}><b>{a.source}: {a.title}</b><p>{a.message}</p><span className={a.severity==="high"?"badge off":"badge warn"}>{a.severity}</span> <button className="btn secondary mini" onClick={()=>resolve(a)}>Erledigen</button></div>)}</div></>
}

function Reports({client}) {
  const {data:reports,load}=useData(`/api/client/${client.slug}/reports`,[client.slug]);
  async function gen(){await api(`/api/client/${client.slug}/reports/generate`,{method:"POST"});load()}
  return <><Head title="Reporting" subtitle="Automatische Berichte erstellen und exportieren" action={<button className="btn" onClick={gen}>＋ Neuen Bericht erstellen</button>}/><div className="grid">{reports.map(r=><div className="card" key={r.id}><h2>{r.title}</h2><p>{r.summary}</p><span className="badge">{r.status}</span><p><button className="btn secondary mini" onClick={()=>downloadText(`${r.title}.txt`,`${r.title}\\n\\n${r.summary}`)}>Export</button></p></div>)}</div></>
}

function QR({client}) {
  const {data:camps,load}=useData(`/api/client/${client.slug}/qr-campaigns`,[client.slug]);
  const [form,setForm]=useState({name:"Google Bewertung",targetUrl:`http://localhost:3000/review/${client.slug}`});
  async function add(){await api(`/api/client/${client.slug}/qr-campaigns`,{method:"POST",body:JSON.stringify(form)});load()}
  async function scan(c){await api(`/api/client/${client.slug}/qr-campaigns/${c.id}/scan`,{method:"PATCH"});load()}
  return <><Head title="QR Code Kampagnen" subtitle="QR-Codes erstellen, tracken und auswerten" action={<button className="btn" onClick={add}>＋ Neue Kampagne</button>}/><div className="card"><div className="grid-2"><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input className="input" value={form.targetUrl} onChange={e=>setForm({...form,targetUrl:e.target.value})}/></div></div><div className="grid">{camps.map(c=><div className="card" key={c.id}><h2>{c.name}</h2><img className="qr" src={c.qrDataUrl}/><p className="muted">{c.targetUrl}</p><span className="badge">{c.scans} Scans</span><p><button className="btn secondary mini" onClick={()=>scan(c)}>Scan simulieren</button></p></div>)}</div></>
}

function Onboarding({client}) {
  const {data:steps,load}=useData(`/api/client/${client.slug}/onboarding`,[client.slug]);
  async function toggle(id){await api(`/api/client/${client.slug}/onboarding/${id}`,{method:"PATCH"});load()}
  return <><Head title="Kunden Onboarding" subtitle="Schritt-für-Schritt-Prozess für neue Kunden"/><div className="card">{steps.map(s=><p key={s.id}><input type="checkbox" checked={s.done} onChange={()=>toggle(s.id)}/> <b>{s.title}</b><br/><span className="muted">{s.description}</span></p>)}</div></>
}

function SalesAssistant({client}) {
  const [prompt,setPrompt]=useState("Schreibe ein Upsell-Angebot für Review + Booking");
  const [answer,setAnswer]=useState("");
  async function ask(){const r=await api(`/api/client/${client.slug}/sales-assistant`,{method:"POST",body:JSON.stringify({prompt})});setAnswer(r.answer)}
  return <><Head title="AI Sales Assistant" subtitle="Verkauf, Angebote und Einwandbehandlung" action={<button className="btn" onClick={ask}>AI Vorschlag</button>}/><div className="grid-2"><div className="card"><textarea className="input" rows="6" value={prompt} onChange={e=>setPrompt(e.target.value)}/></div><div className="card"><h2>Antwort</h2><p>{answer||"Noch kein Vorschlag erzeugt."}</p></div></div></>
}

function Proposals({client}) {
  const {data:items,load}=useData(`/api/client/${client.slug}/proposals`,[client.slug]);
  const [form,setForm]=useState({title:"Growth Paket Angebot",customer:client.name,amount:"299€/Monat"});
  async function add(){await api(`/api/client/${client.slug}/proposals`,{method:"POST",body:JSON.stringify(form)});load()}
  async function accept(p){await api(`/api/client/${client.slug}/proposals/${p.id}/status`,{method:"PATCH",body:JSON.stringify({status:"Angenommen"})});load()}
  return <><Head title="Angebote" subtitle="Angebote erstellen, verfolgen und abschließen" action={<button className="btn" onClick={add}>＋ Neues Angebot</button>}/><div className="grid-2"><div className="card"><input className="input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><input className="input" value={form.customer} onChange={e=>setForm({...form,customer:e.target.value})}/><input className="input" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></div><div>{items.map(p=><div className="doc-preview" key={p.id}><h1>{p.title}</h1><p>Kunde: {p.customer}</p><h2>{p.amount}</h2><p>Leistungsumfang: Reviews, CRM, Booking, WhatsApp und Dashboard.</p><span className="badge">{p.status}</span><p><button className="btn secondary mini" onClick={()=>accept(p)}>Als angenommen markieren</button></p></div>)}</div></div></>
}

function Portal({client}){return <><Head title="Kundenportal" subtitle="Self-Service für Kunden" action={<a className="btn" href={`/portal/${client.slug}`}>Portal öffnen</a>}/><div className="grid"><Kpi icon="📊" label="Reports" value="4" trend="aktuell"/><Kpi icon="🧾" label="Rechnungen" value="2" trend="1 offen"/><Kpi icon="⭐" label="Bewertungen" value="128" trend="+12"/><Kpi icon="📅" label="Termine" value="23" trend="8 diese Woche"/></div></>}
function Suite(){return <><Head title="Full Local Business Suite" subtitle="Gesamtpaket für lokale Unternehmen"/><div className="grid-4">{["Reviews","CRM","Booking","WhatsApp","Webseiten","SEO","Analytics","Reputation","Automationen","Reporting","Kundenportal","QR Codes"].map(x=><div className="card suite-card" key={x}><h2>{x}</h2><p className="muted">Voll integriert, freischaltbar und vermarktbar.</p><span className="badge">bereit</span></div>)}</div></>}
function WhatsApp(){return <><Head title="WhatsApp" subtitle="Kontakte, Kampagnen und Nachrichten"/><div className="grid"><Kpi icon="👥" label="Kontakte" value="1.248" trend="+32"/><Kpi icon="💬" label="Nachrichten" value="4.782" trend="+18%"/><Kpi icon="✓" label="Zugestellt" value="94,4%" trend="stabil"/></div><div className="phone-frame"><div className="phone-top">Friseur Profi</div><div className="bubble">Hallo! Ich hätte gerne einen Termin.</div><div className="bubble me">Gerne! Wann hätten Sie Zeit?</div></div></>}
function SEO(){return <><Head title="SEO Dashboard" subtitle="Rankings, Keywords und technische SEO"/><div className="grid"><Kpi icon="📈" label="Traffic" value="2.450" trend="+18,7%"/><Kpi icon="🎯" label="Keywords Top 10" value="128" trend="+12"/><Kpi icon="🔗" label="Backlinks" value="532" trend="+48"/></div><div className="card"><BarChart/></div></>}
function Analytics(){return <><Head title="Analytics" subtitle="Performance auf einen Blick"/><div className="grid"><Kpi icon="👥" label="Besucher" value="18.452" trend="+16,3%"/><Kpi icon="💶" label="Umsatz" value="32.850€" trend="+18,9%"/><Kpi icon="⏱" label="Sitzungsdauer" value="1m 32s" trend="+8,6%"/></div><div className="card"><Donut/></div></>}
function Simple({title,subtitle}){return <><Head title={title} subtitle={subtitle}/><div className="grid"><div className="card"><h2>Funktion eingebaut</h2><p className="ok">UI, Buttons, API-Struktur und Demo-Logik vorhanden.</p></div><div className="card"><h2>Externer Provider</h2><p className="todo">Für Live-Nutzung API-Key des jeweiligen Dienstes setzen.</p></div></div></>}

export default function ClientModulePage(){
  const router=useRouter();
  const {slug,module}=router.query;
  const [client,setClient]=useState(null);
  useEffect(()=>{if(slug)api(`/api/clients/${slug}`).then(setClient).catch(()=>location.href="/login")},[slug]);
  if(!client)return <main className="review-public">Lade...</main>;
  const allowed=["dashboard","settings","social","portal"].includes(module)||client.modules[module];
  const pages={dashboard:<Dashboard client={client}/>,crm:<CRM client={client}/>,reviews:<Reviews client={client}/>,booking:<Booking client={client}/>,social:<Social client={client}/>,outreach:<Outreach client={client}/>,reputation:<Reputation client={client}/>,reports:<Reports client={client}/>,qr:<QR client={client}/>,onboarding:<Onboarding client={client}/>,["sales-assistant"]:<SalesAssistant client={client}/>,proposals:<Proposals client={client}/>,portal:<Portal client={client}/>,suite:<Suite/>,whatsapp:<WhatsApp/>,seo:<SEO/>,analytics:<Analytics/>,invoices:<Simple title="Rechnungen" subtitle="Rechnungen, Zahlungen und Mahnungen"/>,websites:<Simple title="Webseiten" subtitle="Webseiten verwalten, Formulare und SEO"/>,automations:<Simple title="Automationen" subtitle="Workflows, Trigger und Aktionen"/>,chatbot:<Simple title="Chatbot" subtitle="AI Chatbot und Wissensbasis"/>,settings:<Simple title="Einstellungen" subtitle="Integrationen, Rollen und Sicherheit"/>};
  return <AppShell client={client} active={module}>{allowed?pages[module]:<Locked name={moduleLabels[module]||module}/>}</AppShell>
}
