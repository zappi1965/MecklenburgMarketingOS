async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

const ROLE_LEVELS = {
  super_admin: 100,
  admin: 80,
  sales: 50,
  support: 40,
  accounting: 45,
  readonly: 10,
  customer: 5
}

function normalizeRole(value = '') {
  const v = String(value || '').trim().toLowerCase()
  if (['superadmin','owner'].includes(v)) return 'super_admin'
  if (['read_only','read-only','viewer'].includes(v)) return 'readonly'
  return v || 'customer'
}

function canPerform(role, action) {
  const level = ROLE_LEVELS[normalizeRole(role)] || 0
  const required = {
    create_admin: 100,
    disable_mfa: 100,
    delete_customer: 100,
    change_tool_access: 80,
    send_invoice: 45,
    view_customer: 10,
    edit_customer: 40,
    create_offer: 50,
    support_ticket: 40
  }[action] || 80
  return level >= required
}

async function inspectAdminRbacGuard(supabase) {
  if (!supabase) return { ok: false, error: 'Supabase nicht konfiguriert', issues: [] }
  const users = await safeQuery(supabase.from('user_profiles').select('*').limit(500))
  const issues = []
  const roleCounts = {}
  for (const u of (users.data || [])) {
    const role = normalizeRole(u.role)
    roleCounts[role] = (roleCounts[role] || 0) + 1
    if (!ROLE_LEVELS[role]) issues.push({ severity: 'warning', issue: 'unknown_role', user_id: u.id, role: u.role })
    if (['admin','super_admin'].includes(role) && u.status !== 'active') issues.push({ severity: 'info', issue: 'inactive_admin_profile', user_id: u.id, status: u.status })
    if (['admin','super_admin'].includes(role) && u.mfa_enabled === false) issues.push({ severity: 'critical', issue: 'admin_without_mfa', user_id: u.id })
  }
  if (!roleCounts.super_admin && !roleCounts.admin) issues.push({ severity: 'critical', issue: 'no_active_admin_detected' })
  return { ok: !issues.some((i) => i.severity === 'critical'), issues, role_counts: roleCounts, known_roles: Object.keys(ROLE_LEVELS) }
}

module.exports = { inspectAdminRbacGuard, canPerform, normalizeRole }
