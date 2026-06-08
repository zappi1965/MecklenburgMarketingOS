const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

function requireCustomerAccess(options = {}) {
  const paramKey = options.paramKey || 'customer_id'
  const bodyKey = options.bodyKey || 'customer_id'

  return async function (req, res, next) {
    try {
      if (req.userRole === 'admin') return next()

      const customerId =
        (req.params && req.params[paramKey]) ||
        (req.body && req.body[bodyKey]) ||
        (req.query && req.query[bodyKey])

      if (!customerId) {
        return res.status(400).json({ ok: false, code: 'CUSTOMER_ID_MISSING', error: 'customer_id fehlt im Request.' })
      }

      const db = getSupabaseAdmin()
      if (!db) {
        return res.status(503).json({ ok: false, code: 'SUPABASE_UNCONFIGURED', error: 'Backend Auth ENV fehlt.' })
      }

      if (!req.user?.id) {
        return res.status(401).json({ ok: false, code: 'UNAUTHENTICATED', error: 'Nicht authentifiziert.' })
      }

      const { data, error } = await db
        .from('customer_users')
        .select('id, role, status')
        .eq('auth_user_id', req.user.id)
        .eq('customer_id', String(customerId))
        .eq('status', 'active')
        .maybeSingle()

      if (error) throw error
      if (!data) {
        return res.status(403).json({ ok: false, code: 'CUSTOMER_ACCESS_DENIED', error: 'Kein Zugriff auf diesen Kunden.' })
      }

      req.customerAccess = data
      next()
    } catch (e) {
      next(e)
    }
  }
}

module.exports = requireCustomerAccess
