const test = require('node:test')
const assert = require('node:assert/strict')
const { computeComplianceScore } = require('../src/services/complianceCockpitService')

test('computeComplianceScore: voller Score bei optimalen Werten', () => {
  const s = computeComplianceScore({
    activities: 5, nonEuProcessors: 0, sccRequired: 0, mfaCoveragePct: 100, openDsar: 0
  })
  assert.equal(s, 100)
})

test('computeComplianceScore: wenige Aktivitaeten ziehen 15 Punkte ab', () => {
  const s = computeComplianceScore({
    activities: 0, nonEuProcessors: 0, sccRequired: 0, mfaCoveragePct: 100, openDsar: 0
  })
  assert.equal(s, 85)
})

test('computeComplianceScore: Non-EU ohne SCC zieht 20 Punkte ab', () => {
  const s = computeComplianceScore({
    activities: 5, nonEuProcessors: 3, sccRequired: 1, mfaCoveragePct: 100, openDsar: 0
  })
  assert.equal(s, 80)
})

test('computeComplianceScore: MFA <50% zieht 25 Punkte', () => {
  const s = computeComplianceScore({
    activities: 5, nonEuProcessors: 0, sccRequired: 0, mfaCoveragePct: 25, openDsar: 0
  })
  assert.equal(s, 75)
})

test('computeComplianceScore: MFA 50-99% zieht 10 Punkte', () => {
  const s = computeComplianceScore({
    activities: 5, nonEuProcessors: 0, sccRequired: 0, mfaCoveragePct: 75, openDsar: 0
  })
  assert.equal(s, 90)
})

test('computeComplianceScore: >5 offene DSAR ziehen 10 Punkte', () => {
  const s = computeComplianceScore({
    activities: 5, nonEuProcessors: 0, sccRequired: 0, mfaCoveragePct: 100, openDsar: 6
  })
  assert.equal(s, 90)
})

test('computeComplianceScore: clamp auf 0..100', () => {
  const s = computeComplianceScore({
    activities: 0, nonEuProcessors: 10, sccRequired: 0, mfaCoveragePct: 0, openDsar: 100
  })
  assert.ok(s >= 0)
  assert.ok(s <= 100)
})
