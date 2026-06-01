async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

const STEPS = [
  { key: 'customer_created', label: 'Kunde angelegt' },
  { key: 'package_selected', label: 'Paket gewählt' },
  { key: 'tools_enabled', label: 'Tools freigeschaltet' },
  { key: 'contract_status', label: 'Vertrag/AVV Status erfasst' },
  { key: 'branding_done', label: 'Branding hinterlegt' },
  { key: 'qr_loyalty_done', label: 'QR/Loyalty eingerichtet' },
  { key: 'slug_tested', label: 'Slug live getestet' },
  { key: 'billing_checked', label: 'Rechnung/Angebot geprüft' },
  { key: 'golive_checked', label: 'Go-Live Check gestartet' },
  { key: 'access_prepared', label: 'Kundenzugang vorbereitet' }
]

function stepState(records = [], key) {
  const found = records.find((r) => (r.payload?.key || r.local_id) === key)
  return { key, done: found?.payload?.done === true || found?.status === 'done', note: found?.payload?.note || '', updated_at: found?.updated_at || found?.created_at || null }
}

async function getOnboardingWorkflow(supabase, { customer_id } = {}) {
  if (!supabase || !customer_id) return { ok: false, error: 'customer_id fehlt' }
  const [customer, records] = await Promise.all([
    safeQuery(supabase.from('customers').select('*').eq('id', customer_id).maybeSingle()),
    safeQuery(supabase.from('v33_functional_records').select('*').eq('customer_id', customer_id).eq('resource', 'customer_onboarding_steps').limit(100))
  ])
  const states = STEPS.map((s) => ({ ...s, ...stepState(records.data || [], s.key) }))
  const done = states.filter((s) => s.done).length
  return { ok: true, customer: customer.data || null, steps: states, progress: Math.round(done / STEPS.length * 100), done, total: STEPS.length }
}

async function updateOnboardingStep(supabase, { customer_id, key, done = true, note = '', actor = 'Admin' } = {}) {
  if (!supabase || !customer_id || !key) return { ok: false, error: 'customer_id/key fehlt' }
  if (!STEPS.some((s) => s.key === key)) return { ok: false, error: 'Unbekannter Onboarding-Schritt' }
  const now = new Date().toISOString()
  const payload = { key, done: Boolean(done), note, actor, updated_at: now }
  const row = {
    resource: 'customer_onboarding_steps',
    local_id: key,
    customer_id,
    title: STEPS.find((s) => s.key === key)?.label || key,
    status: done ? 'done' : 'open',
    payload,
    updated_at: now
  }
  const existing = await safeQuery(supabase.from('v33_functional_records').select('*').eq('resource', 'customer_onboarding_steps').eq('customer_id', customer_id).eq('local_id', key).maybeSingle())
  let saved
  if (existing.data?.id) {
    saved = await safeQuery(supabase.from('v33_functional_records').update(row).eq('id', existing.data.id).select('*').maybeSingle())
  } else {
    saved = await safeQuery(supabase.from('v33_functional_records').insert({ ...row, created_at: now }).select('*').maybeSingle())
  }
  if (saved.error) return { ok: false, error: saved.error.message }
  return getOnboardingWorkflow(supabase, { customer_id })
}

module.exports = { getOnboardingWorkflow, updateOnboardingStep, ONBOARDING_STEPS: STEPS }
