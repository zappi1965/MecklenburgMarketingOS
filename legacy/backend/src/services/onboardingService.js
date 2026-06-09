// Onboarding-Service.
//
// Wizard-Schritte fuer neue Customers:
//   1. brand        Name + Brand-Farben in customers.metadata speichern
//   2. qr           Erste QR-Kampagne erstellen (slug + headline + cta)
//   3. loyalty      Loyalty-Programm + erstes Reward
//   4. samples      Demo-Daten seeden (3 Reviews, 5 Loyalty-Mitglieder)
//   5. done         Schritt-Status markieren, Slug-URL zurueckliefern
//
// Status pro Customer in customers.metadata.onboarding = { brand: true,
// qr: true, ... }. Idempotent.

const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

const STEPS = ['brand', 'qr', 'loyalty', 'samples', 'done']

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'bonusclub'
}

async function getStatus(customer_id) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return { steps: {} }
  const { data } = await supabase
    .from('customers')
    .select('id, name, metadata')
    .eq('id', customer_id)
    .maybeSingle()
  return {
    customer: data || null,
    steps: data?.metadata?.onboarding || {}
  }
}

async function markStep(supabase, customer_id, step, extra = {}) {
  const { data: cur } = await supabase.from('customers').select('metadata').eq('id', customer_id).maybeSingle()
  const md = cur?.metadata || {}
  const onboarding = { ...(md.onboarding || {}), [step]: true, [`${step}_at`]: new Date().toISOString(), ...extra }
  await supabase.from('customers').update({ metadata: { ...md, onboarding } }).eq('id', customer_id)
  return onboarding
}

async function saveBrand({ customer_id, brand_name, brand_primary, brand_secondary, brand_voice }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }
  const { data: cur } = await supabase.from('customers').select('metadata').eq('id', customer_id).maybeSingle()
  const md = cur?.metadata || {}
  const next = {
    ...md,
    brand_name: brand_name || md.brand_name,
    brand_primary: brand_primary || md.brand_primary || '#d4af37',
    brand_secondary: brand_secondary || md.brand_secondary || '#111827',
    brand_voice: brand_voice || md.brand_voice || 'professionell, freundlich'
  }
  await supabase
    .from('customers')
    .update({ name: brand_name || undefined, metadata: next, brand_voice: brand_voice || undefined })
    .eq('id', customer_id)
  return markStep(supabase, customer_id, 'brand')
}

async function createFirstQr({ customer_id, title, headline, slug }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }
  const finalSlug = slugify(slug || title || 'bonusclub')
  // Idempotenz: existierende Kampagne mit gleichem Slug bei diesem Customer wiederverwenden.
  const { data: existing } = await supabase
    .from('qr_campaigns')
    .select('id, slug')
    .eq('customer_id', customer_id)
    .eq('slug', finalSlug)
    .maybeSingle()
  let campaign = existing
  if (!campaign) {
    const { data, error } = await supabase
      .from('qr_campaigns')
      .insert({
        customer_id,
        title: title || 'Bonusclub',
        slug: finalSlug,
        headline: headline || 'Willkommen im Bonusclub',
        purpose: 'loyalty',
        points_per_scan: 10,
        active: true
      })
      .select('id, slug')
      .maybeSingle()
    if (error) throw error
    campaign = data
  }
  await markStep(supabase, customer_id, 'qr', { qr_campaign_id: campaign?.id, slug: campaign?.slug })
  return campaign
}

async function createFirstLoyalty({ customer_id, program_name, reward_title, reward_points }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }

  // Loyalty-Programm.
  const { data: existingProgram } = await supabase
    .from('loyalty_programs')
    .select('id')
    .eq('customer_id', customer_id)
    .maybeSingle()
  let programId = existingProgram?.id
  if (!programId) {
    const { data, error } = await supabase
      .from('loyalty_programs')
      .insert({
        customer_id,
        name: program_name || 'Bonusclub',
        points_per_scan: 10,
        active: true
      })
      .select('id')
      .maybeSingle()
    if (error) throw error
    programId = data?.id
  }

  // Erstes Reward.
  const { data: existingReward } = await supabase
    .from('loyalty_rewards')
    .select('id')
    .eq('customer_id', customer_id)
    .maybeSingle()
  if (!existingReward) {
    await supabase
      .from('loyalty_rewards')
      .insert({
        customer_id,
        loyalty_program_id: programId || null,
        title: reward_title || 'Gratis-Kaffee',
        points_required: Number(reward_points || 50),
        active: true
      })
  }

  await markStep(supabase, customer_id, 'loyalty', { loyalty_program_id: programId })
  return { loyalty_program_id: programId }
}

async function seedSamples({ customer_id }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }

  // 3 Demo-Reviews.
  try {
    const reviews = [
      { customer_id, rating: 5, feedback_text: 'Sehr freundlich und schnell. Komme gerne wieder!', reviewer_name: 'Anna Demo' },
      { customer_id, rating: 4, feedback_text: 'Gute Beratung, nur etwas Wartezeit.', reviewer_name: 'Bernd Demo' },
      { customer_id, rating: 5, feedback_text: 'Beste Adresse vor Ort. Klare Empfehlung.', reviewer_name: 'Clara Demo' }
    ]
    await supabase.from('review_feedback').insert(reviews)
  } catch (_) {}

  // 5 Demo-Loyalty-Mitglieder.
  try {
    const members = Array.from({ length: 5 }, (_, i) => ({
      customer_id,
      email: `demo-member-${i + 1}@deleted.local`,
      display_name: `Demo-Mitglied ${i + 1}`,
      points_balance: 30 + i * 25,
      tier: i >= 3 ? 'VIP' : 'Basic'
    }))
    await supabase.from('loyalty_customers').insert(members)
  } catch (_) {}

  return markStep(supabase, customer_id, 'samples')
}

async function complete({ customer_id }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }
  return markStep(supabase, customer_id, 'done')
}

module.exports = {
  STEPS,
  getStatus,
  saveBrand,
  createFirstQr,
  createFirstLoyalty,
  seedSamples,
  complete,
  slugify
}
