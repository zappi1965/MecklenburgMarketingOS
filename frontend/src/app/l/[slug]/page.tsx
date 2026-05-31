'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { v33FunctionalClient } from '@/lib/v33FunctionalClient'
import { requireConsent } from '@/lib/consent'
import { safeLocalStorageSet, safeLocalStorageText } from '@/lib/safeStorage'

function titleFromSlug(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ')
}

// Geräte-ID wird nur gesetzt, wenn der Nutzer der Kategorie "Funktional"
// zugestimmt hat (§ 25 TDDDG). Ohne Consent läuft Loyalty mit serverseitiger
// Bindung an E-Mail/Passwort weiter, nur die geräte-spezifischen Limits
// fallen weg.
function deviceId() {
  if (typeof window === 'undefined') return undefined
  if (!requireConsent('functional')) return undefined
  const existing = safeLocalStorageText('mmos_device_id', '', { category: 'functional' })
  if (existing) return existing
  const id = `dev_${Date.now()}_${Math.random().toString(16).slice(2)}`
  safeLocalStorageSet('mmos_device_id', id, { category: 'functional' })
  return id
}

export default function PublicLoyaltyPage() {
  const params = useParams<{ slug: string }>()
  const slug = String(params?.slug || '')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [reviewText, setReviewText] = useState('')
  const [rating, setRating] = useState(5)
  const [result, setResult] = useState<any>(null)
  const [status, setStatus] = useState<any>(null)
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')
  const [loading, setLoading] = useState(false)
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [staffCodes, setStaffCodes] = useState<Record<string, string>>({})
  const [rewardOverviewOpen, setRewardOverviewOpen] = useState(true)
  const [submittedReview, setSubmittedReview] = useState<any>(null)
  const rewardOverviewRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!slug) return
    v33FunctionalClient.publicStatus(slug)
      .then(setStatus)
      .catch((e: any) => setHint(friendlyHint(e?.message || 'Status konnte nicht geladen werden.')))
  }, [slug])

  const settings = status?.settings || null
  const mode = String(status?.mode || status?.qr_campaign?.metadata?.purpose || 'loyalty')
  const showLoyalty = mode === 'loyalty' || mode === 'both'
  const showReview = mode === 'review' || mode === 'both'

  const points = Number(result?.points_balance || result?.member?.points_balance || 0)
  const pointsAdded = Number(result?.points_added || status?.qr_campaign?.points_per_scan || status?.qr_campaign?.metadata?.points_per_scan || status?.program?.points_per_scan || 10)
  const progress = Math.min(100, Math.round((points / 100) * 100))

  const brandName =
    settings?.brand_name ||
    result?.program?.name ||
    status?.program?.name ||
    status?.program?.title ||
    titleFromSlug(slug) ||
    'Bonusclub'

  const brandFont = settings?.brand_font || 'Pacifico'
  const primary = settings?.brand_primary || '#d4af37'
  const secondary = settings?.brand_secondary || '#111827'
  const campaignTexts = status?.qr_campaign?.metadata || {}
  const headline = campaignTexts.hero_headline || settings?.hero_headline || status?.qr_campaign?.headline || `Willkommen im ${brandName}`
  const subline =
    campaignTexts.hero_subline ||
    settings?.hero_subline ||
    (showReview && !showLoyalty
      ? 'Bewerte deinen Besuch und hilf uns, noch besser zu werden.'
      : 'Sammle Punkte, sichere dir Rewards und werde VIP.')
  const loyaltyCta = campaignTexts.cta_label || 'Punkte sammeln'
  const reviewCta = campaignTexts.review_cta_label || 'Bewertung absenden'
  const successTitle = campaignTexts.success_title || 'Deine Punkte wurden gespeichert.'
  const successMessage = campaignTexts.success_message || 'Danke für deine Teilnahme. Deine Vorteile werden direkt deinem Bonuskonto zugeordnet.'
  const fineprint = campaignTexts.fineprint || 'Mit dem Absenden nimmst du am digitalen Bonusprogramm teil. Deine Angaben werden dem jeweiligen Anbieter zugeordnet.'

  const publicUrl = useMemo(() => {
    if (typeof window === 'undefined') return `/l/${slug}`
    return `${window.location.origin}/l/${slug}`
  }, [slug])

  const rewards = status?.rewards || []
  const activeActions = status?.active_actions || []
  const rewardPoints = (r: any) => Number(r.points_required ?? r.required_points ?? r.points ?? 0)
  const unlockedRewards = rewards.filter((r: any) => rewardPoints(r) <= points)
  const nextReward = rewards.find((r: any) => rewardPoints(r) > points)
  const redemptions = Array.isArray(result?.redemptions) ? result.redemptions : []
  const visibleRewards = useMemo(() => [...rewards].sort((a: any, b: any) => rewardPoints(a) - rewardPoints(b)), [rewards])
  const rewardAllowsMultiple = (r: any) => r?.allow_multiple_redemptions === true || r?.allow_multiple === true || r?.repeatable === true || String(r?.redemption_frequency || '').toLowerCase() === 'multiple'
  const rewardStaffRequired = (r: any) => r?.staff_code_required !== false && r?.require_staff_code !== false
  const alreadyRedeemed = (r: any) => redemptions.some((x: any) => String(x.reward_id || x.rewardId || '') === String(r.id || r.local_id))

  function friendlyHint(message: string) {
    const m = String(message || '')
    if (m.includes('Tageslimit')) return 'Du hast heute bereits Punkte gesammelt.'
    if (m.includes('Wochenlimit')) return 'Diese Woche ist dein Limit erreicht.'
    if (m.includes('nicht gefunden') || m.includes('Kein Loyalty')) return 'Dieser QR-Link ist noch nicht aktiv. Bitte prüfe die Kampagne im Adminbereich.'
    if (m.includes('Failed to fetch') || m.includes('Network') || m.includes('fetch failed')) return 'Der Server ist gerade nicht erreichbar. Bitte versuche es gleich erneut.'
    return 'Wir konnten deine Aktion gerade nicht speichern. Bitte versuche es später erneut.'
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setHint('')

    try {
      const displayName = email ? email.split('@')[0] : 'Gast'
      const response: any = await v33FunctionalClient.publicJoinOrScan(slug, {
        display_name: displayName,
        email,
        password,
        auth_only: !showLoyalty,
        device_id: deviceId()
      })

      if (showLoyalty) {
        setResult(response)
      }

      if (showReview) {
        const review = await v33FunctionalClient.publicReview(slug, {
          customer_id: response?.program?.customer_id || status?.customer_id,
          loyalty_program_id: response?.program?.id || status?.program?.id,
          loyalty_customer_id: response?.member?.id,
          qr_campaign_id: response?.program?.qr_campaign_id || status?.program?.qr_campaign_id || status?.qr_campaign?.id,
          reviewer_name: displayName,
          reviewer_email: email,
          rating,
          feedback_text: reviewText
        })
        setSubmittedReview(review?.feedback || null)
        setStatus((current: any) => current ? ({
          ...current,
          qr_campaign: current.qr_campaign ? {
            ...current.qr_campaign,
            metadata: {
              ...(current.qr_campaign.metadata || {}),
              review_count: Number(current.qr_campaign.metadata?.review_count || 0) + 1,
              last_review_rating: rating
            }
          } : current.qr_campaign
        }) : current)
        setHint(review?.campaign_review_saved ? 'Danke, deine Bewertung wurde der Kampagne zugeordnet.' : review?.ok ? 'Danke für deine Bewertung.' : 'Bewertung gespeichert.')
        setResult((current: any) => ({
          ...(current || response || {}),
          review_submitted: true,
          review_feedback: review?.feedback || null,
          points_added: showLoyalty ? (response?.points_added || current?.points_added || 0) : 0,
          points_balance: response?.member?.points_balance || response?.points_balance || current?.points_balance || 0,
          member: response?.member || current?.member || null,
          program: response?.program || current?.program || status?.program || null,
          redemptions: response?.redemptions || current?.redemptions || []
        }))
      }

      // DSGVO/Drittland: Kein automatischer Redirect zu Google mehr.
      // Bei rating >= 4 wird im Success-View ein expliziter Button angezeigt,
      // der erst beim Klick auf google.com weiterleitet (echte Einwilligung).
    } catch (e: any) {
      const message = e?.message || 'Speichern fehlgeschlagen'
      setError(friendlyHint(message))
      setHint('Aus Sicherheitsgründen werden Punkte und Bewertungen erst nach erfolgreicher E-Mail/Passwort-Verifizierung gespeichert.')
    } finally {
      setLoading(false)
    }
  }

  async function redeemReward(reward: any) {
    const rewardId = String(reward?.id || reward?.local_id || '')
    if (!rewardId) return
    setError('')
    setHint('')
    if (rewardStaffRequired(reward) && !staffCodes[rewardId]) {
      setHint('Bitte lass den Mitarbeitercode oder die Mitarbeiter-PIN eintragen, um die Prämie einzulösen.')
      return
    }
    setRedeeming(rewardId)
    try {
      const response: any = await v33FunctionalClient.publicRedeemReward(slug, rewardId, {
        email,
        password,
        staff_code: staffCodes[rewardId]
      })
      setResult((current: any) => ({
        ...(current || {}),
        member: response.member,
        points_balance: response.points_balance,
        redemptions: response.redemptions || [...(current?.redemptions || []), response.redemption],
        last_redemption: response.redemption
      }))
      setStatus((current: any) => current ? ({ ...current, rewards: current.rewards }) : current)
      setHint(`${reward.title || reward.name || 'Prämie'} wurde eingelöst. ${response.points_spent || 0} Punkte wurden abgezogen.`)
      setStaffCodes((current) => ({ ...current, [rewardId]: '' }))
    } catch (e: any) {
      const message = e?.message || 'Prämie konnte nicht eingelöst werden.'
      setError(message)
    } finally {
      setRedeeming(null)
    }
  }

  function openRewardOverview() {
    setRewardOverviewOpen(true)
    setHint('')
    setError('')
    window.setTimeout(() => rewardOverviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
  }

  async function requestPasswordReset() {
    setError('')
    setHint('')
    if (!email) { setHint('Bitte gib zuerst deine E-Mail-Adresse ein.'); return }
    try {
      const r = await v33FunctionalClient.publicPasswordReset(slug, { email })
      setHint(r?.message || 'Wenn ein Bonuskonto existiert, wurde ein Reset-Vorgang vorbereitet.')
    } catch (e: any) {
      setHint(e?.message || 'Passwort-Reset konnte nicht vorbereitet werden.')
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
          <div className="v37-script-brand" style={{ fontFamily: brandFont, color: primary }}>
            {brandName}
          </div>

          <h1>{headline}</h1>
          <p className="v37-subline">{subline}</p>

          {activeActions.length > 0 && (
            <div className="publicActiveAction">
              <b>{activeActions[0].label}</b>
              <span>{activeActions[0].message}</span>
            </div>
          )}

          {showLoyalty && (
            <>
              <div className="publicStats">
                <div><strong>{points}</strong><span>Punkte</span></div>
                <div><strong>{pointsAdded || 10}</strong><span>pro Scan</span></div>
                <div><strong>{result?.loyalty_level?.tier || result?.member?.tier || 'Basic'}</strong><span>Level</span></div>
              </div>

              <div className="publicProgress"><span style={{ width: `${progress}%` }} /></div>
            </>
          )}

          {showLoyalty && (
            <div className="publicRewardQuickPanel">
              <div>
                <b>Rewards jederzeit ansehen</b>
                <span>{visibleRewards.length ? `${visibleRewards.length} Reward(s) verfügbar` : 'Aktuell sind noch keine Rewards hinterlegt.'}</span>
              </div>
              <button type="button" onClick={openRewardOverview}>Rewards anzeigen</button>
            </div>
          )}

          {!result && (
            <form onSubmit={submit} className="publicForm">
              <div className="publicAuthNotice">
                Melde dich mit deiner E-Mail-Adresse und deinem Passwort an. Neue Bonuskonten werden beim ersten Login mit Passwort angelegt.
              </div>

              <label>
                E-Mail
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-Mail-Adresse für dein Bonuskonto" autoComplete="email" required />
              </label>

              <label>
                Passwort
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mindestens 8 Zeichen" autoComplete="current-password" minLength={8} required />
              </label>
              <div className="publicPasswordHint">Dein Passwort schützt dein Bonuskonto und verhindert, dass andere Personen Punkte oder Rewards in deinem Namen verwenden.</div><button className="publicLinkButton" type="button" onClick={requestPasswordReset}>Passwort vergessen?</button>

              {showReview && (
                <>
                  <label>
                    Bewertung
                    <input type="number" min="1" max="5" value={rating} onChange={(e) => setRating(Number(e.target.value))} placeholder="Sternebewertung von 1 bis 5" />
                  </label>
                  <label>
                    Feedback optional
                    <input value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Kurze Beschreibung deiner Erfahrung" />
                  </label>
                </>
              )}

              <p className="publicConsentNotice">
                Mit dem Absenden willige ich in die Verarbeitung meiner Daten (E-Mail
                {showReview ? ', Bewertung und Feedback' : ''}) zur Teilnahme am
                Bonusprogramm ein (Art. 6 Abs. 1 lit. a + b DSGVO). Verantwortlich
                ist der jeweilige Anbieter dieses Bonusprogramms. Details:{' '}
                <a href="/datenschutz">Datenschutzhinweise</a>.
                {showReview && (
                  <>
                    {' '}Mein Feedback wird gespeichert; bei einer guten Bewertung
                    kann ich anschließend selbst entscheiden, ob ich es auch auf
                    Google veröffentliche.
                  </>
                )}
              </p>

              <button disabled={loading || status?.active === false} type="submit">
                {loading ? 'Speichere...' : showLoyalty && showReview ? `${loyaltyCta} & bewerten` : showReview ? reviewCta : loyaltyCta}
              </button>
            </form>
          )}

          {rewardOverviewOpen && (
            <div className="publicRewards publicRewardOverview" ref={rewardOverviewRef}>
              <div className="publicRewardOverviewHead">
                <div>
                  <b>Rewards ansehen</b>
                  <span>{result ? `Dein aktueller Stand: ${points} Punkte` : 'Melde dich an, damit wir deinen Punktestand und verfügbare Rewards prüfen können.'}</span>
                </div>
                <button type="button" className="publicLinkButton" onClick={() => setRewardOverviewOpen(false)}>Schließen</button>
              </div>

              {visibleRewards.length === 0 ? (
                <p className="publicRewardEmpty">Aktuell sind für diese Slug-Seite noch keine Rewards hinterlegt.</p>
              ) : (
                visibleRewards.map((r: any) => {
                  const rewardId = String(r.id || r.local_id || '')
                  const required = rewardPoints(r)
                  const missing = Math.max(0, required - points)
                  const isUnlocked = result && missing === 0
                  const onceRedeemed = alreadyRedeemed(r) && !rewardAllowsMultiple(r)
                  return (
                    <div key={rewardId || r.title} className={isUnlocked ? 'publicRewardItem publicRewardRedeemItem' : 'publicRewardItem'}>
                      <div className="publicRewardText">
                        <span>{r.title || r.name || 'Reward'}</span>
                        <em>{required} Punkte · {isUnlocked ? 'verfügbar' : result ? `noch ${missing} Punkte` : 'nach Anmeldung prüfbar'}</em>
                      </div>

                      {isUnlocked && (
                        onceRedeemed ? (
                          <strong className="publicRedeemedBadge">Bereits eingelöst</strong>
                        ) : (
                          <div className="publicRedeemBox">
                            {rewardStaffRequired(r) && (
                              <input
                                value={staffCodes[rewardId] || ''}
                                onChange={(e) => setStaffCodes((current) => ({ ...current, [rewardId]: e.target.value }))}
                                placeholder="Mitarbeitercode / PIN"
                                autoComplete="off"
                              />
                            )}
                            <button type="button" onClick={() => redeemReward(r)} disabled={redeeming === rewardId}>
                              {redeeming === rewardId ? 'Löse ein...' : 'Prämie einlösen'}
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {result && (
            <div className="publicSuccess">
              <h2>{successTitle}</h2>
              <p>{successMessage}</p>
              <p>Du hast {pointsAdded || 0} Punkte gesammelt. Dein aktueller Stand: <b>{points}</b> Punkte.</p>

              {submittedReview && (
                <div className="publicReviewSavedBox">
                  <b>Bewertung gespeichert</b>
                  <span>{rating} Sterne · der Kampagne zugeordnet</span>
                </div>
              )}

              {unlockedRewards.length > 0 && (
                <div className="publicRewards">
                  <b>Jetzt verfügbar</b>
                  {unlockedRewards.map((r: any) => {
                    const rewardId = String(r.id || r.local_id || '')
                    const onceRedeemed = alreadyRedeemed(r) && !rewardAllowsMultiple(r)
                    return (
                      <div key={rewardId || r.title} className="publicRewardItem publicRewardRedeemItem">
                        <div className="publicRewardText">
                          <span>{r.title || r.name || 'Reward'}</span>
                          <em>{rewardPoints(r)} Punkte · {rewardAllowsMultiple(r) ? 'mehrfach einlösbar' : 'einmalig einlösbar'}</em>
                        </div>
                        {onceRedeemed ? (
                          <strong className="publicRedeemedBadge">Bereits eingelöst</strong>
                        ) : (
                          <div className="publicRedeemBox">
                            {rewardStaffRequired(r) && (
                              <input
                                value={staffCodes[rewardId] || ''}
                                onChange={(e) => setStaffCodes((current) => ({ ...current, [rewardId]: e.target.value }))}
                                placeholder="Mitarbeitercode / PIN"
                                autoComplete="off"
                              />
                            )}
                            <button type="button" onClick={() => redeemReward(r)} disabled={redeeming === rewardId}>
                              {redeeming === rewardId ? 'Löse ein...' : 'Prämie einlösen'}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {nextReward && (
                <div className="publicRewards locked">
                  <b>Nächster Reward</b>
                  <div className="publicRewardItem">
                    <span>{nextReward.title || nextReward.name || 'Reward'}</span>
                    <em>Noch {Math.max(0, rewardPoints(nextReward) - points)} Punkte</em>
                  </div>
                </div>
              )}

              <div className="publicActions">
                <button type="button" onClick={() => setResult(null)}>Erneut anmelden / weitere Aktion</button>
                <button type="button" onClick={copyReferral}>Freund empfehlen</button>
              </div>

              {status?.google_review_url && rating >= 4 && (
                <div className="publicGoogleReview">
                  <p>
                    Freut uns, dass es dir gefallen hat. Wenn du magst, kannst du deine
                    Bewertung auch auf Google teilen — das hilft anderen, uns zu finden.
                  </p>
                  <a
                    className="publicGoogleReviewBtn"
                    href={status.google_review_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Auf Google bewerten →
                  </a>
                  <p className="publicGoogleReviewHint">
                    Hinweis: Beim Klick wird google.com (USA) geöffnet. Dabei werden u.a.
                    deine IP-Adresse und Browser-Daten an Google übertragen.
                  </p>
                </div>
              )}
            </div>
          )}

          {hint && <div className="v39-public-hint">{hint}</div>}
          {error && <div className="publicError">{error}</div>}

          <div className="publicFineprint">
            {fineprint}
          </div>
          <div className="publicLegalLinks" aria-label="Rechtliche Informationen">
            <a href="/impressum">Impressum</a>
            <a href="/datenschutz">Datenschutz</a>
            <a href="/cookies">Cookie-Einstellungen</a>
            <a href="/agb">AGB</a>
          </div>
        </div>
      </section>

      <div className="v38-mobile-actions">
        <button type="button" onClick={() => document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' })}>
          {showReview && !showLoyalty ? reviewCta : loyaltyCta}
        </button>
        <button type="button" onClick={openRewardOverview}>
          Reward ansehen
        </button>
        <button type="button" onClick={copyReferral}>Freund empfehlen</button>
      </div>
    </main>
  )
}
