const test = require('node:test')
const assert = require('node:assert/strict')
const { toolReadinessOverview, toolReadinessMarkdown } = require('../src/services/toolReadinessService')

test('tool readiness returns tools with scores and missing items', () => {
  const overview = toolReadinessOverview()
  assert.equal(Array.isArray(overview.tools), true)
  assert.ok(overview.tools.length >= 20)
  assert.equal(typeof overview.average_score, 'number')
  assert.equal(overview.tools.some((t) => t.key === 'sumup_revenue_connection'), true)
  assert.equal(overview.tools.every((t) => Array.isArray(t.missing)), true)
})

test('tool readiness markdown exports a table', () => {
  const md = toolReadinessMarkdown()
  assert.equal(md.includes('| Tool | Score | Status | Was fehlt |'), true)
  assert.equal(md.includes('QR & Slug Marketing'), true)
})
