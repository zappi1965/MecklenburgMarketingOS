// Smart-Pricing-Engine.
//
// Regeln pro Customer + Scope. Final-Preis ist:
//   base_price
//     * (1 + uplift_pct/100  wenn occupancy >= threshold)
//     * (1 - downlift_pct/100 wenn occupancy < threshold und vorhanden)
//     * (1 + weekend_uplift_pct/100 wenn Sa/So)
//     * (1 - off_peak_downlift_pct/100 wenn ausserhalb Stosszeiten)
//
// Service ist seiteneffekt-frei: calculatePrice gibt nur den errechneten
// Preis + breakdown zurueck.

const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

async function listRules({ customer_id, scope }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return []
  let q = supabase.from('pricing_rules').select('*').eq('customer_id', customer_id).eq('enabled', true)
  if (scope) q = q.eq('scope', scope)
  const { data, error } = await q.order('scope', { ascending: false })
  if (error) throw error
  return data || []
}

async function upsertRule({ id, ...payload }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase nicht konfiguriert')
  const update = { ...payload, updated_at: new Date().toISOString() }
  if (id) {
    const { data, error } = await supabase
      .from('pricing_rules').update(update).eq('id', id).select('*').maybeSingle()
    if (error) throw error
    return data
  }
  const { data, error } = await supabase
    .from('pricing_rules').insert(update).select('*').maybeSingle()
  if (error) throw error
  return data
}

async function deleteRule({ id, customer_id }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase nicht konfiguriert')
  const { error } = await supabase.from('pricing_rules').delete().eq('id', id).eq('customer_id', customer_id)
  if (error) throw error
  return { ok: true }
}

// Findet die "naechstgelegene" Regel: konkreter Scope-Match bevorzugt,
// sonst global.
function pickRule(rules, scope, scopeValue) {
  const specific = rules.find((r) => r.scope === scope && r.scope_value === scopeValue)
  if (specific) return specific
  const scopeOnly = rules.find((r) => r.scope === scope && !r.scope_value)
  if (scopeOnly) return scopeOnly
  return rules.find((r) => r.scope === 'global') || null
}

function isWeekend(date) {
  const day = new Date(date).getDay()
  return day === 0 || day === 6
}

function isOffPeak(date) {
  const hour = new Date(date).getHours()
  // Werktags ausserhalb 11-14 + 17-20 als off-peak.
  if (isWeekend(date)) return false
  return !((hour >= 11 && hour < 14) || (hour >= 17 && hour < 20))
}

function calculate({ rule, occupancy, slot_time }) {
  if (!rule) return { base: 0, final: 0, breakdown: [], rule: null }
  const base = Number(rule.base_price_eur || 0)
  let factor = 1
  const breakdown = [{ label: 'base', value: base }]

  if (rule.occupancy_threshold != null && occupancy != null) {
    if (occupancy >= rule.occupancy_threshold && rule.uplift_pct) {
      factor *= 1 + Number(rule.uplift_pct) / 100
      breakdown.push({ label: 'occupancy_uplift', pct: Number(rule.uplift_pct) })
    } else if (occupancy < rule.occupancy_threshold && rule.downlift_pct) {
      factor *= 1 - Number(rule.downlift_pct) / 100
      breakdown.push({ label: 'occupancy_downlift', pct: -Number(rule.downlift_pct) })
    }
  }
  if (slot_time && rule.weekend_uplift_pct && isWeekend(slot_time)) {
    factor *= 1 + Number(rule.weekend_uplift_pct) / 100
    breakdown.push({ label: 'weekend_uplift', pct: Number(rule.weekend_uplift_pct) })
  }
  if (slot_time && rule.off_peak_downlift_pct && isOffPeak(slot_time)) {
    factor *= 1 - Number(rule.off_peak_downlift_pct) / 100
    breakdown.push({ label: 'off_peak_downlift', pct: -Number(rule.off_peak_downlift_pct) })
  }
  const final = Math.round(base * factor * 100) / 100
  return { base, final, factor, breakdown, rule }
}

async function calculatePrice({ customer_id, scope = 'global', scope_value = null, occupancy = null, slot_time = null }) {
  const rules = await listRules({ customer_id })
  const rule = pickRule(rules, scope, scope_value)
  return calculate({ rule, occupancy, slot_time })
}

module.exports = {
  listRules,
  upsertRule,
  deleteRule,
  pickRule,
  calculate,
  calculatePrice,
  isWeekend,
  isOffPeak
}
