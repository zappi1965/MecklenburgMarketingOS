// 2FA / MFA-Service. Nutzt TOTP (RFC 6238) ueber otplib.
//
// Wichtige ENV:
//   MFA_ISSUER_NAME=MecklenburgMarketing
//   MFA_SESSION_TTL_HOURS=12
//   MFA_TOTP_WINDOW=2
//   MFA_REQUIRE_EVERY_LOGIN=true
//
// Wenn MFA_REQUIRE_EVERY_LOGIN=true gesetzt ist, entscheidet nicht nur
// mfa_verified_until, sondern ob mfa_last_used_at nach dem aktuellen
// auth.users.last_sign_in_at liegt. Dadurch wird bei jedem neuen
// Passwort-Login wieder 2FA verlangt.

const crypto = require('crypto')
const { authenticator } = require('otplib')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

authenticator.options = { window: Number(process.env.MFA_TOTP_WINDOW || 2), step: 30 }

const ISSUER = process.env.MFA_ISSUER_NAME || 'MMOS'
const MFA_SESSION_TTL_HOURS = Number(process.env.MFA_SESSION_TTL_HOURS ?? 12)
const MFA_SESSION_TTL_MS = Math.max(0, Number.isFinite(MFA_SESSION_TTL_HOURS) ? MFA_SESSION_TTL_HOURS : 12) * 60 * 60 * 1000

async function findProfileCandidates(supabase, { user_id, email }, columns = 'id, email, mfa_secret, mfa_enabled, mfa_backup_codes_hash, mfa_verified_until, mfa_last_used_at') {
  const rows = []
  const seen = new Set()

  async function pushQuery(query) {
    try {
      const { data } = await query
      const list = Array.isArray(data) ? data : (data ? [data] : [])
      for (const row of list) {
        const key = String(row?.id || row?.email || JSON.stringify(row))
        if (!seen.has(key)) {
          seen.add(key)
          rows.push(row)
        }
      }
    } catch (_) {}
  }

  if (user_id) {
    await pushQuery(supabase.from('user_profiles').select(columns).eq('id', user_id).limit(5))
  }
  if (email) {
    await pushQuery(supabase.from('user_profiles').select(columns).ilike('email', String(email).trim().toLowerCase()).limit(10))
  }

  return rows
}

async function findProfileForMfa(supabase, { user_id, email }, columns = 'id, email, mfa_secret, mfa_enabled, mfa_backup_codes_hash, mfa_verified_until, mfa_last_used_at') {
  const rows = await findProfileCandidates(supabase, { user_id, email }, columns)
  return rows.find((r) => r?.mfa_enabled && r?.mfa_secret) ||
         rows.find((r) => r?.mfa_secret) ||
         rows[0] ||
         null
}

function verifiedUntil() {
  return new Date(Date.now() + MFA_SESSION_TTL_MS).toISOString()
}

function normalizeMfaCode(code) {
  const raw = String(code || '').trim().toUpperCase()
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 6) return { raw, totp: digits, backup: raw.replace(/\s+/g, '') }
  return { raw, totp: '', backup: raw.replace(/\s+/g, '') }
}

function secretCandidates(secret) {
  const raw = String(secret || '').trim()
  const out = []
  if (raw) out.push(raw)
  try {
    if (raw.startsWith('otpauth://')) {
      const url = new URL(raw)
      const fromUrl = url.searchParams.get('secret')
      if (fromUrl) out.push(fromUrl)
    }
  } catch (_) {}
  const compact = raw.replace(/\s+/g, '').replace(/-/g, '').toUpperCase()
  if (compact && compact !== raw) out.push(compact)
  return Array.from(new Set(out.filter(Boolean)))
}

function verifyTotpCode(code, secret) {
  const normalized = normalizeMfaCode(code)
  if (!normalized.totp) return { ok: false, reason: 'not_totp_format' }
  for (const candidate of secretCandidates(secret)) {
    try {
      const delta = authenticator.checkDelta(normalized.totp, candidate)
      if (delta !== null && delta !== undefined) return { ok: true, delta, normalized_code: normalized.totp }
    } catch (_) {}
    try {
      if (authenticator.verify({ token: normalized.totp, secret: candidate })) return { ok: true, delta: null, normalized_code: normalized.totp }
    } catch (_) {}
  }
  return { ok: false, reason: 'totp_mismatch', normalized_code: normalized.totp }
}

function generateBackupCodes(count = 10) {
  const codes = []
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase()
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5, 10)}`)
  }
  return codes
}

function hashCode(code, salt) {
  const s = salt || crypto.randomBytes(16).toString('hex')
  const derived = crypto.scryptSync(code, s, 32).toString('hex')
  return `${s}:${derived}`
}

function verifyCodeHash(code, stored) {
  if (!stored || !String(stored).includes(':')) return false
  const [salt, expected] = String(stored).split(':')
  const derived = crypto.scryptSync(code, salt, 32).toString('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(derived), Buffer.from(expected))
  } catch {
    return false
  }
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

async function logMfaEvent({ user_id, event_type, ip_address, user_agent, metadata }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return
  try {
    await supabase.from('mfa_events').insert({
      user_id,
      event_type,
      ip_address: ip_address || null,
      user_agent: user_agent ? String(user_agent).slice(0, 300) : null,
      metadata: metadata || {}
    })
  } catch (_) {}
}

async function enroll({ user_id, email }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }
  const secret = authenticator.generateSecret()
  const profile = await findProfileForMfa(supabase, { user_id, email }, 'id, email')
  const profileId = profile?.id || user_id
  await supabase
    .from('user_profiles')
    .update({ mfa_secret: secret, mfa_enabled: false, mfa_verified_until: null, mfa_last_used_at: null })
    .eq('id', profileId)
  const otpauth = authenticator.keyuri(email || profile?.email || user_id, ISSUER, secret)
  return { otpauth, secret }
}

async function activate({ user_id, email, code, ip_address, user_agent }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }
  const profile = await findProfileForMfa(supabase, { user_id, email }, 'id, email, mfa_secret, mfa_enabled')
  if (!profile?.mfa_secret) { const e = new Error('Kein Enrollment vorhanden'); e.status = 400; throw e }
  const totp = verifyTotpCode(code, profile.mfa_secret)
  if (!totp.ok) {
    await logMfaEvent({ user_id, event_type: 'failed', ip_address, user_agent, metadata: { phase: 'activation', reason: totp.reason } })
    const e = new Error('Code ungueltig'); e.status = 400; throw e
  }
  const now = new Date().toISOString()
  const backupCodes = generateBackupCodes(10)
  const hashed = backupCodes.map((c) => hashCode(c))
  await supabase
    .from('user_profiles')
    .update({
      mfa_enabled: true,
      mfa_enrolled_at: now,
      mfa_last_used_at: now,
      mfa_verified_until: verifiedUntil(),
      mfa_backup_codes_hash: hashed
    })
    .eq('id', profile.id)
  await logMfaEvent({ user_id, event_type: 'enrolled', ip_address, user_agent })
  return { backupCodes }
}

async function verify({ user_id, email, code, ip_address, user_agent }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }
  const profile = await findProfileForMfa(supabase, { user_id, email }, 'id, email, mfa_secret, mfa_enabled, mfa_backup_codes_hash, mfa_verified_until, mfa_last_used_at')
  if (!profile?.mfa_enabled || !profile.mfa_secret) return { ok: false, reason: 'mfa_disabled' }

  const normalized = normalizeMfaCode(code)
  const codeStr = normalized.backup
  const until = verifiedUntil()
  const now = new Date().toISOString()

  const totpResult = verifyTotpCode(code, profile.mfa_secret)
  if (totpResult.ok) {
    await supabase.from('user_profiles').update({ mfa_last_used_at: now, mfa_verified_until: until }).eq('id', profile.id)
    await logMfaEvent({ user_id, event_type: 'verified', ip_address, user_agent, metadata: { verified_until: until, delta: totpResult.delta } })
    return { ok: true, via: 'totp', verified_until: until, delta: totpResult.delta }
  }

  const hashes = normalizeBackupHashes(profile.mfa_backup_codes_hash)
  for (let i = 0; i < hashes.length; i++) {
    if (verifyCodeHash(codeStr, hashes[i])) {
      const remaining = hashes.slice(0, i).concat(hashes.slice(i + 1))
      await supabase
        .from('user_profiles')
        .update({ mfa_backup_codes_hash: remaining, mfa_last_used_at: now, mfa_verified_until: until })
        .eq('id', profile.id)
      await logMfaEvent({ user_id, event_type: 'backup_used', ip_address, user_agent, metadata: { remaining: remaining.length, verified_until: until } })
      return { ok: true, via: 'backup', remaining: remaining.length, verified_until: until }
    }
  }

  await logMfaEvent({ user_id, event_type: 'failed', ip_address, user_agent, metadata: { reason: totpResult.reason, normalized_totp: normalized.totp ? 'present' : 'missing' } })
  return { ok: false, reason: 'invalid_code', detail: totpResult.reason }
}

async function disable({ user_id, email, ip_address, user_agent }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }
  const profile = await findProfileForMfa(supabase, { user_id, email }, 'id, email')
  await supabase
    .from('user_profiles')
    .update({ mfa_enabled: false, mfa_secret: null, mfa_backup_codes_hash: null, mfa_verified_until: null, mfa_last_used_at: null })
    .eq('id', profile?.id || user_id)
  await logMfaEvent({ user_id, event_type: 'disabled', ip_address, user_agent })
  return { ok: true }
}

module.exports = {
  enroll,
  activate,
  verify,
  disable,
  _generateBackupCodes: generateBackupCodes,
  _verifyCodeHash: verifyCodeHash,
  _hashCode: hashCode,
  _findProfileForMfa: findProfileForMfa,
  _normalizeMfaCode: normalizeMfaCode,
  _verifyTotpCode: verifyTotpCode,
  _normalizeBackupHashes: normalizeBackupHashes
}
