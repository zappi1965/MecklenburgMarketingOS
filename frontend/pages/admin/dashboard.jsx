
export default function Dashboard(){
  return (
    <div>
      <h1>Admin Dashboard</h1>

      <div className="grid">
        <div className="card kpiCard">
          <div className="kpiValue">42</div>
          <p>Kunden gesamt</p>
        </div>

        <div className="card kpiCard">
          <div className="kpiValue">18</div>
          <p>Neue Leads</p>
        </div>

        <div className="card kpiCard">
          <div className="kpiValue">12.480€</div>
          <p>Monatsumsatz</p>
        </div>
      </div>
    </div>
  )
}
