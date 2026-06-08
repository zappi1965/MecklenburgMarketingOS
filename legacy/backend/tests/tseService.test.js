// Unit-Tests fuer den TSE-Service (Mock-Provider).
// Run: node --test tests/tseService.test.js

const test = require('node:test')
const assert = require('node:assert/strict')
const { buildProcessData, _mockSign, PROVIDERS } = require('../src/services/tseService')

test('buildProcessData: enthaelt Brutto/Netto/USt fuer 119 EUR / 19%', () => {
  const data = buildProcessData({ amount: 119, payment_type: 'Bar', taxRate: 19 })
  assert.match(data, /^Beleg\^119\.00_19:100\.00:19\.00\^Bar:EUR:119\.00$/)
})

test('buildProcessData: payment_type wird uebernommen', () => {
  const data = buildProcessData({ amount: 50, payment_type: 'Karte', taxRate: 19 })
  assert.match(data, /Karte:EUR:50\.00/)
})

test('_mockSign: liefert deterministisch fuer gleichen Input', () => {
  const a = _mockSign('TestPayload')
  const b = _mockSign('TestPayload')
  assert.equal(a.signature_value, b.signature_value)
  assert.equal(a.signature_algorithm, 'ecdsa-plain-SHA256-mock')
})

test('_mockSign: signed_payload ist Base64 des Originals', () => {
  const r = _mockSign('Hello')
  assert.equal(Buffer.from(r.signed_payload, 'base64').toString(), 'Hello')
})

test('PROVIDERS enthaelt mock + fiskaly + dtrust + epson', () => {
  assert.deepEqual([...PROVIDERS].sort(), ['dtrust', 'epson', 'fiskaly', 'mock'])
})
