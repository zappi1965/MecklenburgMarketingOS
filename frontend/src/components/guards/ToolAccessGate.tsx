
'use client'

import type { ReactNode } from 'react'
import { accessStatus, canAccessTool } from '@/lib/toolAccess'

export default function ToolAccessGate({
  customer,
  toolKey,
  accessRules,
  children
}: {
  customer: any
  toolKey: string
  accessRules?: any[]
  children: ReactNode
}) {
  const allowed = canAccessTool(customer, toolKey, accessRules || [])
  const status = accessStatus(customer, toolKey, accessRules || [])

  if (allowed) return <>{children}</>

  return (
    <section style={{
      border: '1px solid rgba(255,255,255,.16)',
      background: 'rgba(15,23,42,.82)',
      color: 'white',
      borderRadius: 22,
      padding: 24,
      marginTop: 18
    }}>
      <p style={{ color: '#fbbf24', fontWeight: 900, marginTop: 0 }}>Tool nicht freigeschaltet</p>
      <h2 style={{ margin: '6px 0 8px' }}>Upgrade oder Freigabe erforderlich</h2>
      <p style={{ color: '#cbd5e1' }}>
        Dieses Modul ist fuer den aktuellen Kunden nicht aktiv. Status: <strong>{status}</strong>.
      </p>
      <a href="/admin/tool-access-v2" style={{
        display: 'inline-flex',
        background: 'linear-gradient(135deg,#7c3aed,#2563eb)',
        color: 'white',
        borderRadius: 14,
        padding: '12px 16px',
        fontWeight: 900,
        textDecoration: 'none'
      }}>
        Tool-Freigaben öffnen
      </a>
    </section>
  )
}
