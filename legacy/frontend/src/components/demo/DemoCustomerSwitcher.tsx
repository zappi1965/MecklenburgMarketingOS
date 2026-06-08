
'use client'

import demo from '@/data/demoVerticals.json'

export default function DemoCustomerSwitcher({onSelect}:any){
  return (
    <div className="card" style={{marginBottom:'18px'}}>
      <h2>Demo Branchen-Presets</h2>
      <div className="grid4">
        {demo.customers.map((c:any)=>(
          <button
            key={c.id}
            className="btn secondary"
            style={{height:'84px',textAlign:'left'}}
            onClick={()=>onSelect?.(c)}
          >
            <div><b>{c.name}</b></div>
            <div className="sub">{c.branch} • {c.city}</div>
            <div className="badge purple" style={{marginTop:'8px'}}>{c.package}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
