
'use client'

export function EmptyState({ title = 'Keine Daten', text = 'Noch keine Einträge vorhanden.', action }: any) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 28 }}>
      <h2>{title}</h2>
      <div className="sub" style={{ marginBottom: 14 }}>{text}</div>
      {action}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="card">
      <div className="skeleton" style={{ width: '45%', height: 18 }} />
      <div className="skeleton" style={{ width: '92%', height: 14, marginTop: 12 }} />
      <div className="skeleton" style={{ width: '72%', height: 14, marginTop: 8 }} />
    </div>
  )
}

export function ConfirmButton({ children, onConfirm, className = 'btn red', message = 'Wirklich ausführen?' }: any) {
  return (
    <button className={className} onClick={() => confirm(message) && onConfirm?.()}>
      {children}
    </button>
  )
}

export function Toast({ message, type = 'green' }: any) {
  if (!message) return null
  return <div className={`toast ${type}`}>{message}</div>
}
