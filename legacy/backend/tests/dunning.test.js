const test = require('node:test')
const assert = require('node:assert/strict')
const { DEFAULT_LEVELS } = require('../src/services/dunningService')

test('DEFAULT_LEVELS: vier aufsteigende Stufen', () => {
  assert.equal(DEFAULT_LEVELS.length, 4)
  for (let i = 1; i < DEFAULT_LEVELS.length; i++) {
    assert.ok(DEFAULT_LEVELS[i].level > DEFAULT_LEVELS[i - 1].level)
    assert.ok(DEFAULT_LEVELS[i].days_overdue > DEFAULT_LEVELS[i - 1].days_overdue)
  }
})

test('DEFAULT_LEVELS: Aktion eskaliert (reminder -> warning -> escalation -> inkasso)', () => {
  const actions = DEFAULT_LEVELS.map((l) => l.action)
  assert.deepEqual(actions, ['reminder', 'warning', 'escalation', 'inkasso'])
})

test('DEFAULT_LEVELS: Gebuehren steigen monoton', () => {
  const fees = DEFAULT_LEVELS.map((l) => Number(l.fee_eur))
  for (let i = 1; i < fees.length; i++) {
    assert.ok(fees[i] >= fees[i - 1])
  }
})
