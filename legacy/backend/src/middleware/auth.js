const { getSupabaseAdmin } = require('../lib/supabaseAdmin')
const mfaService = require('../services/mfaService')

const ADMIN_ROLES = new Set(['admin', 'super_admin'])

function isMfaExemptPath(req) {
  const path = String(req.originalUrl || req.url || '').split('?')[0]
  return (
    path.startsWith('/api/auth/') ||
    path === '/api/security/mfa/verify' ||
    path === '/api/security/mfa/status' ||
    path === '/api/security/mfa/enroll' ||
    path === '/api/security/mfa/activate'
  )
}

function mfaStillValid(profile, authUser) {
  const requireEveryLogin = process.env.MFA_REQUIRE_EVERY_LOGIN === 'true'
  const until = profile?.mfa_verified_until
  const ttlValid = until ? Date.parse(until) > Date.now() : false
  if (!requireEveryLogin) return ttlValid
  const lastSignInMs = authUser?.last_sign_in_at ? Date.parse(authUser.last_sign_in_at) : 0
  const lastMfaMs = profile?.mfa_last_used_at ? Date.parse(profile.mfa_last_used_at) : 0
  if (!lastSignInMs || !lastMfaMs) return ttlValid
  return lastMfaMs + 5000 >= lastSignInMs
}


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
      // Wichtig: In manchen Supabase-Projekten ist user_profiles.id nicht identisch
      // mit auth.users.id, der Datensatz ist aber per email vorhanden. Ohne diesen
      // Fallback wird ein echter Admin als customer behandelt und /api/store lehnt
      // Admin-Tabellen wie landing_page_settings ab.
      let role = 'customer'
      let status = 'active'
      let profile = null
      const email = String(data.user.email || '').trim().toLowerCase()
      try {
        const lookup = await supabase
          .from('user_profiles')
          .select('role, status, customer_id, email, mfa_enabled, mfa_verified_until, mfa_last_used_at')
          .eq('id', data.user.id)
          .maybeSingle()
        if (lookup?.data) profile = lookup.data
      } catch (_) {
        // Fallback per E-Mail folgt unten.
      }
      if (!profile && email) {
        try {
          const lookupByEmail = await supabase
            .from('user_profiles')
            .select('role, status, customer_id, email, mfa_enabled, mfa_verified_until, mfa_last_used_at')
            .ilike('email', email)
            .maybeSingle()
          if (lookupByEmail?.data) profile = lookupByEmail.data
        } catch (_) {
          // Profile lookup failed → fall back to customer role, do not block the request.
        }
      }
      if (profile) {
        role = String(profile.role || 'customer').toLowerCase()
        status = String(profile.status || 'active').toLowerCase()
      }

      const isAdmin = ADMIN_ROLES.has(role) && status === 'active'
      req.userRole = isAdmin ? 'admin' : role
      req.userStatus = status
      req.userProfile = profile

      if (isAdmin && profile?.mfa_enabled && options.enforceMfa !== false && !isMfaExemptPath(req)) {
        const headerCode = req.headers['x-mfa-code'] || req.headers['x-mmos-mfa-code']
        if (!mfaStillValid(profile, data.user)) {
          if (headerCode) {
            const result = await mfaService.verify({
              user_id: data.user.id,
              email: data.user.email,
              code: headerCode,
              ip_address: req.ip,
              user_agent: req.get('user-agent')
            })
            if (!result.ok) {
              const err = new Error('2FA-Code ungueltig')
              err.status = 401
              err.code = 'MFA_INVALID'
              throw err
            }
            req.mfaVerified = true
          } else {
            const err = new Error('2FA erforderlich')
            err.status = 401
            err.code = 'MFA_REQUIRED'
            throw err
          }
        } else {
          req.mfaVerified = true
        }
      }

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
