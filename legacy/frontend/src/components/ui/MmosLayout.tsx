
import React from 'react'

export function MmosPage({
  title,
  subtitle,
  actions,
  children
}: {
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <main className="mmos-shell">
      <div className="mmos-content">
        {(title || subtitle || actions) && (
          <header className="page-header">
            <div>
              {title && <h1>{title}</h1>}
              {subtitle && <p>{subtitle}</p>}
            </div>
            {actions && <div className="page-actions">{actions}</div>}
          </header>
        )}
        {children}
      </div>
    </main>
  )
}

export function MmosCard({
  children,
  className = ''
}: {
  children: React.ReactNode
  className?: string
}) {
  return <section className={`mmos-card ${className}`}>{children}</section>
}

export function MmosGrid({
  children,
  className = ''
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={`cards-grid ${className}`}>{children}</div>
}
