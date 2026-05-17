
const DEFAULT_POINTS_PER_SCAN = 10

function n(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function sentimentFromRating(rating) {
  const r = n(rating, 0)
  if (r >= 4) return 'positive'
  if (r <= 2) return 'negative'
  return 'neutral'
}

function healthFromSignals({ qrScans, leads, reviews, negativeReviews, openTickets, automationRuns, usageTotal }) {
  let score = 70
  score += Math.min(15, qrScans / 10)
  score += Math.min(10, leads * 2)
  score += Math.min(8, automationRuns)
  score += Math.min(7, usageTotal / 10)
  score -= Math.min(20, negativeReviews * 6)
  score -= Math.min(15, openTickets * 3)
  if (reviews > 0) score += Math.min(5, reviews)
  return Math.max(0, Math.min(100, Math.round(score)))
}

function riskFromHealth(health, negativeReviews, openTickets) {
  let risk = 100 - n(health, 70)
  risk += negativeReviews * 6
  risk += openTickets * 4
  return Math.max(0, Math.min(100, Math.round(risk)))
}

function upsellFromSignals({ qrScans, leads, usageTotal, health, packageKey }) {
  let score = 20
  score += Math.min(25, qrScans / 4)
  score += Math.min(25, leads * 5)
  score += Math.min(20, usageTotal / 5)
  score += Math.max(0, n(health, 70) - 70) / 2
  if (packageKey === 'starter') score += 12
  if (packageKey === 'growth') score += 8
  return Math.max(0, Math.min(100, Math.round(score)))
}

class V35BusinessEngine {
  constructor(supabase) {
    this.supabase = supabase
  }

  async maybeInsert(table, payload) {
    try {
      const { data, error } = await this.supabase.from(table).insert(payload).select('*').single()
      if (error) return null
      return data
    } catch (_) {
      return null
    }
  }

  async maybeSelect(table, queryFn) {
    try {
      let q = this.supabase.from(table).select('*')
      q = queryFn ? queryFn(q) : q
      const { data, error } = await q
      if (error) return []
      return data || []
    } catch (_) {
      return []
    }
  }

  async getCustomer(customerId) {
    try {
      const { data } = await this.supabase.from('customers').select('*').eq('id', customerId).maybeSingle()
      return data || null
    } catch (_) {
      return null
    }
  }

  async getSignals(customerId) {
    const [
      qrCampaigns,
      leads,
      reviews,
      tickets,
      automations,
      billingUsage,
      loyaltyCustomers,
      loyaltyTransactions,
      pipelineLeads
    ] = await Promise.all([
      this.maybeSelect('qr_campaigns', q => q.eq('customer_id', customerId).limit(500)),
      this.maybeSelect('v33_public_leads', q => q.eq('customer_id', customerId).limit(500)),
      this.maybeSelect('review_feedback', q => q.eq('customer_id', customerId).limit(500)),
      this.maybeSelect('tickets', q => q.eq('customer_id', customerId).limit(500)),
      this.maybeSelect('v33_functional_records', q => q.eq('customer_id', customerId).eq('resource', 'smart_automations').limit(500)),
      this.maybeSelect('v33_functional_records', q => q.eq('customer_id', customerId).eq('resource', 'dynamic_billing_usage').limit(500)),
      this.maybeSelect('loyalty_customers', q => q.eq('customer_id', customerId).limit(500)),
      this.maybeSelect('loyalty_transactions', q => q.eq('customer_id', customerId).limit(500)),
      this.maybeSelect('pipeline_leads', q => q.eq('customer_id', customerId).limit(500))
    ])

    const qrScans = qrCampaigns.reduce((sum, item) => sum + n(item.scans), 0)
    const conversions = qrCampaigns.reduce((sum, item) => sum + n(item.conversions), 0)
    const negativeReviews = reviews.filter(r => {
      const rating = n(r.rating)
      const s = String(r.sentiment || '').toLowerCase()
      return rating <= 2 || s.includes('negative') || s.includes('negativ')
    }).length
    const openTickets = tickets.filter(t => !['closed', 'done', 'erledigt', 'resolved'].includes(String(t.status || '').toLowerCase())).length
    const automationRuns = automations.reduce((sum, row) => sum + n(row.payload?.runs), 0)
    const usageTotal = billingUsage.reduce((sum, row) => {
      const p = row.payload || {}
      return sum + n(p.quantity) * n(p.unit)
    }, 0)
    const pipelineValue = pipelineLeads.reduce((sum, row) => sum + n(row.value), 0)
    const mrr = n((await this.getCustomer(customerId))?.monthly_price || (await this.getCustomer(customerId))?.amount || 299, 299)

    return {
      qrCampaigns,
      leads,
      reviews,
      tickets,
      automations,
      billingUsage,
      loyaltyCustomers,
      loyaltyTransactions,
      pipelineLeads,
      qrScans,
      conversions,
      negativeReviews,
      openTickets,
      automationRuns,
      usageTotal,
      pipelineValue,
      mrr
    }
  }

  async recalculateCustomer(customerId) {
    const customer = await this.getCustomer(customerId)
    const packageKey = String(customer?.package_key || customer?.package || customer?.plan || 'growth').toLowerCase()
    const signals = await this.getSignals(customerId)

    const health = healthFromSignals({
      qrScans: signals.qrScans,
      leads: signals.leads.length,
      reviews: signals.reviews.length,
      negativeReviews: signals.negativeReviews,
      openTickets: signals.openTickets,
      automationRuns: signals.automationRuns,
      usageTotal: signals.usageTotal
    })
    const risk = riskFromHealth(health, signals.negativeReviews, signals.openTickets)
    const upsell = upsellFromSignals({
      qrScans: signals.qrScans,
      leads: signals.leads.length,
      usageTotal: signals.usageTotal,
      health,
      packageKey
    })
    const success = Math.round((health + Math.max(0, 100 - risk) + Math.min(100, signals.conversions * 4 + 50)) / 3)
    const forecast = Math.round((signals.mrr + signals.pipelineValue * 0.35 + signals.usageTotal) * 100) / 100
    const revenueShare = Math.round((signals.mrr * 0.15) * 100) / 100

    const warnings = []
    const opportunities = []

    if (signals.negativeReviews > 0) warnings.push('Negative Bewertungen prüfen')
    if (signals.openTickets > 0) warnings.push('Offene Tickets bearbeiten')
    if (signals.qrScans > 50) opportunities.push('QR-Kampagne performt stark')
    if (upsell > 75) opportunities.push('Upgrade-/Add-on-Chance hoch')
    if (signals.leads.length > 0) opportunities.push('Neue QR/Loyalty Leads nachfassen')

    const snapshot = {
      customer_id: customerId,
      health,
      risk,
      upsell,
      success,
      package_usage: Math.min(100, Math.round(signals.usageTotal + signals.qrScans / 3 + signals.automationRuns * 5)),
      qr_scans: signals.qrScans,
      leads: signals.leads.length,
      reviews: signals.reviews.length,
      negative_reviews: signals.negativeReviews,
      open_tickets: signals.openTickets,
      usage_total: signals.usageTotal,
      forecast,
      revenue_share: revenueShare,
      warnings,
      opportunities,
      recalculated_at: new Date().toISOString()
    }

    await this.upsertRecord('customer_health', customerId, 'health_snapshot', {
      name: 'Customer Health Snapshot',
      score: health,
      risk,
      upsell,
      success,
      warnings,
      opportunities,
      snapshot,
      active: true
    })

    await this.upsertRecord('customer_intelligence', customerId, 'intelligence_snapshot', {
      name: 'Customer Intelligence',
      score: success,
      risk,
      upsell,
      recommendation: opportunities[0] || 'Kunde stabil weiterentwickeln',
      snapshot,
      active: true
    })

    await this.upsertRecord('revenue_forecasts', customerId, 'current_forecast', {
      period: 'Aktueller Monat',
      expected: forecast,
      mrr: signals.mrr,
      pipeline: signals.pipelineValue,
      usage: signals.usageTotal,
      confidence: Math.max(50, Math.min(95, success)),
      active: true
    })

    await this.upsertRecord('revenue_shares', customerId, 'current_revenue_share', {
      name: 'Automatisch berechneter Revenue Share',
      gross: signals.mrr,
      percent: 15,
      amount: revenueShare,
      active: true
    })

    const recommendation = upsell > 75
      ? 'Premium Add-on empfehlen'
      : risk > 60
        ? 'Retention-Call einplanen'
        : 'Nächsten Loyalty Booster starten'

    await this.upsertRecord('package_recommendations', customerId, 'current_recommendation', {
      title: recommendation,
      uplift: upsell > 75 ? 499 : 199,
      confidence: Math.max(55, upsell),
      priority: upsell > 75 || risk > 60 ? 'hoch' : 'mittel',
      status: 'offen',
      active: true
    })

    await this.upsertRecord('assistant_messages', customerId, `assistant_${Date.now()}`, {
      title: recommendation,
      severity: risk > 60 ? 'warn' : 'success',
      message: `${recommendation}. Health ${health}, Risk ${risk}, Upsell ${upsell}.`,
      active: true
    })

    return snapshot
  }

  async upsertRecord(resource, customerId, localId, payload) {
    const { data: existing, error: lookupError } = await this.supabase
      .from('v33_functional_records')
      .select('*')
      .eq('resource', resource)
      .eq('customer_id', customerId)
      .eq('local_id', localId)
      .maybeSingle()

    if (lookupError) throw lookupError

    const row = {
      customer_id: customerId,
      resource,
      local_id: localId,
      title: payload.title || payload.name || resource,
      status: payload.status || 'active',
      payload,
      updated_at: new Date().toISOString()
    }

    if (!existing) {
      const { data, error } = await this.supabase.from('v33_functional_records').insert(row).select('*').single()
      if (error) throw error
      return data
    }

    const { data, error } = await this.supabase.from('v33_functional_records').update(row).eq('id', existing.id).select('*').single()
    if (error) throw error
    return data
  }

  async applyReview(customerId, review) {
    const rating = n(review.rating)
    const sentiment = review.sentiment || sentimentFromRating(rating)

    let escalation = null
    if (rating <= 3 || sentiment === 'negative' || sentiment === 'negativ') {
      escalation = await this.maybeInsert('tickets', {
        customer_id: customerId,
        title: `Review-Eskalation: ${review.reviewer_name || review.name || 'Gast'}`,
        status: 'open',
        priority: rating <= 2 ? 'high' : 'medium',
        source: 'review_intelligence',
        description: review.feedback_text || review.comment || review.text || 'Negative Bewertung',
        metadata: { review }
      })

      await this.maybeInsert('customer_timeline_events', {
        customer_id: customerId,
        event_type: 'review_escalated',
        title: 'Review eskaliert',
        description: review.feedback_text || review.comment || review.text || 'Negative Bewertung erkannt',
        source_module: 'review_intelligence',
        severity: 'warn',
        metadata: { review, escalation_id: escalation?.id || null }
      })
    }

    const snapshot = await this.recalculateCustomer(customerId)
    return { escalation, snapshot }
  }

  async runAutomation(customerId, automationPayload = {}) {
    const signals = await this.getSignals(customerId)
    const actions = []

    if (signals.negativeReviews > 0) {
      const event = await this.maybeInsert('customer_timeline_events', {
        customer_id: customerId,
        event_type: 'automation_negative_review',
        title: 'Automation: Negative Bewertung erkannt',
        description: 'Smart Automation hat einen Review-Follow-up erzeugt.',
        source_module: 'smart_automation',
        severity: 'warn',
        metadata: { automationPayload }
      })
      actions.push({ type: 'timeline_event', event })
    }

    if (signals.qrScans > 50 || signals.leads.length > 0) {
      const lead = await this.maybeInsert('pipeline_leads', {
        customer_id: customerId,
        title: 'Automation Upsell Lead',
        source: 'smart_automation',
        stage: 'new',
        value: 499,
        probability: 35,
        metadata: { reason: 'QR/Loyalty Aktivität', automationPayload }
      })
      actions.push({ type: 'pipeline_lead', lead })
    }

    const snapshot = await this.recalculateCustomer(customerId)
    return { actions, snapshot }
  }

  async runMarketingCampaign(customerId, campaignPayload = {}) {
    const segments = await this.maybeSelect('v33_functional_records', q => q.eq('customer_id', customerId).eq('resource', 'loyalty_segments').limit(100))
    const members = await this.maybeSelect('loyalty_customers', q => q.eq('customer_id', customerId).limit(500))
    const targetCount = members.length || segments.reduce((sum, s) => sum + n(s.payload?.members), 0)

    const run = await this.upsertRecord('marketing_runs', customerId, `run_${Date.now()}`, {
      title: campaignPayload.name || campaignPayload.title || 'Marketing Kampagne',
      audience: campaignPayload.audience || 'Alle aktiven Endkunden',
      reward: campaignPayload.reward || null,
      status: 'sent',
      target_count: targetCount,
      sent_at: new Date().toISOString(),
      active: true
    })

    await this.maybeInsert('customer_timeline_events', {
      customer_id: customerId,
      event_type: 'marketing_campaign_sent',
      title: 'Marketing Kampagne gestartet',
      description: `${campaignPayload.name || 'Kampagne'} wurde an ${targetCount} Zielkontakte gesendet.`,
      source_module: 'marketing_automation',
      severity: 'success',
      metadata: { campaignPayload, targetCount }
    })

    const snapshot = await this.recalculateCustomer(customerId)
    return { run, target_count: targetCount, snapshot }
  }

  async calculateBilling(customerId) {
    const signals = await this.getSignals(customerId)
    const qrCost = signals.qrScans * 0.01
    const automationCost = signals.automationRuns * 0.03
    const leadCost = signals.leads.length * 0.5
    const total = Math.round((qrCost + automationCost + leadCost + signals.usageTotal) * 100) / 100

    const bill = await this.upsertRecord('dynamic_billing_usage', customerId, 'calculated_usage', {
      label: 'Automatisch berechnete Usage',
      quantity: signals.qrScans + signals.automationRuns + signals.leads.length,
      unit: 1,
      qr_cost: qrCost,
      automation_cost: automationCost,
      lead_cost: leadCost,
      manual_usage: signals.usageTotal,
      total,
      active: true
    })

    return { bill, total }
  }

  async redeemReward(customerId, rewardId, staffCode, memberName) {
    if (staffCode) {
      const codes = await this.maybeSelect('v33_functional_records', q => q.eq('resource', 'staff_codes').eq('customer_id', customerId).limit(200))
      const valid = codes.find(row => row.payload?.active !== false && String(row.payload?.code || '') === String(staffCode))
      if (!valid) throw new Error('Mitarbeitercode ungültig')

      const uses = n(valid.payload?.uses) + 1
      await this.upsertRecord('staff_codes', customerId, valid.local_id || valid.payload?.id || `staff_${customerId}`, {
        ...(valid.payload || {}),
        uses
      })
    }

    const redemption = await this.upsertRecord('redemptions', customerId, `redemption_${Date.now()}`, {
      reward_id: rewardId,
      staff_code_used: Boolean(staffCode),
      member_name: memberName || null,
      status: 'redeemed',
      redeemed_at: new Date().toISOString()
    })

    await this.maybeInsert('customer_timeline_events', {
      customer_id: customerId,
      event_type: 'reward_redeemed',
      title: 'Reward eingelöst',
      description: `${memberName || 'Endkunde'} hat einen Reward eingelöst.`,
      source_module: 'loyalty',
      severity: 'success',
      metadata: { reward_id: rewardId }
    })

    const snapshot = await this.recalculateCustomer(customerId)
    return { redemption, snapshot }
  }
}

module.exports = {
  V35BusinessEngine,
  sentimentFromRating
}
