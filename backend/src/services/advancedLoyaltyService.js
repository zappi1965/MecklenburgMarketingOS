
function daysSince(dateValue) {
  if (!dateValue) return 9999
  const diff = Date.now() - new Date(dateValue).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

class AdvancedLoyaltyService {
  constructor(supabase) {
    this.supabase = supabase
  }

  async ensureDefaults({ customer_id, loyalty_program_id }) {
    const defaultSegments = [
      { segment_key:'vip', name:'VIP Kunden', description:'Sehr aktive Endkunden mit hohem Punktestand.', rule_config:{ min_points:500 } },
      { segment_key:'inactive', name:'Inaktive Endkunden', description:'Endkunden ohne Aktivität seit 30 Tagen.', rule_config:{ inactive_days:30 } },
      { segment_key:'review_active', name:'Bewertungsaktive Endkunden', description:'Endkunden mit mindestens einer Bewertung.', rule_config:{ min_reviews:1 } },
      { segment_key:'new_member', name:'Neue Mitglieder', description:'Neue Loyalty-Mitglieder der letzten 14 Tage.', rule_config:{ member_since_days_lte:14 } },
      { segment_key:'reward_ready', name:'Reward-bereit', description:'Endkunden mit mindestens 100 Punkten.', rule_config:{ min_points:100 } }
    ]

    const defaultTiers = [
      { tier_key:'basic', name:'Basic', min_points:0, min_scans:0, min_reviews:0, multiplier:1, sort_order:1, benefits:['Standardpunkte'] },
      { tier_key:'silver', name:'Silver', min_points:250, min_scans:3, min_reviews:0, multiplier:1.1, sort_order:2, benefits:['10% Punktebonus'] },
      { tier_key:'gold', name:'Gold', min_points:500, min_scans:8, min_reviews:1, multiplier:1.25, sort_order:3, benefits:['25% Punktebonus','Exklusive Rewards'] },
      { tier_key:'vip', name:'VIP', min_points:1000, min_scans:15, min_reviews:2, multiplier:1.5, sort_order:4, benefits:['50% Punktebonus','VIP Rewards'] }
    ]

    for (const segment of defaultSegments) {
      await this.supabase.from('loyalty_segments').upsert({
        customer_id, loyalty_program_id, ...segment, active:true
      }, { onConflict:'customer_id,loyalty_program_id,segment_key' })
    }

    for (const tier of defaultTiers) {
      await this.supabase.from('loyalty_tiers').upsert({
        customer_id, loyalty_program_id, ...tier, active:true
      }, { onConflict:'loyalty_program_id,tier_key' })
    }

    return { ok:true }
  }

  async getProgramContext(loyalty_program_id) {
    const [program, members, segments, tiers, pointRules, rewards, smartActions] = await Promise.all([
      this.supabase.from('loyalty_programs').select('*').eq('id', loyalty_program_id).single(),
      this.supabase.from('loyalty_customers').select('*').eq('loyalty_program_id', loyalty_program_id),
      this.supabase.from('loyalty_segments').select('*').eq('loyalty_program_id', loyalty_program_id).eq('active', true),
      this.supabase.from('loyalty_tiers').select('*').eq('loyalty_program_id', loyalty_program_id).eq('active', true).order('sort_order', { ascending:true }),
      this.supabase.from('loyalty_point_rules').select('*').eq('loyalty_program_id', loyalty_program_id).eq('active', true).order('priority', { ascending:true }),
      this.supabase.from('loyalty_rewards').select('*').eq('loyalty_program_id', loyalty_program_id),
      this.supabase.from('loyalty_smart_actions').select('*').eq('loyalty_program_id', loyalty_program_id)
    ])
    if (program.error) throw program.error
    return {
      program: program.data,
      members: members.data || [],
      segments: segments.data || [],
      tiers: tiers.data || [],
      pointRules: pointRules.data || [],
      rewards: rewards.data || [],
      smartActions: smartActions.data || []
    }
  }

  evaluateSegment(member, segment) {
    const r = segment.rule_config || {}
    if (r.min_points !== undefined && Number(member.points_balance || 0) < Number(r.min_points)) return false
    if (r.min_scans !== undefined && Number(member.total_scans || 0) < Number(r.min_scans)) return false
    if (r.min_reviews !== undefined && Number(member.total_reviews || 0) < Number(r.min_reviews)) return false
    if (r.inactive_days !== undefined && daysSince(member.last_activity_at || member.last_seen_at || member.created_at) < Number(r.inactive_days)) return false
    if (r.member_since_days_lte !== undefined && daysSince(member.created_at) > Number(r.member_since_days_lte)) return false
    return true
  }

  pickTier(member, tiers) {
    const sorted = [...tiers].sort((a,b)=>Number(b.min_points||0)-Number(a.min_points||0))
    for (const tier of sorted) {
      if (
        Number(member.points_balance || 0) >= Number(tier.min_points || 0) &&
        Number(member.total_scans || 0) >= Number(tier.min_scans || 0) &&
        Number(member.total_reviews || 0) >= Number(tier.min_reviews || 0)
      ) return tier
    }
    return tiers.find(t=>t.tier_key==='basic') || null
  }

  async rebuildStats(loyalty_program_id) {
    const ctx = await this.getProgramContext(loyalty_program_id)

    for (const member of ctx.members) {
      const tx = await this.supabase.from('loyalty_transactions').select('*').eq('loyalty_customer_id', member.id)
      const reviews = await this.supabase.from('review_feedback').select('*').eq('loyalty_customer_id', member.id)
      const totalScans = (tx.data || []).filter(t => t.action === 'qr_scan').length
      const totalReviews = (reviews.data || []).length
      const lastTx = (tx.data || []).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0]
      await this.supabase.from('loyalty_customers').update({
        total_scans: totalScans,
        total_reviews: totalReviews,
        last_activity_at: lastTx?.created_at || member.last_seen_at || member.created_at
      }).eq('id', member.id)
    }

    return this.segmentProgram(loyalty_program_id)
  }

  async segmentProgram(loyalty_program_id) {
    const ctx = await this.getProgramContext(loyalty_program_id)
    const result = []

    for (const member of ctx.members) {
      const matched = []
      for (const segment of ctx.segments) {
        if (this.evaluateSegment(member, segment)) {
          matched.push(segment)
          await this.supabase.from('loyalty_member_segments').upsert({
            customer_id: ctx.program.customer_id,
            loyalty_program_id,
            loyalty_customer_id: member.id,
            segment_id: segment.id,
            assigned_reason: `Regel ${segment.segment_key} erfüllt`
          }, { onConflict:'loyalty_customer_id,segment_id' })
        }
      }

      const tier = this.pickTier(member, ctx.tiers)
      await this.supabase.from('loyalty_customers').update({
        current_tier: tier?.tier_key || 'basic',
        segment_summary: matched.map(s => ({ id:s.id, key:s.segment_key, name:s.name }))
      }).eq('id', member.id)

      result.push({ member_id: member.id, segments: matched.map(s=>s.segment_key), tier: tier?.tier_key || 'basic' })
    }

    for (const segment of ctx.segments) {
      const count = result.filter(r => r.segments.includes(segment.segment_key)).length
      await this.supabase.from('loyalty_segments').update({ member_count: count, updated_at:new Date().toISOString() }).eq('id', segment.id)
    }

    await this.supabase.from('customer_timeline_events').insert({
      customer_id: ctx.program.customer_id,
      event_type:'loyalty_segmentation_updated',
      title:'Loyalty-Segmente aktualisiert',
      description:`${result.length} Endkunden wurden segmentiert.`,
      source_module:'loyalty_segments',
      severity:'info',
      metadata:{ loyalty_program_id, result }
    })

    return { program: ctx.program, result }
  }

  async calculatePoints({ loyalty_program_id, loyalty_customer_id, trigger_key='qr_scan', base_points=10, qr_campaign_id=null }) {
    const ctx = await this.getProgramContext(loyalty_program_id)
    const member = ctx.members.find(m => m.id === loyalty_customer_id)
    if (!member) throw new Error('Loyalty-Kunde nicht gefunden')

    const tier = this.pickTier(member, ctx.tiers)
    let points = Number(base_points || 0)
    const applied = []

    if (tier?.multiplier) {
      points = Math.round(points * Number(tier.multiplier || 1))
      applied.push({ type:'tier_multiplier', tier:tier.tier_key, multiplier:tier.multiplier })
    }

    const now = new Date()
    for (const rule of ctx.pointRules) {
      if (rule.trigger_key !== trigger_key) continue
      if (rule.qr_campaign_id && qr_campaign_id && rule.qr_campaign_id !== qr_campaign_id) continue
      if (rule.valid_from && new Date(rule.valid_from) > now) continue
      if (rule.valid_until && new Date(rule.valid_until) < now) continue

      const c = rule.condition_config || {}
      if (c.weekdays && Array.isArray(c.weekdays) && !c.weekdays.includes(now.getDay())) continue
      if (c.hours && Array.isArray(c.hours) && !c.hours.includes(now.getHours())) continue
      if (c.segment_key && !(member.segment_summary || []).some(s => s.key === c.segment_key)) continue

      points = Math.round(points * Number(rule.multiplier || 1) + Number(rule.points_delta || 0))
      applied.push({ type:'point_rule', id:rule.id, name:rule.name, delta:rule.points_delta, multiplier:rule.multiplier })
    }

    return { points: Math.max(0, points), applied, tier: tier?.tier_key || 'basic' }
  }

  async createPointRule(payload) {
    const { data, error } = await this.supabase.from('loyalty_point_rules').insert(payload).select('*').single()
    if (error) throw error
    return data
  }

  async createSmartAction(payload) {
    const { data, error } = await this.supabase.from('loyalty_smart_actions').insert(payload).select('*').single()
    if (error) throw error

    await this.supabase.from('customer_timeline_events').insert({
      customer_id: data.customer_id,
      event_type:'loyalty_smart_action_created',
      title:'Loyalty Smart Action erstellt',
      description:`${data.name} wurde vorbereitet.`,
      source_module:'smart_loyalty',
      source_id:data.id,
      severity:'success',
      metadata:data
    })

    return data
  }

  async createMarketingFromSegment({ loyalty_program_id, segment_id, campaign_type='reactivation', reward_id=null }) {
    const { data:segment, error:se } = await this.supabase.from('loyalty_segments').select('*').eq('id', segment_id).single()
    if (se) throw se
    const { data:program, error:pe } = await this.supabase.from('loyalty_programs').select('*').eq('id', loyalty_program_id).single()
    if (pe) throw pe

    const { data:campaign, error } = await this.supabase.from('marketing_automation_campaigns').insert({
      customer_id: program.customer_id,
      name: `${segment.name} Kampagne`,
      campaign_type,
      status:'draft',
      audience_config:{ loyalty_segment_id: segment.id, segment_key:segment.segment_key, member_count:segment.member_count },
      trigger_config:{ trigger:'manual_segment_campaign' },
      message_config:{ subject:`Aktion für ${segment.name}`, body:'Spezielle Aktion für diese Kundengruppe.' },
      linked_loyalty_program_id: loyalty_program_id,
      linked_reward_id: reward_id
    }).select('*').single()
    if (error) throw error

    await this.createSmartAction({
      customer_id: program.customer_id,
      loyalty_program_id,
      segment_id,
      name:`Marketing Automation für ${segment.name}`,
      action_type:campaign_type,
      status:'draft',
      reward_id,
      marketing_campaign_id:campaign.id,
      message_config:campaign.message_config,
      trigger_config:campaign.trigger_config
    })

    return campaign
  }
}

module.exports = { AdvancedLoyaltyService }
