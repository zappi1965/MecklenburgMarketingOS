const express = require('express')

function nowIso() { return new Date().toISOString() }
function safeString(value) { return String(value || '').trim() }
function validateAdminPassword(password) {
  const p = String(password || '')
  if (p.length < Number(process.env.ADMIN_PASSWORD_MIN_LENGTH || 10)) return 'Passwort muss mindestens 10 Zeichen haben.'
  if (!/[A-ZÄÖÜ]/.test(p) || !/[a-zäöüß]/.test(p) || !/[0-9]/.test(p) || !/[^A-Za-z0-9ÄÖÜäöüß]/.test(p)) {
    return 'Passwort muss Groß-/Kleinbuchstaben, Zahl und Sonderzeichen enthalten.'
  }
  return null
}

function getBearer(req) {
  const h = req.get('authorization') || req.get('Authorization') || ''
  const m = String(h).match(/^Bearer\s+(.+)$/i)
  return m ? m[1] : ''
}

async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

async function adminCount(supabase) {
  const { count, error } = await supabase
    .from('user_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin')
  if (error) return 0
  return count || 0
}

async function activeAdminCount(supabase) {
  const { count, error } = await supabase
    .from('user_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin')
    .eq('status', 'active')
  if (error) return 0
  return count || 0
}

async function writeActivity(supabase, payload) {
  try {
    await supabase.from('activity_logs').insert({
      type: payload.type || 'admin_profile_event',
      title: payload.title || 'Adminprofil geändert',
      message: payload.message || '',
      ref_table: payload.ref_table || 'user_profiles',
      ref_id: payload.ref_id || null,
      severity: payload.severity || 'info',
      metadata: payload.metadata || {},
      created_at: nowIso()
    })
  } catch (_) {}
}

async function getRequesterProfile(supabase, req) {
  const token = getBearer(req)
  if (!token) return null
  const userResponse = await safeQuery(supabase.auth.getUser(token))
  const user = userResponse?.data?.user
  if (!user?.id) return null
  const { data: profile } = await safeQuery(
    supabase.from('user_profiles').select('*').eq('id', user.id).maybeSingle()
  )
  if (profile?.role === 'admin' && (!profile.status || profile.status === 'active')) return profile
  return null
}

async function authorizeAdminProfileWrite(supabase, req) {
  const profile = await getRequesterProfile(supabase, req)
  if (profile) return { ok: true, via: 'admin_session', profile }

  const setupToken = process.env.ADMIN_PROFILE_SETUP_TOKEN || ''
  if (!setupToken) {
    return {
      ok: false,
      status: 403,
      error: 'Kein ADMIN_PROFILE_SETUP_TOKEN konfiguriert. Bootstrap ohne Token ist deaktiviert.'
    }
  }

  const provided = req.get('x-admin-setup-token') || req.body?.setup_token || ''
  if (provided && provided === setupToken) return { ok: true, via: 'setup_token' }

  return {
    ok: false,
    status: 403,
    error: 'Keine Admin-Berechtigung. Bitte als Admin einloggen oder gültigen Setup-Key angeben.'
  }
}

function sanitizeProfile(profile) {
  if (!profile) return null
  return {
    id: profile.id,
    username: profile.username || profile.display_name || '',
    display_name: profile.display_name || profile.username || profile.email || '',
    email: profile.email || '',
    role: profile.role || 'admin',
    status: profile.status || 'active',
    created_at: profile.created_at || null,
    updated_at: profile.updated_at || null,
    created_by: profile.created_by || null,
    last_login_at: profile.last_login_at || null
  }
}

function adminProfilesRoutes(supabase) {
  const router = express.Router()

  router.use((req, res, next) => {
    if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase ist nicht konfiguriert.' })
    next()
  })

  router.get('/', async (req, res, next) => {
    try {
      const auth = await authorizeAdminProfileWrite(supabase, req)
      if (!auth.ok) return res.status(auth.status || 403).json({ ok: false, error: auth.error })

      const { data, error } = await supabase
        .from('user_profiles')
        .select('id,username,display_name,email,role,status,created_at,updated_at,created_by,last_login_at')
        .eq('role', 'admin')
        .order('created_at', { ascending: false })
      if (error) throw error
      res.json({ ok: true, profiles: (data || []).map(sanitizeProfile), auth_via: auth.via })
    } catch (e) { next(e) }
  })

  router.post('/', async (req, res, next) => {
    try {
      const auth = await authorizeAdminProfileWrite(supabase, req)
      if (!auth.ok) return res.status(auth.status || 403).json({ ok: false, error: auth.error })

      const body = req.body || {}
      const email = safeString(body.email).toLowerCase()
      const password = String(body.password || '')
      const username = safeString(body.username || body.display_name || body.name)
      const displayName = safeString(body.display_name || body.name || body.username || email)
      const status = ['active', 'blocked', 'pending'].includes(body.status) ? body.status : 'active'

      if (!email) return res.status(400).json({ ok: false, error: 'E-Mail fehlt.' })
      const passwordError = validateAdminPassword(password)
      if (passwordError) return res.status(400).json({ ok: false, error: passwordError })
      if (!username) return res.status(400).json({ ok: false, error: 'Benutzername fehlt.' })

      let user = null
      const created = await safeQuery(supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username, display_name: displayName, role: 'admin' }
      }))

      if (created?.error) {
        const existing = await safeQuery(supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }))
        user = existing?.data?.users?.find((u) => String(u.email || '').toLowerCase() === email) || null
        if (!user) throw created.error
        await safeQuery(supabase.auth.admin.updateUserById(user.id, {
          password,
          email_confirm: true,
          user_metadata: { ...(user.user_metadata || {}), username, display_name: displayName, role: 'admin' }
        }))
      } else {
        user = created?.data?.user
      }

      if (!user?.id) return res.status(500).json({ ok: false, error: 'Supabase Auth User konnte nicht erstellt werden.' })

      const payload = {
        id: user.id,
        username,
        display_name: displayName,
        email,
        role: 'admin',
        status,
        created_by: auth.profile?.email || auth.via,
        updated_at: nowIso()
      }
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .upsert(payload, { onConflict: 'id' })
        .select('*')
        .single()
      if (error) throw error

      await writeActivity(supabase, {
        type: 'admin_profile_created',
        title: 'Adminprofil erstellt',
        message: `${displayName} (${email}) wurde als Admin angelegt.`,
        ref_id: user.id,
        severity: 'success',
        metadata: { via: auth.via }
      })

      res.json({ ok: true, profile: sanitizeProfile(profile), auth_via: auth.via })
    } catch (e) { next(e) }
  })

  router.patch('/:id', async (req, res, next) => {
    try {
      const auth = await authorizeAdminProfileWrite(supabase, req)
      if (!auth.ok) return res.status(auth.status || 403).json({ ok: false, error: auth.error })

      const id = req.params.id
      const body = req.body || {}
      const patch = {
        username: body.username !== undefined ? safeString(body.username) : undefined,
        display_name: body.display_name !== undefined ? safeString(body.display_name) : undefined,
        status: body.status !== undefined ? safeString(body.status) : undefined,
        updated_at: nowIso()
      }
      Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k])
      if (patch.status && !['active', 'blocked', 'pending'].includes(patch.status)) delete patch.status
      const currentProfile = await safeQuery(supabase.from('user_profiles').select('*').eq('id', id).eq('role','admin').maybeSingle())
      if (!currentProfile?.data) return res.status(404).json({ ok: false, error: 'Adminprofil nicht gefunden.' })
      if (patch.status && patch.status !== 'active' && currentProfile.data.status === 'active') {
        const activeCount = await activeAdminCount(supabase)
        if (activeCount <= 1) return res.status(400).json({ ok: false, error: 'Der letzte aktive Admin kann nicht gesperrt oder auf pending gesetzt werden.' })
      }
      if (auth.profile?.id === id && patch.status && patch.status !== 'active') {
        return res.status(400).json({ ok: false, error: 'Du kannst dein eigenes aktives Adminprofil nicht sperren.' })
      }

      if (body.email) {
        const email = safeString(body.email).toLowerCase()
        await safeQuery(supabase.auth.admin.updateUserById(id, { email, email_confirm: true }))
        patch.email = email
      }
      if (body.password) {
        const passwordError = validateAdminPassword(body.password)
        if (passwordError) return res.status(400).json({ ok: false, error: passwordError })
        await safeQuery(supabase.auth.admin.updateUserById(id, { password: String(body.password) }))
      }

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .update(patch)
        .eq('id', id)
        .eq('role', 'admin')
        .select('*')
        .maybeSingle()
      if (error) throw error
      if (!profile) return res.status(404).json({ ok: false, error: 'Adminprofil nicht gefunden.' })
      await writeActivity(supabase, { type:'admin_profile_updated', title:'Adminprofil aktualisiert', message:`${profile.email} wurde aktualisiert.`, ref_id:id, metadata:{ patch:Object.keys(patch), by: auth.profile?.email || auth.via } })

      res.json({ ok: true, profile: sanitizeProfile(profile) })
    } catch (e) { next(e) }
  })

  router.post('/:id/status', async (req, res, next) => {
    try {
      const auth = await authorizeAdminProfileWrite(supabase, req)
      if (!auth.ok) return res.status(auth.status || 403).json({ ok: false, error: auth.error })
      const status = safeString(req.body?.status || 'blocked')
      if (!['active', 'blocked', 'pending'].includes(status)) return res.status(400).json({ ok: false, error: 'Ungültiger Status.' })
      const current = await safeQuery(supabase.from('user_profiles').select('*').eq('id', req.params.id).eq('role','admin').maybeSingle())
      if (!current?.data) return res.status(404).json({ ok: false, error: 'Adminprofil nicht gefunden.' })
      if (status !== 'active' && current.data.status === 'active') {
        const activeCount = await activeAdminCount(supabase)
        if (activeCount <= 1) return res.status(400).json({ ok: false, error: 'Der letzte aktive Admin kann nicht gesperrt werden.' })
      }
      if (auth.profile?.id === req.params.id && status !== 'active') return res.status(400).json({ ok: false, error: 'Du kannst dein eigenes Adminprofil nicht sperren.' })
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .update({ status, updated_at: nowIso() })
        .eq('id', req.params.id)
        .eq('role', 'admin')
        .select('*')
        .maybeSingle()
      if (error) throw error
      if (!profile) return res.status(404).json({ ok: false, error: 'Adminprofil nicht gefunden.' })
      await writeActivity(supabase, { type:'admin_profile_status_changed', title:'Adminstatus geändert', message:`${profile.email} → ${status}`, ref_id:req.params.id, severity: status === 'blocked' ? 'warning' : 'info', metadata:{ by: auth.profile?.email || auth.via } })
      res.json({ ok: true, profile: sanitizeProfile(profile) })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = adminProfilesRoutes
