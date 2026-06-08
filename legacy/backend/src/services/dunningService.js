// Mahnstufen-Konfigurator + Worker-Logik.
// Pro Customer: konfigurierbare Stufen (Tage ueberfaellig, Aufschlag, Aktion).
// Worker erkennt ueberfaellige Rechnungen und legt dunning_runs an.

const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

const DEFAULT_LEVELS = [
  { level: 1, days_overdue: 7,  fee_eur: 0,   action: 'reminder',   template: 'reminder_friendly' },
  { level: 2, days_overdue: 14, fee_eur: 5,   action: 'warning',    template: 'warning_firm' },
  { level: 3, days_overdue: 30, fee_eur: 15,  action: 'escalation', template: 'final_notice' },
  { level: 4, days_overdue: 60, fee_eur: 30,  action: 'inkasso',    template: 'inkasso_handover' }
]

async function listLevels(customer_id) {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase nicht konfiguriert')
  const { data, error } = await supabase
    .from('dunning_levels')
    .select('*')
    .eq('customer_id', customer_id)
    .order('level', { ascending: true })
  if (error) throw error
  return data || []
}

async function ensureDefaults(customer_id) {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase nicht konfiguriert')
  const existing = await listLevels(customer_id)
  if (existing.length > 0) return existing
  const rows = DEFAULT_LEVELS.map((l) => ({ ...l, customer_id }))
  const { data, error } = await supabase.from('dunning_levels').insert(rows).select('*')
  if (error) throw error
  return data || []
}

async function upsertLevel({ customer_id, level, days_overdue, fee_eur, action, template, enabled }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase nicht konfiguriert')
  if (!customer_id || !level) { const e = new Error('customer_id und level Pflicht'); e.status = 400; throw e }
  const { data, error } = await supabase
    .from('dunning_levels')
    .upsert(
      {
        customer_id,
        level: Number(level),
        days_overdue: Number(days_overdue ?? 0),
        fee_eur: Number(fee_eur ?? 0),
        action: action || 'reminder',
        template: template || null,
        enabled: enabled !== false,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'customer_id,level' }
    )
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data
}

async function deleteLevel({ customer_id, level }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase nicht konfiguriert')
  const { error } = await supabase
    .from('dunning_levels')
    .delete()
    .eq('customer_id', customer_id)
    .eq('level', Number(level))
  if (error) throw error
  return { ok: true }
}

// Worker-Funktion: scan ueber alle ueberfaelligen Rechnungen, finde die
// passende Stufe je Customer + days_overdue, lege dunning_run an wenn
// fuer diese Rechnung + Stufe noch keiner existiert.
async function runDunningSweep({ now = new Date() } = {}) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return { skipped: true, reason: 'no_supabase' }

  const today = now.toISOString().slice(0, 10)
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, customer_id, invoice_number, amount, total, due_date, status')
    .lt('due_date', today)
    .not('status', 'ilike', '%bezahlt%')
    .not('status', 'ilike', '%paid%')
    .order('due_date', { ascending: true })
    .limit(1000)
  if (error) throw error

  const results = []
  for (const inv of invoices || []) {
    if (!inv.due_date || !inv.customer_id) continue
    const daysOverdue = Math.floor((now - new Date(inv.due_date)) / 86_400_000)
    if (daysOverdue <= 0) continue

    const { data: levels } = await supabase
      .from('dunning_levels')
      .select('*')
      .eq('customer_id', inv.customer_id)
      .eq('enabled', true)
      .lte('days_overdue', daysOverdue)
      .order('level', { ascending: false })
      .limit(1)
    const target = levels?.[0]
    if (!target) continue

    // Pruefen ob fuer diese Rechnung + Stufe schon ein Run existiert.
    const { data: existing } = await supabase
      .from('dunning_runs')
      .select('id')
      .eq('invoice_id', inv.id)
      .eq('level', target.level)
      .maybeSingle()
    if (existing) continue

    const { data: run } = await supabase
      .from('dunning_runs')
      .insert({
        invoice_id: inv.id,
        customer_id: inv.customer_id,
        dunning_level_id: target.id,
        level: target.level,
        days_overdue: daysOverdue,
        fee_charged: Number(target.fee_eur || 0),
        status: 'queued',
        metadata: { template: target.template, action: target.action }
      })
      .select('id, level')
      .maybeSingle()
    if (run) results.push({ invoice_id: inv.id, ...run })
  }
  return { queued: results.length, results }
}

module.exports = {
  listLevels,
  ensureDefaults,
  upsertLevel,
  deleteLevel,
  runDunningSweep,
  DEFAULT_LEVELS
}
