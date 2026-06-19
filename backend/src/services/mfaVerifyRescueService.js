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

// Wenn die normale Prüfung (Fenster MFA_TOTP_WINDOW) fehlschlägt, scannen wir
// ein deutlich breiteres Zeitfenster, um Uhren-Drift von einem falschen Secret
// zu unterscheiden. Es werden KEINE Geheimnisse oder Codes zurückgegeben –
// nur die Diagnose. So lässt sich die eigentliche Ursache in genau einem
// Login-Versuch eingrenzen (statt blind das Verifikations-Fenster zu öffnen).
function diagnoseTotpFailure(code, secret, maxSteps = 20) {
  const normalized = normalizeCode(code)
  if (normalized.totp.length !== 6) {
    return { reason: 'not_totp_format', hint: 'Eingabe ist kein 6-stelliger TOTP-Code. Backup-Code oder Tippfehler prüfen.' }
  }
  const now = Date.now()
  for (const candidate of secretCandidates(secret)) {
    for (let step = -maxSteps; step <= maxSteps; step++) {
      try {
        const gen = authenticator.clone({ epoch: now + step * 30 * 1000 })
        if (gen.generate(candidate) === normalized.totp) {
          return {
            reason: 'clock_drift',
            drift_steps: step,
            drift_seconds: step * 30,
            hint: `Code ist korrekt, aber Server- und App-Uhr weichen um ca. ${step * 30}s ab (Verifikations-Fenster: ±${Number(process.env.MFA_TOTP_WINDOW || 2) * 30}s). Automatische Zeitsynchronisation aktivieren oder MFA_TOTP_WINDOW erhöhen.`
          }
        }
      } catch (_) {}
    }
  }
  return {
    reason: 'secret_mismatch',
    hint: 'Der Code passt auch in einem ±10-Minuten-Fenster nicht zum gespeicherten Secret. Die Authenticator-App nutzt ein anderes Secret als in der DB hinterlegt → 2FA mit Backup-Code einloggen und neu einrichten oder per Admin-Reset zurücksetzen.'
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

function verifyCodeHash(code, stored) {
  if (!stored || !String(stored).includes(':')) return false
  const [salt, expected] = String(stored).split(':')
  const derived = crypto.scryptSync(code, salt, 32).toString('hex')
  try { return crypto.timingSafeEqual(Buffer.from(derived), Buffer.from(expected)) }
  catch (_) { return false }
}

// Wählt aus mehreren möglichen Profilzeilen die richtige für die MFA-Prüfung.
// Wichtig: In diesem Projekt ist user_profiles.id NICHT immer identisch mit
// auth.users.id (siehe auth.js). Enrollment/Aktivierung schreibt das Secret
// ggf. in die per-E-Mail gefundene Zeile, während eine separate per-ID
// gefundene Zeile ein altes/leeres Secret enthält. Würden wir hier wie bisher
// einfach die per-ID gefundene Zeile bevorzugen, prüft der Login gegen das
// falsche Secret und lehnt jeden gültigen Code mit MFA_INVALID ab.
// Deshalb sammeln wir Kandidaten per ID UND E-Mail und bevorzugen — wie der
// Aktivierungspfad in mfaService.findProfileForMfa — die Zeile, die tatsächlich
// MFA konfiguriert hat.
function pickProfile(candidates) {
  return (
    candidates.find((c) => c?.mfa_enabled && c?.mfa_secret) ||
    candidates.find((c) => c?.mfa_secret) ||
    candidates[0] ||
    null
  )
}

async function queryProfile(supabase, user) {
  const email = String(user?.email || '').trim().toLowerCase()
  const columnSets = [
    'id,email,role,status,mfa_enabled,mfa_secret,mfa_backup_codes_hash,mfa_verified_until,mfa_last_used_at',
    'id,email,role,status,mfa_enabled,mfa_secret,mfa_verified_until,mfa_last_used_at',
    'id,email,role,status,mfa_enabled,mfa_secret'
  ]
  const errors = []
  for (const columns of columnSets) {
    try {
      const candidates = []
      const seen = new Set()
      const add = (row) => {
        if (!row) return
        const key = String(row.id || row.email || JSON.stringify(row))
        if (seen.has(key)) return
        seen.add(key)
        candidates.push(row)
      }

      if (user?.id) {
        const r = await supabase.from('user_profiles').select(columns).eq('id', user.id).limit(5)
        if (r.error) throw r.error
        for (const row of (Array.isArray(r.data) ? r.data : (r.data ? [r.data] : []))) add(row)
      }
      if (email) {
        const r = await supabase.from('user_profiles').select(columns).ilike('email', email).limit(10)
        if (r.error) throw r.error
        for (const row of (Array.isArray(r.data) ? r.data : (r.data ? [r.data] : []))) add(row)
      }

      if (candidates.length) return { profile: pickProfile(candidates), columns }
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

  if (!via) {
    const diagnostic = diagnoseTotpFailure(code, profile.mfa_secret)
    const secretStr = String(profile.mfa_secret || '')
    // Server-Log (Railway) – ohne Secret/Code, nur Form-Hinweise zur Ursachenanalyse.
    console.warn('[MFA_INVALID_DIAG]', JSON.stringify({
      reason: diagnostic.reason,
      drift_steps: diagnostic.drift_steps,
      server_time: new Date().toISOString(),
      totp_window: Number(process.env.MFA_TOTP_WINDOW || 2),
      profile_id: profile.id,
      secret_len: secretStr.length,
      secret_is_otpauth: secretStr.startsWith('otpauth://'),
      code_len: normalizeCode(code).totp.length
    }))
    try {
      await supabase.from('mfa_events').insert({
        user_id: user.id,
        event_type: 'failed',
        ip_address: reqMeta.ip_address || null,
        user_agent: reqMeta.user_agent ? String(reqMeta.user_agent).slice(0, 300) : null,
        metadata: { reason: diagnostic.reason, drift_steps: diagnostic.drift_steps, server_time: new Date().toISOString() }
      })
    } catch (_) {}
    return { ok: false, status: 401, code: 'MFA_INVALID', error: '2FA-Code ungueltig.', reason: totp.reason, diagnostic }
  }

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

module.exports = {
  verifyMfaWithRescue,
  _queryProfile: queryProfile,
  _pickProfile: pickProfile,
  _verifyTotp: verifyTotp,
  _diagnoseTotpFailure: diagnoseTotpFailure
}
