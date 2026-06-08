'use client'

import { useEffect, useState } from 'react'
import { customerReadinessClient } from '@/lib/customerReadinessClient'
import { getAdminSelectedCustomerId } from '@/lib/adminCustomerSelection'

function Card({ title, children, action }: any) {
  return <section className="card"><div className="cardHead"><div><h2>{title}</h2></div>{action}</div>{children}</section>
}

function Badge({ ok, children }: any) {
  return <span className={ok ? 'badge green' : 'badge red'}>{children || (ok ? 'OK' : 'Prüfen')}</span>
}

function IssueList({ items, empty = 'Keine kritischen Hinweise.' }: any) {
  const rows = Array.isArray(items) ? items : []
  if (!rows.length) return <p className="sub">{empty}</p>
  return <div className="stack">{rows.slice(0, 10).map((x: any, i: number) => <div className="item" key={i}><div><b>{x.issue || x.type || x.key || x.table || 'Hinweis'}</b><div className="sub">{x.hint || x.error || x.invoice_number || x.id || JSON.stringify(x).slice(0, 140)}</div></div><Badge ok={x.severity !== 'critical'}>{x.severity || 'info'}</Badge></div>)}</div>
}

export default function CustomerReadinessPage() {
  const [customerId, setCustomerId] = useState('')
  const [overview, setOverview] = useState<any>(null)
  const [goLive, setGoLive] = useState<any>(null)
  const [msg, setMsg] = useState('')

  async function load() {
    const cid = getAdminSelectedCustomerId()
    setCustomerId(cid)
    setMsg('Prüfe System...')
    const [overviewResult, goLiveResult] = await Promise.all([
      customerReadinessClient.overview(cid || undefined).catch((e:any) => ({ ok:false, error:e.message })),
      cid ? customerReadinessClient.goLive(cid).catch((e:any) => ({ ok:false, error:e.message })) : Promise.resolve(null)
    ])
    setOverview(overviewResult)
    setGoLive(goLiveResult)
    setMsg(cid ? 'Prüfung abgeschlossen.' : 'Prüfung abgeschlossen. Für Kunden-Go-Live bitte oben Kundenkontext wählen.')
  }

  async function migrateQr(dryRun: boolean) {
    setMsg(dryRun ? 'QR-Migration Testlauf...' : 'QR-Migration läuft...')
    const result = await customerReadinessClient.migrateQrTargets(customerId || undefined, dryRun)
    setMsg(`${dryRun ? 'Testlauf' : 'Migration'} abgeschlossen: ${result.updated_count || 0} QR-Ziele betroffen.`)
    await load()
  }

  async function cleanupTokens(dryRun: boolean) {
    setMsg(dryRun ? 'QR-Token Cleanup Testlauf...' : 'QR-Token Cleanup läuft...')
    const result = await customerReadinessClient.cleanupQrTokens(dryRun)
    setMsg(`Token Cleanup abgeschlossen: ${result.expired || 0} abgelaufen, ${result.archived || 0} archiviert.`)
  }

  async function restore(item: any) {
    setMsg(`Stelle ${item.table}/${item.id} wieder her...`)
    await customerReadinessClient.restoreTrash(item.table, item.id)
    await load()
    setMsg('Datensatz wiederhergestellt.')
  }

  useEffect(() => { void load() }, [])

  const checklist = goLive?.checklist || []
  const trash = overview?.trash?.items || []

  return (
    <>
      <div className="pageHeader">
        <div>
          <p className="eyebrow">Go-Live & Integrity</p>
          <h1>Customer Readiness Center</h1>
          <p className="muted">Rechnungen, Dokumente, Rechte, Tools, Datenqualität, Booking, Mail, Trash/Restore und QR-Fixes zentral prüfen.</p>
        </div>
        <div className="actionRow">
          <button className="btn secondary" onClick={load}>Neu prüfen</button>
          <button className="btn secondary" onClick={() => migrateQr(true)}>QR-Testlauf</button>
          <button className="btn" onClick={() => migrateQr(false)}>QR-Ziele migrieren</button>
          <button className="btn secondary" onClick={() => cleanupTokens(true)}>Token-Testlauf</button>
          <button className="btn secondary" onClick={() => cleanupTokens(false)}>Token Cleanup</button>
        </div>
      </div>

      <Card title="Kundenkontext" action={<Badge ok={Boolean(customerId)}>{customerId ? 'Kunde gewählt' : 'Kein Kunde'}</Badge>}>
        <p className="sub">{customerId ? `Aktiver Kunde: ${customerId}` : 'Oben in der Backoffice-Suche einen Kunden wählen, um Go-Live Checks kundenspezifisch auszuführen.'}</p>
        <p className="sub">{msg}</p>
      </Card>

      <div className="grid2">
        <Card title="Customer Go-Live Checklist" action={<Badge ok={goLive?.ok}>{goLive?.ok ? 'Live bereit' : 'Prüfen'}</Badge>}>
          <IssueList items={checklist.map((c:any) => ({ ...c, severity: c.ok ? 'ok' : 'warning', issue: c.label }))} />
        </Card>

        <Card title="Data Quality Rules Engine" action={<Badge ok={overview?.data_quality?.ok}>{overview?.data_quality?.issues?.length || 0} Hinweise</Badge>}>
          <IssueList items={overview?.data_quality?.issues} />
        </Card>

        <Card title="Invoice & Document Integrity" action={<Badge ok={overview?.documents?.ok}>{overview?.documents?.issues?.length || 0} Hinweise</Badge>}>
          <IssueList items={overview?.documents?.issues} />
        </Card>

        <Card title="Document Versioning Guard" action={<Badge ok={overview?.document_versioning?.ok}>{overview?.document_versioning?.issues?.length || 0} Hinweise</Badge>}>
          <IssueList items={overview?.document_versioning?.issues} />
        </Card>

        <Card title="Audit-to-Offer Guard" action={<Badge ok={overview?.audit_offer?.ok}>{overview?.audit_offer?.issues?.length || 0} Hinweise</Badge>}>
          <IssueList items={overview?.audit_offer?.issues} />
        </Card>

        <Card title="Booking Consistency Guard" action={<Badge ok={overview?.booking?.ok}>{overview?.booking?.issues?.length || 0} Hinweise</Badge>}>
          <IssueList items={overview?.booking?.issues} />
        </Card>

        <Card title="Mail Delivery Guard" action={<Badge ok={overview?.mail?.ok}>{overview?.mail?.provider || 'Provider fehlt'}</Badge>}>
          <IssueList items={overview?.mail?.issues} />
        </Card>

        <Card title="Admin RBAC Guard" action={<Badge ok={overview?.admin_rbac?.ok}>{overview?.admin_rbac?.issues?.length || 0} Hinweise</Badge>}>
          <IssueList items={overview?.admin_rbac?.issues} />
        </Card>

        <Card title="QR End-to-End / Legacy Fix" action={<Badge ok={overview?.qr?.ok}>{overview?.qr?.checks?.length || 0} QR</Badge>}>
          <p className="sub">{overview?.qr?.recommendation || 'QR-Ziele werden geprüft.'}</p>
          <IssueList items={(overview?.qr?.checks || []).filter((x:any) => !x.ok).map((x:any) => ({ severity: 'warning', issue: x.title || x.slug, hint: (x.points || []).filter((p:any) => !p.ok).map((p:any) => p.hint).join(' · ') }))} />
        </Card>

        <Card title="Trash & Restore Center" action={<Badge ok={!trash.length}>{trash.length} im Papierkorb</Badge>}>
          {!trash.length ? <p className="sub">Keine wiederherstellbaren gelöschten Datensätze gefunden.</p> : trash.slice(0,10).map((item:any) => (
            <div className="item" key={`${item.table}:${item.id}`}>
              <div><b>{item.title}</b><div className="sub">{item.table} · {item.id}</div></div>
              <button className="btn secondary" onClick={() => restore(item)}>Wiederherstellen</button>
            </div>
          ))}
        </Card>
      </div>
    </>
  )
}
