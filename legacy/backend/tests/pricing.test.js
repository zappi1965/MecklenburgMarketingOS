const test = require('node:test')
const assert = require('node:assert/strict')
const { calculate, pickRule, isWeekend, isOffPeak } = require('../src/services/pricingService')

const baseRule = {
  scope: 'global',
  base_price_eur: 100,
  occupancy_threshold: 80,
  uplift_pct: 20,
  downlift_pct: 10,
  weekend_uplift_pct: 15,
  off_peak_downlift_pct: 25
}

test('calculate: base ohne occupancy/slot -> Grundpreis', () => {
  const r = calculate({ rule: baseRule, occupancy: null, slot_time: null })
  assert.equal(r.final, 100)
  assert.equal(r.breakdown[0].label, 'base')
})

test('calculate: occupancy >= threshold loest uplift aus', () => {
  const r = calculate({ rule: baseRule, occupancy: 90, slot_time: null })
  assert.equal(r.final, 120)
})

test('calculate: occupancy < threshold loest downlift aus', () => {
  const r = calculate({ rule: baseRule, occupancy: 30, slot_time: null })
  assert.equal(r.final, 90)
})

test('isWeekend: Samstag/Sonntag true, Mo-Fr false', () => {
  // 2026-05-30 ist ein Samstag.
  assert.equal(isWeekend('2026-05-30T12:00:00Z'), true)
  // 2026-05-27 ist ein Mittwoch.
  assert.equal(isWeekend('2026-05-27T12:00:00Z'), false)
})

test('isOffPeak: Sa/So -> nicht off-peak, Werktag 09:00 -> off-peak, Werktag 12:00 -> peak', () => {
  // Lokale Stunde im Konstruktor — Test mit klaren Mock-Zeiten.
  const dWeekday0900 = new Date(); dWeekday0900.setFullYear(2026, 4, 27); dWeekday0900.setHours(9, 0, 0, 0)
  const dWeekday1200 = new Date(); dWeekday1200.setFullYear(2026, 4, 27); dWeekday1200.setHours(12, 0, 0, 0)
  assert.equal(isOffPeak(dWeekday0900), true)
  assert.equal(isOffPeak(dWeekday1200), false)
})

test('pickRule: konkreter Scope-Match bevorzugt vor global', () => {
  const rules = [
    { scope: 'global', scope_value: null, name: 'g' },
    { scope: 'service', scope_value: 'cut', name: 's-cut' },
    { scope: 'service', scope_value: null, name: 's-any' }
  ]
  assert.equal(pickRule(rules, 'service', 'cut').name, 's-cut')
  assert.equal(pickRule(rules, 'service', 'color').name, 's-any')
  assert.equal(pickRule(rules, 'category', 'x').name, 'g')
})

test('calculate: ohne Regel -> 0/0/[]', () => {
  const r = calculate({ rule: null, occupancy: 50, slot_time: null })
  assert.equal(r.final, 0)
  assert.deepEqual(r.breakdown, [])
})
