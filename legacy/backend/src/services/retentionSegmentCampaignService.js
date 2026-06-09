const { calculateRetentionIntelligence } = require('./retentionIntelligenceSuiteService')
const { createLoyaltyCampaign } = require('./loyaltyGrowthSuiteService')
const { createCouponWalletItem } = require('./loyaltyGrowthSuiteService')

function campaignTemplateForSegment(segmentKey) {
  const map = {
    inactive_customers: { type: 'winback_inactive', title: 'Winback-Kampagne für inaktive Kunden', offer: 'Comeback-Vorteil', points_bonus: 25 },
    at_risk_customers: { type: 'winback_inactive', title: 'Churn Prevention Kampagne', offer: 'Persönliche Reaktivierung', points_bonus: 30 },
    vip_customers: { type: 'vip_levels', title: 'VIP-Pflegekampagne', offer: 'Exklusiver VIP-Vorteil', points_bonus: 0 },
    high_value_customers: { type: 'customer_club', title: 'Topkunden-Club Aktion', offer: 'Exklusiver Stammkundenvorteil', points_bonus: 0 },
    critical_feedback_customers: { type: 'review_bonus', title: 'Service Recovery Kampagne', offer: 'Kulanzvorteil nach Feedback', points_bonus: 0 },
    new_customers: { type: 'birthday_bonus', title: 'Willkommensserie für Neukunden', offer: 'Willkommensbonus', points_bonus: 10 },
    regular_customers: { type: 'seasonal_campaign', title: 'Stammkunden-Aktion', offer: 'Treuevorteil', points_bonus: 15 }
  }
  return map[segmentKey] || { type: 'seasonal_campaign', title: `Segment-Kampagne ${segmentKey}`, offer: 'Segmentvorteil', points_bonus: 10 }
}

async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

async function startSegmentBasedCampaign(supabase, { customer_id, segment_key, title = null, create_coupons = false, coupon_value = '10%', actor = 'Admin' } = {}) {
  if (!supabase || !customer_id || !segment_key) return { ok: false, error: 'customer_id/segment_key fehlt' }
  const intelligence = await calculateRetentionIntelligence(supabase, { customer_id, persist: true })
  const members = (intelligence.members || []).filter((m) => (m.segments || []).includes(segment_key))
  const template = campaignTemplateForSegment(segment_key)
  const campaign = await createLoyaltyCampaign(supabase, {
    customer_id,
    type: template.type,
    title: title || template.title,
    target_segment: segment_key,
    offer: template.offer,
    points_bonus: template.points_bonus,
    rules: {
      source: 'retention_intelligence',
      segment_key,
      candidate_count: members.length,
      consent_note: 'Kontakt und Versand nur bei passender Rechtsgrundlage/Einwilligung.'
    },
    status: 'draft'
  })
  const coupons = []
  if (create_coupons) {
    for (const m of members.slice(0, 100)) {
      const c = await createCouponWalletItem(supabase, {
        customer_id,
        loyalty_member_id: m.id,
        title: `${template.offer} · ${m.display_name}`,
        description: `Automatisch vorgeschlagen für Segment ${segment_key}.`,
        value: coupon_value,
        status: 'draft'
      })
      coupons.push(c)
    }
  }
  const now = new Date().toISOString()
  const record = {
    resource: 'segment_campaigns',
    local_id: `segment_campaign_${segment_key}_${Date.now()}`,
    customer_id,
    title: title || template.title,
    status: 'draft',
    payload: {
      customer_id,
      segment_key,
      actor,
      campaign,
      candidate_count: members.length,
      candidates: members.slice(0, 100),
      coupons_created: coupons.filter((x) => x.ok).length,
      create_coupons,
      coupon_value,
      created_at: now
    },
    created_at: now,
    updated_at: now
  }
  const saved = await safeQuery(supabase.from('v33_functional_records').insert(record).select('*').maybeSingle())
  return {
    ok: campaign.ok && !saved.error,
    segment_key,
    candidate_count: members.length,
    campaign,
    coupons,
    segment_campaign: saved.data || record,
    error: campaign.error || saved.error?.message || null
  }
}

module.exports = { startSegmentBasedCampaign, campaignTemplateForSegment }
