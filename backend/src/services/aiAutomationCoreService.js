
function clamp(n,min=0,max=100){ return Math.max(min, Math.min(max, Number(n)||0)) }
function healthLevel(score){ if(score>=75) return 'green'; if(score>=45) return 'yellow'; return 'red' }

class AiAutomationCoreService {
  constructor(supabase) { this.supabase = supabase }

  async getCustomerIntelligence(customer_id) {
    let { data } = await this.supabase.from('customer_intelligence_scores').select('*').eq('customer_id', customer_id).maybeSingle()
    return data
  }

  async timeline(customer_id, payload) {
    await this.supabase.from('customer_timeline_events').insert({
      customer_id,
      event_type: payload.event_type || 'automation_event',
      title: payload.title,
      description: payload.description || null,
      source_module: payload.source_module || 'smart_automation',
      source_id: payload.source_id || null,
      severity: payload.severity || 'info',
      actor_name: 'Smart Automation',
      metadata: payload.metadata || {}
    })
  }

  async assistantMessage({ customer_id, title, message, recommendation_type='general', severity='info', source_modules=[], related_entity_type=null, related_entity_id=null, metadata={} }) {
    const { data, error } = await this.supabase.from('ai_business_assistant_messages').insert({
      customer_id, title, message, recommendation_type, severity, source_modules, related_entity_type, related_entity_id, metadata
    }).select('*').single()
    if(error) throw error
    return data
  }

  async calculateHealth(customer_id) {
    const intelligence = await this.getCustomerIntelligence(customer_id)
    const metrics = intelligence?.metrics || {}

    const revenueHealth = clamp((Number(metrics.revenue||0) / 1000) * 70 + (Number(metrics.monthlyRecurring||0) / 500) * 30)
    const usageHealth = clamp(Number(intelligence?.package_usage_score || metrics.packageUsageScore || 0))
    const reviewHealth = clamp(Number(intelligence?.review_health_score || 65))
    const loyaltyHealth = clamp(Number(intelligence?.loyalty_engagement_score || 0))
    const supportHealth = clamp(100 - (Number(metrics.openTickets||0) * 18))
    const qrHealth = clamp(Number(metrics.qrScans||0) > 0 ? Math.min(100, Number(metrics.qrScans||0) / 2 + Number(metrics.qrConversions||0) * 3) : 35)

    const healthScore = clamp(Math.round(
      revenueHealth * .18 +
      usageHealth * .20 +
      reviewHealth * .20 +
      loyaltyHealth * .15 +
      supportHealth * .15 +
      qrHealth * .12 -
      Number(intelligence?.risk_score || 0) * .12
    ))

    const warnings = []
    const opportunities = []
    if (healthScore < 45) warnings.push({ type:'health_red', text:'Kunde ist kritisch. Proaktiver Kontakt empfohlen.' })
    if (Number(intelligence?.risk_score||0) >= 65) warnings.push({ type:'risk', text:'Hohes Kündigungs-/Unzufriedenheitsrisiko.' })
    if (Number(metrics.openTickets||0) >= 3) warnings.push({ type:'support', text:'Viele offene Tickets.' })
    if (reviewHealth < 55) warnings.push({ type:'reviews', text:'Bewertungsgesundheit niedrig.' })
    if (usageHealth < 40) warnings.push({ type:'usage', text:'Geringe Paket-/Toolnutzung.' })

    if (Number(intelligence?.upsell_score||0) >= 65) opportunities.push({ type:'upsell', text:'Hohe Upsell-Chance.' })
    if (Number(metrics.qrScans||0) > 50) opportunities.push({ type:'qr', text:'QR-Kampagnen zeigen starkes Interesse.' })
    if (loyaltyHealth > 60) opportunities.push({ type:'loyalty', text:'Loyalty-Nutzung ist stark.' })

    const snapshot = {
      customer_id,
      health_score: healthScore,
      health_level: healthLevel(healthScore),
      revenue_health: Math.round(revenueHealth),
      usage_health: Math.round(usageHealth),
      review_health: Math.round(reviewHealth),
      loyalty_health: Math.round(loyaltyHealth),
      support_health: Math.round(supportHealth),
      qr_health: Math.round(qrHealth),
      warnings,
      opportunities,
      metrics,
      calculated_at: new Date().toISOString()
    }

    const { data, error } = await this.supabase.from('customer_health_snapshots').upsert(snapshot, { onConflict:'customer_id' }).select('*').single()
    if(error) throw error

    await this.timeline(customer_id, {
      event_type:'customer_health_calculated',
      title:'Customer Health aktualisiert',
      description:`Health Score: ${healthScore}/100 (${snapshot.health_level}).`,
      severity: snapshot.health_level === 'red' ? 'warning' : 'info',
      metadata: snapshot
    })

    return data
  }

  async generateAssistant(customer_id) {
    const intelligence = await this.getCustomerIntelligence(customer_id)
    const health = await this.calculateHealth(customer_id)
    const created = []

    if (!intelligence && !health) return []

    if (health.health_level === 'red') created.push(await this.assistantMessage({
      customer_id,
      title:'Kritischer Customer Health Status',
      message:'Der Kunde ist im roten Bereich. Prüfe offene Tickets, Toolnutzung und aktuelle Bewertungen.',
      recommendation_type:'health',
      severity:'warning',
      source_modules:['customer_health','customer_intelligence'],
      metadata:{ health }
    }))

    if (Number(intelligence?.upsell_score || 0) >= 65) created.push(await this.assistantMessage({
      customer_id,
      title:'Hohe Upsell-Chance erkannt',
      message:'Der Kunde zeigt starke Aktivität. Ein Upgrade-Angebot oder Premium-Modul könnte sinnvoll sein.',
      recommendation_type:'upsell',
      severity:'success',
      source_modules:['pipeline','qr','loyalty','customer_intelligence'],
      metadata:{ intelligence }
    }))

    if (Number(intelligence?.package_usage_score || 0) <= 40) created.push(await this.assistantMessage({
      customer_id,
      title:'Geringe Paketnutzung',
      message:'Der Kunde nutzt nur wenige freigeschaltete Tools. Ein kurzes Onboarding oder Tutorial kann die Bindung erhöhen.',
      recommendation_type:'adoption',
      severity:'info',
      source_modules:['packages','tool_usage'],
      metadata:{ intelligence }
    }))

    if (Number(health.review_health || 0) < 55) created.push(await this.assistantMessage({
      customer_id,
      title:'Review Health niedrig',
      message:'Die Bewertungsqualität oder Feedbacklage ist auffällig. Review Funnel und internes Feedback prüfen.',
      recommendation_type:'reviews',
      severity:'warning',
      source_modules:['reviews','loyalty'],
      metadata:{ health }
    }))

    return created
  }

  async createMarketingCampaign({ customer_id, campaign_type='reactivation', name, linked_qr_campaign_id=null, linked_loyalty_program_id=null, linked_reward_id=null, audience_config={}, trigger_config={}, message_config={} }) {
    const defaults = {
      reactivation: {
        audience_config:{ segment:'inactive_loyalty_customers', inactive_days:30 },
        trigger_config:{ trigger:'no_visit_since_days', days:30 },
        message_config:{ subject:'Wir vermissen dich', body:'Komm zurück und sichere dir deinen nächsten Bonus.' }
      },
      review_request: {
        audience_config:{ segment:'recent_positive_customers' },
        trigger_config:{ trigger:'after_reward_or_booking' },
        message_config:{ subject:'Wie zufrieden warst du?', body:'Teile deine Erfahrung und hilf uns besser zu werden.' }
      },
      loyalty_boost: {
        audience_config:{ segment:'all_loyalty_members' },
        trigger_config:{ trigger:'manual_or_scheduled' },
        message_config:{ subject:'Doppelte Punkte Aktion', body:'Sammle jetzt mehr Punkte für deinen nächsten Reward.' }
      }
    }
    const base = defaults[campaign_type] || defaults.reactivation
    const { data, error } = await this.supabase.from('marketing_automation_campaigns').insert({
      customer_id,
      name: name || base.message_config.subject,
      campaign_type,
      status:'draft',
      audience_config:{ ...base.audience_config, ...audience_config },
      trigger_config:{ ...base.trigger_config, ...trigger_config },
      message_config:{ ...base.message_config, ...message_config },
      linked_qr_campaign_id,
      linked_loyalty_program_id,
      linked_reward_id
    }).select('*').single()
    if(error) throw error

    await this.timeline(customer_id, {
      event_type:'marketing_campaign_created',
      title:'Marketing Automation Kampagne erstellt',
      description:`Kampagne "${data.name}" wurde vorbereitet.`,
      source_module:'marketing_automation',
      source_id:data.id,
      severity:'success',
      metadata:data
    })
    return data
  }

  async evaluateRuleForCustomer(rule, customer_id) {
    const intelligence = await this.getCustomerIntelligence(customer_id)
    const health = await this.calculateHealth(customer_id)
    const c = rule.condition_config || {}
    let matched = false

    if (rule.trigger_key === 'usage.low') matched = Number(intelligence?.package_usage_score || 100) <= Number(c.package_usage_lte || 40)
    if (rule.trigger_key === 'health.risk_high') matched = Number(intelligence?.risk_score || 0) >= Number(c.risk_gte || 65)
    if (rule.trigger_key === 'health.upsell_high') matched = Number(intelligence?.upsell_score || 0) >= Number(c.upsell_gte || 65)
    if (rule.trigger_key === 'qr.performance_high') {
      const m = intelligence?.metrics || {}
      matched = Number(m.qrScans || 0) >= Number(c.min_scans || 25) || Number(m.qrConversions || 0) >= Number(c.min_conversions || 5)
    }
    if (rule.trigger_key === 'review.negative') {
      const m = intelligence?.metrics || {}
      matched = Number(m.negativeReviews || 0) > 0
    }

    if (!matched) return { matched:false }

    const actions = []
    const a = rule.action_config || {}

    if (a.create_assistant_message) {
      const msg = await this.assistantMessage({
        customer_id,
        title:`Automation: ${rule.name}`,
        message: rule.description || 'Eine Smart Automation wurde ausgelöst.',
        recommendation_type: rule.trigger_key,
        severity: rule.trigger_key.includes('risk') || rule.trigger_key.includes('negative') ? 'warning' : 'info',
        source_modules:['smart_automation','customer_intelligence'],
        metadata:{ rule_id:rule.id, intelligence, health }
      })
      actions.push({ type:'assistant_message', id:msg.id })
    }

    if (a.create_pipeline_lead) {
      const { data:lead, error } = await this.supabase.from('pipeline_leads').insert({
        customer_id,
        title:`Smart Opportunity: ${rule.name}`,
        source:'smart_automation',
        stage:'qualified',
        value:499,
        probability: Number(intelligence?.upsell_score || 50),
        metadata:{ rule_id:rule.id, trigger:rule.trigger_key }
      }).select('*').single()
      if (!error) actions.push({ type:'pipeline_lead', id:lead.id })
    }

    if (a.timeline) {
      await this.timeline(customer_id, {
        event_type:'smart_automation_triggered',
        title:`Automation ausgelöst: ${rule.name}`,
        description: rule.description,
        severity: rule.trigger_key.includes('risk') || rule.trigger_key.includes('negative') ? 'warning' : 'info',
        metadata:{ rule, intelligence, health }
      })
      actions.push({ type:'timeline' })
    }

    return { matched:true, actions }
  }

  async runAutomations({ customer_id, trigger_key=null }) {
    let q = this.supabase.from('smart_automation_rules').select('*').eq('active', true)
    if (trigger_key) q = q.eq('trigger_key', trigger_key)
    const { data:rules, error } = await q
    if(error) throw error

    const results = []
    for (const rule of (rules || [])) {
      if (rule.customer_id && rule.customer_id !== customer_id) continue
      const result = await this.evaluateRuleForCustomer(rule, customer_id)
      const { data:run } = await this.supabase.from('smart_automation_runs').insert({
        rule_id: rule.id,
        customer_id,
        trigger_key: rule.trigger_key,
        status: result.matched ? 'executed' : 'skipped',
        actions_executed: result.actions || [],
        result
      }).select('*').single()
      if (result.matched) {
        await this.supabase.from('smart_automation_rules').update({ run_count:Number(rule.run_count||0)+1, last_run_at:new Date().toISOString(), updated_at:new Date().toISOString() }).eq('id', rule.id)
      }
      results.push(run)
    }
    return results
  }
}

module.exports = { AiAutomationCoreService }
