
'use client'

import React from 'react'

export function MobileModal({
  open,
  title,
  children,
  actions,
  onClose
}: {
  open: boolean
  title?: string
  children: React.ReactNode
  actions?: React.ReactNode
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="mobileModalBackdrop" onClick={onClose}>
      <section className="mobileModalSheet" onClick={e => e.stopPropagation()}>
        <header>
          <strong>{title}</strong>
          <button type="button" onClick={onClose}>×</button>
        </header>
        <div className="mobileModalBody">{children}</div>
        {actions ? <footer className="mobileModalActions">{actions}</footer> : null}
      </section>
    </div>
  )
}

export function StickyActionBar({ children }: { children: React.ReactNode }) {
  return <div className="stickyActionBar">{children}</div>
}
