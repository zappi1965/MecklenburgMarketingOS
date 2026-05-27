'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { aiMailClient, type MailDraft } from '@/lib/adminToolsClients'

const PURPOSES = [
  { key: 'reactivation', label: 'Reaktivierung — inaktiven Kunden zurueckgewinnen' },
  { key: 'thank_you', label: 'Dankeschoen nach Termin oder Bewertung' },
  { key: 'dunning_intro', label: 'Erste freundliche Zahlungserinnerung' },
  { key: 'birthday', label: 'Geburtstagsgruss' },
  { key: 'review_followup', label: 'Nachfassen auf eine schlechte Bewertung' },
  { key: 'free', label: 'Freie Form — eigener Anlass' }
]

export default function MailAssistantPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [purpose, setPurpose] = useState('reactivation')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [customNote, setCustomNote] = useState('')
  const [draft, setDraft] = useState<MailDraft | null>(null)
  const [provider, setProvider] = useState('')
  const [context, setContext] = useState<Record<string, any>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<'subject' | 'body' | null>(null)

  useEffect(() => {
    (async () => {
      const profile = await getCurrentUserProfile()
      if (!profile) { setAuthorized(false); return }
      setAuthorized(true)
      setCustomerId(profile.customer_id || '')
    })()
  }, [])

  async function generate() {
    setBusy(true); setError(''); setDraft(null)
    try {
      const r = await aiMailClient.draft(customerId, {
        purpose,
        recipient: { email: recipientEmail || undefined, name: recipientName || undefined },
        custom_note: customNote || undefined
      })
      setDraft(r.draft)
      setProvider(r.provider)
      setContext(r.context || {})
    } catch (e: any) { setError(e?.message || 'AI-Entwurf fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function copy(field: 'subject' | 'body') {
    if (!draft) return
    try {
      await navigator.clipboard.writeText(field === 'subject' ? draft.subject : draft.body)
      setCopied(field)
      setTimeout(() => setCopied(null), 1500)
    } catch {}
  }

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <h1>AI Mail-Assistant</h1>
        <p>Erzeuge personalisierte E-Mail-Entwuerfe im Markenton, mit Kontext aus der Kundenhistorie (letzte Termine, offene Rechnungen, Bewertungen, Health-Score).</p>
      </header>

      {authorized === false && <div className="adminNotice"><b>Anmeldung erforderlich.</b></div>}
      {error && <div className="adminAlert">{error}</div>}

      {authorized && (
        <>
          <section className="adminCard">
            <h2>Entwurf konfigurieren</h2>
            <label className="adminLabel">Anlass
              <select className="adminInput" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                {PURPOSES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </label>
            <div className="adminGrid2">
              <label className="adminLabel">Empfaenger-E-Mail<input className="adminInput" type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="kunde@example.com" /></label>
              <label className="adminLabel">Empfaenger-Name<input className="adminInput" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Anna Mueller" /></label>
            </div>
            <label className="adminLabel">Notiz (optional, fliesst in den Prompt)
              <textarea className="adminInput" rows={3} value={customNote} onChange={(e) => setCustomNote(e.target.value)} placeholder="z.B. Anlass: 10-Jahres-Jubilaeum unseres Hairsalons" />
            </label>
            <button type="button" className="adminBtn" onClick={generate} disabled={busy || !customerId}>
              {busy ? 'Erstelle Entwurf …' : 'Entwurf erstellen'}
            </button>
          </section>

          {draft && (
            <section className="adminCard adminHighlight">
              <h2>Entwurf <span className="adminBadge">{provider}</span></h2>
              <div className="adminLabel">
                <span>Betreff <button type="button" className="adminBtn small" onClick={() => copy('subject')}>{copied === 'subject' ? '✓ kopiert' : 'kopieren'}</button></span>
                <input className="adminInput" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
              </div>
              <div className="adminLabel">
                <span>Body <button type="button" className="adminBtn small" onClick={() => copy('body')}>{copied === 'body' ? '✓ kopiert' : 'kopieren'}</button></span>
                <textarea className="adminInput" rows={10} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
              </div>
              {Object.keys(context).length > 0 && (
                <details>
                  <summary className="adminMuted">Verwendeter Kontext (zur Transparenz)</summary>
                  <pre className="adminCode">{JSON.stringify(context, null, 2)}</pre>
                </details>
              )}
            </section>
          )}
        </>
      )}
    </main>
  )
}
