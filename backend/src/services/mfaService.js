// 2FA / MFA-Service. Nutzt TOTP (RFC 6238) ueber otplib.
//
// Workflow:
//   1. Admin ruft /api/security/mfa/enroll auf -> Service liefert Secret
//      + Otpauth-URL fuer QR-Code-Scanner.
//   2. Admin scannt QR in Authenticator-App (z.B. 1Password, Google Auth).
//   3. Admin sendet ersten Code an /api/security/mfa/activate. Service
//      verifiziert + schaltet mfa_enabled=true frei + generiert
//      Backup-Codes.
//   4. Bei Login mit role IN (admin, super_admin) verlangt die Auth-
//      Middleware einen zweiten Code im Header X-MFA-Code.
//
// Backup-Codes werden gehashed gespeichert (scrypt mit Salt), Klartext
// nur einmal beim Enrollen ausgeliefert.

const crypto = require('crypto')
const { authenticator } = require('otplib')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

authenticator.options = { window: 1, step: 30 }

const ISSUER = process.env.MFA_ISSUER_NAME || 'MMOS'

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
  if (!stored || !stored.includes(':')) return false
  const [salt, expected] = stored.split(':')
  const derived = crypto.scryptSync(code, salt, 32).toString('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(derived), Buffer.from(expected))
  } catch {
    return false
  }
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

// Enrollment: erzeugt Secret, schreibt es ABER setzt mfa_enabled=false.
// Erst die Activation-Verifikation aktiviert es.
async function enroll({ user_id, email }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }
  const secret = authenticator.generateSecret()
  await supabase
    .from('user_profiles')
    .update({ mfa_secret: secret, mfa_enabled: false })
    .eq('id', user_id)
  const otpauth = authenticator.keyuri(email || user_id, ISSUER, secret)
  return { otpauth, secret }
}

async function activate({ user_id, code, ip_address, user_agent }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, mfa_secret, mfa_enabled')
    .eq('id', user_id)
    .maybeSingle()
  if (!profile?.mfa_secret) { const e = new Error('Kein Enrollment vorhanden'); e.status = 400; throw e }
  if (!authenticator.verify({ token: String(code || ''), secret: profile.mfa_secret })) {
    await logMfaEvent({ user_id, event_type: 'failed', ip_address, user_agent, metadata: { phase: 'activation' } })
    const e = new Error('Code ungueltig'); e.status = 400; throw e
  }
  const backupCodes = generateBackupCodes(10)
  const hashed = backupCodes.map((c) => hashCode(c))
  await supabase
    .from('user_profiles')
    .update({
      mfa_enabled: true,
      mfa_enrolled_at: new Date().toISOString(),
      mfa_backup_codes_hash: hashed
    })
    .eq('id', user_id)
  await logMfaEvent({ user_id, event_type: 'enrolled', ip_address, user_agent })
  return { backupCodes }
}

async function verify({ user_id, code, ip_address, user_agent }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, mfa_secret, mfa_enabled, mfa_backup_codes_hash')
    .eq('id', user_id)
    .maybeSingle()
  if (!profile?.mfa_enabled || !profile.mfa_secret) return { ok: false, reason: 'mfa_disabled' }

  const codeStr = String(code || '').trim().toUpperCase()
  // TOTP-Pfad
  if (/^\d{6}$/.test(codeStr) && authenticator.verify({ token: codeStr, secret: profile.mfa_secret })) {
    await supabase.from('user_profiles').update({ mfa_last_used_at: new Date().toISOString() }).eq('id', user_id)
    await logMfaEvent({ user_id, event_type: 'verified', ip_address, user_agent })
    return { ok: true, via: 'totp' }
  }
  // Backup-Code-Pfad
  const hashes = profile.mfa_backup_codes_hash || []
  for (let i = 0; i < hashes.length; i++) {
    if (verifyCodeHash(codeStr, hashes[i])) {
      const remaining = hashes.slice(0, i).concat(hashes.slice(i + 1))
      await supabase
        .from('user_profiles')
        .update({ mfa_backup_codes_hash: remaining, mfa_last_used_at: new Date().toISOString() })
        .eq('id', user_id)
      await logMfaEvent({ user_id, event_type: 'backup_used', ip_address, user_agent, metadata: { remaining: remaining.length } })
      return { ok: true, via: 'backup', remaining: remaining.length }
    }
  }
  await logMfaEvent({ user_id, event_type: 'failed', ip_address, user_agent })
  return { ok: false, reason: 'invalid_code' }
}

async function disable({ user_id, ip_address, user_agent }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }
  await supabase
    .from('user_profiles')
    .update({ mfa_enabled: false, mfa_secret: null, mfa_backup_codes_hash: null })
    .eq('id', user_id)
  await logMfaEvent({ user_id, event_type: 'disabled', ip_address, user_agent })
  return { ok: true }
}

module.exports = {
  enroll,
  activate,
  verify,
  disable,
  // Test helpers:
  _generateBackupCodes: generateBackupCodes,
  _verifyCodeHash: verifyCodeHash,
  _hashCode: hashCode
}
