const test = require('node:test')
const assert = require('node:assert/strict')
const { SEGMENT_TEMPLATES, churnScoreFor, valueScoreFor } = require('../src/services/retentionIntelligenceSuiteService')
const { roleAllowed } = require('../src/services/rbacPermissionMatrixService')

test('retention suite contains core segments', () => {
  assert.equal(SEGMENT_TEMPLATES.some((s) => s.key === 'inactive_customers'), true)
  assert.equal(SEGMENT_TEMPLATES.some((s) => s.key === 'vip_customers'), true)
})

test('inactive former customer gets churn score and reasons', () => {
  const result = churnScoreFor({ days_inactive: 75, visits: 8, points_balance: 120, reward_redemptions: 0, last_rating: 5, status: 'active' })
  assert.equal(result.score >= 60, true)
  assert.equal(result.reasons.some((r) => r.includes('inaktiv')), true)
})

test('value score stays explainable', () => {
  const result = valueScoreFor({ visits: 8, points_balance: 300, reward_redemptions: 2, avg_rating: 4.8, days_inactive: 5 })
  assert.equal(result.score > 0, true)
  assert.equal(Array.isArray(result.reasons), true)
})

test('retention permissions are present', () => {
  assert.equal(roleAllowed('admin', 'manage_retention'), true)
  assert.equal(roleAllowed('customer', 'manage_retention'), false)
})
