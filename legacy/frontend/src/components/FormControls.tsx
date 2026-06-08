
'use client'

export function Field({ label, children, error }: any) {
  return (
    <label style={{ display: 'block', marginBottom: 8 }}>
      <div className="metricLabel" style={{ marginBottom: 5 }}>{label}</div>
      {children}
      {error && <div className="red" style={{ marginTop: 4 }}>{error}</div>}
    </label>
  )
}

export function SelectCustomer({ customers = [], value, onChange }: any) {
  return (
    <select className="input" value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">Kunde wählen</option>
      {customers.map((c: any) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  )
}
