const test = require('node:test')
const assert = require('node:assert/strict')
const { LIFECYCLE_STATES } = require('../src/services/customerLifecycleService')
const { ONBOARDING_STEPS } = require('../src/services/customerOnboardingWorkflowService')
const { permissionSnapshot } = require('../src/middleware/permissionGuard')

test('customer lifecycle exposes live states', () => {
  assert.equal(LIFECYCLE_STATES.includes('live'), true)
  assert.equal(LIFECYCLE_STATES.includes('archiviert'), true)
})

test('onboarding workflow has operational steps', () => {
  assert.equal(ONBOARDING_STEPS.some((s) => s.key === 'qr_loyalty_done'), true)
  assert.equal(ONBOARDING_STEPS.length >= 10, true)
})

test('permission snapshot denies customer for admin action', () => {
  const req = { userRole: 'customer' }
  const snap = permissionSnapshot(req, 'restore_deleted')
  assert.equal(snap.allowed, false)
})
