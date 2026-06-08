const { roleAllowed } = require('../services/rbacPermissionMatrixService')

function normalizedRole(req) {
  return String(req.userRole || req.user?.role || req.user?.app_metadata?.role || req.user?.user_metadata?.role || 'customer').toLowerCase()
}

function requirePermission(permission) {
  return function permissionMiddleware(req, res, next) {
    const role = normalizedRole(req)
    if (roleAllowed(role, permission)) return next()
    return res.status(403).json({ ok: false, code: 'PERMISSION_DENIED', error: `Recht fehlt: ${permission}`, role, permission })
  }
}

function permissionSnapshot(req, permission) {
  const role = normalizedRole(req)
  return { role, permission, allowed: roleAllowed(role, permission) }
}

module.exports = { requirePermission, permissionSnapshot }
