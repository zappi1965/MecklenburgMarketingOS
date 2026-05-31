const express = require('express')

function getBearer(req) {
  const h = req.get('authorization') || req.get('Authorization') || ''
  const m = String(h).match(/^Bearer\s+(.+)$/i)
  return m ? m[1] : ''
}

function normalizeEmail(v) {
  return String(v || '').trim().toLowerCase()
}

function sanitizeProfile(profile) {
  if (!profile) return null
  return {
    id: profile.id,
    email: profile.email || '',
    role: profile.role || 'customer',
    status: profile.status || 'pending',
    username: profile.username || '',
    display_name: profile.display_name || profile.username || profile.email || '',
    customer_id: profile.customer_id || null,
    package_name: profile.package_name || null,
    metadata: profile.metadata || {},
    mfa_enabled: Boolean(profile.mfa_enabled),
    mfa_enrolled_at: profile.mfa_enrolled_at || null,
    mfa_last_used_at: profile.mfa_last_used_at || null,
    mfa_verified_until: profile.mfa_verified_until || null
  }
}

async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

function authRoutes(supabase) {
  const router = express.Router()

  router.use((req, res, next) => {
    if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase ist im Backend nicht konfiguriert.' })
    next()
  })

  // V42.23.2 AUTH GUARD FIX
  // Uses the Service Role backend client to read user_profiles. This avoids
  // frontend/RLS false negatives where a valid admin profile exists in SQL but
  // the browser anon client cannot read it and incorrectly falls into customer login.
  router.get('/me', async (req, res, next) => {
    try {
      const token = getBearer(req)
      if (!token) return res.status(401).json({ ok: false, error: 'Session-Token fehlt.' })

      const userResult = await safeQuery(supabase.auth.getUser(token))
      const authUser = userResult?.data?.user
      if (!authUser?.id) return res.status(401).json({ ok: false, error: 'Session konnte nicht validiert werden.' })

      const email = normalizeEmail(authUser.email)
      let profile = null
      let lookup = 'id'

      const byId = await safeQuery(
        supabase.from('user_profiles').select('*').eq('id', authUser.id).maybeSingle()
      )
      if (byId?.data) profile = byId.data

      if (!profile && email) {
        lookup = 'email'
        const byEmail = await safeQuery(
          supabase.from('user_profiles').select('*').ilike('email', email).maybeSingle()
        )
        if (byEmail?.data) profile = byEmail.data
      }

      if (!profile) {
        return res.json({
          ok: true,
          authenticated: true,
          profile: null,
          role: null,
          status: null,
          auth_user: { id: authUser.id, email },
          hint: 'Auth-User gefunden, aber kein Eintrag in public.user_profiles.'
        })
      }

      const normalized = sanitizeProfile(profile)
      const isAdmin = String(normalized.role || '').toLowerCase() === 'admin' && String(normalized.status || '').toLowerCase() === 'active'
      const mfaEnabled = Boolean(normalized.mfa_enabled)
      const mfaVerified = !mfaEnabled || (normalized.mfa_verified_until ? Date.parse(normalized.mfa_verified_until) > Date.now() : false)
      return res.json({
        ok: true,
        authenticated: true,
        profile: normalized,
        role: String(normalized.role || '').toLowerCase(),
        status: String(normalized.status || '').toLowerCase(),
        is_admin: isAdmin,
        mfa_enabled: mfaEnabled,
        mfa_verified: mfaVerified,
        mfa_required: Boolean(isAdmin && mfaEnabled && !mfaVerified),
        lookup,
        auth_user: { id: authUser.id, email }
      })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = authRoutes
