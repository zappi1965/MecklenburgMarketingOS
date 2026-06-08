
class PackageBillingService {
  constructor(supabase) { this.supabase = supabase }

  async catalog() {
    const [packages, features, tools] = await Promise.all([
      this.supabase.from('package_catalog').select('*').eq('active', true).order('sort_order', { ascending:true }),
      this.supabase.from('package_features').select('*').order('sort_order', { ascending:true }),
      this.supabase.from('package_tools').select('*').order('sort_order', { ascending:true })
    ])
    if (packages.error) throw packages.error
    if (features.error) throw features.error
    if (tools.error) throw tools.error

    return (packages.data || []).map(pkg => ({
      ...pkg,
      features: (features.data || []).filter(f => f.package_key === pkg.key),
      tools: (tools.data || []).filter(t => t.package_key === pkg.key && t.visible_to_customer)
    }))
  }

  async activeSubscription(customer_id) {
    const { data, error } = await this.supabase
      .from('customer_subscriptions')
      .select('*')
      .eq('customer_id', customer_id)
      .in('status', ['active','Aktiv'])
      .order('created_at', { ascending:false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async allowedTools(customer_id) {
    const sub = await this.activeSubscription(customer_id)
    const packageKey = sub?.package_key || String(sub?.package_name || 'starter').toLowerCase()
    const { data: defaults, error: defaultsError } = await this.supabase
      .from('package_tools')
      .select('*')
      .eq('package_key', packageKey)
      .eq('visible_to_customer', true)
      .eq('enabled_by_default', true)
      .order('sort_order', { ascending:true })
    if (defaultsError) throw defaultsError

    const { data: overrides } = await this.supabase
      .from('customer_tool_access')
      .select('*')
      .eq('customer_id', customer_id)

    const disabled = new Set((overrides || []).filter(t => t.enabled === false).map(t => t.tool_key))
    const enabledExtra = (overrides || []).filter(t => t.enabled === true)

    const base = (defaults || []).filter(t => !disabled.has(t.tool_key))
    const baseKeys = new Set(base.map(t => t.tool_key))
    const extras = enabledExtra.filter(t => !baseKeys.has(t.tool_key)).map(t => ({
      tool_key: t.tool_key,
      label: t.tool_key,
      description: 'Individuell freigeschaltet',
      sort_order: 999
    }))

    return { subscription: sub, package_key: packageKey, tools: [...base, ...extras].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)) }
  }

  async requestPackage({ customer_id, package_key, requested_by, billing_interval='month' }) {
    const catalog = await this.catalog()
    const pkg = catalog.find(p => p.key === package_key)
    if (!pkg) throw new Error('Paket nicht gefunden')
    const { data, error } = await this.supabase.from('package_requests').insert({
      customer_id,
      package_key,
      package_name: pkg.name,
      requested_price: billing_interval === 'year' ? pkg.yearly_price : pkg.monthly_price,
      billing_interval,
      status: 'Angefragt',
      requested_by: requested_by || 'Kunde'
    }).select('*').single()
    if (error) throw error
    return data
  }

  async grantPackage({ customer_id, package_key, billing_status='active', provider='manual' }) {
    const catalog = await this.catalog()
    const pkg = catalog.find(p => p.key === package_key)
    if (!pkg) throw new Error('Paket nicht gefunden')

    const { data: sub, error } = await this.supabase.from('customer_subscriptions').insert({
      customer_id,
      package_key,
      package_name: pkg.name,
      status: 'active',
      billing_status,
      provider,
      started_at: new Date().toISOString(),
      current_period_start: new Date().toISOString()
    }).select('*').single()
    if (error) throw error

    for (const tool of pkg.tools || []) {
      await this.supabase.from('customer_tool_access').upsert({
        customer_id,
        tool_key: tool.tool_key,
        enabled: true,
        package_key,
        source: 'package',
        granted_by: 'Admin'
      }, { onConflict: 'customer_id,tool_key' })
    }

    return sub
  }
}
module.exports = PackageBillingService
