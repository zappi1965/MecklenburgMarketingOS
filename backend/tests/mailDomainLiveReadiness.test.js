const test = require('node:test')
const assert = require('node:assert/strict')
const { finalLegalChecklist, privacyMarketingReminderText } = require('../src/services/mailDomainLiveReadinessService')

test('legal checklist passes default consent wording', () => {
  const result = finalLegalChecklist()
  assert.equal(result.ok, true)
})

test('privacy reminder text contains double opt in and unsubscribe info', () => {
  const result = privacyMarketingReminderText()
  const body = JSON.stringify(result)
  assert.equal(body.includes('Double-Opt-in'), true)
  assert.equal(body.includes('Abmeldelink'), true)
})
