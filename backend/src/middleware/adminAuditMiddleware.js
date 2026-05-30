const crypto = require('crypto')
const { recordAdminLog } = require('../services/adminLogService')

function hashIp(value = '') {
  const salt = process.env.ADMIN_AUDIT_IP_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || 'mmos'
  return crypto.createHash('sha256').update(`${salt}:${value}`).digest('hex').slice(0, 32)
}

function shouldLog(req) {
  const method = String(req.method || 'GET').toUpperCase()
  const path = String(req.originalUrl || req.url || '')
  if (path.includes('/api/production/client-error')) return true
  if (path.includes('/api/health') || path.includes('/api/system/health')) return false
  if (method !== 'GET') return true
  return /\/api\/(business-tools|production|store|customer-portal|ops-admin|api-keys|security|compliance)/.test(path)
}

function createAdminAuditMiddleware(supabase) {
  return function adminAuditMiddleware(req, res, next) {
    if (!shouldLog(req)) return next()
    const started = Date.now()
    res.on('finish', () => {
      const isAdmin = req.userRole === 'admin'
      const isSensitive = String(req.originalUrl || req.url || '').includes('/api/store') || String(req.originalUrl || req.url || '').includes('/api/business-tools')
      if (!isAdmin && !isSensitive && res.statusCode < 400) return
      const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
      recordAdminLog(supabase, {
        event_type: isAdmin ? 'admin_api_request' : 'customer_api_request',
        severity: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warning' : 'info',
        actor_user_id: req.user?.id || null,
        actor_email: req.user?.email || null,
        actor_role: req.userRole || null,
        customer_id: req.userProfile?.customer_id || req.query?.customer_id || req.body?.customer_id || null,
        route: String(req.originalUrl || req.url || '').split('?')[0],
        method: req.method,
        status_code: res.statusCode,
        ip_hash: hashIp(forwarded || req.ip || ''),
        user_agent: req.headers['user-agent'],
        message: `${req.method} ${String(req.originalUrl || req.url || '').split('?')[0]} -> ${res.statusCode}`,
        metadata: {
          duration_ms: Date.now() - started,
          query: req.query || {},
          body_keys: req.body && typeof req.body === 'object' ? Object.keys(req.body).slice(0, 30) : []
        }
      })
    })
    next()
  }
}

module.exports = { createAdminAuditMiddleware }
