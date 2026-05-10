
export default function Home(){
  return <main className="page"><div className="box">
    <div className="brand"><div className="logo">M</div><div><b>Mecklenburg Marketing OS</b><br/><span className="muted">Frontend Hotfix</span></div></div>
    <h1 className="h1">Agency SaaS Demo</h1>
    <p className="muted">Öffne Login oder Review-Demo. Falls etwas nicht lädt, zeigt diese Version den echten API-Fehler an.</p>
    <a href="/login"><button className="btn">Admin Login öffnen</button></a>
    <a href="/review/friseur-profi"><button className="btn secondary">Review Demo öffnen</button></a>
  </div></main>
}
