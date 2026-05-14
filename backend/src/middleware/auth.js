
const { createClient } = require('@supabase/supabase-js')

function authMiddleware(options = {}) {
  const required = options.required !== false
  const allowedRoles = options.roles || []

  return async function(req, res, next) {
    try {
      const supabaseUrl = process.env.SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!supabaseUrl || !serviceKey) {
        if (!required) return next()
        const err = new Error('Backend Auth ENV fehlt')
        err.status = 500
        throw err
      }

      const authHeader = req.headers.authorization || ''
      const token = authHeader.replace(/^Bearer\s+/i, '')

      if (!token) {
        if (!required) return next()
        const err = new Error('Nicht authentifiziert')
        err.status = 401
        throw err
      }

      const supabase = createClient(supabaseUrl, serviceKey)
      const { data, error } = await supabase.auth.getUser(token)
      if (error || !data?.user) {
        const err = new Error('Ungültige Session')
        err.status = 401
        throw err
      }

      req.user = data.user

      const role = data.user.user_metadata?.role || data.user.app_metadata?.role
      req.userRole = role || 'customer'

      if (allowedRoles.length && !allowedRoles.includes(req.userRole)) {
        const err = new Error('Keine Berechtigung')
        err.status = 403
        throw err
      }

      next()
    } catch (e) {
      next(e)
    }
  }
}

module.exports = authMiddleware
