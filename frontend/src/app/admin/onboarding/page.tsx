'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Check, ChevronRight, Sparkles, QrCode, Gift, Database, PartyPopper } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { onboardingClient } from '@/lib/adminToolsClients'

type Stage = 'loading' | 'brand' | 'qr' | 'loyalty' | 'samples' | 'done'

export default function OnboardingPage() {
  const [stage, setStage] = useState<Stage>('loading')
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [stepsDone, setStepsDone] = useState<Record<string, any>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [origin, setOrigin] = useState('')

  // Step-spezifischer State
  const [brand, setBrand] = useState({ brand_name: '', brand_primary: '#d4af37', brand_secondary: '#111827', brand_voice: 'professionell, freundlich' })
  const [qr, setQr] = useState({ title: 'Mein Bonusclub', headline: 'Willkommen — sammle Punkte', slug: '' })
  const [createdSlug, setCreatedSlug] = useState('')
  const [loyalty, setLoyalty] = useState({ program_name: 'Bonusclub', reward_title: 'Gratis-Kaffee', reward_points: 50 })

  function deriveStage(steps: Record<string, any>): Stage {
    if (steps.done) return 'done'
    if (steps.samples) return 'done'
    if (steps.loyalty) return 'samples'
    if (steps.qr) return 'loyalty'
    if (steps.brand) return 'qr'
    return 'brand'
  }

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin)
    ;(async () => {
      const profile = await getCurrentUserProfile()
      if (!profile || !profile.customer_id) { setAuthorized(false); setStage('brand'); return }
      setAuthorized(true)
      setCustomerId(profile.customer_id)
      if (profile.display_name) setBrand((b) => ({ ...b, brand_name: profile.display_name }))
      try {
        const s = await onboardingClient.status(profile.customer_id)
        setStepsDone(s.steps || {})
        setStage(deriveStage(s.steps || {}))
      } catch {
        setStage('brand')
      }
    })()
  }, [])

  async function doBrand() {
    setBusy(true); setError('')
    try {
      await onboardingClient.brand(customerId, brand)
      setStepsDone((s) => ({ ...s, brand: true }))
      setStage('qr')
    } catch (e: any) { setError(e?.message || 'Schritt fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function doQr() {
    setBusy(true); setError('')
    try {
      const r = await onboardingClient.qr(customerId, qr)
      setCreatedSlug(r.campaign?.slug || '')
      setStepsDone((s) => ({ ...s, qr: true }))
      setStage('loyalty')
    } catch (e: any) { setError(e?.message || 'Schritt fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function doLoyalty() {
    setBusy(true); setError('')
    try {
      await onboardingClient.loyalty(customerId, loyalty)
      setStepsDone((s) => ({ ...s, loyalty: true }))
      setStage('samples')
    } catch (e: any) { setError(e?.message || 'Schritt fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function doSamples() {
    setBusy(true); setError('')
    try {
      await onboardingClient.samples(customerId)
      await onboardingClient.complete(customerId)
      setStepsDone((s) => ({ ...s, samples: true, done: true }))
      setStage('done')
    } catch (e: any) { setError(e?.message || 'Schritt fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  function StepIndicator({ active, done, label, icon: Icon }: any) {
    return (
      <div className={`obStep ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
        <div className="obStepIcon">{done ? <Check size={14} /> : <Icon size={14} />}</div>
        <span>{label}</span>
      </div>
    )
  }

  return (
    <main className="adminPage obPage">
      <header className="adminHeader">
        <h1>Willkommen bei MMOS</h1>
        <p>In 4 Minuten ist dein Bonusclub einsatzbereit — Branding, QR-Code, Loyalty-Programm und Demo-Daten.</p>
      </header>

      {authorized === false && <div className="adminNotice"><b>Anmeldung erforderlich.</b><p>Bitte melde dich an, um den Onboarding-Assistenten zu nutzen.</p></div>}
      {error && <div className="adminAlert">{error}</div>}

      {authorized && (
        <>
          <div className="obSteps">
            <StepIndicator label="Branding" icon={Sparkles} active={stage === 'brand'} done={stepsDone.brand} />
            <ChevronRight size={14} className="obSep" />
            <StepIndicator label="QR-Kampagne" icon={QrCode} active={stage === 'qr'} done={stepsDone.qr} />
            <ChevronRight size={14} className="obSep" />
            <StepIndicator label="Loyalty" icon={Gift} active={stage === 'loyalty'} done={stepsDone.loyalty} />
            <ChevronRight size={14} className="obSep" />
            <StepIndicator label="Demo-Daten" icon={Database} active={stage === 'samples'} done={stepsDone.samples} />
            <ChevronRight size={14} className="obSep" />
            <StepIndicator label="Fertig" icon={PartyPopper} active={stage === 'done'} done={stepsDone.done} />
          </div>

          {stage === 'brand' && (
            <section className="adminCard">
              <h2>1 · Branding</h2>
              <p className="adminMuted">Wie heisst dein Unternehmen und welche Farbe traegt dein Logo?</p>
              <label className="adminLabel">Markenname<input className="adminInput" value={brand.brand_name} onChange={(e) => setBrand({ ...brand, brand_name: e.target.value })} placeholder="z.B. Friseur Mueller" /></label>
              <div className="adminGrid2">
                <label className="adminLabel">Primaerfarbe<input className="adminInput" type="color" value={brand.brand_primary} onChange={(e) => setBrand({ ...brand, brand_primary: e.target.value })} /></label>
                <label className="adminLabel">Sekundaerfarbe<input className="adminInput" type="color" value={brand.brand_secondary} onChange={(e) => setBrand({ ...brand, brand_secondary: e.target.value })} /></label>
              </div>
              <label className="adminLabel">Tonalitaet fuer AI (Stilbeschreibung)<input className="adminInput" value={brand.brand_voice} onChange={(e) => setBrand({ ...brand, brand_voice: e.target.value })} placeholder="z.B. locker und mit Augenzwinkern" /></label>
              <button type="button" className="adminBtn" onClick={doBrand} disabled={busy || !brand.brand_name.trim()}>Weiter</button>
            </section>
          )}

          {stage === 'qr' && (
            <section className="adminCard">
              <h2>2 · Erste QR-Kampagne</h2>
              <p className="adminMuted">Erstellt eine Slug-Seite, die deine Kunden per QR-Code erreichen. Wird sofort live.</p>
              <label className="adminLabel">Interner Titel<input className="adminInput" value={qr.title} onChange={(e) => setQr({ ...qr, title: e.target.value })} /></label>
              <label className="adminLabel">Headline auf der Slug-Seite<input className="adminInput" value={qr.headline} onChange={(e) => setQr({ ...qr, headline: e.target.value })} /></label>
              <label className="adminLabel">Slug (URL-Teil, optional)<input className="adminInput" value={qr.slug} onChange={(e) => setQr({ ...qr, slug: e.target.value })} placeholder="z.B. bonusclub-mueller — leer = automatisch" /></label>
              <button type="button" className="adminBtn" onClick={doQr} disabled={busy || !qr.title.trim()}>Kampagne anlegen</button>
            </section>
          )}

          {stage === 'loyalty' && (
            <section className="adminCard">
              <h2>3 · Loyalty-Programm &amp; erstes Reward</h2>
              <p className="adminMuted">Ein Reward genuegt fuer den Start — du kannst spaeter beliebig viele anlegen.</p>
              <label className="adminLabel">Programm-Name<input className="adminInput" value={loyalty.program_name} onChange={(e) => setLoyalty({ ...loyalty, program_name: e.target.value })} /></label>
              <div className="adminGrid2">
                <label className="adminLabel">Erstes Reward<input className="adminInput" value={loyalty.reward_title} onChange={(e) => setLoyalty({ ...loyalty, reward_title: e.target.value })} placeholder="z.B. Gratis-Kaffee" /></label>
                <label className="adminLabel">Erforderliche Punkte<input className="adminInput" type="number" min={1} value={loyalty.reward_points} onChange={(e) => setLoyalty({ ...loyalty, reward_points: Number(e.target.value) })} /></label>
              </div>
              <button type="button" className="adminBtn" onClick={doLoyalty} disabled={busy || !loyalty.program_name.trim()}>Programm anlegen</button>
            </section>
          )}

          {stage === 'samples' && (
            <section className="adminCard">
              <h2>4 · Demo-Daten</h2>
              <p>Wir legen 5 Demo-Loyalty-Mitglieder und 3 Demo-Reviews an, damit deine Dashboards beim ersten Login nicht leer sind. Du kannst alle Demo-Daten spaeter im CRM ausblenden oder loeschen.</p>
              <button type="button" className="adminBtn" onClick={doSamples} disabled={busy}>Demo-Daten anlegen &amp; fertig stellen</button>
            </section>
          )}

          {stage === 'done' && (
            <section className="adminCard adminHighlight">
              <h2>5 · Fertig 🎉</h2>
              <p>Dein Bonusclub ist einsatzbereit. Naechste Schritte:</p>
              <ul className="obDoneList">
                <li><b>Slug-Seite testen:</b> {createdSlug ? <a href={`/l/${createdSlug}`} target="_blank" rel="noreferrer">{origin}/l/{createdSlug}</a> : 'siehe QR-Kampagnen-Bereich'}</li>
                <li><b>QR-Code fuer die Kasse:</b> generiere ihn in der QR-Kampagnen-Liste und drucke ihn aus.</li>
                <li><b>2FA aktivieren:</b> <a href="/admin/security">/admin/security</a> — empfohlen vor Live-Betrieb.</li>
                <li><b>Compliance:</b> <a href="/admin/compliance">DSGVO-Cockpit</a> — Verfahrensverzeichnis ausfuellen.</li>
                <li><b>Insights:</b> <a href="/admin/insights">/admin/insights</a> — alle KPIs im Ueberblick.</li>
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  )
}
