
'use client'

export function PageHeader({ title, subtitle, actions }: any) {
  return (
    <div className="head">
      <div>
        <h1>{title}</h1>
        {subtitle && <div className="sub">{subtitle}</div>}
      </div>
      <div className="row">{actions}</div>
    </div>
  )
}

export function StatusPill({ value }: { value: string }) {
  const v = String(value || '').toLowerCase()
  const type = v.includes('aktiv') || v.includes('bezahlt') || v.includes('fertig') ? 'green'
    : v.includes('offen') || v.includes('lead') ? 'yellow'
    : v.includes('überfällig') || v.includes('fehler') ? 'red'
    : 'purple'

  return <span className={`badge ${type}`}>{value}</span>
}

export function Section({ title, children }: any) {
  return <section className="card"><h2>{title}</h2>{children}</section>
}
