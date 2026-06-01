'use client'

import { FormEvent, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { v33FunctionalClient } from '@/lib/v33FunctionalClient'

export default function MarketingUnsubscribePage() {
  const search = useSearchParams()
  const token = String(search.get('token') || '')
  const slug = String(search.get('slug') || '')
  const emailFromLink = String(search.get('email') || '')
  const [email, setEmail] = useState(emailFromLink)
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e?: FormEvent) {
    e?.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const result = await v33FunctionalClient.publicWithdrawMarketingConsent(slug, token ? { token, email, reason: 'unsubscribe_page' } : { email, password, reason: 'unsubscribe_page' })
      setMessage(result?.ok ? 'Deine Werbeeinwilligung wurde widerrufen.' : result?.error || 'Widerruf konnte nicht gespeichert werden.')
    } catch (err:any) {
      setMessage(err?.message || 'Widerruf konnte nicht gespeichert werden.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="publicLoyaltyPage">
      <section className="publicHero">
        <div className="publicCard">
          <h1>Werbeeinwilligung widerrufen</h1>
          <p className="v37-subline">Du kannst Erinnerungen und Angebotsmails jederzeit abbestellen.</p>
          {token ? (
            <button className="btn" disabled={loading} onClick={() => submit()}>{loading ? 'Speichere...' : 'Jetzt abbestellen'}</button>
          ) : (
            <form className="publicForm" onSubmit={submit}>
              <label>E-Mail<input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} /></label>
              <label>Passwort<input type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} /></label>
              <button disabled={loading} type="submit">{loading ? 'Speichere...' : 'Einwilligung widerrufen'}</button>
            </form>
          )}
          {message && <div className="v39-public-hint">{message}</div>}
          <div className="publicLegalLinks">
            <a href="/marketing/consent-center">Consent Center</a><a href="/datenschutz">Datenschutz</a>
            <a href="/impressum">Impressum</a>
          </div>
        </div>
      </section>
    </main>
  )
}
