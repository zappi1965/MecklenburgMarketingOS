'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { newsletterClient, type Subscriber, type NewsletterCampaign } from '@/lib/adminToolsClients'

export default function NewsletterPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [statusFilter, setStatusFilter] = useState('active')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [lastCampaign, setLastCampaign] = useState<NewsletterCampaign | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh(cid: string, status: string) {
    try {
      const r = await newsletterClient.listSubscribers(cid, status)
      setSubscribers(r.subscribers || [])
    } catch (e: any) { setError(e?.message || 'Konnte nicht laden.') }
  }

  useEffect(() => {
    (async () => {
      const profile = await getCurrentUserProfile()
      if (!profile) { setAuthorized(false); return }
      setAuthorized(true)
      setCustomerId(profile.customer_id || '')
      if (profile.customer_id) await refresh(profile.customer_id, statusFilter)
    })()
  }, [])

  async function changeFilter(next: string) {
    setStatusFilter(next)
    if (customerId) await refresh(customerId, next)
  }

  async function createAndSend() {
    setBusy(true); setError(''); setInfo('')
    try {
      const c = await newsletterClient.createCampaign(customerId, subject.trim(), body.trim())
      setLastCampaign(c.campaign)
      if (c.campaign?.id) {
        const r = await newsletterClient.send(c.campaign.id)
        setInfo(`Kampagne eingestellt: ${r.result?.queued ?? 0} Empfaenger in der Versand-Queue.`)
      }
      setSubject(''); setBody('')
    } catch (e: any) { setError(e?.message || 'Versand fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <h1>Newsletter</h1>
        <p>Erstelle Kampagnen an deine aktiven Subscriber. Versand wird via Mail-Provider gequeued, sobald der Provider verbunden ist.</p>
      </header>

      {authorized === false && <div className="adminNotice"><b>Anmeldung erforderlich.</b></div>}
      {error && <div className="adminAlert">{error}</div>}
      {info && <div className="adminAlertInfo">{info}</div>}

      {authorized && (
        <>
          <section className="adminCard">
            <h2>Neue Kampagne</h2>
            <label className="adminLabel">Betreff<input className="adminInput" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="z.B. Sommer-Aktion 2026" /></label>
            <label className="adminLabel">Body (Plain-Text)<textarea className="adminInput" rows={10} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Hallo {{name}},&#10;&#10;…" /></label>
            <button type="button" className="adminBtn" onClick={createAndSend} disabled={busy || !subject.trim() || !body.trim() || !customerId}>
              {busy ? 'Sende …' : `An ${subscribers.length} aktive Subscriber senden`}
            </button>
            {lastCampaign && <div className="adminMuted">Zuletzt erzeugt: {lastCampaign.subject} ({lastCampaign.status})</div>}
          </section>

          <section className="adminCard">
            <h2>Subscriber</h2>
            <div className="adminActions">
              {['active', 'pending', 'unsubscribed'].map((s) => (
                <button key={s} type="button" className={statusFilter === s ? 'adminBtn small' : 'adminBtn small adminChip'} onClick={() => changeFilter(s)}>
                  {s} ({statusFilter === s ? subscribers.length : '—'})
                </button>
              ))}
            </div>
            {subscribers.length === 0 && <div className="adminMuted">Keine Eintraege fuer Status "{statusFilter}".</div>}
            {subscribers.length > 0 && (
              <table className="adminTable">
                <thead><tr><th>E-Mail</th><th>Status</th><th>Beigetreten</th><th>Bestaetigt</th></tr></thead>
                <tbody>
                  {subscribers.map((s) => (
                    <tr key={s.id}>
                      <td>{s.email}</td>
                      <td><span className={`adminBadge ${s.status === 'active' ? 'on' : s.status === 'unsubscribed' ? 'off' : ''}`}>{s.status}</span></td>
                      <td>{s.created_at?.slice(0, 10) || '—'}</td>
                      <td>{s.confirmed_at?.slice(0, 10) || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </main>
  )
}
