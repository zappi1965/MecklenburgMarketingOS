import { NextResponse } from 'next/server'
import { analyzeGoogleMiniAudit, mapGooglePlaceApiResponse } from '@/lib/mini-audit/googleDataAnalyzer'

export const runtime = 'nodejs'

type LookupBody = {
  query?: string
  placeId?: string
}

const FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'types',
  'primaryType',
  'rating',
  'userRatingCount',
  'websiteUri',
  'nationalPhoneNumber',
  'regularOpeningHours',
  'currentOpeningHours',
  'photos',
  'reviews',
  'businessStatus'
].join(',')

function googleApiKey() {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
}

async function fetchPlaceDetails(placeId: string, key: string) {
  const normalized = placeId.startsWith('places/') ? placeId.slice('places/'.length) : placeId
  const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(normalized)}?languageCode=de`, {
    headers: {
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': FIELD_MASK
    },
    cache: 'no-store'
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Google Place Details fehlgeschlagen (${response.status}): ${message}`)
  }

  return response.json()
}

async function searchPlace(query: string, key: string) {
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': FIELD_MASK
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: 'de',
      regionCode: 'DE',
      maxResultCount: 5
    }),
    cache: 'no-store'
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Google Text Search fehlgeschlagen (${response.status}): ${message}`)
  }

  const data = await response.json()
  const places = Array.isArray(data?.places) ? data.places : []
  if (!places.length) throw new Error('Kein passender Google-Ort gefunden.')
  return places[0]
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LookupBody
    const key = googleApiKey()

    if (!key) {
      return NextResponse.json({
        ok: false,
        error: 'GOOGLE_MAPS_API_KEY fehlt. Bitte in Vercel/Railway als Environment Variable hinterlegen. Der Mini-Audit-Generator nutzt nur öffentliche Google-Place-Daten.'
      }, { status: 500 })
    }

    if (!body.placeId && !body.query?.trim()) {
      return NextResponse.json({ ok: false, error: 'Bitte Unternehmensname/Ort oder Place ID angeben.' }, { status: 400 })
    }

    const place = body.placeId ? await fetchPlaceDetails(body.placeId, key) : await searchPlace(String(body.query || '').trim(), key)
    const googleData = mapGooglePlaceApiResponse(place)
    const audit = analyzeGoogleMiniAudit(googleData)

    return NextResponse.json({ ok: true, googleData, audit })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Mini-Audit Google Lookup fehlgeschlagen.' }, { status: 500 })
  }
}
