const test = require('node:test')
const assert = require('node:assert/strict')
const {
  normalizeEmail,
  referralCodeForMember,
  isSelfReferral,
  computeReferralCredit,
  withinMaxPerReferrer,
  referralIdempotencyKey,
  canCreditReferral
} = require('../src/services/endcustomerReferralService')

test('normalizeEmail trimmt und lowercased', () => {
  assert.equal(normalizeEmail('  Max@Example.DE '), 'max@example.de')
  assert.equal(normalizeEmail(''), null)
  assert.equal(normalizeEmail(null), null)
})

test('referralCodeForMember nutzt die letzten 8 Token-Zeichen, uppercase', () => {
  const code = referralCodeForMember('loy_abcdef1234567890')
  assert.equal(code.length, 8)
  assert.equal(code, code.toUpperCase())
  assert.equal(code, '34567890')
})

test('referralCodeForMember erzeugt 8-stelligen Fallback bei zu kurzem Token', () => {
  const code = referralCodeForMember('xy')
  assert.equal(code.length, 8)
})

test('isSelfReferral erkennt gleiche E-Mail (case-insensitive)', () => {
  assert.equal(isSelfReferral('a@b.de', 'A@B.DE'), true)
  assert.equal(isSelfReferral('a@b.de', 'c@d.de'), false)
  assert.equal(isSelfReferral(null, 'a@b.de'), false)
})

test('computeReferralCredit liefert Defaults und respektiert Settings', () => {
  assert.deepEqual(computeReferralCredit({}), { referrer_points: 100, friend_points: 50 })
  assert.deepEqual(computeReferralCredit({ referral_bonus_referrer: 30, referral_bonus_friend: 20 }), { referrer_points: 30, friend_points: 20 })
  assert.deepEqual(computeReferralCredit({ referral_bonus_referrer: -5, referral_bonus_friend: -1 }), { referrer_points: 0, friend_points: 0 })
})

test('withinMaxPerReferrer: 0 = unbegrenzt, sonst Grenze', () => {
  assert.equal(withinMaxPerReferrer(999, { referral_max_per_referrer: 0 }), true)
  assert.equal(withinMaxPerReferrer(2, { referral_max_per_referrer: 3 }), true)
  assert.equal(withinMaxPerReferrer(3, { referral_max_per_referrer: 3 }), false)
})

test('referralIdempotencyKey ist stabil und seitenspezifisch', () => {
  assert.equal(referralIdempotencyKey('abc', 'referrer'), 'referral:abc:referrer')
  assert.notEqual(referralIdempotencyKey('abc', 'referrer'), referralIdempotencyKey('abc', 'friend'))
})

test('canCreditReferral nur aus pending/joined', () => {
  assert.equal(canCreditReferral('pending'), true)
  assert.equal(canCreditReferral('joined'), true)
  assert.equal(canCreditReferral('credited'), false)
  assert.equal(canCreditReferral('rejected'), false)
})
