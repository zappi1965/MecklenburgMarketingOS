
'use client'

import React from 'react'

export function AppShell({ sidebar, children }: { sidebar: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mmos-shell">
      <aside className="mmos-sidebar">{sidebar}</aside>
      <main className="mmos-main">{children}</main>
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: any) {
  return (
    <div className="mmos-page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="mmos-header-actions">{actions}</div>}
    </div>
  )
}

export function Card({ title, subtitle, children, actions }: any) {
  return (
    <section className="mmos-card">
      {(title || actions) && (
        <div className="mmos-card-head">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className="mmos-card-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

export function MetricCard({ label, value, delta, tone = 'green' }: any) {
  return (
    <div className="mmos-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {delta && <em className={`mmos-delta ${tone}`}>{delta}</em>}
    </div>
  )
}

export function Button({ children, variant = 'primary', ...props }: any) {
  return <button className={`mmos-btn ${variant}`} {...props}>{children}</button>
}

export function Badge({ children, tone = 'purple' }: any) {
  return <span className={`mmos-badge ${tone}`}>{children}</span>
}

export function Table({ columns = [], rows = [], renderActions }: any) {
  return (
    <div className="mmos-table-wrap">
      <table className="mmos-table">
        <thead>
          <tr>
            {columns.map((c: any) => <th key={c.key}>{c.label}</th>)}
            {renderActions && <th />}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length + (renderActions ? 1 : 0)} className="mmos-empty-cell">Keine Daten vorhanden</td></tr>
          ) : rows.map((row: any) => (
            <tr key={row.id || JSON.stringify(row)}>
              {columns.map((c: any) => <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>)}
              {renderActions && <td>{renderActions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function EmptyState({ title = 'Keine Daten', text = 'Noch keine Einträge vorhanden.', action }: any) {
  return (
    <div className="mmos-empty">
      <div className="mmos-empty-icon">✦</div>
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  )
}

export function Skeleton({ rows = 3 }: any) {
  return (
    <div className="mmos-skeleton-card">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="mmos-skeleton-line" key={i} style={{ width: `${92 - i * 12}%` }} />
      ))}
    </div>
  )
}
