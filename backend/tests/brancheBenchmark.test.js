const test = require('node:test')
const assert = require('node:assert/strict')
const { quantiles, decideSource, buildMetricComparison, MIN_PEERS } = require('../src/services/brancheBenchmarkService')

const metric = { key: 'revenue', label: 'Umsatz' }

test('quantiles berechnet p25/median/p75/avg', () => {
  const q = quantiles([1, 2, 3, 4, 5])
  assert.equal(q.count, 5)
  assert.equal(q.median, 3)
  assert.equal(q.p25, 2)
  assert.equal(q.p75, 4)
  assert.equal(q.avg, 3)
})

test('decideSource: ab MIN_PEERS peers, sonst targets', () => {
  assert.equal(decideSource(MIN_PEERS - 1), 'targets')
  assert.equal(decideSource(MIN_PEERS), 'peers')
})

test('<5 Peers -> Fallback auf Zielwert', () => {
  const row = buildMetricComparison({ metric, ownValue: 100, peerValues: [1, 2], target: 80 })
  assert.equal(row.source, 'targets')
  assert.equal(row.suppressed, true)
  assert.equal(row.target_value, 80)
  assert.equal(row.position, 'über Ziel')
})

test('<5 Peers ohne Zielwert -> none/suppressed (keine Daten)', () => {
  const row = buildMetricComparison({ metric, ownValue: 100, peerValues: [1, 2], target: null })
  assert.equal(row.source, 'none')
  assert.equal(row.suppressed, true)
  assert.equal('peer_median' in row, false)
})

test('>=5 Peers -> echte Quantile + Position', () => {
  const row = buildMetricComparison({ metric, ownValue: 100, peerValues: [10, 20, 30, 40, 50] })
  assert.equal(row.source, 'peers')
  assert.equal(row.suppressed, false)
  assert.equal(row.peer_count, 5)
  assert.equal(row.peer_median, 30)
  assert.equal(row.position, 'top')
})

test('Self-Exclusion-Effekt: 5 Peers ohne self bleibt peers, mit self-drop unter 5 -> fallback', () => {
  // Simulation: nach Self-Exclusion nur 4 Peers -> fallback
  const row = buildMetricComparison({ metric, ownValue: 10, peerValues: [1, 2, 3, 4], target: 5 })
  assert.equal(row.source, 'targets')
})
