const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

const ADMIN_ROLES = new Set(['admin', 'super_admin'])

function authMiddleware(options = {}) {
  const required = options.required !== false
  const allowedRoles = options.roles || []

  return async function (req, res, next) {
    try {
      const supabase = getSupabaseAdmin()
      if (!supabase) {
        if (!required) return next()
        const err = new Error('Backend Auth ENV fehlt')
        err.status = 500
        err.code = 'SUPABASE_UNCONFIGURED'
        throw err
      }

      const authHeader = req.headers.authorization || ''
      const token = authHeader.replace(/^Bearer\s+/i, '')

      if (!token) {
        if (!required) return next()
        const err = new Error('Nicht authentifiziert')
        err.status = 401
        err.code = 'UNAUTHENTICATED'
        throw err
      }

      const { data, error } = await supabase.auth.getUser(token)
      if (error || !data?.user) {
        const err = new Error('Ungültige Session')
        err.status = 401
        err.code = 'INVALID_SESSION'
        throw err
      }

      req.user = data.user

      // Resolve role from the canonical user_profiles table — same pattern as authRoutes.js:/me.
      // Tolerant: if no profile row exists yet, treat the user as 'customer' (least privilege).
      let role = 'customer'
      let status = 'active'
      let profile = null
      try {
        const lookup = await supabase
          .from('user_profiles')
          .select('role, status, customer_id, email')
          .eq('id', data.user.id)
          .maybeSingle()
        if (lookup?.data) {
          profile = lookup.data
          role = String(lookup.data.role || 'customer').toLowerCase()
          status = String(lookup.data.status || 'active').toLowerCase()
        }
      } catch (_) {
        // Profile lookup failed → fall back to customer role, do not block the request.
      }

      const isAdmin = ADMIN_ROLES.has(role) && status === 'active'
      req.userRole = isAdmin ? 'admin' : role
      req.userStatus = status
      req.userProfile = profile

      if (allowedRoles.length && !allowedRoles.includes(req.userRole)) {
        const err = new Error('Keine Berechtigung')
        err.status = 403
        err.code = 'FORBIDDEN'
        throw err
      }

      next()
    } catch (e) {
      next(e)
    }
  }
}

module.exports = authMiddleware
