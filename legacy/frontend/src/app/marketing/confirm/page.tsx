'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { v33FunctionalClient } from '@/lib/v33FunctionalClient'

export default function MarketingConfirmPage() {
  return (
    <Suspense fallback={
      <main className="publicLoyaltyPage">
        <section className="publicHero">
          <div className="publicCard">
            <h1>Bitte warten...</h1>
            <p className="v37-subline">Bestätigungslink wird geladen...</p>
          </div>
        </section>
      </main>
    }>
      <MarketingConfirmPageContent />
    </Suspense>
  )
}

function MarketingConfirmPageContent() {
  const search = useSearchParams()
  const token = String(search.get('token') || '')
  const slug = String(search.get('slug') || '')
  const [state, setState] = useState<any>({ loading: true, message: 'Bestätigung wird geprüft...' })

  useEffect(() => {
    let alive = true
    async function run() {
      if (!token || !slug) {
        setState({ loading: false, ok: false, message: 'Bestätigungslink ist unvollständig.' })
        return
      }
      try {
        const result = await v33FunctionalClient.publicConfirmMarketingConsent(slug, token)
        if (!alive) return
        setState({ loading: false, ok: result?.ok, message: result?.ok ? 'Deine Einwilligung wurde bestätigt.' : result?.error || 'Bestätigung fehlgeschlagen.' })
      } catch (e:any) {
        if (!alive) return
        setState({ loading: false, ok: false, message: e?.message || 'Bestätigung fehlgeschlagen.' })
      }
    }
    void run()
    return () => { alive = false }
  }, [token, slug])

  return (
    <main className="publicLoyaltyPage">
      <section className="publicHero">
        <div className="publicCard">
          <h1>{state.ok ? 'Einwilligung bestätigt' : state.loading ? 'Bitte warten...' : 'Bestätigung nicht möglich'}</h1>
          <p className="v37-subline">{state.message}</p>
          <div className="publicActions">
            <a className="btn" href={slug ? `/l/${encodeURIComponent(slug)}` : '/'}>Zurück zur Bonusseite</a>
          </div>
          <div className="publicLegalLinks">
            <a href="/marketing/consent-center">Consent Center</a><a href="/datenschutz">Datenschutz</a>
            <a href="/impressum">Impressum</a>
          </div>
        </div>
      </section>
    </main>
  )
}
