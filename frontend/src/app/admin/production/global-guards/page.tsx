'use client'

import { useEffect, useState } from 'react'
import AdminShell from '@/components/AdminShell'
import { globalGuardClient } from '@/lib/globalGuardClient'
import { getAdminSelectedCustomerId } from '@/lib/adminCustomerSelection'

function Card({ title, children, action }: any) {
  return <section className="card"><div className="cardHead"><div><h2>{title}</h2></div>{action}</div>{children}</section>
}

function Badge({ ok, children }: any) {
  return <span className={ok ? 'badge green' : 'badge red'}>{children || (ok ? 'OK' : 'Prüfen')}</span>
}

export default function GlobalGuardsPage() {
  const [schema, setSchema] = useState<any>(null)
  const [docs, setDocs] = useState<any>(null)
  const [shield, setShield] = useState<any>(null)
  const [limits, setLimits] = useState<any>(null)
  const [tools, setTools] = useState<any>(null)
  const [msg, setMsg] = useState('')

  async function load() {
    setMsg('Lade Global Guards...')
    const selectedCustomerId = getAdminSelectedCustomerId()
    const [schemaResult, docResult, shieldResult] = await Promise.all([
      globalGuardClient.schemaDoctor().catch((e:any) => ({ ok:false, error:e.message })),
      globalGuardClient.documentIntegrity(selectedCustomerId || undefined).catch((e:any) => ({ ok:false, error:e.message })),
      globalGuardClient.publicShieldStatus().catch((e:any) => ({ ok:false, error:e.message }))
    ])
    setSchema(schemaResult)
    setDocs(docResult)
    setShield(shieldResult)
    if (selectedCustomerId) {
      setLimits(await globalGuardClient.limitPolicy(selectedCustomerId).catch((e:any) => ({ ok:false, error:e.message })))
      setTools(await globalGuardClient.toolAccessPolicy(selectedCustomerId).catch((e:any) => ({ ok:false, error:e.message })))
    }
    setMsg(selectedCustomerId ? 'Global Guards geladen.' : 'Global Guards geladen. Für Kunden-Limits bitte oben einen Kunden wählen.')
  }

  useEffect(() => { void load() }, [])

  return (
    <AdminShell activeHref="/admin/production/global-guards">
      <div className="pageHeader">
        <div>
          <p className="eyebrow">Production Hardening</p>
          <h1>Global Guards</h1>
          <p className="muted">Live-/Demo-Trennung, Public Shield, Limit Engine, Dokumentenintegrität, Schema Doctor und Tool Access Policy.</p>
        </div>
        <button className="btn" onClick={load}>Neu prüfen</button>
      </div>

      <div className="grid2">
        <Card title="Schema Migration Doctor" action={<Badge ok={schema?.ok}>{schema?.ok ? 'Schema OK' : 'Prüfen'}</Badge>}>
          <p className="sub">{schema?.recommendation || schema?.error || 'Noch nicht geprüft.'}</p>
          {(schema?.failed || []).slice(0,8).map((x:any) => <div className="item" key={x.table}><b>{x.table}</b><span>{x.hint || `Fehlende Spalten: ${(x.missing_columns||[]).join(', ')}`}</span></div>)}
        </Card>

        <Card title="Document Integrity Guard" action={<Badge ok={docs?.ok}>{docs?.issues?.length ? `${docs.issues.length} Hinweise` : 'OK'}</Badge>}>
          <p className="sub">Prüft Rechnungs-PDFs, XML/E-Rechnung und Dokumentenlinks.</p>
          {(docs?.issues || []).slice(0,8).map((x:any,i:number) => <div className="item" key={i}><b>{x.type}</b><span>{x.hint || x.title || x.invoice_number || x.document_id}</span></div>)}
        </Card>

        <Card title="Public Endpoint Shield" action={<Badge ok={shield?.ok}>aktiv</Badge>}>
          <p className="sub">Rate-Limits, Honeypot und Abuse-Score für öffentliche Slug-Aktionen.</p>
          <pre className="codeBox">{JSON.stringify(shield, null, 2)}</pre>
        </Card>

        <Card title="Unified Limit Engine">
          <p className="sub">Zeigt QR-, Punkte- und Reward-Limits für den gewählten Kunden.</p>
          <pre className="codeBox">{JSON.stringify(limits || { hint:'Bitte Kundenkontext wählen.' }, null, 2)}</pre>
        </Card>

        <Card title="Tool Access Policy Engine">
          <p className="sub">Priorität: Security Block → Manual Override → Trial → Package → Add-on → Default Deny.</p>
          <pre className="codeBox">{JSON.stringify(tools || { hint:'Bitte Kundenkontext wählen.' }, null, 2)}</pre>
        </Card>

        <Card title="Aktueller Status">
          <p className="sub">{msg}</p>
        </Card>
      </div>
    </AdminShell>
  )
}
