const test = require('node:test')
const assert = require('node:assert/strict')
const { _median, _percentile, _regionKey, _monthKey, SEGMENT_DEFS } = require('../src/services/analyticsService')

test('median: ungerade Anzahl -> mittlerer Wert', () => {
  assert.equal(_median([1, 2, 3, 4, 5]), 3)
})

test('median: gerade Anzahl -> Mittelwert der mittleren beiden', () => {
  assert.equal(_median([1, 2, 3, 4]), 2.5)
})

test('median: leeres Array -> 0', () => {
  assert.equal(_median([]), 0)
})

test('percentile: p25, p50, p75', () => {
  const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  assert.equal(_percentile(arr, 25), 3)
  assert.equal(_percentile(arr, 50), 6)
  assert.equal(_percentile(arr, 75), 8)
})

test('regionKey: erste drei Ziffern der PLZ', () => {
  assert.equal(_regionKey('18055'), '180')
  assert.equal(_regionKey(''), null)
  assert.equal(_regionKey(null), null)
})

test('monthKey: liefert YYYY-MM-01', () => {
  assert.equal(_monthKey('2026-05-26T10:30:00Z'), '2026-05-01')
})

test('SEGMENT_DEFS enthaelt fuenf bekannte Segmente', () => {
  const keys = SEGMENT_DEFS.map((s) => s.key).sort()
  assert.deepEqual(keys, ['all', 'first_time', 'loyalty_vip', 'qr_only', 'win_back'])
})
