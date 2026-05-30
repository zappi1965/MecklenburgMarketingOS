import type { MiniAuditStatus } from './badgeLibrary'
import type { GooglePlacePublicData, MiniAuditChance, MiniAuditMeasure, MiniAuditQuickCheckItem, MiniAuditResult } from './types'

const DEFAULT_BRANCH = 'Lokaler Betrieb'
const DEFAULT_LOCATION = 'Standort nicht angegeben'

function todayDe() {
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())
}

function safeNumber(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function statusScore(status: MiniAuditStatus) {
  if (status === 'stark') return 2
  if (status === 'bedingt') return 1
  return 0
}

function statusFromRating(rating: number | null): MiniAuditStatus {
  if (rating === null || rating <= 0) return 'kritisch'
  if (rating >= 4.6) return 'stark'
  if (rating >= 4.2) return 'bedingt'
  return 'kritisch'
}

function statusFromReviewCount(count: number | null): MiniAuditStatus {
  if (count === null || count < 20) return 'kritisch'
  if (count < 75) return 'bedingt'
  return 'stark'
}

function statusFromPhotos(count: number | null): MiniAuditStatus {
  if (count === null || count < 4) return 'kritisch'
  if (count < 15) return 'bedingt'
  return 'stark'
}

function statusFromProfileCompleteness(data: GooglePlacePublicData): MiniAuditStatus {
  const hasWebsite = Boolean(data.website)
  const hasPhone = Boolean(data.phone)
  const hasCategories = Boolean(data.categories?.length || data.branch)
  const points = [hasWebsite, hasPhone, hasCategories].filter(Boolean).length
  if (points >= 3) return 'stark'
  if (points >= 2) return 'bedingt'
  return 'kritisch'
}

function statusFromReviewActivity(data: GooglePlacePublicData): MiniAuditStatus {
  const reviewCount = safeNumber(data.reviewCount)
  const sampleReviews = data.reviews?.length || 0
  if (!reviewCount || reviewCount < 10) return 'kritisch'
  if (sampleReviews >= 3 && reviewCount >= 40) return 'stark'
  return 'bedingt'
}

function statusFromReviewFunnel(rating: number | null, reviewCount: number | null): MiniAuditStatus {
  if (reviewCount === null || reviewCount < 25) return 'kritisch'
  if (rating !== null && rating < 4.3) return 'kritisch'
  if (reviewCount >= 100 && rating !== null && rating >= 4.5) return 'stark'
  return 'bedingt'
}

function ratingNote(rating: number | null) {
  if (rating === null || rating <= 0) return 'Kein belastbarer Bewertungsschnitt öffentlich sichtbar.'
  if (rating >= 4.6) return `Sehr guter Bewertungsschnitt von ${rating.toFixed(1)} Sternen als starkes Vertrauenssignal.`
  if (rating >= 4.2) return `Solider Bewertungsschnitt von ${rating.toFixed(1)} Sternen, aber noch ausbaufähig.`
  return `Bewertungsschnitt von ${rating.toFixed(1)} Sternen kann Neukunden-Vertrauen bremsen.`
}

function reviewCountNote(count: number | null) {
  if (count === null || count <= 0) return 'Keine oder kaum öffentliche Bewertungen sichtbar.'
  if (count >= 75) return `${count} Bewertungen bilden bereits eine gute Vertrauensbasis.`
  if (count >= 20) return `${count} Bewertungen sind eine Grundlage, aber noch deutlich steigerbar.`
  return `Nur ${count} Bewertungen sichtbar – für lokale Suche und Vertrauen kritisch.`
}

function photosNote(count: number | null) {
  if (count === null || count <= 0) return 'Keine aussagekräftige öffentliche Foto-Basis erkannt.'
  if (count >= 15) return `${count} Fotos stärken den ersten Eindruck im Google-Profil.`
  if (count >= 4) return `${count} Fotos vorhanden, aber aktuelle Motive könnten stärker wirken.`
  return `Nur ${count} Fotos sichtbar – optischer Ersteindruck wirkt ausbaufähig.`
}

function profileNote(data: GooglePlacePublicData) {
  const missing = [
    !data.website ? 'Website' : '',
    !data.phone ? 'Telefonnummer' : '',
    !(data.categories?.length || data.branch) ? 'Kategorie' : ''
  ].filter(Boolean)
  if (!missing.length) return 'Website, Telefonnummer und Kategorie wirken vollständig hinterlegt.'
  if (missing.length === 1) return `${missing[0]} sollte im Profil klarer sichtbar sein.`
  return `Profilinformationen wirken unvollständig: ${missing.join(', ')} prüfen.`
}

function openingHoursNote(openingHoursAvailable?: boolean) {
  return openingHoursAvailable
    ? 'Öffnungszeiten sind öffentlich vorhanden und unterstützen die Kontaktentscheidung.'
    : 'Öffnungszeiten sind nicht klar öffentlich erkennbar oder unvollständig.'
}

function reviewFunnelNote(status: MiniAuditStatus, count: number | null) {
  if (status === 'stark') return 'Bewertungsbasis wirkt aktiv – Review-Funnel sollte konsequent gehalten werden.'
  if (status === 'bedingt') return 'Bewertungsgewinnung wirkt vorhanden, aber noch nicht konsequent ausgeschöpft.'
  return count && count > 0
    ? 'Es wirkt so, als würden Bewertungen nicht systematisch genug eingesammelt.'
    : 'Ohne sichtbare Bewertungsbasis fehlt ein wichtiger Vertrauenshebel.'
}

function buildChances(items: MiniAuditQuickCheckItem[], data: GooglePlacePublicData): MiniAuditChance[] {
  const weak = [...items].sort((a, b) => statusScore(a.status) - statusScore(b.status))
  const chances: MiniAuditChance[] = []

  for (const item of weak) {
    if (chances.length >= 3) break
    if (item.key === 'rating') {
      chances.push({
        title: 'Bewertungswirkung verbessern',
        text: 'Der sichtbare Bewertungsschnitt beeinflusst den ersten Eindruck direkt. Schon wenige aktuelle, ehrliche Bewertungen können das Vertrauen spürbar erhöhen.',
        recommendation: 'Aktive Bewertungsbitte nach Kundenkontakt einführen und kritische Muster sichtbar auswerten.'
      })
    }
    if (item.key === 'review_count') {
      chances.push({
        title: 'Bewertungsanzahl systematisch steigern',
        text: 'Eine größere Bewertungsbasis wirkt belastbarer und kann die Entscheidung in Google Maps positiv beeinflussen.',
        recommendation: 'Bewertungslink/QR-Karte nach jedem Kauf, Termin oder Besuch einsetzen.'
      })
    }
    if (item.key === 'review_activity') {
      chances.push({
        title: 'Review-Aktivität sichtbarer machen',
        text: 'Aktuelle Bewertungen signalisieren, dass der Betrieb aktiv besucht wird und Kundenmeinungen ernst genommen werden.',
        recommendation: 'Monatliches Bewertungsziel definieren und neue Bewertungen regelmäßig prüfen.'
      })
    }
    if (item.key === 'photos') {
      chances.push({
        title: 'Mehr verkaufsstarke Bilder nutzen',
        text: 'Aktuelle Bilder von Produkten, Räumen, Ergebnissen oder Team schaffen Vertrauen, bevor ein Kunde Kontakt aufnimmt.',
        recommendation: 'Wöchentlich neue, echte Bilder im Google-Profil ergänzen.'
      })
    }
    if (item.key === 'profile') {
      chances.push({
        title: 'Profilinformationen vollständiger machen',
        text: 'Fehlende Kontaktdaten, Kategorien oder Links können Anfragen kosten, obwohl grundsätzlich Interesse vorhanden ist.',
        recommendation: 'Kategorie, Telefonnummer, Website, Leistungen und Kurzbeschreibung prüfen.'
      })
    }
    if (item.key === 'opening_hours') {
      chances.push({
        title: 'Öffnungszeiten als Kontakttrigger nutzen',
        text: 'Klare Öffnungszeiten reduzieren Unsicherheit und erhöhen die Chance auf direkte Kontaktaufnahme.',
        recommendation: 'Öffnungszeiten, Sonderzeiten und Feiertage vollständig pflegen.'
      })
    }
    if (item.key === 'review_funnel') {
      chances.push({
        title: 'Bewertungsstrategie etablieren',
        text: 'Ein einfacher Review-Funnel macht aus zufriedenen Kunden sichtbar mehr öffentliches Vertrauen.',
        recommendation: 'Bewertungslink, QR-Karte und kurze Bitte im Kundenprozess kombinieren.'
      })
    }
  }

  while (chances.length < 3) {
    chances.push({
      title: 'Google-Profil konsequent pflegen',
      text: `Für ${data.clientName || 'den Betrieb'} kann eine regelmäßige Profilpflege den ersten Eindruck und die lokale Sichtbarkeit verbessern.`,
      recommendation: 'Monatliche Kurzprüfung der wichtigsten Google-Signale einführen.'
    })
  }

  return chances.slice(0, 3)
}

function buildMeasures(items: MiniAuditQuickCheckItem[]): MiniAuditMeasure[] {
  const byKey = new Map(items.map((item) => [item.key, item]))
  const measures: MiniAuditMeasure[] = []

  if (byKey.get('rating')?.status !== 'stark' || byKey.get('review_count')?.status !== 'stark') {
    measures.push({ title: 'Bewertungslink/QR-Bewertungskarte einrichten', effort: 'gering', impact: 'hoch' })
  }
  if (byKey.get('review_activity')?.status !== 'stark') {
    measures.push({ title: 'Review-Monitoring und Monatsziel festlegen', effort: 'gering', impact: 'mittel bis hoch' })
  }
  if (byKey.get('photos')?.status !== 'stark') {
    measures.push({ title: '10–15 aktuelle Bilder im Profil ergänzen', effort: 'mittel', impact: 'hoch' })
  }
  if (byKey.get('profile')?.status !== 'stark') {
    measures.push({ title: 'Kategorie, Kontaktdaten und Profilbeschreibung prüfen', effort: 'gering', impact: 'mittel' })
  }
  if (byKey.get('opening_hours')?.status !== 'stark') {
    measures.push({ title: 'Öffnungszeiten und Sonderzeiten vollständig pflegen', effort: 'gering', impact: 'hoch' })
  }

  measures.push({ title: 'Google-Profil monatlich auf Aktualität prüfen', effort: 'gering', impact: 'mittel' })
  measures.push({ title: 'Top-3 Wettbewerber als Vergleichsbasis erfassen', effort: 'mittel', impact: 'mittel bis hoch' })

  return measures.slice(0, 6)
}

function overallSummary(status: MiniAuditStatus, data: GooglePlacePublicData, score: number) {
  const name = data.clientName || 'Das Profil'
  if (status === 'stark') return `${name} wirkt öffentlich bereits solide aufgestellt. Der nächste Hebel liegt in konsequenter Pflege und gezielter Bewertungsgewinnung.`
  if (status === 'bedingt') return `${name} hat eine erkennbare Google-Basis, aber mehrere sichtbare Signale können noch professioneller wirken.`
  return `${name} verschenkt öffentlich sichtbares Google-Vertrauen. Bewertungen, Profilqualität und Aktualität sollten priorisiert werden.`
}

function cleanBranch(data: GooglePlacePublicData) {
  if (data.branch) return data.branch
  const firstType = data.categories?.[0]
  if (!firstType) return DEFAULT_BRANCH
  return firstType.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export function analyzeGoogleMiniAudit(data: GooglePlacePublicData): MiniAuditResult {
  const rating = safeNumber(data.rating)
  const reviewCount = safeNumber(data.reviewCount)
  const photosCount = safeNumber(data.photosCount)
  const openingHoursAvailable = Boolean(data.openingHoursAvailable)
  const websiteAvailable = Boolean(data.website)
  const phoneAvailable = Boolean(data.phone)
  const categoriesAvailable = Boolean(data.categories?.length || data.branch)

  const ratingStatus = statusFromRating(rating)
  const reviewCountStatus = statusFromReviewCount(reviewCount)
  const reviewActivityStatus = statusFromReviewActivity(data)
  const photosStatus = statusFromPhotos(photosCount)
  const profileStatus = statusFromProfileCompleteness(data)
  const openingHoursStatus: MiniAuditStatus = openingHoursAvailable ? 'stark' : 'kritisch'
  const reviewFunnelStatus = statusFromReviewFunnel(rating, reviewCount)

  const quickCheck: MiniAuditQuickCheckItem[] = [
    { key: 'rating', area: 'Google-Bewertungen', status: ratingStatus, note: ratingNote(rating), source: 'google_public' },
    { key: 'review_count', area: 'Bewertungsanzahl', status: reviewCountStatus, note: reviewCountNote(reviewCount), source: 'google_public' },
    { key: 'review_activity', area: 'Review-Aktivität', status: reviewActivityStatus, note: reviewActivityStatus === 'stark' ? 'Öffentliche Review-Signale wirken aktiv und belastbar.' : 'Aktivität und Regelmäßigkeit der Bewertungen sollten verbessert werden.', source: 'google_public' },
    { key: 'photos', area: 'Fotos & erster Eindruck', status: photosStatus, note: photosNote(photosCount), source: 'google_public' },
    { key: 'profile', area: 'Profilinformationen', status: profileStatus, note: profileNote(data), source: 'google_public' },
    { key: 'opening_hours', area: 'Öffnungszeiten', status: openingHoursStatus, note: openingHoursNote(openingHoursAvailable), source: 'google_public' },
    { key: 'review_funnel', area: 'Bewertungsstrategie', status: reviewFunnelStatus, note: reviewFunnelNote(reviewFunnelStatus, reviewCount), source: 'google_public' }
  ]

  const rawScore = quickCheck.reduce((sum, item) => sum + statusScore(item.status), 0)
  const score = Math.round((rawScore / (quickCheck.length * 2)) * 100)
  const overallStatus: MiniAuditStatus = score >= 72 ? 'stark' : score >= 43 ? 'bedingt' : 'kritisch'

  return {
    auditMode: 'mini_google_only',
    clientName: data.clientName || 'Unbekannter Betrieb',
    branch: cleanBranch(data),
    location: data.location || data.address || DEFAULT_LOCATION,
    address: data.address,
    auditDate: todayDe(),
    overallStatus,
    overallSummary: overallSummary(overallStatus, data, score),
    publicSignals: {
      rating,
      reviewCount,
      photosCount,
      openingHoursAvailable,
      websiteAvailable,
      phoneAvailable,
      categoriesAvailable
    },
    quickCheck,
    chances: buildChances(quickCheck, data),
    measures: buildMeasures(quickCheck),
    potential: [
      'Mehr Vertrauen bei Neukunden',
      'Besserer erster Eindruck in Google Maps',
      'Mehr direkte Anfragen über öffentliche Google-Signale',
      'Strukturierte Bewertungsgewinnung ohne MMOS-Datenbasis'
    ],
    nextStepCta: 'Kostenloser 10-Minuten-Check: Wir zeigen Ihnen kurz, welche 3 öffentlichen Google-Signale zuerst verbessert werden sollten.',
    score
  }
}

export function mapGooglePlaceApiResponse(place: any): GooglePlacePublicData {
  const displayName = typeof place?.displayName === 'string' ? place.displayName : place?.displayName?.text
  const address = place?.formattedAddress || place?.formatted_address || ''
  const city = extractCity(address)
  const reviews = Array.isArray(place?.reviews)
    ? place.reviews.map((review: any) => ({
        rating: safeNumber(review?.rating) ?? undefined,
        text: review?.text?.text || review?.originalText?.text || '',
        relativeTime: review?.relativePublishTimeDescription || '',
        author: review?.authorAttribution?.displayName || ''
      }))
    : []

  return {
    placeId: place?.id || place?.place_id || place?.name,
    clientName: displayName || place?.name || 'Unbekannter Betrieb',
    branch: guessBranch(place?.types || [place?.primaryType].filter(Boolean)),
    location: city || address,
    address,
    rating: safeNumber(place?.rating) ?? undefined,
    reviewCount: safeNumber(place?.userRatingCount || place?.user_ratings_total) ?? undefined,
    photosCount: Array.isArray(place?.photos) ? place.photos.length : safeNumber(place?.photosCount) ?? undefined,
    website: place?.websiteUri || place?.website || '',
    phone: place?.nationalPhoneNumber || place?.formatted_phone_number || '',
    businessStatus: place?.businessStatus || place?.business_status || '',
    categories: (place?.types || [place?.primaryType].filter(Boolean) || []).filter(Boolean),
    openingHoursAvailable: Boolean(place?.regularOpeningHours || place?.currentOpeningHours || place?.opening_hours),
    reviews,
    raw: place
  }
}

function extractCity(address: string) {
  const parts = String(address || '').split(',').map((part) => part.trim()).filter(Boolean)
  const candidate = parts.find((part) => /\b\d{5}\b/.test(part)) || parts.at(-2) || ''
  return candidate.replace(/^\d{5}\s*/, '').trim()
}

function guessBranch(types: string[] = []) {
  const normalized = types.map((type) => String(type || '').toLowerCase())
  if (normalized.some((type) => type.includes('restaurant') || type.includes('cafe') || type.includes('bar') || type.includes('food'))) return 'Gastronomie'
  if (normalized.some((type) => type.includes('beauty') || type.includes('hair') || type.includes('nail') || type.includes('spa'))) return 'Beauty / Dienstleistung'
  if (normalized.some((type) => type.includes('car') || type.includes('auto') || type.includes('repair'))) return 'Kfz / Werkstatt'
  if (normalized.some((type) => type.includes('doctor') || type.includes('physio') || type.includes('health'))) return 'Gesundheit / Praxis'
  if (normalized.some((type) => type.includes('store') || type.includes('shop') || type.includes('retail'))) return 'Einzelhandel'
  return DEFAULT_BRANCH
}
