const ADMIN_ROLES = new Set(['admin', 'super_admin'])

const INTERNAL_ONLY_RESOURCES = new Set([
  'admin_area',
  'lead_engine',
  'lead_scraper',
  'mini_audit',
  'offer_generator',
  'contract_generator',
  'document_template',
  'document_generation',
  'production_health',
  'api_costs',
  'admin_logs',
  'backup_runs',
  'job_queue_admin'
])

const CUSTOMER_READONLY_RESOURCES = new Set([
  'output_document',
  'customer_file',
  'generated_offer',
  'generated_contract',
  'monthly_report',
  'invoice',
  'google_business_audit',
  'seo_snapshot',
  'competitor_benchmark'
])

const CUSTOMER_WRITE_RESOURCES = new Set([
  'ticket',
  'ticket_message',
  'review_feedback',
  'package_request',
  'approval_request',
  'dsar_request'
])

function normalizeRole(user = {}) {
  return String(user.role || user.userRole || user.user_role || '').toLowerCase().trim()
}

function normalizeStatus(user = {}) {
  return String(user.status || user.userStatus || user.user_status || 'active').toLowerCase().trim()
}

function isActive(user = {}) {
  return normalizeStatus(user) === 'active'
}

function isAdmin(user = {}) {
  return isActive(user) && ADMIN_ROLES.has(normalizeRole(user))
}

function isCustomer(user = {}) {
  return isActive(user) && !isAdmin(user)
}

function customerIdOf(value = {}) {
  return value.customer_id || value.customerId || value.customer?.id || value.userProfile?.customer_id || value.profile?.customer_id || null
}

function permissionError(message, code = 'FORBIDDEN') {
  const err = new Error(message)
  err.status = 403
  err.statusCode = 403
  err.code = code
  return err
}

function missingScopeError() {
  const err = new Error('customer_id fehlt für tenant-gebundenen Zugriff')
  err.status = 400
  err.statusCode = 400
  err.code = 'CUSTOMER_SCOPE_REQUIRED'
  return err
}

function sameCustomer(user = {}, resource = {}) {
  const u = customerIdOf(user)
  const r = customerIdOf(resource)
  if (!u || !r) return false
  return String(u) === String(r)
}

function can(user = {}, action = 'read', resourceType = '', resource = {}) {
  const type = String(resourceType || '').toLowerCase().trim()
  const act = String(action || 'read').toLowerCase().trim()

  if (!user || !isActive(user)) return false
  if (isAdmin(user)) return true

  if (INTERNAL_ONLY_RESOURCES.has(type)) return false

  if (CUSTOMER_READONLY_RESOURCES.has(type)) {
    if (!['read', 'list', 'download'].includes(act)) return false
    return sameCustomer(user, resource)
  }

  if (CUSTOMER_WRITE_RESOURCES.has(type)) {
    return sameCustomer(user, resource)
  }

  // Unknown resources default to deny for customers. This makes new modules safe by default.
  return false
}

function assertCan(user = {}, action = 'read', resourceType = '', resource = {}) {
  if (can(user, action, resourceType, resource)) return true
  const type = String(resourceType || 'resource')
  const act = String(action || 'read')

  if (!isAdmin(user) && !customerIdOf(resource) && !INTERNAL_ONLY_RESOURCES.has(type)) {
    throw missingScopeError()
  }

  throw permissionError(`Keine Berechtigung: ${act} ${type}`, 'PERMISSION_DENIED')
}

function scopedCustomerFilter(user = {}, requestedCustomerId = null) {
  if (isAdmin(user)) return requestedCustomerId || null
  const own = customerIdOf(user)
  if (!own) throw missingScopeError()
  if (requestedCustomerId && String(requestedCustomerId) !== String(own)) {
    throw permissionError('Kein Zugriff auf diesen Customer', 'TENANT_ACCESS_DENIED')
  }
  return own
}

function requestUser(req = {}) {
  return {
    id: req.user?.id || req.user_id || null,
    email: req.user?.email || req.userProfile?.email || null,
    role: req.userRole || req.userProfile?.role || 'customer',
    status: req.userStatus || req.userProfile?.status || 'active',
    customer_id: req.userProfile?.customer_id || req.user?.customer_id || null,
    userProfile: req.userProfile || null
  }
}

module.exports = {
  ADMIN_ROLES,
  INTERNAL_ONLY_RESOURCES,
  CUSTOMER_READONLY_RESOURCES,
  CUSTOMER_WRITE_RESOURCES,
  normalizeRole,
  normalizeStatus,
  isActive,
  isAdmin,
  isCustomer,
  customerIdOf,
  sameCustomer,
  can,
  assertCan,
  scopedCustomerFilter,
  requestUser,
  permissionError,
  missingScopeError
}
