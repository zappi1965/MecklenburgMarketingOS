const test = require('node:test')
const assert = require('node:assert/strict')
const { PLACEMENTS, CAMPAIGN_TYPES } = require('../src/services/qrCampaignGrowthService')

test('qr growth has placement templates', () => {
  assert.equal(PLACEMENTS.some((p) => p.key === 'table_tent'), true)
  assert.equal(PLACEMENTS.some((p) => p.key === 'receipt'), true)
})

test('qr growth has loyalty-like campaign types', () => {
  assert.equal(CAMPAIGN_TYPES.some((t) => t.key === 'loyalty'), true)
  assert.equal(CAMPAIGN_TYPES.some((t) => t.key === 'referral'), true)
})
