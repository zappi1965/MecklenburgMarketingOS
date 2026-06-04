'use client'

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { v33FunctionalClient } from '@/lib/v33FunctionalClient'
import { requireConsent } from '@/lib/consent'
import { safeLocalStorageSet, safeLocalStorageText } from '@/lib/safeStorage'
import StampCardView from '@/components/loyalty/StampCardView'

function titleFromSlug(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ')
}

function publicQrImage(value: string, size = 512) {
  const params = new URLSearchParams({ value, size: String(size) })
  return `/api/qr?${params.toString()}`
}

function absolutePublicUrl(path: string) {
  if (typeof window === 'undefined') return path
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`
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

function qrScanSessionId(slug: string) {
  if (typeof window === 'undefined' || !slug) return ''
  const key = `mmos_qr_scan_session:${slug}`
  const existing = sessionStorage.getItem(key)
  if (existing) return existing
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`
  const next = `scan_${slug}_${random}`
  sessionStorage.setItem(key, next)
  return next
}

function consumeQrScanSession(slug: string) {
  try { sessionStorage.removeItem(`mmos_qr_scan_session:${slug}`) } catch {}
}

export default function PublicLoyaltyPage() {
  return (
    <Suspense fallback={
      <main className="publicLoyaltyPage">
        <section className="publicHero">
          <div className="publicCard">
            <h1>Bonusseite wird geladen...</h1>
            <p className="v37-subline">Bitte einen Moment warten.</p>
          </div>
        </section>
      </main>
    }>
      <PublicLoyaltyPageContent />
    </Suspense>
  )
}

function PublicLoyaltyPageContent() {
  const params = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const slug = String(params?.slug || '')
  const scanTokenFromUrl = String(searchParams?.get('scan_token') || '')
  const [scanToken, setScanToken] = useState(scanTokenFromUrl)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [reviewText, setReviewText] = useState('')
  const [marketingConsent, setMarketingConsent] = useState(false)
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
  const [scanTokenConsumed, setScanTokenConsumed] = useState(false)
  const rewardOverviewRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!slug) return
    setScanTokenConsumed(false)
    v33FunctionalClient.publicStatus(slug)
      .then(setStatus)
      .catch((e: any) => setHint(friendlyHint(e?.message || 'Status konnte nicht geladen werden.')))
  }, [slug])

  useEffect(() => {
    if (!slug || typeof window === 'undefined') return
    const key = `mmos_qr_scan_token:${slug}`
    if (scanTokenFromUrl) {
      try { sessionStorage.setItem(key, scanTokenFromUrl) } catch {}
      setScanToken(scanTokenFromUrl)
      return
    }
    try {
      const fallback = sessionStorage.getItem(key) || ''
      if (fallback) setScanToken(fallback)
    } catch {}
  }, [slug, scanTokenFromUrl])

  const settings = status?.settings || null
  const mode = String(status?.mode || status?.qr_campaign?.metadata?.purpose || 'loyalty')
  const showLoyalty = mode === 'loyalty' || mode === 'both'
  const showReview = mode === 'review' || mode === 'both'
  const requireRescanForPoints = Boolean(status?.scan_limits?.require_rescan_for_points || status?.qr_campaign?.metadata?.require_rescan_for_points || status?.program?.metadata?.require_rescan_for_points || settings?.metadata?.require_rescan_for_points)

  const points = Number(result?.points_balance || result?.member?.points_balance || 0)
  const pointsAdded = Number(result?.points_added || status?.qr_campaign?.points_per_scan || status?.qr_campaign?.metadata?.points_per_scan || status?.program?.points_per_scan || 10)
  const totalScans = Number(result?.member?.total_scans ?? result?.total_scans ?? status?.member?.total_scans ?? 0)
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
  const marketingConsentVersion = campaignTexts.marketing_consent_version || 'marketing-reactivation-v2-2026-06-03'
  const marketingConsentText = campaignTexts.marketing_consent_text || 'Ich möchte per E-Mail Informationen zu meinem Punktekonto, Bonuspunkten, Rewards, Coupons und persönlichen Reaktivierungsaktionen dieses Anbieters erhalten. Ich kann diese Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen.'
  const redemptionMode = campaignTexts.redemption_mode || 'customer_phone_staff_pin'
  const quickRedemption = result?.quick_redemption || null

  const stampSettings = {
    // QR-Kampagnen-Metadaten sind die finale Quelle für /l/[slug].
    // Ältere Loyalty-/Branding-Defaults dürfen eine konkrete QR-Zielseiten-Auswahl nicht überschreiben.
    loyalty_display_mode: campaignTexts.loyalty_display_mode || settings?.loyalty_display_mode || settings?.metadata?.loyalty_display_mode || status?.program?.metadata?.loyalty_display_mode || 'classic',
    stamp_card_slots: campaignTexts.stamp_card_slots || settings?.stamp_card_slots || settings?.metadata?.stamp_card_slots || status?.program?.metadata?.stamp_card_slots || 10,
    stamp_card_reward_text: campaignTexts.stamp_card_reward_text || settings?.stamp_card_reward_text || settings?.metadata?.stamp_card_reward_text || status?.program?.metadata?.stamp_card_reward_text || 'Volle Karte = Prämie sichern',
    stamp_card_stamp_style: campaignTexts.stamp_card_stamp_style || settings?.stamp_card_stamp_style || settings?.metadata?.stamp_card_stamp_style || status?.program?.metadata?.stamp_card_stamp_style || 'logo',
    stamp_card_show_logo: campaignTexts.stamp_card_show_logo ?? settings?.stamp_card_show_logo ?? settings?.metadata?.stamp_card_show_logo ?? status?.program?.metadata?.stamp_card_show_logo ?? true,
    logo_url: campaignTexts.stamp_card_logo_url || campaignTexts.stamp_card_background || campaignTexts.brand_logo_url || settings?.stamp_card_background || settings?.logo_url || settings?.brand_logo_url || settings?.metadata?.stamp_card_logo_url || settings?.metadata?.brand_logo_url || status?.program?.metadata?.stamp_card_logo_url || status?.program?.metadata?.brand_logo_url || null
  }
  const loyaltyDisplayMode = ['classic', 'stamp_card', 'hybrid'].includes(String(stampSettings.loyalty_display_mode)) ? String(stampSettings.loyalty_display_mode) : 'classic'
  const stampSlotsRaw = Number(stampSettings.stamp_card_slots || 10)
  const stampSlots = [6, 8, 10, 12].includes(stampSlotsRaw) ? stampSlotsRaw : 10
  const stampStyleRaw = String(stampSettings.stamp_card_stamp_style || 'logo')
  const stampStyle = (['logo', 'check', 'star'].includes(stampStyleRaw) ? stampStyleRaw : 'logo') as 'logo' | 'check' | 'star'
  const pointsPerStampRaw = Number(settings?.points_per_stamp || settings?.metadata?.points_per_stamp || status?.program?.metadata?.points_per_stamp || campaignTexts.points_per_stamp || pointsAdded || 10)
  const pointsPerStamp = Number.isFinite(pointsPerStampRaw) && pointsPerStampRaw > 0 ? pointsPerStampRaw : Math.max(1, pointsAdded || 10)
  // V103.8: Stempelkarte zeigt Besuche/Stempel, nicht rohe Punkte.
  // Bevorzugt total_scans aus loyalty_customers; fallback auf Punkte / pointsPerStamp.
  const stampCount = Math.max(0, Math.floor(totalScans > 0 ? totalScans : points / pointsPerStamp))
  const showStampCard = (showLoyalty || loyaltyDisplayMode === 'stamp_card' || loyaltyDisplayMode === 'hybrid') && (loyaltyDisplayMode === 'stamp_card' || loyaltyDisplayMode === 'hybrid')
  const showClassicLoyaltyStats = showLoyalty && loyaltyDisplayMode !== 'stamp_card'

  const publicUrl = useMemo(() => {
    if (typeof window === 'undefined') return `/l/${slug}`
    return `${window.location.origin}/l/${slug}`
  }, [slug])

  const rewards = status?.rewards || []
  const activeActions = status?.active_actions || []
  const rewardPoints = (r: any) => Number(r.points_required ?? r.required_points ?? r.points ?? 0)
  const rewardTitle = (r: any) => r?.title || r?.name || r?.label || r?.reward_title || r?.reward_name || r?.display_name || r?.benefit || r?.description || 'Prämie'
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
    if (m.includes('QR_SCAN_TOKEN') || m.includes('QR_RESCAN_REQUIRED') || m.includes('erneut gescannt') || m.includes('Scan-Token')) return 'Für neue Punkte musst du den QR-Code erneut scannen.'
    if (m.includes('Punkte-Wochenlimit')) return 'Diese Woche ist dein Punkte-Limit erreicht.'
    if (m.includes('Wochenlimit')) return 'Diese Woche ist dein Einlöse-Limit erreicht.'
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
        device_id: deviceId(),
        scan_token: scanToken,
        marketing_consent: marketingConsent,
        marketing_consent_version: marketingConsentVersion,
        marketing_consent_text: marketingConsentText,
        marketing_consent_source: 'public_slug_page',
        marketing_consent_purposes: ['loyalty_reminders','reward_reminders','coupon_offers','reactivation']
      })

      if (showLoyalty) {
        setResult(response)
        if (response?.scan_token_consumed) {
          setScanTokenConsumed(true)
          try { sessionStorage.removeItem(`mmos_qr_scan_token:${slug}`) } catch {}
          setScanToken('')
          setHint('Punkte gesammelt. Für weitere Punkte ist ein erneutes Scannen des QR-Codes erforderlich.')
        }
        if (response?.marketing_consent?.granted) {
          setHint(response.marketing_consent?.email_sent ? 'Punkte gespeichert. Bitte bestätige deine Werbeeinwilligung über die E-Mail, die wir dir gerade gesendet haben.' : 'Punkte gespeichert. Deine Werbeeinwilligung wurde als Double-Opt-in-Anfrage vorbereitet. Bitte prüfe dein E-Mail-Postfach.')
        }
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
      setHint(`${rewardTitle(reward)} wurde eingelöst. ${response.points_spent || 0} Punkte wurden abgezogen.`)
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

          {showStampCard && (
            <StampCardView
              businessName={brandName}
              logoUrl={stampSettings.logo_url}
              pointsBalance={stampCount}
              slots={stampSlots}
              rewardText={String(stampSettings.stamp_card_reward_text || 'Volle Karte = Prämie sichern')}
              stampStyle={stampStyle}
              showLogo={stampSettings.stamp_card_show_logo !== false}
            />
          )}

          {loyaltyDisplayMode === 'stamp_card' && (
            <p className="publicStampCompactPoints">{result ? <>Aktueller Punktestand: {points} Punkte · {pointsAdded || 10} pro Scan · {stampCount} Stempel · Level {result?.loyalty_level?.tier || result?.member?.tier || 'Basic'}</> : <>Melde dich an oder scanne beim Kauf, damit deine gesammelten Stempel hier erscheinen.</>}</p>
          )}

          {showClassicLoyaltyStats && (
            <>
              <div className="publicStats">
                <div><strong>{points}</strong><span>Punkte</span></div>
                <div><strong>{pointsAdded || 10}</strong><span>pro Scan</span></div>
                <div><strong>{result?.loyalty_level?.tier || result?.member?.tier || 'Basic'}</strong><span>Level</span></div>
              </div>

              <div className="publicProgress"><span style={{ width: `${progress}%` }} /></div>
            </>
          )}

          {requireRescanForPoints && showLoyalty && (
            <div className={scanToken && !scanTokenConsumed ? "publicRescanNotice" : "publicRescanNotice publicNoScanTokenNotice"}>
              <b>QR-Scan erforderlich</b>
              <span>{scanToken && !scanTokenConsumed ? 'Dieser QR-Scan ist bereit. Nach Punktevergabe wird er verbraucht.' : 'Für neue Punkte muss diese Seite erneut über den QR-Code geöffnet werden.'}</span>
            </div>
          )}

          {showLoyalty && (
            <div className="publicRewardQuickPanel">
              <div>
                <b>Aktive Rewards ansehen</b>
                <span>{visibleRewards.length ? `${visibleRewards.length} Reward(s) verfügbar` : 'Aktuell sind keine aktiven Rewards hinterlegt.'}</span>
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

              <label className="publicMarketingConsentBox">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                />
                <span>
                  <b>Kontakt zu Werbezwecken erlauben</b>
                  {marketingConsentText} Nach dem Absenden erhältst du eine Bestätigungs-E-Mail. Erst nach dieser Bestätigung werden Werbe-, Prämien- und Reaktivierungsmails aktiviert.
                </span>
              </label>

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
                        <span>{rewardTitle(r)}</span>
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

              {result?.marketing_consent?.double_opt_in_required && (
                <div className="publicReviewSavedBox">
                  <b>Bestätigungsmail versendet</b>
                  <span>Bitte bestätige deine Werbeeinwilligung per Double-Opt-in-Link. Erst danach erhältst du Reminder- oder Angebotsmails.</span>
                </div>
              )}

              {submittedReview && (
                <div className="publicReviewSavedBox">
                  <b>Bewertung gespeichert</b>
                  <span>{rating} Sterne · der Kampagne zugeordnet</span>
                </div>
              )}

              {quickRedemption?.code && redemptionMode === 'counter_customer_code' && (
                <div className="publicReviewSavedBox">
                  <b>Dein Einlösecode für den Tresen</b>
                  <span style={{fontSize:'32px',fontWeight:900,letterSpacing:'0.12em',display:'block',marginTop:8}}>{quickRedemption.code}</span>
                  <span>Zeige diesen Code dem Team. Der Mitarbeiter löst deine verfügbare Prämie im Tresenmodus ein.</span>
                  <span style={{display:'block',marginTop:8,color:'#6b7280'}}>Dieser Code erscheint nur, wenn der Tresenmodus für diese QR-Zielseite aktiviert ist.</span>
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
                          <span>{rewardTitle(r)}</span>
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
                    <span>{rewardTitle(nextReward)}</span>
                    <em>Noch {Math.max(0, rewardPoints(nextReward) - points)} Punkte</em>
                  </div>
                </div>
              )}

              {result?.qr_rotation?.next_qr_scan_url && (
                <div className="publicNextQrBox">
                  <img src={publicQrImage(absolutePublicUrl(result.qr_rotation.next_qr_scan_url), 512)} alt="Neuer QR-Code" />
                  <div>
                    <b>Neuer QR-Code wurde erzeugt</b>
                    <p>Diese Kampagne rotiert nach erfolgreichem Scan. Für den nächsten Gast ist jetzt dieser neue QR-Code gültig.</p>
                    <a href={`/qr-display/${encodeURIComponent(String(result.qr_rotation.next_slug || '').trim())}`} target="_blank" rel="noopener noreferrer">Neuen QR öffnen</a>
                  </div>
                </div>
              )}

              <div className="publicActions">
                <button type="button" onClick={() => setResult(null)}>Erneut anmelden / weitere Aktion</button>
                <button type="button" onClick={copyReferral}>Freund empfehlen</button>
              </div>

              {status?.google_review_url && (
                <div className="publicGoogleReview">
                  <p>
                    Danke für dein Feedback. Wenn du möchtest, kannst du deine Erfahrung
                    zusätzlich öffentlich auf Google teilen — unabhängig davon, wie deine Bewertung ausgefallen ist.
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
