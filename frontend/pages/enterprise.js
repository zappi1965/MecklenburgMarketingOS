
import {useEffect,useState} from "react";
import {api} from "../src/lib/api";
import AppShell from "../src/components/AppShell";
import Kpi from "../src/components/Kpi";

export default function Enterprise(){
  const [status,setStatus]=useState(null);
  const [logs,setLogs]=useState([]);
  async function load(){
    setStatus(await api("/api/enterprise/status"));
    setLogs(await api("/api/enterprise/audit-logs"));
  }
  useEffect(()=>{load().catch(()=>location.href="/login")},[]);
  const providers=status?.providers||{};
  return <AppShell active="settings">
    <div className="page-head"><div><h1>Enterprise Control Center</h1><p>Provider, Queue, Storage, Billing und Audit-Logs.</p></div><button className="btn" onClick={load}>Aktualisieren</button></div>
    <div className="grid">
      <Kpi icon="🗄" label="Datenbank" value={status?.mode||"json"} trend="Supabase optional"/>
      <Kpi icon="⚙" label="Queue" value={status?.queue?.redisConfigured?"Redis":"Mock"} trend="BullMQ vorbereitet"/>
      <Kpi icon="📁" label="Storage" value={status?.storage?.supabaseStorage?"Supabase":"Local"} trend="Uploads aktiv"/>
      <Kpi icon="💳" label="Billing" value={providers.stripe?"Stripe":"Mock"} trend="Checkout vorbereitet"/>
    </div>
    <div className="grid-2">
      <div className="card"><h2>Provider Status</h2>{Object.entries(providers).map(([k,v])=><p key={k}><b>{k}</b>: <span className={v?"badge":"badge warn"}>{v?"konfiguriert":"Platzhalter"}</span></p>)}</div>
      <div className="card"><h2>Audit Logs</h2>{logs.slice(0,12).map(l=><p key={l.id}><b>{l.action}</b><br/><span className="muted">{l.createdAt}</span></p>)}</div>
    </div>
  </AppShell>
}
