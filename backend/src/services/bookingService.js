// Booking-Engine: Verfuegbarkeits-/Slot-Berechnung + Buchungs-Anlage.
//
// Der Kern (computeSlots) ist eine REINE Funktion ohne DB/Date.now —
// damit voll unit-testbar. Alle Zeiten werden als Minuten-seit-Mitternacht
// (lokale Betriebszeit) gerechnet, das macht Overlap-Logik trivial.

const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

// 'HH:MM' -> Minuten seit Mitternacht.
function hmToMin(hm) {
  const m = String(hm || '').match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

// Minuten -> 'HH:MM'.
function minToHm(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// === REINE Slot-Berechnung ===
//
// Input:
//   businessHours: [{ open: 'HH:MM', close: 'HH:MM' }]  (kann mehrere Bloecke haben, z.B. Mittagspause)
//   busy: [{ start: minuteOfDay, end: minuteOfDay }]     bereits belegte Intervalle (inkl. Buffer)
//   serviceDuration: int (Minuten)
//   bufferAfter: int (Minuten)
//   granularity: int (Minuten, Slot-Raster)
//   earliestStartMinute: int | null  (z.B. wegen Lead-Time: heute erst ab jetzt+leadtime)
//
// Output: Array von Start-Minuten (Minute-of-day), an denen die Leistung
// vollstaendig (inkl. Buffer) Platz hat.
function computeSlots({
  businessHours = [],
  busy = [],
  serviceDuration = 30,
  bufferAfter = 0,
  granularity = 15,
  earliestStartMinute = null
}) {
  const need = serviceDuration + bufferAfter
  const slots = []
  const sortedBusy = [...busy].sort((a, b) => a.start - b.start)

  function overlapsBusy(start, end) {
    for (const b of sortedBusy) {
      if (start < b.end && end > b.start) return true
    }
    return false
  }

  for (const block of businessHours) {
    const open = hmToMin(block.open)
    const close = hmToMin(block.close)
    if (open == null || close == null || close <= open) continue
    // Erster Slot-Start auf Granularitaet aufrunden.
    let start = open
    if (earliestStartMinute != null && earliestStartMinute > start) {
      start = Math.ceil(earliestStartMinute / granularity) * granularity
    }
    // Auf Granularitaet ausrichten.
    if (start % granularity !== 0) start = Math.ceil(start / granularity) * granularity

    for (; start + serviceDuration <= close; start += granularity) {
      const slotEnd = start + need
      // Die Leistung selbst (ohne Buffer) muss bis close passen; Buffer
      // darf in die Pause/After-Hours ragen.
      if (start + serviceDuration > close) break
      if (overlapsBusy(start, slotEnd)) continue
      slots.push(start)
    }
  }
  // Duplikate (ueberlappende Bloecke) entfernen + sortieren.
  return Array.from(new Set(slots)).sort((a, b) => a - b)
}

// === DB-gestuetzte Verfuegbarkeit ===

async function resolveCustomerBySlug(supabase, slug) {
  // Erst booking_settings.booking_slug, dann qr_campaigns.slug als Fallback.
  const { data: bs } = await supabase
    .from('booking_settings').select('customer_id, slot_granularity_minutes, min_lead_time_hours, max_advance_days, active')
    .eq('booking_slug', slug).maybeSingle()
  if (bs?.customer_id) return { customer_id: bs.customer_id, settings: bs }
  const { data: qr } = await supabase
    .from('qr_campaigns').select('customer_id').eq('slug', slug).maybeSingle()
  if (qr?.customer_id) return { customer_id: qr.customer_id, settings: null }
  return null
}

async function loadSettings(supabase, customer_id, fallback) {
  if (fallback) return fallback
  const { data } = await supabase
    .from('booking_settings').select('*').eq('customer_id', customer_id).maybeSingle()
  return data || {
    slot_granularity_minutes: 15, min_lead_time_hours: 2, max_advance_days: 60,
    timezone: 'Europe/Berlin', confirmation_mode: 'auto'
  }
}

async function listServices({ customer_id }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase nicht konfiguriert')
  const { data, error } = await supabase
    .from('booking_services').select('*').eq('customer_id', customer_id).eq('active', true)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data || []
}

// Liefert verfuegbare Slots fuer (customer, service, date).
// date: 'YYYY-MM-DD' in lokaler Betriebszeit.
async function getAvailability({ customer_id, service_id, date, resource_id = null, now = new Date() }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }

  const { data: service } = await supabase
    .from('booking_services').select('*').eq('id', service_id).eq('customer_id', customer_id).maybeSingle()
  if (!service) { const e = new Error('Leistung nicht gefunden'); e.status = 404; throw e }

  const settings = await loadSettings(supabase, customer_id)
  const granularity = Number(settings.slot_granularity_minutes || 15)
  const leadHours = Number(settings.min_lead_time_hours || 2)
  const maxAdvanceDays = Number(settings.max_advance_days || 60)

  const day = new Date(`${date}T00:00:00`)
  if (isNaN(day.getTime())) { const e = new Error('Ungueltiges Datum'); e.status = 400; throw e }

  // Max-Advance-Pruefung.
  const maxDate = new Date(now.getTime() + maxAdvanceDays * 86_400_000)
  if (day > maxDate) return { date, slots: [], reason: 'beyond_max_advance' }

  const weekday = day.getDay()

  // Welche Ressourcen koennen die Leistung?
  let resourceIds = []
  if (resource_id) {
    resourceIds = [resource_id]
  } else {
    const { data: rs } = await supabase
      .from('booking_resource_services').select('resource_id').eq('service_id', service_id)
    resourceIds = (rs || []).map((r) => r.resource_id)
  }

  // Business-Hours fuer den Wochentag: betriebsweit (resource_id null) ODER
  // pro Ressource. Wenn keine Ressourcen-Hours existieren, gilt der
  // Betriebs-Default.
  const { data: hours } = await supabase
    .from('booking_business_hours').select('resource_id, open_time, close_time')
    .eq('customer_id', customer_id).eq('weekday', weekday)
  const generalHours = (hours || []).filter((h) => !h.resource_id).map((h) => ({ open: h.open_time, close: h.close_time }))

  // Bestehende Termine an dem Tag (fuer Overlap).
  const dayStart = new Date(`${date}T00:00:00`).toISOString()
  const dayEnd = new Date(`${date}T23:59:59`).toISOString()
  let apptQuery = supabase
    .from('appointments').select('start_time, end_time, resource_id, status')
    .eq('customer_id', customer_id).gte('start_time', dayStart).lte('start_time', dayEnd)
    .neq('status', 'cancelled')
  const { data: appts } = await apptQuery

  // Blackouts.
  const { data: blackouts } = await supabase
    .from('booking_blackouts').select('start_at, end_at, resource_id')
    .eq('customer_id', customer_id).lte('start_at', dayEnd).gte('end_at', dayStart)

  // Lead-Time: wenn date == heute, frueester Start = jetzt + leadHours.
  const isToday = day.toDateString() === now.toDateString()
  const earliestStartMinute = isToday
    ? (now.getHours() * 60 + now.getMinutes()) + leadHours * 60
    : null

  // Pro Ressource die freien Slots berechnen, dann Union bilden.
  const allSlots = new Set()
  const perResource = {}

  for (const rid of resourceIds.length ? resourceIds : [null]) {
    // Hours fuer diese Ressource (oder Betriebs-Default).
    const resHours = (hours || []).filter((h) => h.resource_id === rid).map((h) => ({ open: h.open_time, close: h.close_time }))
    const effectiveHours = resHours.length ? resHours : generalHours
    if (effectiveHours.length === 0) continue

    // Belegte Intervalle dieser Ressource (Minuten-of-day).
    const busy = []
    for (const a of appts || []) {
      if (rid && a.resource_id && a.resource_id !== rid) continue
      const s = new Date(a.start_time)
      const e = a.end_time ? new Date(a.end_time) : new Date(s.getTime() + 30 * 60000)
      busy.push({ start: s.getHours() * 60 + s.getMinutes(), end: e.getHours() * 60 + e.getMinutes() })
    }
    for (const b of blackouts || []) {
      if (rid && b.resource_id && b.resource_id !== rid) continue
      const s = new Date(b.start_at); const e = new Date(b.end_at)
      // Nur der Teil am betrachteten Tag.
      const sMin = s.toDateString() === day.toDateString() ? s.getHours() * 60 + s.getMinutes() : 0
      const eMin = e.toDateString() === day.toDateString() ? e.getHours() * 60 + e.getMinutes() : 24 * 60
      busy.push({ start: sMin, end: eMin })
    }

    const slots = computeSlots({
      businessHours: effectiveHours,
      busy,
      serviceDuration: Number(service.duration_minutes || 30),
      bufferAfter: Number(service.buffer_after_minutes || 0),
      granularity,
      earliestStartMinute
    })
    perResource[rid || 'any'] = slots.map(minToHm)
    for (const s of slots) allSlots.add(s)
  }

  return {
    date,
    service: { id: service.id, name: service.name, duration_minutes: service.duration_minutes, price_eur: service.price_eur },
    slots: Array.from(allSlots).sort((a, b) => a - b).map(minToHm),
    per_resource: perResource,
    granularity
  }
}

// Buchung anlegen (Public, vom Widget aufgerufen).
async function createBooking({ customer_id, service_id, resource_id = null, date, time, contact, now = new Date() }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }
  if (!service_id || !date || !time) { const e = new Error('service_id, date und time sind Pflicht'); e.status = 400; throw e }
  const email = String(contact?.email || '').trim().toLowerCase()
  if (!email || !email.includes('@')) { const e = new Error('Gueltige E-Mail erforderlich'); e.status = 400; throw e }

  const { data: service } = await supabase
    .from('booking_services').select('*').eq('id', service_id).eq('customer_id', customer_id).maybeSingle()
  if (!service) { const e = new Error('Leistung nicht gefunden'); e.status = 404; throw e }

  // Re-Check: ist der Slot noch frei? (Race-Schutz)
  const avail = await getAvailability({ customer_id, service_id, date, resource_id, now })
  if (!avail.slots.includes(time)) {
    const e = new Error('Dieser Slot ist nicht mehr verfuegbar'); e.status = 409; e.code = 'SLOT_TAKEN'; throw e
  }

  const startMin = hmToMin(time)
  const start = new Date(`${date}T${minToHm(startMin)}:00`)
  const end = new Date(start.getTime() + Number(service.duration_minutes || 30) * 60000)

  const settings = await loadSettings(supabase, customer_id)
  const confirmation = settings.confirmation_mode === 'manual' ? 'pending' : 'confirmed'

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      customer_id,
      service_id,
      resource_id: resource_id || null,
      title: service.name,
      price: service.price_eur,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      contact_email: email,
      contact_name: contact?.name || null,
      contact_phone: contact?.phone || null,
      status: confirmation === 'pending' ? 'pending' : 'scheduled',
      confirmation_status: confirmation,
      booking_source: 'online_widget'
    })
    .select('id, start_time, end_time, status, confirmation_status')
    .maybeSingle()
  if (error) throw error

  // Timeline-Event fuer Cross-Modul (No-Show-Score, Automation).
  try {
    await supabase.from('customer_timeline_events').insert({
      customer_id, event_type: 'online_booking_created',
      title: `Online-Buchung: ${service.name}`,
      description: `${contact?.name || email} hat ${service.name} fuer ${date} ${time} gebucht.`,
      source_module: 'booking', source_id: data?.id, severity: 'success',
      metadata: { service_id, date, time, confirmation }
    })
  } catch (_) {}

  return { booking: data, confirmation }
}

module.exports = {
  computeSlots,
  getAvailability,
  createBooking,
  listServices,
  resolveCustomerBySlug,
  // Test-Helpers:
  _hmToMin: hmToMin,
  _minToHm: minToHm
}
