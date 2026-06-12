const test = require('node:test')
const assert = require('node:assert/strict')
const { dealCreateSchema, miniWebsiteUpdateSchema, parseOrThrow } = require('../src/validators/marketingSchemas')
const { lastMonthPeriod } = require('../src/workers/brancheBenchmarkWorker')

test('dealCreateSchema akzeptiert gültige Eingabe', () => {
  const data = parseOrThrow(dealCreateSchema, { title: 'Sommer-Deal', discount_label: '-20%', cta_url: 'https://example.com' })
  assert.equal(data.title, 'Sommer-Deal')
})

test('dealCreateSchema lehnt fehlenden Titel ab (400)', () => {
  assert.throws(() => parseOrThrow(dealCreateSchema, { discount_label: '-20%' }), (e) => e.status === 400)
})

test('dealCreateSchema lehnt ungültige URL ab', () => {
  assert.throws(() => parseOrThrow(dealCreateSchema, { title: 'X', cta_url: 'not-a-url' }), (e) => e.status === 400)
})

test('miniWebsiteUpdateSchema akzeptiert Teilobjekte', () => {
  const data = parseOrThrow(miniWebsiteUpdateSchema, { enabled: true, brand: { name: 'Test' } })
  assert.equal(data.enabled, true)
  assert.equal(data.brand.name, 'Test')
})

test('miniWebsiteUpdateSchema begrenzt Service-Anzahl', () => {
  const services = Array.from({ length: 101 }, () => ({ name: 'x' }))
  assert.throws(() => parseOrThrow(miniWebsiteUpdateSchema, { services }), (e) => e.status === 400)
})

test('lastMonthPeriod liefert Vormonats-Start/-Ende', () => {
  const p = lastMonthPeriod(new Date('2026-03-15T00:00:00Z'))
  assert.equal(p.start, '2026-02-01')
  assert.equal(p.end, '2026-02-28')
})
