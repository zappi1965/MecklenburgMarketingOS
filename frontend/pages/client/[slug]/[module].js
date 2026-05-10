
import {useRouter} from "next/router";
import {useEffect,useState} from "react";
import {api} from "../../../src/lib/api";

const nav=["dashboard","crm","reviews","booking","social","reports","qr","proposals","reputation","onboarding","sales-assistant"];

function Shell({slug,module,children}){
  return <div className="app"><aside className="side">
    <div className="brand"><div className="logo">M</div><div><b>Mecklenburg</b><br/>Marketing OS</div></div>
    <div className="nav">{nav.map(n=><a className={module===n?"active":""} key={n} href={`/client/${slug}/${n}`}>{n}</a>)}</div>
  </aside><main className="main">{children}</main></div>
}

function Kpi({label,value}){return <div className="card"><div className="muted">{label}</div><div className="kpi">{value}</div></div>}

export default function ModulePage(){
  const router=useRouter();
  const {slug,module}=router.query;
  const [client,setClient]=useState(null);
  const [data,setData]=useState([]);
  const [error,setError]=useState("");

  async function load(){
    if(!slug)return;
    try{
      const c=await api(`/api/clients/${slug}`);
      setClient(c);
      if(module==="crm") setData(await api(`/api/client/${slug}/leads`));
      if(module==="reviews") setData(await api(`/api/client/${slug}/reviews`));
      if(module==="booking") setData(await api(`/api/client/${slug}/bookings`));
      if(module==="social") setData(await api(`/api/client/${slug}/social-posts`));
      if(module==="reports") setData(await api(`/api/client/${slug}/reports`));
      if(module==="proposals") setData(await api(`/api/client/${slug}/proposals`));
      if(module==="reputation") setData(await api(`/api/client/${slug}/reputation-alerts`));
      if(module==="onboarding") setData(await api(`/api/client/${slug}/onboarding`));
    }catch(e){setError(e.message)}
  }

  useEffect(()=>{load()},[slug,module]);

  if(error)return <main className="page"><div className="box"><h1 className="h1">Fehler</h1><div className="error">{error}</div><a href="/login"><button className="btn">Zurück zum Login</button></a></div></main>
  if(!client)return <main className="page"><div className="box"><h1>Lade…</h1></div></main>

  return <Shell slug={slug} module={module}>
    <div className="page-head"><div><h1>{client.name}</h1><p className="muted">Modul: {module}</p></div></div>

    {module==="dashboard" && <><div className="grid"><Kpi label="Umsatz" value="12.450€"/><Kpi label="Leads" value="324"/><Kpi label="Bewertungen" value="4.8★"/><Kpi label="Status" value="Online"/></div><div className="card"><h2>Kundensicht Demo</h2><p>Dieses Dashboard läuft live über dein Railway Backend.</p></div></>}

    {module==="sales-assistant" && <SalesAssistant slug={slug}/>}

    {module!=="dashboard" && module!=="sales-assistant" && <div className="card"><h2>{module}</h2><table className="table"><tbody>{data.map((x,i)=><tr key={x.id||i}><td>{x.name||x.title||x.company||x.platform||x.source||"Eintrag"}</td><td>{x.status||x.value||x.message||x.summary||""}</td></tr>)}</tbody></table>{data.length===0&&<p className="muted">Keine Daten vorhanden.</p>}</div>}
  </Shell>
}

function SalesAssistant({slug}){
  const [prompt,setPrompt]=useState("Schreibe ein Upsell-Angebot für Review + Booking");
  const [answer,setAnswer]=useState("");
  async function ask(){
    const r=await api(`/api/client/${slug}/sales-assistant`,{method:"POST",body:JSON.stringify({prompt})});
    setAnswer(r.answer);
  }
  return <div className="card"><h2>AI Sales Assistant</h2><textarea className="input" rows="5" value={prompt} onChange={e=>setPrompt(e.target.value)}/><button className="btn" onClick={ask}>AI Vorschlag</button>{answer&&<div className="ok">{answer}</div>}</div>
}
