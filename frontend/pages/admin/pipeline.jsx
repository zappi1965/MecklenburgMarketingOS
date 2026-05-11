import { useState } from 'react'

export default function Pipeline(){
  const [items] = useState([
    {name:'Friseur Profi', stage:'Erstgespräch', revenue:1200},
    {name:'Autohaus Schmidt', stage:'Angebot gesendet', revenue:2400},
    {name:'Restaurant Küste', stage:'Gewonnen', revenue:1800},
  ])

  return (
    <div>
      <h1>Sales Pipeline</h1>
      {items.map(i=>(
        <div key={i.name} className="card">
          <h3>{i.name}</h3>
          <p>{i.stage}</p>
          <b>{i.revenue}€</b>
        </div>
      ))}
    </div>
  )
}