const test = require('node:test')
const assert = require('node:assert/strict')
const { CAMPAIGN_IDEAS, VIP_LEVELS } = require('../src/services/loyaltyGrowthSuiteService')

test('loyalty growth suite contains non-qr campaign ideas', () => {
  assert.equal(CAMPAIGN_IDEAS.some((i) => i.key === 'birthday_bonus'), true)
  assert.equal(CAMPAIGN_IDEAS.some((i) => i.key === 'winback_inactive'), true)
  assert.equal(CAMPAIGN_IDEAS.some((i) => i.key === 'coupon_wallet'), true)
})

test('vip levels include bronze silver gold', () => {
  assert.equal(VIP_LEVELS.map((x) => x.key).join(','), 'bronze,silver,gold')
})
