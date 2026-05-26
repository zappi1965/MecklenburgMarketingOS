const test = require('node:test')
const assert = require('node:assert/strict')
const { computeScore, levelFor, strategyFor } = require('../src/services/noShowService')

test('levelFor: <30 low, 30..59 medium, >=60 high', () => {
  assert.equal(levelFor(0), 'low')
  assert.equal(levelFor(29), 'low')
  assert.equal(levelFor(30), 'medium')
  assert.equal(levelFor(59), 'medium')
  assert.equal(levelFor(60), 'high')
})

test('strategyFor: low -> standard, medium -> high_touch, high -> confirm_required', () => {
  assert.equal(strategyFor(5), 'standard')
  assert.equal(strategyFor(40), 'high_touch')
  assert.equal(strategyFor(80), 'confirm_required')
})

test('computeScore: leere Historie + neuer Kunde -> niedriges-mittleres Risiko', () => {
  const r = computeScore({
    history: { completed: 0, noShows: 0, total: 0 },
    lead_time_hours: 24,
    is_weekend_morning: false,
    new_customer: true
  })
  assert.ok(r.score > 0 && r.score < 50)
})

test('computeScore: viele vergangene No-Shows -> hoher Score', () => {
  const r = computeScore({
    history: { completed: 1, noShows: 4, total: 5 },
    lead_time_hours: 24,
    is_weekend_morning: false,
    new_customer: false
  })
  assert.ok(r.score >= 40, `score ${r.score}`)
})

test('computeScore: loyaler Kunde mit 0 No-Shows -> niedriger Score', () => {
  const r = computeScore({
    history: { completed: 10, noShows: 0, total: 10 },
    lead_time_hours: 24,
    is_weekend_morning: false,
    new_customer: false
  })
  assert.ok(r.score === 0, `score ${r.score}, reasons ${JSON.stringify(r.reasons)}`)
})

test('computeScore: weekend morning slot wirkt erhoehend', () => {
  const r1 = computeScore({
    history: { completed: 0, noShows: 0, total: 0 },
    lead_time_hours: 24,
    is_weekend_morning: false,
    new_customer: false
  })
  const r2 = computeScore({
    history: { completed: 0, noShows: 0, total: 0 },
    lead_time_hours: 24,
    is_weekend_morning: true,
    new_customer: false
  })
  assert.ok(r2.score > r1.score)
})

test('computeScore: reasons enthaelt nachvollziehbare Eintraege', () => {
  const r = computeScore({
    history: { completed: 0, noShows: 0, total: 0 },
    lead_time_hours: 24,
    is_weekend_morning: true,
    new_customer: true
  })
  const keys = r.reasons.map((x) => x.key)
  assert.ok(keys.includes('weekend_morning_slot'))
  assert.ok(keys.includes('new_customer'))
})
