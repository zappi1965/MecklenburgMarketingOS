const requireCustomerAccess = require('./requireCustomerAccess')

function denyCustomerBackoffice(req, res, next) {
  const role = String(req.userRole || req.user?.role || '').toLowerCase()
  if (role === 'admin' || role === 'super_admin') return next()
  const requestPath = String(req.path || req.originalUrl || '')
  const backofficePrefixes = ['/admin', '/internal', '/ops', '/production']
  if (backofficePrefixes.some((prefix) => requestPath === prefix || requestPath.startsWith(prefix + '/'))) {
    return res.status(403).json({ ok: false, code: 'BACKOFFICE_DENIED', error: 'Backoffice ist nur für interne Admin-Zugänge freigegeben.' })
  }
  next()
}

function requireProductionCustomerAccess(options = {}) {
  return [denyCustomerBackoffice, requireCustomerAccess(options)]
}

module.exports = { denyCustomerBackoffice, requireProductionCustomerAccess }
