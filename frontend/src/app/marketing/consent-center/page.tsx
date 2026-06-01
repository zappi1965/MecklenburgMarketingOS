'use client'

import { FormEvent, useState } from 'react'
import { v33FunctionalClient } from '@/lib/v33FunctionalClient'

export default function PublicConsentCenterPage() {
  const [slug, setSlug] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function load(e?: FormEvent) {
    e?.preventDefault()
    setLoading(true)
    setMsg('')
    try {
      const result = await v33FunctionalClient.publicMarketingConsentStatus(slug, { email, password })
      setStatus(result)
      setMsg(result.ok ? 'Status geladen.' : result.error || 'Status konnte nicht geladen werden.')
    } catch (err:any) {
      setMsg(err?.message || 'Status konnte nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }

  async function resend() {
    setLoading(true)
    try {
      const result = await v33FunctionalClient.publicResendMarketingDoubleOptIn(slug, { email, password })
      setMsg(result?.ok ? 'Bestätigungsmail wurde erneut vorbereitet/versendet.' : result?.error || 'Bestätigung konnte nicht versendet werden.')
    } catch (err:any) { setMsg(err?.message || 'Bestätigung konnte nicht versendet werden.') }
    finally { setLoading(false) }
  }

  async function withdraw() {
    setLoading(true)
    try {
      const result = await v33FunctionalClient.publicWithdrawMarketingConsent(slug, { email, password, reason: 'consent_center' })
      setMsg(result?.ok ? 'Einwilligung wurde widerrufen.' : result?.error || 'Widerruf fehlgeschlagen.')
      await load()
    } catch (err:any) { setMsg(err?.message || 'Widerruf fehlgeschlagen.') }
    finally { setLoading(false) }
  }

  return (
    <main className="publicLoyaltyPage">
      <section className="publicHero">
        <div className="publicCard">
          <p className="eyebrow">Consent Center</p>
          <h1>Werbeeinwilligung verwalten</h1>
          <p className="v37-subline">Prüfe deine Reminder-Einwilligung, fordere Double-Opt-in erneut an oder widerrufe die Einwilligung.</p>

          <form className="publicForm" onSubmit={load}>
            <label>Slug des Bonusprogramms<input required value={slug} onChange={(e)=>setSlug(e.target.value)} placeholder="z. B. cafe-milo"/></label>
            <label>E-Mail<input required type="email" value={email} onChange={(e)=>setEmail(e.target.value)} /></label>
            <label>Passwort<input required type="password" value={password} onChange={(e)=>setPassword(e.target.value)} /></label>
            <button disabled={loading} type="submit">{loading ? 'Lade...' : 'Status prüfen'}</button>
          </form>

          {msg && <div className="v39-public-hint">{msg}</div>}

          {status?.ok && (
            <div className="publicReviewSavedBox">
              <b>Status: {status.status}</b>
              <span>{status.can_receive_reminders ? 'Reminder-Mails sind aktiv.' : 'Reminder-Mails sind nicht aktiv.'}</span>
              <span>Version: {status.version || '—'} · Bestätigt: {status.consent_at || '—'} · Widerrufen: {status.withdrawn_at || '—'}</span>
              <div className="publicActions">
                <button className="btn secondary" disabled={loading} onClick={resend}>Double-Opt-in erneut senden</button>
                <button className="btn secondary" disabled={loading} onClick={withdraw}>Einwilligung widerrufen</button>
              </div>
            </div>
          )}

          <div className="publicLegalLinks">
            <a href="/datenschutz">Datenschutz</a>
            <a href="/impressum">Impressum</a>
          </div>
        </div>
      </section>
    </main>
  )
}
