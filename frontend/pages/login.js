
import {useEffect,useState} from "react";
import {api,getApiBase,setApiBase} from "../src/lib/api";

export default function Login(){
  const [apiBase,setApiBaseState]=useState("");
  const [email,setEmail]=useState("admin@agentur.local");
  const [password,setPassword]=useState("admin123");
  const [error,setError]=useState("");
  const [ok,setOk]=useState("");

  useEffect(()=>{setApiBaseState(getApiBase())},[]);

  async function saveApi(){
    setApiBase(apiBase);
    setOk("API URL gespeichert. Teste jetzt /api/health...");
    setError("");
    try {
      const h = await api("/api/health");
      setOk(`API verbunden: ${h.name || "OK"} / mode: ${h.mode || "-"}`);
    } catch(e) {
      setError(e.message);
      setOk("");
    }
  }

  async function login(e){
    e.preventDefault();
    setError(""); setOk("");
    try{
      const data = await api("/api/auth/login",{method:"POST",body:JSON.stringify({email,password})});
      localStorage.setItem("mmos_token",data.token);
      setOk("Login erfolgreich. Weiterleitung...");
      window.location.href="/client/friseur-profi/dashboard";
    }catch(e){setError(e.message)}
  }

  return <main className="page"><form className="box" onSubmit={login}>
    <div className="brand"><div className="logo">M</div><div><b>Mecklenburg Marketing OS</b><br/><span className="muted">Admin Login</span></div></div>
    <h1 className="h1">Einloggen</h1>

    <label><b>Railway API URL</b></label>
    <input className="input" placeholder="https://deine-railway-url.up.railway.app" value={apiBase} onChange={e=>setApiBaseState(e.target.value)} />
    <button type="button" className="btn secondary" onClick={saveApi}>API URL speichern & testen</button>

    <hr style={{border:"0",borderTop:"1px solid #e7eaf2",margin:"20px 0"}}/>

    <input className="input" value={email} onChange={e=>setEmail(e.target.value)} />
    <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} />

    {error && <div className="error">{error}</div>}
    {ok && <div className="ok">{ok}</div>}

    <button className="btn">Einloggen</button>
    <p className="muted">Login: admin@agentur.local / admin123</p>
  </form></main>
}
