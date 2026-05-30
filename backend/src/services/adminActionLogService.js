const { requestUser } = require('./permissionService')

function safeIp(req) {
  const forwarded = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim()
  return forwarded || req.ip || null
}

async function writeAdminLog(supabase, req, payload = {}) {
  if (!supabase) return null
  try {
    const user = requestUser(req)
    const record = {
      actor_user_id: user.id || null,
      actor_email: user.email || null,
      actor_role: user.role || null,
      action: payload.action || `${req.method || 'GET'} ${req.path || req.originalUrl || ''}`,
      resource_type: payload.resource_type || payload.resourceType || null,
      resource_id: payload.resource_id || payload.resourceId || null,
      customer_id: payload.customer_id || payload.customerId || req.body?.customer_id || req.query?.customer_id || null,
      status: payload.status || 'success',
      ip_address: safeIp(req),
      user_agent: String(req.headers?.['user-agent'] || '').slice(0, 500),
      metadata: payload.metadata || {},
      created_at: new Date().toISOString()
    }
    const { data } = await supabase.from('admin_audit_logs').insert(record).select('*').maybeSingle()
    return data || record
  } catch (_) {
    return null
  }
}

function adminActionLogger(resourceType) {
  return async function (req, res, next) {
    const started = Date.now()
    res.on('finish', async () => {
      if (res.statusCode < 400) {
        await writeAdminLog(req.app?.locals?.supabaseAdmin || null, req, {
          action: `${req.method} ${req.originalUrl || req.url}`,
          resource_type: resourceType || 'api',
          status: 'success',
          metadata: { status_code: res.statusCode, duration_ms: Date.now() - started }
        })
      }
    })
    next()
  }
}

module.exports = { writeAdminLog, adminActionLogger }
