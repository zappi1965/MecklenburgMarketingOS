'use client'

import { useEffect, useState } from 'react'
import AdminShell from '@/components/AdminShell'
import { mailDomainComplianceClient } from '@/lib/mailDomainComplianceClient'

function Card({ title, children, action }: any) {
  return <section className="card"><div className="cardHead"><div><h2>{title}</h2></div>{action}</div>{children}</section>
}
function Badge({ ok, children }: any) {
  return <span className={ok ? 'badge green' : 'badge red'}>{children || (ok ? 'OK' : 'Prüfen')}</span>
}
function List({ rows, empty = 'Keine Einträge.' }: any) {
  const items = Array.isArray(rows) ? rows : []
  if (!items.length) return <p className="sub">{empty}</p>
  return <div className="stack">{items.map((x:any,i:number) => <div className="item" key={i}><div><b>{x.key || x.issue || x.title}</b><div className="sub">{x.hint || x.text || JSON.stringify(x.records || x.value || x).slice(0, 180)}</div></div><Badge ok={x.ok !== false}>{x.ok === false ? (x.severity || 'prüfen') : 'ok'}</Badge></div>)}</div>
}

export default function MailDomainCompliancePage() {
  const [domain, setDomain] = useState('mecklenburgmarketing.de')
  const [readiness, setReadiness] = useState<any>(null)
  const [legal, setLegal] = useState<any>(null)
  const [privacy, setPrivacy] = useState<any>(null)
  const [testTo, setTestTo] = useState('')
  const [testResult, setTestResult] = useState<any>(null)
  const [unsubResult, setUnsubResult] = useState<any>(null)
  const [msg, setMsg] = useState('')

  async function load() {
    setMsg('Prüfung läuft...')
    const [r, l, p] = await Promise.all([
      mailDomainComplianceClient.readiness(domain).catch((e:any) => ({ ok:false, error:e.message, checks: [] })),
      mailDomainComplianceClient.legalChecklist().catch((e:any) => ({ ok:false, error:e.message })),
      mailDomainComplianceClient.privacyReminderText().catch((e:any) => ({ ok:false, error:e.message }))
    ])
    setReadiness(r)
    setLegal(l?.checklist || l)
    setPrivacy(p?.privacy || p)
    setMsg('Prüfung abgeschlossen.')
  }

  async function sendTestMail() {
    setMsg('Testmail wird versendet...')
    const result = await mailDomainComplianceClient.testMail({ to: testTo || undefined, require_delivery: true }).catch((e:any) => ({ ok:false, error:e.message }))
    setTestResult(result)
    setMsg(result.ok ? 'Testmail versendet.' : result.error || 'Testmail fehlgeschlagen.')
  }

  async function createUnsubTest() {
    setMsg('Abmeldelink-Test wird erzeugt...')
    const result = await mailDomainComplianceClient.unsubscribeSelfTest({ email: testTo || undefined, slug: 'mail-domain-test' }).catch((e:any) => ({ ok:false, error:e.message }))
    setUnsubResult(result)
    setMsg(result.ok ? 'Abmeldelink-Test erzeugt.' : result.error || 'Abmeldelink-Test fehlgeschlagen.')
  }

  useEffect(() => { void load() }, [])

  return (
    <AdminShell activeHref="/admin/production/mail-domain">
      <div className="pageHeader">
        <div>
          <p className="eyebrow">Mail & Consent</p>
          <h1>Mail-Domain Live Readiness</h1>
          <p className="muted">Resend-Domain, SPF/DKIM/DMARC, Testmail, Abmeldelink, Datenschutztext und Consent-Formulierung prüfen.</p>
        </div>
        <button className="btn" onClick={load}>Neu prüfen</button>
      </div>

      <Card title="Domain" action={<Badge ok={readiness?.ok}>{readiness?.domain || domain}</Badge>}>
        <input className="input" value={domain} onChange={(e)=>setDomain(e.target.value)} placeholder="mecklenburgmarketing.de"/>
        <p className="sub">{msg}</p>
      </Card>

      <div className="grid2">
        <Card title="DNS / Resend Readiness" action={<Badge ok={readiness?.ok}>{readiness?.ok ? 'bereit' : 'prüfen'}</Badge>}>
          <List rows={readiness?.checks || []}/>
          <pre className="codeBox">{JSON.stringify(readiness?.required_dns_hint || {}, null, 2)}</pre>
        </Card>

        <Card title="Echte Testmail">
          <input className="input" value={testTo} onChange={(e)=>setTestTo(e.target.value)} placeholder="Empfänger optional, sonst ADMIN_NOTIFY_EMAIL"/>
          <div className="actionRow">
            <button className="btn" onClick={sendTestMail}>Testmail senden</button>
            <button className="btn secondary" onClick={createUnsubTest}>Abmeldelink-Test</button>
          </div>
          <pre className="codeBox">{JSON.stringify({ testResult, unsubResult }, null, 2)}</pre>
        </Card>

        <Card title="Legal Guard" action={<Badge ok={legal?.ok}>{legal?.ok ? 'plausibel' : 'prüfen'}</Badge>}>
          <p className="sub">{legal?.note}</p>
          <List rows={legal?.checks || []}/>
        </Card>

        <Card title="Datenschutz Ergänzung">
          {(privacy?.sections || []).map((s:any) => <div className="item" key={s.title}><div><b>{s.title}</b><div className="sub">{s.text}</div></div></div>)}
        </Card>
      </div>
    </AdminShell>
  )
}
