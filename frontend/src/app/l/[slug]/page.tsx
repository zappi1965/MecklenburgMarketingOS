'use client'

import { FormEvent, useMemo, useState } from 'react'
import { v33FunctionalClient } from '@/lib/v33FunctionalClient'

type PageProps = {
  params: {
    slug: string
  }
}

export default function PublicLoyaltyPage({ params }: PageProps) {
  const slug = params.slug

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [birthday, setBirthday] = useState('')
  const [result, setResult] = useState<any>(null)
  const [v37Settings, setV37Settings] = useState<any>(null)
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')
  const [loading, setLoading] = useState(false)

  const points = Number(result?.points_balance || result?.member?.points_balance || 0)
  const pointsAdded = Number(result?.points_added || 0)
  const progress = Math.min(100, Math.round((points / 100) * 100))

  const brandName =
    v37Settings?.brand_name ||
    result?.program?.name ||
    result?.program?.title ||
    'Bonusclub'

  const brandFont = v37Settings?.brand_font || 'Pacifico'
  const primary = v37Settings?.brand_primary || '#d4af37'
  const secondary = v37Settings?.brand_secondary || '#111827'
  const headline = v37Settings?.hero_headline || `Willkommen im ${brandName}`
  const subline =
    v37Settings?.hero_subline ||
    'Sammle Punkte, sichere dir Rewards und werde VIP.'

  const publicUrl = useMemo(() => {
    if (typeof window === 'undefined') return `/l/${slug}`
    return `${window.location.origin}/l/${slug}`
  }, [slug])

  function friendlyHint(message: string) {
    const m = String(message || '')
    if (m.includes('Tageslimit')) return 'Du hast heute bereits Punkte gesammelt.'
    if (m.includes('Wochenlimit')) return 'Diese Woche ist dein Limit erreicht.'
    if (m.includes('nicht gefunden') || m.includes('Kein Loyalty')) {
      return 'Dieser QR-Link ist noch nicht aktiv. Bitte prüfe die Kampagne im Adminbereich.'
    }
    if (m.includes('Failed to fetch') || m.includes('Network')) {
      return 'Der Server ist gerade nicht erreichbar. Bitte versuche es gleich erneut.'
    }
    return 'Wir konnten deinen Punktestand gerade nicht speichern. Bitte versuche es später erneut.'
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setHint('')

    try {
      const response = await v33FunctionalClient.publicJoinOrScan(slug, {
        name,
        display_name: name,
        email,
        phone,
        birthday,
        device_id:
          typeof window !== 'undefined'
            ? window.localStorage.getItem('mmos_device_id') ||
              (() => {
                const id = `dev_${Date.now()}_${Math.random().toString(16).slice(2)}`
                window.localStorage.setItem('mmos_device_id', id)
                return id
              })()
            : undefined
      })

      setResult(response)

      if (response?.program?.customer_id) {
        try {
          const settings = await v33FunctionalClient.getLoyaltySettings(
            response.program.customer_id
          )
          setV37Settings(settings?.settings || null)
        } catch {
          // Branding is optional. The scan must remain successful even if settings fail.
        }
      }
    } catch (e: any) {
      const message = e?.message || 'Speichern fehlgeschlagen'
      setError(message)
      setHint(friendlyHint(message))
    } finally {
      setLoading(false)
    }
  }

  async function copyReferral() {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setHint('Link wurde kopiert.')
    } catch {
      setHint('Link konnte nicht kopiert werden.')
    }
  }

  return (
    <main className="publicLoyaltyPage" style={{ ['--loyalty-primary' as any]: primary, ['--loyalty-secondary' as any]: secondary }}>
      <section className="publicHero">
        <div className="publicHeroGlow" />
        <div className="publicCard">
          <div
            className="v37-script-brand"
            style={{ fontFamily: brandFont, color: primary }}
          >
            {brandName}
          </div>

          <h1>{headline}</h1>
          <p className="v37-subline">{subline}</p>

          <div className="publicStats">
            <div>
              <strong>{points}</strong>
              <span>Punkte</span>
            </div>
            <div>
              <strong>{pointsAdded || 10}</strong>
              <span>pro Scan</span>
            </div>
            <div>
              <strong>{result?.loyalty_level?.tier || result?.member?.tier || 'Basic'}</strong>
              <span>Level</span>
            </div>
          </div>

          <div className="publicProgress">
            <span style={{ width: `${progress}%` }} />
          </div>

          {!result && (
            <form onSubmit={submit} className="publicForm">
              <label>
                Dein Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Max Mustermann"
                  required
                />
              </label>

              <label>
                E-Mail
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="max@example.de"
                  required
                />
              </label>

              <label>
                Telefon optional
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+49 ..."
                />
              </label>

              <label>
                Geburtstag optional
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                />
              </label>

              <button disabled={loading} type="submit">
                {loading ? 'Speichere...' : 'Punkte sammeln'}
              </button>
            </form>
          )}

          {result && (
            <div className="publicSuccess">
              <h2>Deine Punkte wurden gespeichert.</h2>
              <p>
                Du hast {pointsAdded || 0} Punkte gesammelt. Dein aktueller
                Stand: <b>{points}</b> Punkte.
              </p>

              <div className="publicActions">
                <button type="button" onClick={() => setResult(null)}>
                  Noch ein Scan
                </button>
                <button type="button" onClick={copyReferral}>
                  Freund empfehlen
                </button>
              </div>
            </div>
          )}

          {hint && <div className="v39-public-hint">{hint}</div>}
          {error && <div className="publicError">{error}</div>}

          <div className="publicFineprint">
            Mit dem Absenden nimmst du am digitalen Bonusprogramm teil. Demo- und
            Testdaten werden dem jeweiligen Anbieter zugeordnet.
          </div>
        </div>
      </section>

      <div className="v38-mobile-actions">
        <button
          type="button"
          onClick={() =>
            document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' })
          }
        >
          Punkte sammeln
        </button>
        <button
          type="button"
          onClick={() =>
            setHint('Rewards werden nach dem ersten Scan im Bonuskonto angezeigt.')
          }
        >
          Reward ansehen
        </button>
        <button type="button" onClick={copyReferral}>
          Freund empfehlen
        </button>
      </div>
    </main>
  )
}
