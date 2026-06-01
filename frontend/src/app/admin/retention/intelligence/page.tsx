'use client'

import { useEffect, useState } from 'react'
import AdminShell from '@/components/AdminShell'
import { retentionIntelligenceClient } from '@/lib/retentionIntelligenceClient'
import { getAdminSelectedCustomerId } from '@/lib/adminCustomerSelection'

function Card({ title, children, action }: any) {
  return <section className="card"><div className="cardHead"><div><h2>{title}</h2></div>{action}</div>{children}</section>
}
function Badge({ ok, children }: any) {
  return <span className={ok ? 'badge green' : 'badge red'}>{children || (ok ? 'OK' : 'Prüfen')}</span>
}
function List({ rows, empty = 'Keine Einträge.' }: any) {
  const items = Array.isArray(rows) ? rows : []
  if (!items.length) return <p className="sub">{empty}</p>
  return <div className="stack">{items.slice(0, 16).map((x:any,i:number) => <div className="item" key={i}><div><b>{x.title || x.display_name || x.label || x.type || x.key}</b><div className="sub">{x.suggestion || x.action || x.recommendation || x.description || x.churn_reasons?.join(', ') || x.value_reasons?.join(', ') || JSON.stringify(x).slice(0, 180)}</div></div><Badge ok={(x.priority || '') !== 'high'}>{x.priority || x.churn_score || x.value_score || x.status || 'ok'}</Badge></div>)}</div>
}

export default function RetentionIntelligencePage() {
  const [customerId, setCustomerId] = useState('')
  const [data, setData] = useState<any>(null)
  const [templates, setTemplates] = useState<any>(null)
  const [reactivation, setReactivation] = useState<any>(null)
  const [feedbackActions, setFeedbackActions] = useState<any>(null)
  const [reminderDrafts, setReminderDrafts] = useState<any>(null)
  const [sendResult, setSendResult] = useState<any>(null)
  const [legalReview, setLegalReview] = useState<any>(null)
  const [segmentKey, setSegmentKey] = useState('inactive_customers')
  const [segmentCampaign, setSegmentCampaign] = useState<any>(null)
  const [msg, setMsg] = useState('')

  async function load(persist = false) {
    const cid = getAdminSelectedCustomerId()
    setCustomerId(cid)
    setTemplates(await retentionIntelligenceClient.templates().catch((e:any) => ({ ok:false, error:e.message, segments: [], actions: [] })))
    if (!cid) { setMsg('Bitte Kundenkontext wählen.'); return }
    setMsg(persist ? 'Analyse läuft und wird gespeichert...' : 'Analyse läuft...')
    const result = await retentionIntelligenceClient.overview(cid, persist).catch((e:any) => ({ ok:false, error:e.message }))
    setData(result)
    setMsg(result.ok ? 'Retention Intelligence geladen.' : result.error || 'Fehler')
  }

  async function createSegments() {
    if (!customerId) return setMsg('Bitte Kundenkontext wählen.')
    setMsg('Standardsegmente werden erstellt...')
    await retentionIntelligenceClient.createDefaultSegments(customerId)
    await load(true)
  }

  async function createReactivation() {
    if (!customerId) return setMsg('Bitte Kundenkontext wählen.')
    setMsg('Reaktivierungsplan wird erstellt...')
    const result = await retentionIntelligenceClient.createReactivationPlan(customerId, { persist: true }).catch((e:any) => ({ ok:false, error:e.message }))
    setReactivation(result?.plan || result)
    setMsg(result.ok ? 'Reaktivierungsplan erstellt.' : result.error || 'Fehler')
  }

  async function generateActions() {
    if (!customerId) return setMsg('Bitte Kundenkontext wählen.')
    setMsg('Feedback-Aufgaben werden erzeugt...')
    const result = await retentionIntelligenceClient.generateFeedbackActions(customerId, { persist: true }).catch((e:any) => ({ ok:false, error:e.message }))
    setFeedbackActions(result)
    setMsg(result.ok ? `${result.actions?.length || 0} Feedback-Aufgaben erzeugt.` : result.error || 'Fehler')
  }


  async function generateMarketingReminders() {
    if (!customerId) return setMsg('Bitte Kundenkontext wählen.')
    setMsg('Marketing-Reminder-Entwürfe werden erzeugt...')
    const result = await retentionIntelligenceClient.generateMarketingReminders(customerId, { persist: true }).catch((e:any) => ({ ok:false, error:e.message, drafts: [], skipped: [] }))
    setReminderDrafts(result)
    setMsg(result.ok ? `${result.drafts?.length || 0} Reminder-Entwürfe erzeugt. ${result.skipped?.length || 0} übersprungen.` : result.error || 'Fehler')
  }


  async function sendMarketingReminders() {
    if (!customerId) return setMsg('Bitte Kundenkontext wählen.')
    setMsg('Reminder-Mails werden per Resend/Mail versendet...')
    const result = await retentionIntelligenceClient.sendMarketingReminders(customerId, { require_delivery: true, limit: 50 }).catch((e:any) => ({ ok:false, error:e.message, sent: [], failed: [] }))
    setSendResult(result)
    setMsg(result.ok ? `${result.sent?.length || 0} Reminder-Mail(s) versendet.` : result.error || `${result.sent?.length || 0} versendet, ${result.failed?.length || 0} fehlgeschlagen.`)
  }


  async function runLegalReview() {
    setMsg('Consent-Formulierung wird technisch geprüft...')
    const result = await retentionIntelligenceClient.legalReviewMarketingConsent({
      text: 'Ich möchte per E-Mail zu Bonuspunkten, Rewards, Coupons und Reaktivierungsaktionen dieses Anbieters kontaktiert werden. Ich kann die Einwilligung jederzeit widerrufen.',
      checkbox_preselected: false,
      participation_coupled: false,
      double_opt_in_enabled: true,
      unsubscribe_link_enabled: true
    }).catch((e:any) => ({ ok:false, error:e.message, checks: [] }))
    setLegalReview(result)
    setMsg(result.ok ? 'Consent-Formulierung technisch plausibel.' : result.error || 'Consent-Formulierung prüfen.')
  }


  async function startSegmentCampaign() {
    if (!customerId) return setMsg('Bitte Kundenkontext wählen.')
    setMsg('Segmentbasierte Kampagne wird erstellt...')
    const result = await retentionIntelligenceClient.startSegmentCampaign(customerId, { segment_key: segmentKey, create_coupons: true, coupon_value: '10%' }).catch((e:any) => ({ ok:false, error:e.message }))
    setSegmentCampaign(result)
    setMsg(result.ok ? `Segment-Kampagne erstellt: ${result.candidate_count || 0} Kandidaten.` : result.error || 'Segment-Kampagne fehlgeschlagen.')
  }

  async function createRecovery(member:any) {
    if (!customerId) return
    setMsg('Service Recovery Case wird erstellt...')
    const result = await retentionIntelligenceClient.createServiceRecoveryCase(customerId, {
      loyalty_member_id: member.id,
      issue_type: 'Automatisch erkannter Recovery-Fall',
      proposed_solution: 'Persönlich nachfassen, Ursache klären und Kulanzcoupon prüfen.',
      contact_allowed: Boolean(member.consent_marketing)
    }).catch((e:any) => ({ ok:false, error:e.message }))
    setMsg(result.ok ? 'Service Recovery Case erstellt.' : result.error || 'Fehler')
  }

  useEffect(() => { void load(false) }, [])

  const metrics = data?.metrics || {}
  const reactivationCandidates = data?.reactivation_candidates || []
  const criticalMembers = (data?.members || []).filter((m:any) => (m.segments || []).includes('critical_feedback_customers'))

  return (
    <AdminShell activeHref="/admin/retention/intelligence">
      <div className="pageHeader">
        <div>
          <p className="eyebrow">Retention</p>
          <h1>Retention Intelligence Suite</h1>
          <p className="muted">Segment Builder, Churn Prevention, Customer Value Score, Feedback-to-Action, Service Recovery und Reaktivierungsvorschläge.</p>
        </div>
        <div className="actionRow">
          <button className="btn secondary" onClick={() => load(false)}>Neu analysieren</button>
          <button className="btn" onClick={() => load(true)}>Analyse speichern</button>
        </div>
      </div>

      <Card title="Kundenbindung Übersicht" action={<Badge ok={Boolean(customerId)}>{metrics.reactivation_candidates || 0} Reaktivieren</Badge>}>
        <p className="sub">{customerId || 'Kein Kunde gewählt'} · {msg}</p>
        <pre className="codeBox">{JSON.stringify(metrics, null, 2)}</pre>
      </Card>

      <div className="grid2">
        <Card title="Konkrete Systemvorschläge" action={<Badge ok={(data?.recommendations || []).every((x:any)=>x.priority!=='high')}>{(data?.recommendations || []).length}</Badge>}>
          <List rows={data?.recommendations || []}/>
          <div className="actionRow"><button className="btn secondary" onClick={createSegments}>Standardsegmente erstellen</button><button className="btn" onClick={createReactivation}>Reaktivierungsplan erstellen</button><button className="btn secondary" onClick={generateMarketingReminders}>Reminder-Entwürfe</button></div>
        </Card>

        <Card title="Inaktive Kunden / Reaktivierung" action={<Badge ok={!reactivationCandidates.length}>{reactivationCandidates.length}</Badge>}>
          <List rows={reactivationCandidates} empty="Keine Reaktivierungskandidaten."/>
          {reactivationCandidates.slice(0, 4).map((m:any) => <div className="actionRow" key={m.id}><button className="btn secondary" onClick={() => createRecovery(m)}>Recovery Case für {m.display_name}</button></div>)}
        </Card>

        <Card title="Customer Value Score / VIP-Kandidaten" action={<Badge ok={true}>{(data?.vip_candidates || []).length}</Badge>}>
          <List rows={data?.vip_candidates || []} empty="Keine VIP-Kandidaten."/>
        </Card>

        <Card title="Feedback-to-Action Board" action={<Badge ok={!criticalMembers.length}>{criticalMembers.length} kritisch</Badge>}>
          <List rows={criticalMembers} empty="Keine kritischen Feedback-Kunden."/>
          <button className="btn" onClick={generateActions}>Feedback-Aufgaben erzeugen</button>
          <p className="sub">{feedbackActions?.saved ? `${feedbackActions.saved} Aufgaben gespeichert.` : ''}</p>
        </Card>

        <Card title="Segmente & Kampagnen starten" action={<Badge ok={true}>{Object.keys(data?.segment_counts || {}).length}</Badge>}>
          <pre className="codeBox">{JSON.stringify(data?.segment_counts || {}, null, 2)}</pre>
          <select className="input" value={segmentKey} onChange={e=>setSegmentKey(e.target.value)}>
            {(templates?.segments || []).map((s:any) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button className="btn secondary" onClick={startSegmentCampaign}>Segment-Kampagne starten</button>
          {segmentCampaign ? <p className="sub">{segmentCampaign.ok ? `Kampagne erstellt · ${segmentCampaign.candidate_count || 0} Kandidaten` : segmentCampaign.error}</p> : null}
        </Card>

        <Card title="Templates / Regeln">
          <List rows={templates?.segments || []}/>
        </Card>

        <Card title="Reaktivierungsplan Entwurf">
          <pre className="codeBox">{JSON.stringify((reactivation?.candidates || []).slice(0, 5), null, 2)}</pre>
        </Card>

        <Card title="Marketing-Reminder-Entwürfe" action={<Badge ok={true}>{reminderDrafts?.drafts?.length || 0}</Badge>}>
          <List rows={reminderDrafts?.drafts || []} empty="Noch keine Reminder-Entwürfe erzeugt."/>
          <div className="actionRow"><button className="btn secondary" onClick={sendMarketingReminders}>Entwürfe per Mail versenden</button><button className="btn secondary" onClick={runLegalReview}>Consent-Text prüfen</button></div>
          {reminderDrafts?.skipped?.length ? <p className="sub">{reminderDrafts.skipped.length} Kontakte wurden wegen fehlender E-Mail oder fehlender bestätigter Werbeeinwilligung übersprungen.</p> : null}
          {sendResult ? <p className="sub">Versand: {sendResult.sent?.length || 0} erfolgreich · {sendResult.failed?.length || 0} fehlgeschlagen</p> : null}
          {legalReview ? <pre className="codeBox">{JSON.stringify({ ok: legalReview.ok, note: legalReview.note, failed: (legalReview.checks || []).filter((c:any)=>!c.ok) }, null, 2)}</pre> : null}
        </Card>

        <Card title="Top-Risiko-Kunden">
          <List rows={(data?.members || []).slice(0, 10)}/>
        </Card>
      </div>
    </AdminShell>
  )
}
