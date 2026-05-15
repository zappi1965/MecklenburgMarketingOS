
function clamp(n, min=0, max=100) {
  return Math.max(min, Math.min(max, Number(n) || 0))
}

function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return { start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10) }
}

function addMonths(date = new Date(), count = 1) {
  return new Date(date.getFullYear(), date.getMonth() + count, date.getDate())
}

class RevenueDynamicBillingService {
  constructor(supabase) {
    this.supabase = supabase
  }

  async getSubscription(customer_id) {
    const { data } = await this.supabase
      .from('customer_subscriptions')
      .select('*')
      .eq('customer_id', customer_id)
      .order('created_at', { ascending:false })
      .limit(1)
      .maybeSingle()
    return data
  }

  async collectRevenueMetrics(customer_id, period_start, period_end) {
    const [
      invoices,
      appointments,
      pipeline,
      intelligence,
      health,
      qr,
      loyaltyMembers,
      loyaltyTx,
      reviews,
      automationRuns,
      aiMessages,
      tools
    ] = await Promise.all([
      this.supabase.from('invoices').select('*').eq('customer_id', customer_id),
      this.supabase.from('appointments').select('*').eq('customer_id', customer_id),
      this.supabase.from('pipeline_leads').select('*').eq('customer_id', customer_id),
      this.supabase.from('customer_intelligence_scores').select('*').eq('customer_id', customer_id).maybeSingle(),
      this.supabase.from('customer_health_snapshots').select('*').eq('customer_id', customer_id).maybeSingle(),
      this.supabase.from('qr_campaigns').select('*').eq('customer_id', customer_id),
      this.supabase.from('loyalty_customers').select('*').eq('customer_id', customer_id),
      this.supabase.from('loyalty_transactions').select('*').eq('customer_id', customer_id),
      this.supabase.from('review_feedback').select('*').eq('customer_id', customer_id),
      this.supabase.from('smart_automation_runs').select('*').eq('customer_id', customer_id),
      this.supabase.from('ai_business_assistant_messages').select('*').eq('customer_id', customer_id),
      this.supabase.from('customer_tool_usage').select('*').eq('customer_id', customer_id)
    ])

    const inv = invoices.data || []
    const appts = appointments.data || []
    const leads = pipeline.data || []
    const qrs = qr.data || []
    const lt = loyaltyTx.data || []

    const invoicedRevenue = inv.reduce((s,i)=>s + Number(i.amount || i.total || 0), 0)
    const bookingRevenue = appts.reduce((s,a)=>s + Number(a.price || 0), 0)
    const pipelineWeighted = leads.reduce((s,l)=>s + (Number(l.value || 0) * (Number(l.probability || 0) / 100)), 0)
    const qrScans = qrs.reduce((s,q)=>s + Number(q.scans || 0), 0)
    const qrConversions = qrs.reduce((s,q)=>s + Number(q.conversions || 0), 0)

    return {
      invoicedRevenue,
      bookingRevenue,
      actualRevenue: invoicedRevenue + bookingRevenue,
      pipelineWeighted,
      pipelineCount: leads.length,
      riskScore: Number(intelligence.data?.risk_score || 0),
      upsellScore: Number(intelligence.data?.upsell_score || 0),
      healthScore: Number(health.data?.health_score || 50),
      qrScans,
      qrConversions,
      loyaltyMembers: (loyaltyMembers.data || []).length,
      loyaltyTransactions: lt.length,
      reviewEvents: (reviews.data || []).length,
      automationRuns: (automationRuns.data || []).length,
      aiMessages: (aiMessages.data || []).length,
      activeTools: (tools.data || []).filter(t => Number(t.usage_count || 0) > 0).length,
      subscription: await this.getSubscription(customer_id)
    }
  }

  async createForecast({ customer_id, period_start=null, period_end=null }) {
    const next = monthRange(addMonths(new Date(), 1))
    period_start = period_start || next.start
    period_end = period_end || next.end

    const m = await this.collectRevenueMetrics(customer_id, period_start, period_end)
    const mrr = Number(m.subscription?.amount || m.subscription?.monthly_price || m.subscription?.price || 0)

    const churnRiskValue = mrr * (m.riskScore / 100)
    const expectedNew = m.pipelineWeighted * 0.85 + (m.upsellScore >= 65 ? 149 : 0)
    const expectedRevenue = Math.max(0, mrr + expectedNew - churnRiskValue)
    const confidence = clamp(
      45 +
      (m.pipelineCount > 0 ? 10 : 0) +
      (m.actualRevenue > 0 ? 15 : 0) +
      (m.healthScore >= 70 ? 10 : 0) -
      (m.riskScore >= 70 ? 15 : 0)
    )

    const drivers = []
    if (m.pipelineWeighted > 0) drivers.push({ type:'pipeline', text:`Gewichtete Pipeline: ${m.pipelineWeighted.toFixed(2)} EUR` })
    if (m.riskScore >= 60) drivers.push({ type:'risk', text:`Churn-Risiko belastet Forecast: ${churnRiskValue.toFixed(2)} EUR` })
    if (m.upsellScore >= 65) drivers.push({ type:'upsell', text:'Hohe Upgrade-Wahrscheinlichkeit erkannt.' })
    if (m.qrScans > 50) drivers.push({ type:'qr', text:'QR-Aktivität unterstützt Upsell-Potenzial.' })

    const payload = {
      customer_id,
      forecast_period:'monthly',
      period_start,
      period_end,
      expected_revenue: Math.round(expectedRevenue * 100) / 100,
      expected_mrr: mrr,
      expected_new_revenue: Math.round(expectedNew * 100) / 100,
      expected_churn_risk_value: Math.round(churnRiskValue * 100) / 100,
      pipeline_weighted_value: Math.round(m.pipelineWeighted * 100) / 100,
      confidence_score: Math.round(confidence),
      forecast_level: confidence >= 70 ? 'high' : confidence >= 45 ? 'medium' : 'low',
      drivers,
      metrics: m
    }

    const { data, error } = await this.supabase
      .from('revenue_forecasts')
      .upsert(payload, { onConflict:'customer_id,period_start,period_end' })
      .select('*')
      .single()
    if (error) throw error

    await this.supabase.from('customer_timeline_events').insert({
      customer_id,
      event_type:'revenue_forecast_created',
      title:'Revenue Forecast aktualisiert',
      description:`Erwarteter Umsatz: ${payload.expected_revenue.toFixed(2)} EUR, Confidence ${payload.confidence_score}/100.`,
      source_module:'revenue_forecasting',
      source_id:data.id,
      severity:'info',
      metadata:payload
    })

    return data
  }

  async calculateUsage({ customer_id, period_start=null, period_end=null }) {
    const range = period_start && period_end ? { start:period_start, end:period_end } : monthRange()
    const m = await this.collectRevenueMetrics(customer_id, range.start, range.end)

    const breakdown = {
      qr_scans: { quantity:m.qrScans, unit_price:0.01, amount:m.qrScans * 0.01 },
      loyalty_members: { quantity:m.loyaltyMembers, unit_price:0.10, amount:m.loyaltyMembers * 0.10 },
      review_events: { quantity:m.reviewEvents, unit_price:0.05, amount:m.reviewEvents * 0.05 },
      automation_runs: { quantity:m.automationRuns, unit_price:0.03, amount:m.automationRuns * 0.03 },
      ai_messages: { quantity:m.aiMessages, unit_price:0.02, amount:m.aiMessages * 0.02 }
    }

    const addon = Object.values(breakdown).reduce((s,item)=>s + Number(item.amount || 0), 0)

    const payload = {
      customer_id,
      period_start: range.start,
      period_end: range.end,
      qr_scans: m.qrScans,
      loyalty_members: m.loyaltyMembers,
      loyalty_transactions: m.loyaltyTransactions,
      review_events: m.reviewEvents,
      invoices_created: m.invoicedRevenue > 0 ? 1 : 0,
      automation_runs: m.automationRuns,
      ai_messages: m.aiMessages,
      active_tools: m.activeTools,
      calculated_addon_amount: Math.round(addon * 100) / 100,
      usage_breakdown: breakdown
    }

    const { data, error } = await this.supabase
      .from('dynamic_billing_usage')
      .upsert(payload, { onConflict:'customer_id,period_start,period_end' })
      .select('*')
      .single()
    if (error) throw error
    return data
  }

  async recommendPackage(customer_id) {
    const m = await this.collectRevenueMetrics(customer_id)
    const current = m.subscription?.package_key || m.subscription?.plan || 'starter'
    let recommended = current
    let reason = 'Aktuelles Paket passt.'
    let type = 'keep'
    let priority = 'low'
    let uplift = 0
    let confidence = 55

    if ((m.qrScans > 100 || m.loyaltyMembers > 50 || m.automationRuns > 40) && current !== 'premium') {
      recommended = 'premium'
      reason = 'Hohe QR-, Loyalty- oder Automationsnutzung spricht für Premium.'
      type = 'upgrade'
      priority = 'high'
      uplift = 299
      confidence = 82
    } else if ((m.qrScans > 25 || m.reviewEvents > 10 || m.activeTools >= 4) && false) {
      recommended = 'growth'
    }

    if (current === 'starter' && (m.qrScans > 25 || m.reviewEvents > 10 || m.activeTools >= 4)) {
      recommended = 'growth'
      reason = 'Nutzung liegt über Starter-Niveau. Growth wäre sinnvoll.'
      type = 'upgrade'
      priority = 'medium'
      uplift = 149
      confidence = 70
    }

    if (m.riskScore > 75) {
      reason += ' Achtung: hohes Risiko, Upgrade eher mit Onboarding kombinieren.'
      priority = priority === 'high' ? 'high' : 'medium'
      confidence = Math.max(45, confidence - 15)
    }

    const payload = {
      customer_id,
      current_package: current,
      recommended_package: recommended,
      reason,
      recommendation_type: type,
      priority,
      estimated_revenue_uplift: uplift,
      confidence_score: confidence,
      source_metrics: m,
      status:'open'
    }

    const { data, error } = await this.supabase.from('package_recommendations').insert(payload).select('*').single()
    if (error) throw error

    await this.supabase.from('customer_timeline_events').insert({
      customer_id,
      event_type:'package_recommendation_created',
      title:'Paketempfehlung erstellt',
      description:`Empfehlung: ${recommended}. ${reason}`,
      source_module:'dynamic_billing',
      source_id:data.id,
      severity:type === 'upgrade' ? 'success' : 'info',
      metadata:payload
    })

    return data
  }

  async calculateRevenueShare({ customer_id, gross_amount, source_type='subscription', source_id=null, rule_id=null }) {
    let rule = null
    if (rule_id) {
      const { data } = await this.supabase.from('revenue_share_rules').select('*').eq('id', rule_id).maybeSingle()
      rule = data
    } else {
      const sub = await this.getSubscription(customer_id)
      const { data } = await this.supabase
        .from('revenue_share_rules')
        .select('*')
        .or(`customer_id.eq.${customer_id},applies_to_package.eq.${sub?.package_key || sub?.plan || 'starter'}`)
        .eq('active', true)
        .limit(1)
        .maybeSingle()
      rule = data
    }

    if (!rule) {
      return { skipped:true, reason:'Keine Revenue-Share-Regel gefunden.' }
    }

    const gross = Number(gross_amount || 0)
    const share = rule.share_type === 'fixed'
      ? Number(rule.share_value || 0)
      : gross * (Number(rule.share_value || 0) / 100)

    const payload = {
      customer_id,
      rule_id: rule.id,
      source_type,
      source_id,
      gross_amount:gross,
      share_amount: Math.round(share * 100) / 100,
      platform_amount: Math.round((gross - share) * 100) / 100,
      currency:'EUR',
      status:'calculated',
      metadata:{ rule }
    }

    const { data, error } = await this.supabase.from('revenue_share_events').insert(payload).select('*').single()
    if (error) throw error
    return data
  }

  async createShareRule(payload) {
    const { data, error } = await this.supabase.from('revenue_share_rules').insert(payload).select('*').single()
    if (error) throw error
    return data
  }
}

module.exports = { RevenueDynamicBillingService, monthRange }
