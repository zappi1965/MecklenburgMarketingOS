// Tests fuer den MFA-Login-Verify-Rescue-Service.
// Fokus: Profil-Auswahl muss konsistent mit dem Aktivierungspfad sein,
// auch wenn user_profiles.id != auth.users.id ist.
// Run: node --test tests/mfaVerifyRescueService.test.js

const test = require('node:test')
const assert = require('node:assert/strict')
const { authenticator } = require('otplib')
const { _queryProfile, _pickProfile, _verifyTotp, verifyMfaWithRescue } = require('../src/services/mfaVerifyRescueService')

// Minimaler Supabase-Mock: liefert vorkonfigurierte Zeilen pro Filter.
function makeSupabase({ byId = [], byEmail = [] }) {
  function builder(rows) {
    const api = {
      _rows: rows,
      select() { return api },
      eq() { return api },
      ilike() { return api },
      limit() { return Promise.resolve({ data: api._rows, error: null }) },
      maybeSingle() { return Promise.resolve({ data: api._rows[0] || null, error: null }) },
      update() { return api },
      insert() { return Promise.resolve({ data: null, error: null }) }
    }
    return api
  }
  return {
    from() {
      return {
        select(cols) {
          return {
            eq() { return builder(byId).select(cols) },
            ilike() { return builder(byEmail).select(cols) }
          }
        },
        update() {
          return { eq() { return { select() { return { maybeSingle() { return Promise.resolve({ data: { id: 'x' }, error: null }) } } } } } }
        },
        insert() { return Promise.resolve({ data: null, error: null }) }
      }
    }
  }
}

test('pickProfile bevorzugt die Zeile mit aktivem MFA-Secret', () => {
  const stale = { id: 'auth-id', mfa_enabled: false, mfa_secret: null }
  const real = { id: 'profile-id', mfa_enabled: true, mfa_secret: 'SECRET' }
  assert.equal(_pickProfile([stale, real]), real)
  assert.equal(_pickProfile([real, stale]), real)
})

test('pickProfile faellt auf erste Zeile zurueck, wenn keine MFA hat', () => {
  const a = { id: 'a' }
  const b = { id: 'b' }
  assert.equal(_pickProfile([a, b]), a)
  assert.equal(_pickProfile([]), null)
})

test('queryProfile waehlt das per-E-Mail aktivierte Profil, auch wenn die per-ID-Zeile kein Secret hat', async () => {
  const secret = authenticator.generateSecret()
  const idRow = { id: 'auth-id', email: 'admin@example.com', mfa_enabled: false, mfa_secret: null }
  const emailRow = { id: 'profile-id', email: 'admin@example.com', mfa_enabled: true, mfa_secret: secret }
  const supabase = makeSupabase({ byId: [idRow], byEmail: [idRow, emailRow] })
  const { profile } = await _queryProfile(supabase, { id: 'auth-id', email: 'admin@example.com' })
  assert.equal(profile.mfa_secret, secret)
  assert.equal(profile.mfa_enabled, true)
})

test('verifyTotp akzeptiert einen frisch generierten Code', () => {
  const secret = authenticator.generateSecret()
  const token = authenticator.generate(secret)
  assert.equal(_verifyTotp(token, secret).ok, true)
})

test('verifyMfaWithRescue: gueltiger TOTP-Code wird akzeptiert, obwohl per-ID-Zeile leer ist', async () => {
  const secret = authenticator.generateSecret()
  const token = authenticator.generate(secret)
  const idRow = { id: 'auth-id', email: 'admin@example.com', mfa_enabled: false, mfa_secret: null }
  const emailRow = { id: 'profile-id', email: 'admin@example.com', mfa_enabled: true, mfa_secret: secret, mfa_backup_codes_hash: [] }
  const supabase = makeSupabase({ byId: [idRow], byEmail: [idRow, emailRow] })
  const res = await verifyMfaWithRescue(supabase, { id: 'auth-id', email: 'admin@example.com' }, token)
  assert.equal(res.ok, true)
  assert.equal(res.via, 'totp')
})
