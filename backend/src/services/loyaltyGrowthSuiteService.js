async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

const CAMPAIGN_IDEAS = [
  { key: 'birthday_bonus', label: 'Geburtstagskampagne', category: 'retention', description: 'Automatischer Geburtstagsbonus oder Gutschein für Bestandskunden.' },
  { key: 'winback_inactive', label: 'Winback für inaktive Kunden', category: 'retention', description: 'Kunden zurückholen, die länger nicht aktiv waren.' },
  { key: 'vip_levels', label: 'VIP-Level Bronze/Silber/Gold', category: 'loyalty', description: 'Level-System mit besseren Vorteilen je Aktivität.' },
  { key: 'happy_hour_booster', label: 'Happy Hour Punkte-Booster', category: 'promotion', description: 'Mehr Punkte zu schwachen Tageszeiten.' },
  { key: 'seasonal_campaign', label: 'Saisonkampagne', category: 'promotion', description: 'Sommer-, Weihnachts- oder Event-Aktionen planen.' },
  { key: 'reward_expiry_reminder', label: 'Reward-Expiry Reminder', category: 'automation', description: 'Kunden erinnern, bevor Punkte/Rewards verfallen.' },
  { key: 'coupon_wallet', label: 'Coupon Wallet', category: 'coupon', description: 'Digitale Gutscheine je Kunde verwalten.' },
  { key: 'referral_program', label: 'Freunde-werben-Freunde', category: 'growth', description: 'Bestandskunden bringen neue Kunden.' },
  { key: 'visit_frequency', label: 'Besuchsfrequenz-Analyse', category: 'analytics', description: 'Erkennt Stammkunden, Risiko-Kunden und Wachstumschancen.' },
  { key: 'reward_ab_test', label: 'Reward A/B-Test', category: 'optimization', description: 'Zwei Rewards gegeneinander testen.' },
  { key: 'customer_club', label: 'Kundenclub', category: 'loyalty', description: 'Exklusive Aktionen für Club-Mitglieder.' },
  { key: 'manual_bonus', label: 'Manueller Bonus', category: 'ops', description: 'Kulanzpunkte durch Mitarbeiter vergeben.' },
  { key: 'subscription_perks', label: 'Abo-/Mitgliedschaftsvorteile', category: 'monetization', description: 'Wiederkehrende Vorteile für zahlende Mitglieder.' },
  { key: 'review_bonus', label: 'Bewertungsbonus', category: 'reputation', description: 'Interner Bonus nach Feedback/Bewertung ohne unzulässige Bewertungskäufe.' },
  { key: 'upsell_offer', label: 'Cross-/Upsell-Kampagne', category: 'sales', description: 'Passende Zusatzangebote an aktive Kunden ausspielen.' }
]

const VIP_LEVELS = [
  { key: 'bronze', label: 'Bronze', min_points: 0, benefits: ['Basis-Vorteile', 'Standard-Rewards'] },
  { key: 'silver', label: 'Silber', min_points: 250, benefits: ['Bessere Rewards', 'Geburtstagsbonus'] },
  { key: 'gold', label: 'Gold', min_points: 750, benefits: ['VIP-Vorteile', 'Exklusive Aktionen', 'Priorisierte Angebote'] }
]

function id(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function monthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

async function listLoyaltyGrowthOverview(supabase, { customer_id } = {}) {
  if (!supabase || !customer_id) return { ok: false, error: 'customer_id fehlt' }
  const [members, tx, rewards, records, reviews, leads] = await Promise.all([
    safeQuery(supabase.from('loyalty_members').select('*').eq('customer_id', customer_id).limit(2000)),
    safeQuery(supabase.from('loyalty_transactions').select('*').eq('customer_id', customer_id).order('created_at', { ascending: false }).limit(5000)),
    safeQuery(supabase.from('loyalty_rewards').select('*').eq('customer_id', customer_id).limit(1000)),
    safeQuery(supabase.from('v33_functional_records').select('*').eq('customer_id', customer_id).in('resource', ['loyalty_campaigns','coupon_wallets','vip_level_rules','loyalty_boosters','referral_programs']).order('created_at', { ascending: false }).limit(2000)),
    safeQuery(supabase.from('review_feedback').select('*').eq('customer_id', customer_id).order('created_at', { ascending: false }).limit(1000)),
    safeQuery(supabase.from('prospect_leads').select('*').eq('customer_id', customer_id).order('created_at', { ascending: false }).limit(1000))
  ])

  const txRows = tx.data || []
  const memberRows = members.data || []
  const now = Date.now()
  const inactiveMembers = memberRows.filter((m) => {
    const last = new Date(m.last_activity_at || m.updated_at || m.created_at || 0).getTime()
    return last && now - last > 45 * 24 * 60 * 60 * 1000
  })
  const pointsIssued = txRows.filter((t) => Number(t.points || 0) > 0).reduce((s, t) => s + Number(t.points || 0), 0)
  const pointsRedeemed = Math.abs(txRows.filter((t) => Number(t.points || 0) < 0).reduce((s, t) => s + Number(t.points || 0), 0))
  const campaigns = (records.data || []).filter((r) => r.resource === 'loyalty_campaigns')
  const coupons = (records.data || []).filter((r) => r.resource === 'coupon_wallets')
  const boosters = (records.data || []).filter((r) => r.resource === 'loyalty_boosters')
  const referrals = (records.data || []).filter((r) => r.resource === 'referral_programs')

  const suggestions = []
  if (inactiveMembers.length > 0) suggestions.push({ priority: 'high', key: 'winback_inactive', recommendation: `${inactiveMembers.length} inaktive Loyalty-Mitglieder per Winback-Kampagne reaktivieren.` })
  if (pointsIssued > 0 && pointsRedeemed === 0) suggestions.push({ priority: 'medium', key: 'reward_expiry_reminder', recommendation: 'Viele Punkte, aber keine Einlösungen: Reward-Reminder oder attraktiveren Reward testen.' })
  if (campaigns.length === 0) suggestions.push({ priority: 'medium', key: 'campaign_calendar', recommendation: 'Erste Loyalty-Kampagne im Kampagnenkalender anlegen.' })
  if (memberRows.length >= 20 && boosters.length === 0) suggestions.push({ priority: 'medium', key: 'happy_hour_booster', recommendation: 'Happy-Hour-Booster für schwache Zeiten testen.' })
  if ((reviews.data || []).length >= 5 && referrals.length === 0) suggestions.push({ priority: 'low', key: 'referral_program', recommendation: 'Freunde-werben-Freunde für zufriedene Kunden aktivieren.' })

  return {
    ok: true,
    metrics: {
      members: memberRows.length,
      inactive_members: inactiveMembers.length,
      transactions: txRows.length,
      active_rewards: (rewards.data || []).filter((r) => r.active !== false).length,
      points_issued: pointsIssued,
      points_redeemed: pointsRedeemed,
      campaigns: campaigns.length,
      coupons: coupons.length,
      boosters: boosters.length,
      referrals: referrals.length,
      reviews: (reviews.data || []).length,
      leads: (leads.data || []).length
    },
    campaigns: campaigns.map((r) => ({ id: r.local_id || r.id, record_id: r.id, ...(r.payload || {}), status: r.status })),
    coupons: coupons.map((r) => ({ id: r.local_id || r.id, record_id: r.id, ...(r.payload || {}), status: r.status })),
    boosters: boosters.map((r) => ({ id: r.local_id || r.id, record_id: r.id, ...(r.payload || {}), status: r.status })),
    referrals: referrals.map((r) => ({ id: r.local_id || r.id, record_id: r.id, ...(r.payload || {}), status: r.status })),
    suggestions,
    ideas: CAMPAIGN_IDEAS,
    vip_levels: VIP_LEVELS
  }
}

async function createLoyaltyCampaign(supabase, payload = {}) {
  if (!supabase || !payload.customer_id) return { ok: false, error: 'customer_id fehlt' }
  const now = new Date().toISOString()
  const campaign = {
    id: payload.id || id('lc'),
    customer_id: payload.customer_id,
    type: payload.type || 'seasonal_campaign',
    title: payload.title || CAMPAIGN_IDEAS.find((i) => i.key === payload.type)?.label || 'Loyalty Kampagne',
    status: payload.status || 'draft',
    starts_at: payload.starts_at || null,
    ends_at: payload.ends_at || null,
    target_segment: payload.target_segment || 'all_members',
    offer: payload.offer || '',
    points_bonus: Number(payload.points_bonus || 0),
    coupon_value: payload.coupon_value || null,
    channel: payload.channel || 'portal',
    rules: payload.rules || {},
    created_at: now,
    updated_at: now
  }
  const row = {
    resource: 'loyalty_campaigns',
    local_id: campaign.id,
    customer_id: campaign.customer_id,
    title: campaign.title,
    status: campaign.status,
    payload: campaign,
    created_at: now,
    updated_at: now
  }
  const saved = await safeQuery(supabase.from('v33_functional_records').insert(row).select('*').maybeSingle())
  if (saved.error) return { ok: false, error: saved.error.message }
  return { ok: true, campaign: { ...campaign, record_id: saved.data?.id } }
}

async function createHappyHourBooster(supabase, payload = {}) {
  if (!supabase || !payload.customer_id) return { ok: false, error: 'customer_id fehlt' }
  const now = new Date().toISOString()
  const booster = {
    id: payload.id || id('booster'),
    customer_id: payload.customer_id,
    title: payload.title || 'Happy Hour Punkte-Booster',
    status: payload.status || 'active',
    weekdays: payload.weekdays || ['MO','TU','WE','TH'],
    start_time: payload.start_time || '14:00',
    end_time: payload.end_time || '17:00',
    multiplier: Number(payload.multiplier || 2),
    max_bonus_points_per_day: Number(payload.max_bonus_points_per_day || 50),
    created_at: now,
    updated_at: now
  }
  const row = { resource: 'loyalty_boosters', local_id: booster.id, customer_id: booster.customer_id, title: booster.title, status: booster.status, payload: booster, created_at: now, updated_at: now }
  const saved = await safeQuery(supabase.from('v33_functional_records').insert(row).select('*').maybeSingle())
  if (saved.error) return { ok: false, error: saved.error.message }
  return { ok: true, booster: { ...booster, record_id: saved.data?.id } }
}

async function createVipLevelRules(supabase, { customer_id, levels = VIP_LEVELS } = {}) {
  if (!supabase || !customer_id) return { ok: false, error: 'customer_id fehlt' }
  const now = new Date().toISOString()
  const payload = { id: `vip_${customer_id}`, customer_id, levels, status: 'active', created_at: now, updated_at: now }
  const existing = await safeQuery(supabase.from('v33_functional_records').select('*').eq('resource','vip_level_rules').eq('customer_id', customer_id).eq('local_id', payload.id).maybeSingle())
  const row = { resource: 'vip_level_rules', local_id: payload.id, customer_id, title: 'VIP-Level-Regeln', status: 'active', payload, updated_at: now }
  const saved = existing.data?.id
    ? await safeQuery(supabase.from('v33_functional_records').update(row).eq('id', existing.data.id).select('*').maybeSingle())
    : await safeQuery(supabase.from('v33_functional_records').insert({ ...row, created_at: now }).select('*').maybeSingle())
  if (saved.error) return { ok: false, error: saved.error.message }
  return { ok: true, vip_rules: saved.data || row }
}

async function createCouponWalletItem(supabase, payload = {}) {
  if (!supabase || !payload.customer_id) return { ok: false, error: 'customer_id fehlt' }
  const now = new Date().toISOString()
  const coupon = {
    id: payload.id || id('coupon'),
    customer_id: payload.customer_id,
    loyalty_member_id: payload.loyalty_member_id || null,
    title: payload.title || 'Coupon',
    description: payload.description || '',
    value: payload.value || '10%',
    status: payload.status || 'active',
    expires_at: payload.expires_at || null,
    redeem_code: payload.redeem_code || Math.random().toString(36).slice(2, 8).toUpperCase(),
    created_at: now,
    updated_at: now
  }
  const row = { resource: 'coupon_wallets', local_id: coupon.id, customer_id: coupon.customer_id, title: coupon.title, status: coupon.status, payload: coupon, created_at: now, updated_at: now }
  const saved = await safeQuery(supabase.from('v33_functional_records').insert(row).select('*').maybeSingle())
  if (saved.error) return { ok: false, error: saved.error.message }
  return { ok: true, coupon: { ...coupon, record_id: saved.data?.id } }
}

async function createReferralProgram(supabase, payload = {}) {
  if (!supabase || !payload.customer_id) return { ok: false, error: 'customer_id fehlt' }
  const now = new Date().toISOString()
  const referral = {
    id: payload.id || id('ref'),
    customer_id: payload.customer_id,
    title: payload.title || 'Freunde werben Freunde',
    status: payload.status || 'active',
    referrer_bonus_points: Number(payload.referrer_bonus_points || 50),
    friend_bonus_points: Number(payload.friend_bonus_points || 25),
    terms: payload.terms || 'Bonus nach erfolgreichem Erstbesuch.',
    created_at: now,
    updated_at: now
  }
  const row = { resource: 'referral_programs', local_id: referral.id, customer_id: referral.customer_id, title: referral.title, status: referral.status, payload: referral, created_at: now, updated_at: now }
  const saved = await safeQuery(supabase.from('v33_functional_records').insert(row).select('*').maybeSingle())
  if (saved.error) return { ok: false, error: saved.error.message }
  return { ok: true, referral_program: { ...referral, record_id: saved.data?.id } }
}

async function calculateLoyaltyRoi(supabase, { customer_id, avg_order_value = 15, gross_margin = 0.6 } = {}) {
  const overview = await listLoyaltyGrowthOverview(supabase, { customer_id })
  if (!overview.ok) return overview
  const m = overview.metrics
  const estimatedRepeatVisits = Math.max(0, Math.round(m.transactions * 0.35))
  const estimatedRevenue = Math.round(estimatedRepeatVisits * Number(avg_order_value || 15) * 100) / 100
  const estimatedGrossProfit = Math.round(estimatedRevenue * Number(gross_margin || 0.6) * 100) / 100
  const recommendation = estimatedGrossProfit > 0
    ? `Geschätzter Deckungsbeitrag durch wiederkehrende Loyalty-Aktionen: ${estimatedGrossProfit} €.`
    : 'Noch zu wenig Daten. Erste Kampagne starten und nach 30 Tagen erneut bewerten.'
  return { ok: true, input: { avg_order_value, gross_margin }, estimated: { repeat_visits: estimatedRepeatVisits, revenue: estimatedRevenue, gross_profit: estimatedGrossProfit }, recommendation }
}

async function recommendNextLoyaltyTools(supabase, { customer_id } = {}) {
  const overview = await listLoyaltyGrowthOverview(supabase, { customer_id })
  if (!overview.ok) return overview
  const existingTypes = new Set((overview.campaigns || []).map((c) => c.type))
  const recommended = []
  for (const s of overview.suggestions || []) {
    const idea = CAMPAIGN_IDEAS.find((i) => i.key === s.key) || { key: s.key, label: s.key, description: s.recommendation }
    recommended.push({ ...idea, priority: s.priority, recommendation: s.recommendation })
  }
  if (!existingTypes.has('birthday_bonus')) recommended.push({ ...CAMPAIGN_IDEAS.find((i) => i.key === 'birthday_bonus'), priority: 'medium', recommendation: 'Geburtstagsbonus ist einfach verständlich und gut für Kundenbindung.' })
  if (!existingTypes.has('vip_levels')) recommended.push({ ...CAMPAIGN_IDEAS.find((i) => i.key === 'vip_levels'), priority: 'medium', recommendation: 'VIP-Level motivieren regelmäßige Besuche.' })
  return { ok: true, recommended, ideas: CAMPAIGN_IDEAS }
}

module.exports = {
  CAMPAIGN_IDEAS,
  VIP_LEVELS,
  listLoyaltyGrowthOverview,
  createLoyaltyCampaign,
  createHappyHourBooster,
  createVipLevelRules,
  createCouponWalletItem,
  createReferralProgram,
  calculateLoyaltyRoi,
  recommendNextLoyaltyTools
}
