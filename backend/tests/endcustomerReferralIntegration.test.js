const test = require('node:test')
const assert = require('node:assert/strict')
const { createStub } = require('./helpers/supabaseStub')
const { EndcustomerReferralService } = require('../src/services/endcustomerReferralService')

function baseDb() {
  return {
    v37_loyalty_settings: [{ customer_id: 'c1', referral_bonus_referrer: 100, referral_bonus_friend: 50, referral_require_friend_scan: true }],
    loyalty_customers: [
      { id: 'm_referrer', customer_id: 'c1', email: 'werber@x.de', member_token: 'loy_referrertoken1234', points_balance: 10, total_points: 10 },
      { id: 'm_friend', customer_id: 'c1', email: 'freund@x.de', member_token: 'loy_friendtoken5678', points_balance: 5, total_points: 5 }
    ],
    loyalty_referrals: [
      { id: 'ref1', customer_id: 'c1', referrer_member_id: 'm_referrer', referred_email: 'freund@x.de', referral_code: 'RTOKEN12', status: 'pending', referrer_points: 100, friend_points: 50 }
    ],
    loyalty_transactions: [],
    customer_timeline_events: []
  }
}

test('creditOnFriendJoinScan schreibt beidseitig gut und setzt credited', async () => {
  const supabase = createStub(baseDb())
  const svc = new EndcustomerReferralService(supabase)
  const friend = supabase._db.loyalty_customers.find((m) => m.id === 'm_friend')

  const r = await svc.creditOnFriendJoinScan({ customer_id: 'c1', friend_member: friend, referral_code: 'RTOKEN12' })
  assert.equal(r.ok, true)
  assert.equal(r.referrer_points, 100)
  assert.equal(r.friend_points, 50)

  const ref = supabase._db.loyalty_referrals.find((x) => x.id === 'ref1')
  assert.equal(ref.status, 'credited')
  const referrer = supabase._db.loyalty_customers.find((m) => m.id === 'm_referrer')
  assert.equal(referrer.points_balance, 110)
  assert.equal(supabase._db.loyalty_transactions.length, 2)
})

test('creditOnFriendJoinScan ist idempotent (kein Doppel-Credit)', async () => {
  const supabase = createStub(baseDb())
  const svc = new EndcustomerReferralService(supabase)
  const friend = supabase._db.loyalty_customers.find((m) => m.id === 'm_friend')

  await svc.creditOnFriendJoinScan({ customer_id: 'c1', friend_member: friend, referral_code: 'RTOKEN12' })
  // Zweiter Aufruf: Referral ist bereits credited -> skip.
  const r2 = await svc.creditOnFriendJoinScan({ customer_id: 'c1', friend_member: friend, referral_code: 'RTOKEN12' })
  assert.equal(r2.skipped, true)
  assert.equal(supabase._db.loyalty_transactions.length, 2)
})

test('creditOnFriendJoinScan blockiert Self-Referral (Freund == Werber)', async () => {
  const db = baseDb()
  db.loyalty_referrals[0].referrer_member_id = 'm_friend' // Werber == Freund
  const supabase = createStub(db)
  const svc = new EndcustomerReferralService(supabase)
  const friend = supabase._db.loyalty_customers.find((m) => m.id === 'm_friend')

  const r = await svc.creditOnFriendJoinScan({ customer_id: 'c1', friend_member: friend, referral_code: 'RTOKEN12' })
  assert.equal(r.skipped, true)
  assert.equal(r.reason, 'self_referral')
  assert.equal(supabase._db.loyalty_transactions.length, 0)
})

test('creditOnFriendJoinScan ohne passende Referral -> skip', async () => {
  const supabase = createStub({ ...baseDb(), loyalty_referrals: [] })
  const svc = new EndcustomerReferralService(supabase)
  const friend = { id: 'm_friend', customer_id: 'c1', email: 'niemand@x.de', points_balance: 0, total_points: 0 }
  const r = await svc.creditOnFriendJoinScan({ customer_id: 'c1', friend_member: friend, referral_code: 'NOPE' })
  assert.equal(r.skipped, true)
})
