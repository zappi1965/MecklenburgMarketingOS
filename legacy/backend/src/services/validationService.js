// Adress-/E-Mail-Validierung + Geokodierung.
//
// E-Mail:
//   - Syntax-Check
//   - DNS MX-Lookup
//   - Wegwerf-Domain-Blocklist (public.disposable_email_domains)
//
// Adresse:
//   - DE-PLZ-Plausibilitaet (5 Ziffern)
//   - Optional: Stadt-Validierung gegen zippopotam.us (kostenfrei, EU)
//
// Geokodierung:
//   - Default: Nominatim (OpenStreetMap, DSGVO-konform, EU-Hosting moeglich)
//   - Alternativ: Google Geocoding via GOOGLE_GEOCODING_KEY
//   - Auswahl via ENV GEOCODER_PROVIDER

const dns = require('dns/promises')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

const EMAIL_RE = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const ZIPPOPOTAM_BASE = 'https://api.zippopotam.us'

function emailDomain(email) {
  const m = String(email || '').match(EMAIL_RE)
  return m ? m[1].toLowerCase() : null
}

async function isDisposable(domain) {
  if (!domain) return false
  const supabase = getSupabaseAdmin()
  if (!supabase) return false
  try {
    const { data } = await supabase
      .from('disposable_email_domains')
      .select('domain')
      .eq('domain', domain)
      .maybeSingle()
    return Boolean(data)
  } catch (_) {
    return false
  }
}

async function hasMx(domain) {
  if (!domain) return false
  try {
    const records = await dns.resolveMx(domain)
    return Array.isArray(records) && records.length > 0
  } catch (_) {
    return false
  }
}

async function validateEmail(email) {
  const trimmed = String(email || '').trim().toLowerCase()
  if (!EMAIL_RE.test(trimmed)) return { ok: false, reason: 'syntax_invalid' }
  const domain = emailDomain(trimmed)
  if (await isDisposable(domain)) return { ok: false, reason: 'disposable_domain', domain }
  const mxOk = await hasMx(domain)
  if (!mxOk) return { ok: false, reason: 'no_mx_record', domain }
  return { ok: true, email: trimmed, domain }
}

async function validateDePostal({ postal_code, city }) {
  const norm = String(postal_code || '').trim()
  if (!/^[0-9]{5}$/.test(norm)) return { ok: false, reason: 'plz_invalid' }
  if (!city) return { ok: true, postal_code: norm, city_validated: false }
  try {
    const res = await fetch(`${ZIPPOPOTAM_BASE}/de/${norm}`, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return { ok: true, postal_code: norm, city_validated: false, city_lookup: 'fetch_failed' }
    const payload = await res.json()
    const cities = (payload.places || []).map((p) => String(p['place name'] || '').toLowerCase())
    const matched = cities.some((c) => c.includes(String(city).toLowerCase()) || String(city).toLowerCase().includes(c))
    return { ok: true, postal_code: norm, city, city_validated: matched, cities_seen: payload.places?.length || 0 }
  } catch (_) {
    return { ok: true, postal_code: norm, city, city_validated: false, city_lookup: 'unreachable' }
  }
}

async function geocodeNominatim({ address, postal_code, city, country = 'Deutschland' }) {
  const q = [address, postal_code, city, country].filter(Boolean).join(', ')
  if (!q.trim()) return { ok: false, reason: 'empty_query' }
  try {
    const url = `${NOMINATIM_BASE}/search?format=json&limit=1&countrycodes=de&q=${encodeURIComponent(q)}`
    const res = await fetch(url, {
      headers: { 'user-agent': process.env.NOMINATIM_USER_AGENT || 'MMOS-Backend/1.0' },
      signal: AbortSignal.timeout(6000)
    })
    if (!res.ok) return { ok: false, reason: 'nominatim_http', status: res.status }
    const arr = await res.json()
    if (!Array.isArray(arr) || arr.length === 0) return { ok: false, reason: 'no_match' }
    const hit = arr[0]
    return {
      ok: true,
      lat: Number(hit.lat),
      lng: Number(hit.lon),
      display_name: hit.display_name,
      provider: 'nominatim'
    }
  } catch (e) {
    return { ok: false, reason: 'nominatim_error', message: e?.message || String(e) }
  }
}

async function geocodeGoogle({ address, postal_code, city, country = 'Deutschland' }) {
  const key = process.env.GOOGLE_GEOCODING_KEY
  if (!key) return { ok: false, reason: 'google_key_missing' }
  const q = [address, postal_code, city, country].filter(Boolean).join(', ')
  if (!q.trim()) return { ok: false, reason: 'empty_query' }
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?key=${encodeURIComponent(key)}&address=${encodeURIComponent(q)}&region=de`
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return { ok: false, reason: 'google_http', status: res.status }
    const payload = await res.json()
    const hit = payload?.results?.[0]
    if (!hit) return { ok: false, reason: 'no_match' }
    return {
      ok: true,
      lat: Number(hit.geometry?.location?.lat),
      lng: Number(hit.geometry?.location?.lng),
      display_name: hit.formatted_address,
      provider: 'google'
    }
  } catch (e) {
    return { ok: false, reason: 'google_error', message: e?.message || String(e) }
  }
}

async function geocode(input) {
  const p = String(process.env.GEOCODER_PROVIDER || 'nominatim').toLowerCase()
  if (p === 'google') {
    const r = await geocodeGoogle(input)
    if (r.ok) return r
    // Fallback auf Nominatim, wenn Google keinen Treffer hat.
  }
  return geocodeNominatim(input)
}

// Komplett-Validierung fuer einen Customer-Datensatz. Schreibt Felder
// geo_lat / geo_lng / address_quality_score / address_validated_at sowie
// email_verified zurueck.
async function validateAndStoreCustomer(customer_id) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }
  const { data: customer, error } = await supabase
    .from('customers')
    .select('id, email, address, postal_code, city, country_code')
    .eq('id', customer_id)
    .maybeSingle()
  if (error) throw error
  if (!customer) { const e = new Error('Kunde nicht gefunden'); e.status = 404; throw e }

  let score = 0
  const updates = { address_validated_at: new Date().toISOString() }

  // E-Mail
  if (customer.email) {
    const r = await validateEmail(customer.email)
    if (r.ok) { score += 25; updates.email_verified = true; updates.email_verified_at = new Date().toISOString() }
    else updates.email_verified = false
  }

  // PLZ + Stadt
  if (customer.postal_code) {
    const r = await validateDePostal({ postal_code: customer.postal_code, city: customer.city })
    if (r.ok && r.city_validated) score += 25
    else if (r.ok) score += 15
  }

  // Geokodierung
  if (customer.address || customer.postal_code) {
    const r = await geocode({
      address: customer.address,
      postal_code: customer.postal_code,
      city: customer.city,
      country: customer.country_code || 'Deutschland'
    })
    if (r.ok) {
      updates.geo_lat = r.lat
      updates.geo_lng = r.lng
      score += 50
    }
  }

  updates.address_quality_score = Math.min(100, score)
  await supabase.from('customers').update(updates).eq('id', customer_id)
  return { customer_id, ...updates }
}

module.exports = {
  validateEmail,
  validateDePostal,
  geocode,
  geocodeNominatim,
  geocodeGoogle,
  validateAndStoreCustomer,
  // Test helpers:
  _emailDomain: emailDomain,
  EMAIL_RE
}
