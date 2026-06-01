const ROLES = ['super_admin','admin','sales','support','accounting','readonly','customer']

const PERMISSIONS = {
  create_admin: ['super_admin'],
  disable_mfa: ['super_admin'],
  delete_customer: ['super_admin'],
  change_tool_access: ['super_admin','admin'],
  create_invoice: ['super_admin','admin','accounting'],
  send_invoice: ['super_admin','admin','accounting'],
  create_offer: ['super_admin','admin','sales'],
  send_offer: ['super_admin','admin','sales'],
  edit_customer: ['super_admin','admin','sales','support'],
  view_customer: ['super_admin','admin','sales','support','accounting','readonly'],
  manage_qr: ['super_admin','admin','sales'],
  manage_loyalty: ['super_admin','admin','sales'],
  manage_retention: ['super_admin','admin','sales','support'],
  view_reports: ['super_admin','admin','sales','support','accounting','readonly','customer'],
  view_retention: ['super_admin','admin','sales','support','readonly'],
  support_ticket: ['super_admin','admin','support'],
  restore_deleted: ['super_admin','admin']
}

function roleAllowed(role, permission) {
  return (PERMISSIONS[permission] || []).includes(String(role || '').toLowerCase())
}

function matrix() {
  return { roles: ROLES, permissions: PERMISSIONS, generated_at: new Date().toISOString() }
}

function inspectRole(role = 'customer') {
  const allowed = Object.keys(PERMISSIONS).filter((permission) => roleAllowed(role, permission))
  return { role, allowed, denied: Object.keys(PERMISSIONS).filter((permission) => !allowed.includes(permission)) }
}

module.exports = { ROLES, PERMISSIONS, roleAllowed, matrix, inspectRole }
