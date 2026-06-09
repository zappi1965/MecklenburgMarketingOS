// Predictive No-Show-Risiko.
//
// Berechnet pro Termin einen Risiko-Score basierend auf historischen
// Daten des Endkunden. Features:
//   - past_no_shows: Anzahl bereits versaeumter Termine
//   - past_completed: Anzahl wahrgenommener Termine
//   - lead_time_hours: Stunden zwischen Buchung und Termin
//   - is_weekend_morning: typische No-Show-Zeit
//   - new_customer: keine Historie -> leichtes Risiko
//
// Score 0..100. Stufen: low < 30, medium 30..59, high >= 60.
//
// reminder_strategy:
//   - low:    standard (1x 24h vorher)
//   - medium: high_touch (24h + 2h vorher)
//   - high:   confirm_required (24h + Bestaetigungs-Pflicht 4h vorher)

const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

function clamp(n, min = 0, max = 100) { return Math.max(min, Math.min(max, Number(n) || 0)) }

function strategyFor(score) {
  if (score >= 60) return 'confirm_required'
  if (score >= 30) return 'high_touch'
  return 'standard'
}

function levelFor(score) {
  if (score >= 60) return 'high'
  if (score >= 30) return 'medium'
  return 'low'
}

// Holt vergangene Termine derselben E-Mail/Phone fuer den gleichen Customer.
async function loadHistory(supabase, { customer_id, contact_email, contact_phone }) {
  if (!customer_id) return { completed: 0, noShows: 0, total: 0 }
  const filters = []
  if (contact_email) filters.push(`contact_email.eq.${contact_email}`)
  if (contact_phone) filters.push(`contact_phone.eq.${contact_phone}`)
  if (filters.length === 0) return { completed: 0, noShows: 0, total: 0 }

  const { data, error } = await supabase
    .from('appointments')
    .select('id, status')
    .eq('customer_id', customer_id)
    .or(filters.join(','))
    .limit(100)
  if (error) return { completed: 0, noShows: 0, total: 0 }
  const all = data || []
  const completed = all.filter((a) => /completed|abgeschlossen/i.test(a.status || '')).length
  const noShows = all.filter((a) => /no.?show|nicht erschienen/i.test(a.status || '')).length
  return { completed, noShows, total: all.length }
}

function computeScore({ history, lead_time_hours, is_weekend_morning, new_customer }) {
  const reasons = []
  let score = 0

  if (history.noShows > 0) {
    const ratio = history.noShows / Math.max(1, history.total)
    const add = Math.round(ratio * 60)
    score += add
    reasons.push({ key: 'past_no_shows', value: history.noShows, weight: add })
  }
  if (history.completed === 0 && history.noShows === 0) {
    score += 12
    reasons.push({ key: 'no_history', weight: 12 })
  }
  if (history.completed >= 5 && history.noShows === 0) {
    score -= 18
    reasons.push({ key: 'loyal_customer', weight: -18 })
  }
  if (lead_time_hours != null) {
    if (lead_time_hours > 7 * 24) {
      score += 10
      reasons.push({ key: 'far_advance_booking', weight: 10 })
    } else if (lead_time_hours < 2) {
      score += 6
      reasons.push({ key: 'last_minute_booking', weight: 6 })
    }
  }
  if (is_weekend_morning) {
    score += 8
    reasons.push({ key: 'weekend_morning_slot', weight: 8 })
  }
  if (new_customer) {
    score += 5
    reasons.push({ key: 'new_customer', weight: 5 })
  }
  return { score: clamp(score), reasons }
}

async function calculateForAppointment(appointment_id) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }

  const { data: appt, error } = await supabase
    .from('appointments')
    .select('id, customer_id, contact_email, contact_phone, start_time, created_at')
    .eq('id', appointment_id)
    .maybeSingle()
  if (error) throw error
  if (!appt) { const e = new Error('Termin nicht gefunden'); e.status = 404; throw e }

  const start = new Date(appt.start_time || Date.now())
  const created = new Date(appt.created_at || Date.now())
  const lead_time_hours = Math.max(0, (start - created) / 3_600_000)
  const day = start.getDay() // 0=So, 6=Sa
  const is_weekend_morning = (day === 0 || day === 6) && start.getHours() < 12

  const history = await loadHistory(supabase, {
    customer_id: appt.customer_id,
    contact_email: appt.contact_email,
    contact_phone: appt.contact_phone
  })
  const new_customer = history.total === 0

  const { score, reasons } = computeScore({ history, lead_time_hours, is_weekend_morning, new_customer })
  const level = levelFor(score)
  const strategy = strategyFor(score)
  const features = { history, lead_time_hours, is_weekend_morning, new_customer }

  const { data, error: upErr } = await supabase
    .from('appointment_risk_scores')
    .upsert(
      {
        appointment_id,
        customer_id: appt.customer_id,
        risk_score: score,
        risk_level: level,
        reasons,
        features,
        reminder_strategy: strategy,
        calculated_at: new Date().toISOString()
      },
      { onConflict: 'appointment_id' }
    )
    .select('*')
    .maybeSingle()
  if (upErr) throw upErr
  return data
}

// Worker-Funktion: scannt offene Termine in den naechsten 14 Tagen, fuer
// die noch kein Score existiert oder der Score aelter als 24h ist.
async function scanUpcoming({ days_ahead = 14, limit = 200 } = {}) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return { skipped: true, reason: 'no_supabase' }

  const now = new Date()
  const to = new Date(Date.now() + days_ahead * 86_400_000)
  const { data: appts, error } = await supabase
    .from('appointments')
    .select('id, start_time')
    .gte('start_time', now.toISOString())
    .lte('start_time', to.toISOString())
    .order('start_time', { ascending: true })
    .limit(limit)
  if (error) throw error

  const results = []
  for (const a of appts || []) {
    try {
      const r = await calculateForAppointment(a.id)
      results.push({ appointment_id: a.id, risk_score: r?.risk_score, risk_level: r?.risk_level })
    } catch (e) {
      results.push({ appointment_id: a.id, error: e?.message || String(e) })
    }
  }
  return { processed: results.length, results }
}

module.exports = {
  calculateForAppointment,
  scanUpcoming,
  computeScore,
  levelFor,
  strategyFor
}
