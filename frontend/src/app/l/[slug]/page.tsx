
'use client'

import { useEffect, useMemo, useState } from 'react'
import { v33FunctionalClient } from '@/lib/v33FunctionalClient'

type LoyaltyResult = {
  member?: any
  program?: any
  points_added?: number
  points_balance?: number
}

export default function PublicLoyaltyPage({ params }: { params: { slug: string } }) {
  const slug = params.slug
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<LoyaltyResult | null>(null)
  const [error, setError] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const [reviewSent, setReviewSent] = useState(false)

  const deviceId = useMemo(() => {
    if (typeof window === 'undefined') return ''
    const key = 'mmos_loyalty_device_id'
    let value = localStorage.getItem(key)
    if (!value) {
      value = `dev_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`
      localStorage.setItem(key, value)
    }
    return value
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedToken = localStorage.getItem(`mmos_loyalty_member_${slug}`)
    if (savedToken) {
      setLoading(true)
      v33FunctionalClient.publicJoinOrScan(slug, {
        member_token: savedToken,
        device_id: deviceId,
        consent: true
      })
        .then((r:any) => {
          setResult(r)
          if (r.member?.member_token) localStorage.setItem(`mmos_loyalty_member_${slug}`, r.member.member_token)
        })
        .catch(() => null)
        .finally(() => setLoading(false))
    }
  }, [slug, deviceId])

  async function collectPoints() {
    setError('')
    setLoading(true)
    try {
      if (!consent && !result?.member) {
        setError('Bitte bestätige die Teilnahme am Bonusprogramm.')
        return
      }
      if (!email && !phone && !result?.member?.member_token) {
        setError('Bitte gib deine E-Mail oder Telefonnummer ein.')
        return
      }

      const r:any = await v33FunctionalClient.publicJoinOrScan(slug, {
        email,
        phone,
        display_name: displayName,
        device_id: deviceId,
        member_token: result?.member?.member_token,
        consent
      })
      setResult(r)
      if (r.member?.member_token && typeof window !== 'undefined') {
        localStorage.setItem(`mmos_loyalty_member_${slug}`, r.member.member_token)
      }
    } catch (e:any) {
      setError(e.message || 'Punkte konnten nicht gespeichert werden.')
    } finally {
      setLoading(false)
    }
  }

  async function sendFeedback() {
    setError('')
    try {
      if (!rating) {
        setError('Bitte wähle eine Bewertung aus.')
        return
      }
      await v33FunctionalClient.publicReview(slug, {
        customer_id: result?.program?.customer_id,
        loyalty_program_id: result?.program?.id,
        loyalty_customer_id: result?.member?.id,
        qr_campaign_id: result?.program?.qr_campaign_id,
        rating,
        feedback_text: feedback,
        reviewer_name: displayName || result?.member?.display_name,
        reviewer_email: email || result?.member?.email,
        reviewer_phone: phone || result?.member?.phone
      })
      setReviewSent(true)
    } catch (e:any) {
      setError(e.message || 'Feedback konnte nicht gespeichert werden.')
    }
  }

  const programName = result?.program?.name || 'Bonusprogramm'
  const points = result?.points_balance ?? result?.member?.points_balance ?? 0
  const added = result?.points_added ?? 0
  const progress = Math.min(100, Math.round((Number(points) / 100) * 100))

  const v37BrandName = v37Settings?.brand_name || publicData?.campaign?.name || publicData?.program?.name || 'Bonusclub'
  const v37BrandFont = v37Settings?.brand_font || 'Pacifico'
  const v37Primary = v37Settings?.brand_primary || '#d4af37'
  const v37Secondary = v37Settings?.brand_secondary || '#111827'
  return (
    <main className="loyaltyPublicShell">
      <section className="loyaltyHero">
        <div className="loyaltyBadge">MMOS Loyalty</div>
        <h1>{programName}</h1>
        <p>Scanne, sammle Punkte und sichere dir Vorteile bei deinem Anbieter.</p>
      </section>

      <section className="loyaltyCard">
        {!result?.member ? (
          <>
            <h2>Punkte sammeln</h2>
            <p className="muted">Gib deine E-Mail oder Telefonnummer ein, damit deine Punkte wiedererkannt werden können.</p>

            <label>Name optional</label>
            <input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Max Mustermann" />

            <label>E-Mail</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="max@example.de" type="email" />

            <label>Telefon</label>
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+49 ..." />

            <label className="check">
              <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} />
              <span>Ich möchte am Bonusprogramm teilnehmen und bin mit der Speicherung meiner Angaben zur Punkteverwaltung einverstanden.</span>
            </label>

            <button onClick={collectPoints} disabled={loading}>
              {loading ? 'Speichere...' : 'Punkte sammeln'}
            </button>
          </>
        ) : (
          <>
            <h2>Willkommen zurück{result.member.display_name ? `, ${result.member.display_name}` : ''}!</h2>
            <p className="success">+{added} Punkte wurden gutgeschrieben.</p>

            <div className="pointsBox">
              <span>Dein Punktestand</span>
              <strong>{points}</strong>
            </div>

            <div className="progress">
              <div style={{ width: `${progress}%` }} />
            </div>
            <p className="muted">Nächster Reward beispielhaft bei 100 Punkten.</p>

            <button onClick={collectPoints} disabled={loading}>
              {loading ? 'Aktualisiere...' : 'Erneut Punkte sammeln'}
            </button>
          </>
        )}

        {v39PublicErrorHint && <div className="v39-public-hint">{v39PublicErrorHint}</div>}{error && <p className="error">{error}</p>}
      </section>

      {result?.member && (
        <section className="loyaltyCard">
          <h2>Feedback geben</h2>
          <p className="muted">Dein Feedback hilft dem Anbieter, besser zu werden.</p>

          <div className="stars">
            {[1,2,3,4,5].map(star => (
              <button
                key={star}
                className={rating === star ? 'active' : ''}
                onClick={()=>setRating(star)}
              >
                ★
              </button>
            ))}
          </div>

          <textarea value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="Optionales Feedback..." />

          <button onClick={sendFeedback}>Feedback speichern</button>

          {reviewSent && rating && rating >= 4 && (
            <p className="success">Danke! Dein Feedback wurde gespeichert und dem QR/Loyalty Lead zugeordnet.</p>
          )}

          {reviewSent && rating && rating <= 3 && (
            <p className="success">Danke für dein ehrliches Feedback. Es wurde intern gespeichert.</p>
          )}
        </section>
      )}

      <section className="loyaltyFooter">
        <p>Deine Daten werden nur zur Verwaltung dieses Bonusprogramms verwendet.</p>
      </section>
    <div className="v38-mobile-actions"><button type="button" onClick={() => document.querySelector('form')?.scrollIntoView({behavior:'smooth'})}>Punkte sammeln</button><button type="button" onClick={() => alert('Reward-Auswahl wird nach dem ersten Scan angezeigt.')}>Reward ansehen</button><button type="button" onClick={() => alert('Freund empfehlen ist im Loyalty Portal vorbereitet.')}>Freund empfehlen</button></div></main>
  )
}
