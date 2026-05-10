
import {useRouter} from "next/router";
import {useEffect,useState} from "react";
import {api,getApiBase,setApiBase} from "../../src/lib/api";

export default function Review(){
  const router=useRouter();
  const {slug}=router.query;
  const [client,setClient]=useState(null);
  const [rating,setRating]=useState(0);
  const [form,setForm]=useState({name:"",message:""});
  const [error,setError]=useState("");
  const [apiBase,setApiBaseState]=useState("");
  const [sent,setSent]=useState(false);

  useEffect(()=>{setApiBaseState(getApiBase())},[]);

  async function load(){
    if(!slug)return;
    setError("");
    try{setClient(await api(`/api/public/client/${slug}`))}
    catch(e){setError(e.message)}
  }

  useEffect(()=>{load()},[slug]);

  async function saveApi(){
    setApiBase(apiBase);
    await load();
  }

  function rate(n){
    setRating(n);
    if(n>=4 && client?.googleReviewLink){
      window.location.href=client.googleReviewLink;
    }
  }

  async function submit(){
    try{
      await api("/api/public/reviews",{method:"POST",body:JSON.stringify({clientSlug:slug,rating,...form})});
      setSent(true);
    }catch(e){setError(e.message)}
  }

  if(error){
    return <main className="page"><div className="box">
      <h1 className="h1">Review lädt nicht</h1>
      <div className="error">{error}</div>
      <p className="muted">Railway API URL prüfen:</p>
      <input className="input" value={apiBase} onChange={e=>setApiBaseState(e.target.value)} placeholder="https://deine-railway-url.up.railway.app"/>
      <button className="btn" onClick={saveApi}>API URL speichern & neu laden</button>
      <a href="/login"><button className="btn secondary">Zum Login</button></a>
    </div></main>
  }

  if(!client)return <main className="page"><div className="box"><h1>Lade…</h1><p className="muted">Slug: {slug || "-"}</p></div></main>;

  return <main className="page"><div className="box">
    <div className="brand"><div className="logo">★</div><div><b>{client.name}</b><br/><span className="muted">Bewertung abgeben</span></div></div>
    <h1 className="h1">Wie zufrieden warst du?</h1>
    <div className="stars">{[1,2,3,4,5].map(n=><span key={n} onClick={()=>rate(n)}>{n<=rating?"★":"☆"}</span>)}</div>
    {rating>0 && rating<4 && !sent && <>
      <input className="input" placeholder="Name optional" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
      <textarea className="input" rows="5" placeholder="Was können wir verbessern?" value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/>
      <button className="btn" onClick={submit}>Internes Feedback senden</button>
    </>}
    {sent && <div className="ok">Danke! Dein Feedback wurde intern übermittelt.</div>}
  </div></main>
}
