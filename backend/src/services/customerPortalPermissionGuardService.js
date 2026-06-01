const { evaluateToolAccessPolicy } = require('./toolAccessPolicyService')

async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

function activeStatus(row = {}) {
  const s = String(row.status || '').toLowerCase()
  return !['deleted','archived','blocked','gesperrt','inactive','inaktiv','cancelled','gekündigt'].includes(s) && row.active !== false && row.is_deleted !== true && !row.deleted_at
}

async function inspectCustomerPortalPermissions(supabase, { customer_id, user_id = null, tool_key = null } = {}) {
  if (!supabase || !customer_id) return { ok: false, error: 'customer_id fehlt', checks: [] }
  const [customerRes, userRowsRes, toolsRes, subscriptionRes] = await Promise.all([
    safeQuery(supabase.from('customers').select('*').eq('id', customer_id).maybeSingle()),
    user_id ? safeQuery(supabase.from('customer_users').select('*').eq('customer_id', customer_id).eq('auth_user_id', user_id).limit(10)) : safeQuery(supabase.from('customer_users').select('*').eq('customer_id', customer_id).limit(50)),
    safeQuery(supabase.from('customer_tool_access').select('*').eq('customer_id', customer_id).limit(500)),
    safeQuery(supabase.from('customer_subscriptions').select('*').eq('customer_id', customer_id).limit(10))
  ])

  const customer = customerRes.data
  const tools = toolsRes.data || []
  const subscription = (subscriptionRes.data || []).find(activeStatus) || (subscriptionRes.data || [])[0] || null
  const packageName = subscription?.package_name || subscription?.plan || customer?.package_name || customer?.requested_package || 'Starter'
  const selectedTool = tool_key ? tools.find((r) => r.tool_key === tool_key) : null
  const policy = tool_key ? evaluateToolAccessPolicy({ tool_key, row: selectedTool, package_name: packageName, security_blocked: !activeStatus(customer || {}) }) : null

  const checks = [
    { key: 'customer_exists', ok: Boolean(customer), hint: customer ? customer.name || customer.title || customer.id : 'Kunde fehlt' },
    { key: 'customer_active', ok: Boolean(customer && activeStatus(customer)), hint: customer?.status || 'Status fehlt' },
    { key: 'subscription_or_package', ok: Boolean(packageName), hint: packageName || 'Kein Paket' },
    { key: 'customer_users', ok: (userRowsRes.data || []).some(activeStatus), hint: `${(userRowsRes.data || []).length} Userzuordnungen` }
  ]
  if (tool_key) checks.push({ key: 'tool_allowed', ok: Boolean(policy?.allowed), hint: policy?.reason || 'Kein Toolzugriff' })

  return { ok: checks.every((c) => c.ok), customer_id, package_name: packageName, checks, policy, users: userRowsRes.data || [] }
}

module.exports = { inspectCustomerPortalPermissions }
