
class EnterpriseService {
  constructor(supabase) {
    this.supabase = supabase
  }

  async getDefaultTenant() {
    const { data, error } = await this.supabase
      .from('tenants')
      .select('*')
      .eq('slug', 'mecklenburgmarketingos')
      .maybeSingle()
    if (error) throw error
    return data
  }

  async getOverview() {
    const [tenants, events, jobs, security, backups, flags] = await Promise.all([
      this.supabase.from('tenants').select('*').order('created_at', { ascending: false }).limit(20),
      this.supabase.from('enterprise_events').select('*').order('created_at', { ascending: false }).limit(30),
      this.supabase.from('enterprise_job_queue').select('*').order('created_at', { ascending: false }).limit(30),
      this.supabase.from('security_events').select('*').order('created_at', { ascending: false }).limit(30),
      this.supabase.from('backup_jobs').select('*').order('created_at', { ascending: false }).limit(30),
      this.supabase.from('feature_flags').select('*').order('key', { ascending: true }).limit(100)
    ])

    return {
      tenants: tenants.data || [],
      events: events.data || [],
      jobs: jobs.data || [],
      security_events: security.data || [],
      backup_jobs: backups.data || [],
      feature_flags: flags.data || []
    }
  }

  async createEvent({ tenant_id, customer_id, event_type, title, payload, severity = 'info', created_by = 'System' }) {
    const tenant = tenant_id ? { id: tenant_id } : await this.getDefaultTenant()
    const { data, error } = await this.supabase.from('enterprise_events').insert({
      tenant_id: tenant?.id,
      customer_id: customer_id || null,
      event_type,
      title,
      payload: payload || {},
      severity,
      created_by
    }).select('*').single()
    if (error) throw error
    return data
  }

  async enqueueJob({ tenant_id, customer_id, job_type, priority = 5, payload = {} }) {
    const tenant = tenant_id ? { id: tenant_id } : await this.getDefaultTenant()
    const { data, error } = await this.supabase.from('enterprise_job_queue').insert({
      tenant_id: tenant?.id,
      customer_id: customer_id || null,
      job_type,
      priority,
      payload,
      status: 'pending'
    }).select('*').single()
    if (error) throw error
    await this.createEvent({
      tenant_id: tenant?.id,
      customer_id,
      event_type: 'job_queued',
      title: `Job geplant: ${job_type}`,
      payload: { job_id: data.id, job_type },
      severity: 'info'
    })
    return data
  }

  async logSecurityEvent({ tenant_id, actor_id, actor_name, event_type, ip, user_agent, severity='info', metadata={} }) {
    const tenant = tenant_id ? { id: tenant_id } : await this.getDefaultTenant()
    const { data, error } = await this.supabase.from('security_events').insert({
      tenant_id: tenant?.id,
      actor_id: actor_id || null,
      actor_name: actor_name || 'System',
      event_type,
      ip,
      user_agent,
      severity,
      metadata
    }).select('*').single()
    if (error) throw error
    return data
  }

  async planBackup({ tenant_id, label='Manueller Restore Point', backup_type='database', metadata={} }) {
    const tenant = tenant_id ? { id: tenant_id } : await this.getDefaultTenant()
    const { data, error } = await this.supabase.from('backup_jobs').insert({
      tenant_id: tenant?.id,
      label,
      backup_type,
      status: 'planned',
      metadata,
      created_by: 'Admin'
    }).select('*').single()
    if (error) throw error
    await this.enqueueJob({
      tenant_id: tenant?.id,
      job_type: 'backup_snapshot',
      priority: 2,
      payload: { backup_job_id: data.id, backup_type }
    })
    return data
  }

  async setFeatureFlag({ tenant_id, key, enabled, config={} }) {
    const tenant = tenant_id ? { id: tenant_id } : await this.getDefaultTenant()
    const { data, error } = await this.supabase.from('feature_flags').upsert({
      tenant_id: tenant?.id,
      key,
      enabled,
      config
    }, { onConflict: 'tenant_id,key' }).select('*').single()
    if (error) throw error
    return data
  }
}

module.exports = EnterpriseService
