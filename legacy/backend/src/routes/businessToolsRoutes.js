const express = require('express')
const GotenbergService = require('../services/gotenbergService')
const { enforceApiBudget, recordApiUsageEvent } = require('../services/apiCostControlService')

const placesCache = new Map()
const usageWindow = new Map()
const CACHE_TTL_MS = Number(process.env.GOOGLE_PLACES_CACHE_TTL_MS || 6 * 60 * 60 * 1000)
const MAX_SEARCHES_PER_HOUR = Number(process.env.GOOGLE_PLACES_MAX_SEARCHES_PER_HOUR || 60)

function rateKey(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  return forwarded || req.ip || 'local'
}
function checkRate(req) {
  const key = rateKey(req)
  const now = Date.now()
  const slot = usageWindow.get(key) || { start: now, count: 0 }
  if (now - slot.start > 60 * 60 * 1000) { slot.start = now; slot.count = 0 }
  slot.count += 1
  usageWindow.set(key, slot)
  return { ok: slot.count <= MAX_SEARCHES_PER_HOUR, count: slot.count, limit: MAX_SEARCHES_PER_HOUR }
}

function safeFilename(value = 'document') {
  return String(value || 'document')
    .replace(/\.pdf$/i, '')
    .replace(/[^a-z0-9äöüß_-]+/gi, '_')
    .replace(/^_+|_+$/g, '') || 'document'
}

function validateInput(input = {}, fields = []) {
  const missing = fields.filter((field) => !String(input[field] || '').trim())
  return { ok: missing.length === 0, missing }
}

function classifyGooglePlacesError(payload = {}, httpStatus = 502) {
  const status = payload.status || String(httpStatus)
  const message = String(payload.error_message || `Google Places Fehler: ${status}`)
  const err = new Error(message)
  err.status = status === 'OVER_QUERY_LIMIT' ? 429 : 502
  err.google_status = status
  err.provider = 'google_places'
  if (/referer|referrer/i.test(message)) {
    err.code = 'GOOGLE_PLACES_KEY_RESTRICTION_INVALID'
    err.hint = 'Der Railway-Backend-Key darf keine Website-/HTTP-Referrer-Restriktion haben. Nutze für GOOGLE_PLACES_API_KEY einen serverseitigen Google Maps API-Key mit API-Restriktion auf Places API.'
  } else if (status === 'REQUEST_DENIED') {
    err.code = 'GOOGLE_PLACES_REQUEST_DENIED'
    err.hint = 'Prüfe Billing, API-Restriktionen und Places API im Google Cloud Projekt.'
  } else if (status === 'OVER_QUERY_LIMIT') {
    err.code = 'GOOGLE_PLACES_OVER_QUERY_LIMIT'
    err.hint = 'Google Places Quota oder Tagesbudget erreicht.'
  } else if (status === 'INVALID_REQUEST') {
    err.code = 'GOOGLE_PLACES_INVALID_REQUEST'
    err.hint = 'Prüfe Suchbegriff, Ort und Query-Parameter.'
  } else {
    err.code = 'GOOGLE_PLACES_API_ERROR'
    err.hint = 'Prüfe GOOGLE_PLACES_API_KEY, API-Restriktionen, Billing und Google Cloud Fehlerdetails.'
  }
  return err
}

function scoreFromBusiness(input = {}) {
  let score = 58
  if (input.website) score += 9
  if (input.google_url) score += 9
  if (input.branch) score += 4
  if (Number(input.reviews || 0) > 50) score += 7
  if (Number(input.rating || 0) >= 4.5) score += 7
  return Math.max(20, Math.min(96, score))
}

async function googlePlacesTextSearch(query, apiKey, options = {}) {
  const cacheKey = `places:${query}`
  const cached = placesCache.get(cacheKey)
  if (cached && Date.now() - cached.created_at < CACHE_TTL_MS) {
    return { results: cached.results, source: 'google_places_cache' }
  }
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
  url.searchParams.set('query', query)
  url.searchParams.set('key', apiKey)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), Number(options.timeout_ms || 12000))
  let res
  try {
    res = await fetch(url.toString(), { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
  const payload = await res.json().catch(() => ({}))
  if (!res.ok || ['REQUEST_DENIED', 'OVER_QUERY_LIMIT', 'INVALID_REQUEST'].includes(payload.status)) {
    throw classifyGooglePlacesError(payload, res.status)
  }
  const results = payload.results || []
  placesCache.set(cacheKey, { created_at: Date.now(), results })
  return { results, source: 'google_places' }
}

module.exports = function businessToolsRoutes(supabaseAdmin) {
  const router = express.Router()
  const gotenberg = new GotenbergService(supabaseAdmin)

  router.get('/health', async (req, res) => {
    const hasPlaces = Boolean(process.env.GOOGLE_PLACES_API_KEY)
    const gotenbergHealth = await gotenberg.health()
    res.json({
      ok: true,
      service: 'MMOS Business Tools',
      google_places: hasPlaces,
      gotenberg: gotenbergHealth.connected,
      gotenberg_configured: gotenbergHealth.configured,
      gotenberg_status: gotenbergHealth,
      mode: hasPlaces ? 'live_google_places' : 'live_google_places_required',
      timestamp: new Date().toISOString(),
      features: ['google_business_audit','lead_search','acquisition_campaign_center','data_integrity','places_cache','places_rate_limit','gotenberg_pdf_render','api_cost_control'],
      rate_limit: { max_searches_per_hour: MAX_SEARCHES_PER_HOUR },
      cache: { entries: placesCache.size, ttl_ms: CACHE_TTL_MS }
    })
  })

  router.post('/google-business-audit', async (req, res, next) => {
    try {
      const input = req.body || {}
      const valid = validateInput(input, ['business_name', 'city'])
      if (!valid.ok && !process.env.GOOGLE_PLACES_API_KEY) {
        return res.status(400).json({ ok: false, code: 'VALIDATION_ERROR', error: 'Für einen Audit werden mindestens Firmenname und Ort benötigt.', missing: valid.missing })
      }
      const rate = checkRate(req)
      if (!rate.ok) return res.status(429).json({ ok: false, code: 'GOOGLE_PLACES_RATE_LIMIT', error: 'Zu viele Google-Places-Abfragen in diesem Zeitraum.', rate })
      const apiKey = process.env.GOOGLE_PLACES_API_KEY
      let places = []
      let source = apiKey ? 'google_places' : 'manual_input'
      if (apiKey && (input.business_name || input.city)) {
        await enforceApiBudget({ supabase: supabaseAdmin, provider: 'google_places', feature: 'google_places_text_search', actor_user_id: req.user?.id, customer_id: input.customer_id, estimated_cost_cents: Number(process.env.GOOGLE_PLACES_TEXT_SEARCH_ESTIMATED_CENTS || 3) })
        const query = `${input.business_name || ''} ${input.city || ''}`.trim()
        const lookup = await googlePlacesTextSearch(query, apiKey)
        await recordApiUsageEvent(supabaseAdmin, { provider: 'google_places', feature: 'google_business_audit', endpoint: '/api/business-tools/google-business-audit', actor_user_id: req.user?.id, customer_id: input.customer_id, estimated_cost_cents: Number(process.env.GOOGLE_PLACES_TEXT_SEARCH_ESTIMATED_CENTS || 3), success: true, metadata: { query } })
        places = lookup.results
        source = lookup.source
      }
      const place = places[0] || {}
      const merged = {
        ...input,
        rating: input.rating || place.rating || 0,
        reviews: input.reviews || place.user_ratings_total || 0,
        website: input.website || '',
        google_url: input.google_url || (place.place_id ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}` : '')
      }
      const score = scoreFromBusiness(merged)
      const findings = [
        merged.website ? 'Website ist vorhanden – Landingpage und lokale SEO prüfen.' : 'Keine Website erkannt – Slug-/Landingpage oder Website-Angebot prüfen.',
        Number(merged.reviews || 0) >= 50 ? 'Bewertungsbasis vorhanden – Antwortquote und neue Bewertungen sichern.' : 'Bewertungsanzahl niedrig – Review-Kampagne empfehlen.',
        Number(merged.rating || 0) >= 4.5 ? 'Gute Sternebewertung – als Vertrauenssignal stärker nutzen.' : 'Sternebewertung bietet Optimierungspotenzial.',
        'Leistungen, Kategorien, Fotos, Beiträge und Öffnungszeiten regelmäßig prüfen.'
      ]
      res.json({ ok: true, source, rate, audit: { score, summary: `Google Business Audit für ${input.business_name || place.name || 'Betrieb'} mit ${score}/100 Punkten.`, findings, place } })
    } catch (error) {
      next(error)
    }
  })

  router.post('/lead-search', async (req, res, next) => {
    try {
      const input = req.body || {}
      const valid = validateInput(input, ['branch', 'city'])
      if (!valid.ok) return res.status(400).json({ ok: false, code: 'VALIDATION_ERROR', error: 'Für die Lead-Suche werden Branche und Ort benötigt.', missing: valid.missing })
      const rate = checkRate(req)
      if (!rate.ok) return res.status(429).json({ ok: false, code: 'GOOGLE_PLACES_RATE_LIMIT', error: 'Zu viele Google-Places-Abfragen in diesem Zeitraum.', rate })
      const apiKey = process.env.GOOGLE_PLACES_API_KEY
      if (!apiKey) return res.status(503).json({ ok: false, source: 'google_places_required', code: 'GOOGLE_PLACES_API_KEY_MISSING', error: 'Lead-Suche benötigt Live-Daten über GOOGLE_PLACES_API_KEY.', rate, leads: [] })
      await enforceApiBudget({ supabase: supabaseAdmin, provider: 'google_places', feature: 'google_places_text_search', actor_user_id: req.user?.id, customer_id: input.customer_id, estimated_cost_cents: Number(process.env.GOOGLE_PLACES_TEXT_SEARCH_ESTIMATED_CENTS || 3) })
      const lookup = await googlePlacesTextSearch(`${input.branch || 'Betrieb'} in ${input.city || 'Schwerin'}`, apiKey)
      await recordApiUsageEvent(supabaseAdmin, { provider: 'google_places', feature: 'lead_search', endpoint: '/api/business-tools/lead-search', actor_user_id: req.user?.id, customer_id: input.customer_id, estimated_cost_cents: Number(process.env.GOOGLE_PLACES_TEXT_SEARCH_ESTIMATED_CENTS || 3), success: true, metadata: { branch: input.branch, city: input.city } })
      const results = lookup.results
      const maxReviews = Number(input.max_reviews || 99999)
      const minRating = Number(input.min_rating || 0)
      const leads = results.map((p) => ({
        name: p.name,
        branch: input.branch || (p.types || []).slice(0, 2).join(', '),
        city: input.city || '',
        rating: p.rating || 0,
        reviews: p.user_ratings_total || 0,
        website: '',
        score: Math.max(35, Math.min(95, 92 - Math.min(p.user_ratings_total || 0, 200) / 4 + ((p.rating || 0) < 4.2 ? 8 : 0))),
        google_url: p.place_id ? `https://www.google.com/maps/place/?q=place_id:${p.place_id}` : '',
        reasons: ['Google Places Treffer', (p.user_ratings_total || 0) < 80 ? 'wenige Bewertungen' : 'starke Konkurrenz / Benchmark', 'Audit empfohlen'],
        source: 'google_places'
      })).filter((p) => p.reviews <= maxReviews && p.rating >= minRating)
      res.json({ ok: true, source: lookup.source, rate, cache_entries: placesCache.size, leads })
    } catch (error) {
      next(error)
    }
  })

  router.post('/render-pdf', async (req, res, next) => {
    try {
      const html = String(req.body?.html || '')
      const filename = `${safeFilename(req.body?.filename || req.body?.title || 'mmos-dokument')}.pdf`
      if (!html.trim()) return res.status(400).json({ ok: false, code: 'VALIDATION_ERROR', error: 'HTML-Inhalt fehlt. PDF kann nicht erzeugt werden.' })
      await enforceApiBudget({ supabase: supabaseAdmin, provider: 'gotenberg', feature: 'gotenberg_render_pdf', actor_user_id: req.user?.id, customer_id: req.body?.customer_id, estimated_cost_cents: Number(process.env.GOTENBERG_RENDER_PDF_ESTIMATED_CENTS || 1) })
      const pdf = await gotenberg.convertHtmlToPdf(html, filename)
      await recordApiUsageEvent(supabaseAdmin, { provider: 'gotenberg', feature: 'render_pdf', endpoint: '/api/business-tools/render-pdf', actor_user_id: req.user?.id, customer_id: req.body?.customer_id, estimated_cost_cents: Number(process.env.GOTENBERG_RENDER_PDF_ESTIMATED_CENTS || 1), success: true, metadata: { filename } })
      if (pdf?.dryRun) return res.status(503).json({ ok: false, code: 'GOTENBERG_NOT_CONFIGURED', error: pdf.note, hint: 'Setze GOTENBERG_URL in Railway oder nutze die HTML-/Druckansicht.' })
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
      res.setHeader('Cache-Control', 'no-store')
      res.send(pdf)
    } catch (error) {
      next(error)
    }
  })

  router.post('/data-integrity-check', async (req, res) => {
    const payload = req.body || {}
    const tables = payload.tables || {}
    const issues = []
    const leads = Array.isArray(tables.prospect_leads) ? tables.prospect_leads : []
    const leadIds = new Set(leads.filter((l) => l.status !== 'Archiviert').map((l) => l.id))
    const campaigns = Array.isArray(tables.acquisition_campaigns) ? tables.acquisition_campaigns : []
    for (const campaign of campaigns) {
      const ids = Array.isArray(campaign.lead_ids) ? campaign.lead_ids : []
      const unique = [...new Set(ids)]
      const missing = unique.filter((id) => !leadIds.has(id))
      if (!campaign.name || !campaign.branch || !campaign.city) issues.push({ table: 'acquisition_campaigns', id: campaign.id, level: 'warning', message: 'Kampagne hat fehlende Pflichtfelder.' })
      if (missing.length) issues.push({ table: 'acquisition_campaigns', id: campaign.id, level: 'warning', message: `Verwaiste Lead-Verknüpfungen: ${missing.join(', ')}` })
      if (ids.length !== unique.length) issues.push({ table: 'acquisition_campaigns', id: campaign.id, level: 'info', message: 'Doppelte Lead-Verknüpfungen gefunden.' })
    }
    res.json({ ok: true, issues, checked_at: new Date().toISOString() })
  })

  return router
}
