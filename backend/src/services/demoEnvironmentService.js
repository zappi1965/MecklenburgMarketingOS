class DemoEnvironmentService {
  constructor(supabase) {
    this.supabase = supabase
    this.demoCustomerId = '11111111-1111-1111-1111-111111111111'
  }

  async safe(table, builder) {
    try {
      let q = this.supabase.from(table).select('*')
      if (builder) q = builder(q)
      const { data, error } = await q
      if (error) return []
      return data || []
    } catch (_) { return [] }
  }

  async one(table, builder) {
    try {
      let q = this.supabase.from(table).select('*')
      if (builder) q = builder(q)
      const { data, error } = await q.maybeSingle()
      if (error) return null
      return data
    } catch (_) { return null }
  }

  async dashboard() {
    const customer_id = this.demoCustomerId
    const [customer, tools, qr, loyaltyCustomers, rewards, reviews, reviewProfile, health, intelligence, assistant, forecasts, usages, pipeline, invoices, appointments, timeline, marketing] = await Promise.all([
      this.one('customers', q => q.eq('id', customer_id)),
      this.safe('customer_tool_access', q => q.eq('customer_id', customer_id)),
      this.safe('qr_campaigns', q => q.eq('customer_id', customer_id)),
      this.safe('loyalty_customers', q => q.eq('customer_id', customer_id)),
      this.safe('loyalty_rewards', q => q.eq('customer_id', customer_id)),
      this.safe('review_feedback', q => q.eq('customer_id', customer_id)),
      this.one('review_intelligence_profiles', q => q.eq('customer_id', customer_id)),
      this.one('customer_health_snapshots', q => q.eq('customer_id', customer_id)),
      this.one('customer_intelligence_scores', q => q.eq('customer_id', customer_id)),
      this.safe('ai_business_assistant_messages', q => q.eq('customer_id', customer_id).order('created_at', { ascending: false }).limit(10)),
      this.safe('revenue_forecasts', q => q.eq('customer_id', customer_id).order('created_at', { ascending: false }).limit(1)),
      this.safe('dynamic_billing_usage', q => q.eq('customer_id', customer_id).order('created_at', { ascending: false }).limit(1)),
      this.safe('pipeline_leads', q => q.eq('customer_id', customer_id)),
      this.safe('invoices', q => q.eq('customer_id', customer_id)),
      this.safe('appointments', q => q.eq('customer_id', customer_id)),
      this.safe('customer_timeline_events', q => q.eq('customer_id', customer_id).order('created_at', { ascending: false }).limit(20)),
      this.safe('marketing_automation_campaigns', q => q.eq('customer_id', customer_id))
    ])

    return {
      customer,
      modules: { enabledTools: tools.filter(t => t.enabled).length, totalTools: tools.length, tools },
      kpis: {
        qrScans: qr.reduce((s, q) => s + Number(q.scans || 0), 0),
        qrConversions: qr.reduce((s, q) => s + Number(q.conversions || 0), 0),
        loyaltyMembers: loyaltyCustomers.length,
        rewards: rewards.length,
        reviews: reviews.length,
        avgRating: reviews.length ? reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length : 0,
        revenue: invoices.reduce((s, i) => s + Number(i.total || i.amount || 0), 0),
        pipelineWeighted: pipeline.reduce((s, l) => s + Number(l.value || 0) * (Number(l.probability || 0) / 100), 0),
        appointments: appointments.length,
        aiMessages: assistant.length
      },
      qr,
      loyalty: { members: loyaltyCustomers, rewards },
      reviews: { items: reviews, profile: reviewProfile },
      intelligence,
      health,
      assistant,
      revenue: { forecast: forecasts[0] || null, usage: usages[0] || null },
      pipeline,
      invoices,
      appointments,
      timeline,
      marketing
    }
  }

  async check() {
    try {
      await this.supabase.from('customer_timeline_events').insert({
        customer_id: this.demoCustomerId,
        event_type: 'demo_sync_checked',
        title: 'Interne Testumgebung geprüft',
        description: 'Testdaten sind auf aktuellem V28 Stand verfügbar.',
        source_module: 'demo_environment',
        severity: 'info',
        actor_name: 'System',
        metadata: { version: 'v28' }
      })
    } catch (_) {}
    return { ok: true, demoCustomerId: this.demoCustomerId }
  }
}

module.exports = { DemoEnvironmentService }
