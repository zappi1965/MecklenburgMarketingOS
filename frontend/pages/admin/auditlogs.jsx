export default function AuditLogs(){
  const logs = [
    {
      user:'Dominique Zapf',
      action:'Kunde bearbeitet',
      entity:'Friseur Profi'
    },
    {
      user:'Dominique Zapf',
      action:'Rechnung erstellt',
      entity:'RE-2026-001'
    }
  ]

  return (
    <div>
      <h1>Audit Logs</h1>

      {logs.map((l,i)=>(
        <div className="card" key={i}>
          <b>{l.user}</b>
          <p>{l.action}</p>
          <small>{l.entity}</small>
        </div>
      ))}
    </div>
  )
}