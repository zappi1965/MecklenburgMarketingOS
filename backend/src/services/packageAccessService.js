const crypto = require('crypto')

const STARTER_TOOLS = [
  'dashboard', 'finance', 'tickets', 'booking', 'media', 'packages', 'knowledge', 'onboarding', 'reports', 'approvals'
]

const GROWTH_TOOLS = [
  ...STARTER_TOOLS,
  'integrations', 'seo', 'customer_workflows', 'kpi', 'competitors',
  'qr', 'public_landing', 'loyalty', 'loyalty_rewards', 'reviews'
]

const PREMIUM_TOOLS = [
  ...GROWTH_TOOLS,
  'loyalty_rules', 'staff_codes', 'loyalty_segments', 'smart_loyalty',
  'smart_automation', 'marketing_automation', 'ai_assistant',
  'customer_health', 'customer_intelligence',
  'dynamic_billing', 'revenue_forecasting', 'revenue_share', 'package_recommendations',
  'package_matrix', 'pipeline', 'timeline_events'
]

function normalizePackageName(value = 'Starter') {
  const v = String(value || 'Starter').trim().toLowerCase()
  if (v.includes('premium')) return 'Premium'
  if (v.includes('growth')) return 'Growth'
  return 'Starter'
}

function toolsForPackage(packageName = 'Starter') {
  const p = normalizePackageName(packageName)
  if (p === 'Premium') return Array.from(new Set(PREMIUM_TOOLS))
  if (p === 'Growth') return Array.from(new Set(GROWTH_TOOLS))
  return Array.from(new Set(STARTER_TOOLS))
}

async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

async function grantPackageTools(supabase, { customer_id, package_name = 'Starter', actor_name = 'System' } = {}) {
  if (!supabase || !customer_id) return { ok: false, error: 'customer_id fehlt', tools: [] }
  const normalizedPackage = normalizePackageName(package_name)
  const tools = toolsForPackage(normalizedPackage)
  const granted = []
  const now = new Date().toISOString()

  for (const tool_key of tools) {
    const existing = await safeQuery(
      supabase.from('customer_tool_access')
        .select('id, customer_id, tool_key, enabled')
        .eq('customer_id', customer_id)
        .eq('tool_key', tool_key)
        .maybeSingle()
    )

    const payload = {
      customer_id,
      tool_key,
      enabled: true,
      visible_to_customer: true,
      source: 'package_auto_grant',
      package_name: normalizedPackage,
      updated_at: now,
      metadata: { actor_name, package_name: normalizedPackage, auto_granted_at: now }
    }

    if (existing?.data?.id) {
      await safeQuery(supabase.from('customer_tool_access').update(payload).eq('id', existing.data.id))
      granted.push({ tool_key, mode: 'updated' })
    } else {
      await safeQuery(supabase.from('customer_tool_access').insert({ id: crypto.randomUUID(), ...payload, created_at: now }))
      granted.push({ tool_key, mode: 'inserted' })
    }
  }

  const existingSubscription = await safeQuery(
    supabase.from('customer_subscriptions')
      .select('id, customer_id')
      .eq('customer_id', customer_id)
      .limit(1)
      .maybeSingle()
  )
  const subscriptionPayload = {
    customer_id,
    package_name: normalizedPackage,
    package_key: normalizedPackage.toLowerCase(),
    plan: normalizedPackage,
    status: 'active',
    updated_at: now,
    metadata: { source: 'package_auto_grant', actor_name }
  }
  if (existingSubscription?.data?.id) {
    await safeQuery(supabase.from('customer_subscriptions').update(subscriptionPayload).eq('id', existingSubscription.data.id))
  } else {
    await safeQuery(supabase.from('customer_subscriptions').insert({ id: crypto.randomUUID(), ...subscriptionPayload, created_at: now }))
  }

  return { ok: true, package_name: normalizedPackage, tools: granted }
}

module.exports = {
  normalizePackageName,
  toolsForPackage,
  grantPackageTools,
  STARTER_TOOLS,
  GROWTH_TOOLS,
  PREMIUM_TOOLS
}
