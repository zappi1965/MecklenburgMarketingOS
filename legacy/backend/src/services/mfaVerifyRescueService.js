const { authenticator } = require('otplib')
const crypto = require('crypto')

authenticator.options = { window: Number(process.env.MFA_TOTP_WINDOW || 2), step: 30 }

function verifiedUntil() {
  const hours = Number(process.env.MFA_SESSION_TTL_HOURS ?? 12)
  const ms = Math.max(1, Number.isFinite(hours) ? hours : 12) * 60 * 60 * 1000
  return new Date(Date.now() + ms).toISOString()
}

function normalizeCode(code) {
  const raw = String(code || '').trim().toUpperCase()
  return {
    raw,
    totp: raw.replace(/\D/g, ''),
    backup: raw.replace(/\s+/g, '')
  }
}

function secretCandidates(secret) {
  const raw = String(secret || '').trim()
  const out = []
  if (raw) out.push(raw)
  try {
    if (raw.startsWith('otpauth://')) {
      const url = new URL(raw)
      const s = url.searchParams.get('secret')
      if (s) out.push(s)
    }
  } catch (_) {}
  const compact = raw.replace(/\s+/g, '').replace(/-/g, '').toUpperCase()
  if (compact && compact !== raw) out.push(compact)
  return Array.from(new Set(out.filter(Boolean)))
}

function verifyTotp(code, secret) {
  const normalized = normalizeCode(code)
  if (normalized.totp.length !== 6) return { ok: false, reason: 'not_totp_format' }
  for (const candidate of secretCandidates(secret)) {
    try {
      const delta = authenticator.checkDelta(normalized.totp, candidate)
      if (delta !== null && delta !== undefined) return { ok: true, via: 'totp', delta }
    } catch (_) {}
    try {
      if (authenticator.verify({ token: normalized.totp, secret: candidate })) return { ok: true, via: 'totp', delta: null }
    } catch (_) {}
  }
  return { ok: false, reason: 'totp_mismatch' }
}

function normalizeBackupHashes(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean).map(String)
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String)
    } catch (_) {}
    return value.split(',').map((v) => v.trim()).filter(Boolean)
  }
  return []
}

function verifyCodeHash(code, stored) {
  if (!stored || !String(stored).includes(':')) return false
  const [salt, expected] = String(stored).split(':')
  const derived = crypto.scryptSync(code, salt, 32).toString('hex')
  try { return crypto.timingSafeEqual(Buffer.from(derived), Buffer.from(expected)) }
  catch (_) { return false }
}

async function queryProfile(supabase, user) {
  const email = String(user?.email || '').trim().toLowerCase()
  const candidates = [
    'id,email,role,status,mfa_enabled,mfa_secret,mfa_backup_codes_hash,mfa_verified_until,mfa_last_used_at',
    'id,email,role,status,mfa_enabled,mfa_secret,mfa_verified_until,mfa_last_used_at',
    'id,email,role,status,mfa_enabled,mfa_secret'
  ]
  const errors = []
  for (const columns of candidates) {
    try {
      let byId = null
      if (user?.id) {
        const r = await supabase.from('user_profiles').select(columns).eq('id', user.id).maybeSingle()
        if (r.error) throw r.error
        byId = r.data
      }
      if (byId) return { profile: byId, columns }
      if (email) {
        const r = await supabase.from('user_profiles').select(columns).ilike('email', email).maybeSingle()
        if (r.error) throw r.error
        if (r.data) return { profile: r.data, columns }
      }
    } catch (e) {
      errors.push(e?.message || String(e))
    }
  }
  return { profile: null, columns: null, errors }
}

async function safeUpdateProfile(supabase, profileId, updates) {
  const attempts = [
    updates,
    { mfa_last_used_at: updates.mfa_last_used_at, mfa_verified_until: updates.mfa_verified_until },
    { mfa_verified_until: updates.mfa_verified_until }
  ]
  let lastError = null
  for (const payload of attempts) {
    try {
      const clean = Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined))
      const r = await supabase.from('user_profiles').update(clean).eq('id', profileId).select('id').maybeSingle()
      if (!r.error) return { ok: true }
      lastError = r.error
    } catch (e) { lastError = e }
  }
  return { ok: false, error: lastError?.message || String(lastError || 'update_failed') }
}

async function verifyMfaWithRescue(supabase, user, code, reqMeta = {}) {
  if (!supabase) return { ok: false, status: 503, code: 'SUPABASE_ADMIN_UNCONFIGURED', error: 'Backend-Supabase ist nicht konfiguriert.' }
  if (!user?.id) return { ok: false, status: 401, code: 'UNAUTHENTICATED', error: 'Nicht authentifiziert.' }

  const { profile, errors } = await queryProfile(supabase, user)
  if (!profile) {
    return { ok: false, status: 500, code: 'MFA_PROFILE_NOT_FOUND_OR_SCHEMA_MISSING', error: '2FA-Profil nicht gefunden oder MFA-Spalten fehlen.', details: errors }
  }
  if (!profile.mfa_enabled || !profile.mfa_secret) {
    return { ok: false, status: 401, code: 'MFA_DISABLED_OR_NOT_ENROLLED', error: '2FA ist für dieses Profil nicht aktiv oder nicht eingerichtet.' }
  }

  const totp = verifyTotp(code, profile.mfa_secret)
  let via = null
  let remainingBackupCodes
  if (totp.ok) {
    via = 'totp'
  } else {
    const normalized = normalizeCode(code)
    const hashes = normalizeBackupHashes(profile.mfa_backup_codes_hash)
    for (let i = 0; i < hashes.length; i++) {
      try {
        if (verifyCodeHash(normalized.backup, hashes[i])) {
          via = 'backup'
          remainingBackupCodes = hashes.slice(0, i).concat(hashes.slice(i + 1))
          break
        }
      } catch (_) {}
    }
  }

  if (!via) return { ok: false, status: 401, code: 'MFA_INVALID', error: '2FA-Code ungueltig.', reason: totp.reason }

  const now = new Date().toISOString()
  const until = verifiedUntil()
  const updates = {
    mfa_last_used_at: now,
    mfa_verified_until: until,
    mfa_backup_codes_hash: via === 'backup' ? remainingBackupCodes : undefined
  }
  const saved = await safeUpdateProfile(supabase, profile.id, updates)
  if (!saved.ok) {
    return { ok: false, status: 500, code: 'MFA_SESSION_UPDATE_FAILED', error: '2FA-Code war gültig, aber die Session konnte nicht gespeichert werden.', detail: saved.error }
  }

  // Best-effort event log; must never block login.
  try {
    await supabase.from('mfa_events').insert({
      user_id: user.id,
      event_type: via === 'backup' ? 'backup_used' : 'verified',
      ip_address: reqMeta.ip_address || null,
      user_agent: reqMeta.user_agent ? String(reqMeta.user_agent).slice(0, 300) : null,
      metadata: { via, verified_until: until }
    })
  } catch (_) {}

  return { ok: true, via, verified_until: until, remaining: remainingBackupCodes ? remainingBackupCodes.length : undefined }
}

module.exports = { verifyMfaWithRescue }
