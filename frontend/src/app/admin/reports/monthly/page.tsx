'use client'

import { useEffect, useState } from 'react'
import { operationsClient } from '@/lib/operationsClient'
import { getAdminSelectedCustomerId } from '@/lib/adminCustomerSelection'

function Card({ title, children, action }: any) {
  return <section className="card"><div className="cardHead"><div><h2>{title}</h2></div>{action}</div>{children}</section>
}
function Badge({ ok, children }: any) {
  return <span className={ok ? 'badge green' : 'badge red'}>{children || (ok ? 'OK' : 'Prüfen')}</span>
}
function IssueList({ rows }: any) {
  const items = Array.isArray(rows) ? rows : []
  if (!items.length) return <p className="sub">Keine Hinweise.</p>
  return <div className="stack">{items.slice(0, 12).map((x:any,i:number) => <div className="item" key={i}><div><b>{x.issue || x.title || x.area || x.key || 'Hinweis'}</b><div className="sub">{x.hint || x.description || x.error || JSON.stringify(x).slice(0, 160)}</div></div><Badge ok={x.severity !== 'critical'}>{x.severity || x.status || 'info'}</Badge></div>)}</div>
}

export default function MonthlyReportsPage() {
  const [customerId, setCustomerId] = useState('')
  const [month, setMonth] = useState('')
  const [report, setReport] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const [recipient, setRecipient] = useState('')
  const [pdfResult, setPdfResult] = useState<any>(null)
  const [sendResult, setSendResult] = useState<any>(null)

  async function generate() {
    const cid = getAdminSelectedCustomerId()
    setCustomerId(cid)
    if (!cid) { setMsg('Bitte Kundenkontext wählen.'); return }
    setMsg('Monatsreport wird erzeugt...')
    const result = await operationsClient.monthlyReport(cid, { month: month || null, save: true }).catch((e:any) => ({ ok:false, error:e.message }))
    setReport(result?.report || result)
    setMsg(result?.ok ? 'Monatsreport als Entwurf gespeichert.' : result?.error || 'Fehler')
  }


  async function createPdf() {
    const cid = getAdminSelectedCustomerId()
    setCustomerId(cid)
    if (!cid) { setMsg('Bitte Kundenkontext wählen.'); return }
    setMsg('Monatsreport-PDF wird erzeugt...')
    const result = await operationsClient.monthlyReportPdf(cid, { month: month || null, save: true }).catch((e:any) => ({ ok:false, error:e.message }))
    setPdfResult(result)
    setMsg(result?.ok ? 'PDF erzeugt und im Kundenportal freigegeben.' : result?.error || 'PDF-Erzeugung fehlgeschlagen.')
  }

  async function sendReport() {
    const cid = getAdminSelectedCustomerId()
    setCustomerId(cid)
    if (!cid) { setMsg('Bitte Kundenkontext wählen.'); return }
    setMsg('Monatsreport wird als PDF versendet...')
    const result = await operationsClient.sendMonthlyReport(cid, { month: month || null, to: recipient || null, require_delivery: true }).catch((e:any) => ({ ok:false, error:e.message }))
    setSendResult(result)
    setMsg(result?.ok ? 'Report-PDF wurde versendet.' : result?.error || 'Report-Versand fehlgeschlagen.')
  }

  useEffect(() => { setCustomerId(getAdminSelectedCustomerId()) }, [])

  return (
    <>
      <div className="pageHeader">
        <div><p className="eyebrow">Reporting</p><h1>Automatischer Monatsreport</h1><p className="muted">QR-Scans, Bewertungen, Leads, Punkte, Rewards, Rechnungen und Handlungsempfehlungen als Report-Entwurf erzeugen.</p></div>
        <button className="btn" onClick={generate}>Report erzeugen</button>
      </div>
      <Card title="Report-Konfiguration">
        <input className="input" value={month} onChange={e=>setMonth(e.target.value)} placeholder="Monat optional, z. B. 2026-05"/>
        <input className="input" value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder="Empfänger optional, sonst Kunden-E-Mail"/>
        <div className="actionRow"><button className="btn secondary" onClick={createPdf}>PDF erzeugen</button><button className="btn secondary" onClick={sendReport}>PDF versenden</button></div>
        <p className="sub">{customerId || 'Kein Kunde gewählt'} · {msg}</p>
      </Card>
      <div className="grid2">
        <Card title="Kennzahlen"><pre className="codeBox">{JSON.stringify(report?.metrics || {}, null, 2)}</pre></Card>
        <Card title="Empfehlungen"><IssueList rows={(report?.recommendations || []).map((x:string) => ({ title:x, severity:'info' }))}/></Card>
        <Card title="PDF / Versand"><pre className="codeBox">{JSON.stringify({ pdf: pdfResult?.ok ? pdfResult.document : pdfResult?.error, send: sendResult?.ok ? sendResult.mail : sendResult?.error }, null, 2)}</pre></Card>
      </div>
    </>
  )
}
