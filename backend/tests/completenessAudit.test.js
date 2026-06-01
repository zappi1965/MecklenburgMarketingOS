const test = require('node:test')
const assert = require('node:assert/strict')
const { buildCompletenessAudit } = require('../src/services/completenessAuditService')

test('completeness audit returns modules and blockers', () => {
  const audit = buildCompletenessAudit({})
  assert.equal(Array.isArray(audit.modules), true)
  assert.ok(audit.modules.length >= 8)
  assert.equal(typeof audit.score, 'number')
  assert.equal(audit.modules.some((m) => m.key === 'sumup_v1'), true)
  assert.equal(audit.modules.some((m) => m.key === 'customer_portal_backoffice'), true)
})

test('completeness audit includes external proof flags', () => {
  const audit = buildCompletenessAudit({})
  assert.ok(audit.env_flags)
  assert.equal(Object.prototype.hasOwnProperty.call(audit.env_flags, 'MMOS_LEGAL_REVIEW_DONE'), true)
})
