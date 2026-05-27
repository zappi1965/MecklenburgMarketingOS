const test = require('node:test')
const assert = require('node:assert/strict')
const {
  generateToken,
  verifyToken,
  buildMagicLink,
  _signParts,
  _normalizeEmail
} = require('../src/services/walletMagicLinkService')

// Tests laufen mit Dev-Default-Secret (kein WALLET_TOKEN_SECRET in ENV).
// Das ist OK weil signParts und verifyToken denselben Secret nutzen.

test('normalizeEmail: trim + lowercase', () => {
  assert.equal(_normalizeEmail('  Anna@Example.DE  '), 'anna@example.de')
  assert.equal(_normalizeEmail(null), '')
  assert.equal(_normalizeEmail(undefined), '')
})

test('generateToken: liefert email + exp + sig', () => {
  const t = generateToken({ email: 'anna@example.de' })
  assert.equal(t.email, 'anna@example.de')
  assert.ok(t.exp > Date.now())
  assert.ok(t.sig && t.sig.length > 10)
})

test('generateToken: wirft bei ungueltiger E-Mail', () => {
  assert.throws(() => generateToken({ email: 'kein-at' }), /Ungueltige E-Mail/)
})

test('verifyToken: korrekter Token wird akzeptiert', () => {
  const t = generateToken({ email: 'bob@example.de' })
  const r = verifyToken({ email: t.email, exp: t.exp, sig: t.sig })
  assert.equal(r.ok, true)
  assert.equal(r.email, 'bob@example.de')
})

test('verifyToken: abgelaufener Token -> expired', () => {
  const t = generateToken({ email: 'a@b.de', ttlMs: -1000 })
  const r = verifyToken({ email: t.email, exp: t.exp, sig: t.sig })
  assert.equal(r.ok, false)
  assert.equal(r.reason, 'expired')
})

test('verifyToken: manipulierte Signatur -> signature_mismatch', () => {
  const t = generateToken({ email: 'c@d.de' })
  const tampered = (t.sig.slice(0, -2) + 'AA').slice(0, t.sig.length)
  const r = verifyToken({ email: t.email, exp: t.exp, sig: tampered })
  assert.equal(r.ok, false)
  assert.equal(r.reason, 'signature_mismatch')
})

test('verifyToken: manipulierte E-Mail -> signature_mismatch', () => {
  const t = generateToken({ email: 'c@d.de' })
  const r = verifyToken({ email: 'attacker@evil.de', exp: t.exp, sig: t.sig })
  assert.equal(r.ok, false)
})

test('verifyToken: incomplete data -> incomplete', () => {
  assert.equal(verifyToken({ email: '', exp: 1, sig: 'x' }).reason, 'incomplete')
  assert.equal(verifyToken({ email: 'a@b.de', exp: null, sig: 'x' }).reason, 'incomplete')
  assert.equal(verifyToken({ email: 'a@b.de', exp: 123, sig: '' }).reason, 'incomplete')
})

test('verifyToken: exp ist case-insensitive zur E-Mail', () => {
  const t = generateToken({ email: 'CASE@TEST.de' })
  const r = verifyToken({ email: 'case@test.de', exp: t.exp, sig: t.sig })
  assert.equal(r.ok, true)
})

test('buildMagicLink: enthaelt alle URL-Parameter', () => {
  const link = buildMagicLink({ email: 'a@b.de', exp: 1700000000, sig: 'sigvalue', base_url: 'https://app.test' })
  assert.match(link, /^https:\/\/app\.test\/wallet\/me\?/)
  assert.match(link, /email=a%40b\.de/)
  assert.match(link, /exp=1700000000/)
  assert.match(link, /sig=sigvalue/)
})

test('signParts: deterministisch fuer gleiche Eingabe', () => {
  const a = _signParts('x@y.de', 1234)
  const b = _signParts('x@y.de', 1234)
  assert.equal(a, b)
})

test('signParts: unterschiedlich bei anderem exp', () => {
  const a = _signParts('x@y.de', 1234)
  const b = _signParts('x@y.de', 5678)
  assert.notEqual(a, b)
})
