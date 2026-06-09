const test = require('node:test')
const assert = require('node:assert/strict')
const { extractMemberId, _UUID_RE } = require('../src/services/loyaltyScanService')

test('extractMemberId: erkennt nackte UUID', () => {
  assert.equal(extractMemberId('a1b2c3d4-1234-5678-9abc-def012345678'), 'a1b2c3d4-1234-5678-9abc-def012345678')
})

test('extractMemberId: case-insensitive, normalisiert zu lowercase', () => {
  assert.equal(extractMemberId('A1B2C3D4-1234-5678-9ABC-DEF012345678'), 'a1b2c3d4-1234-5678-9abc-def012345678')
})

test('extractMemberId: aus mmos:loyalty:<id>-Praefix', () => {
  assert.equal(extractMemberId('mmos:loyalty:a1b2c3d4-1234-5678-9abc-def012345678'), 'a1b2c3d4-1234-5678-9abc-def012345678')
})

test('extractMemberId: aus URL', () => {
  assert.equal(
    extractMemberId('https://app.mmos.de/wallet/a1b2c3d4-1234-5678-9abc-def012345678'),
    'a1b2c3d4-1234-5678-9abc-def012345678'
  )
})

test('extractMemberId: leere/ungueltige Eingabe -> null', () => {
  assert.equal(extractMemberId(''), null)
  assert.equal(extractMemberId('keine-uuid-hier'), null)
  assert.equal(extractMemberId(null), null)
  assert.equal(extractMemberId(undefined), null)
})

test('UUID_RE matcht Standard-UUIDs', () => {
  assert.ok(_UUID_RE.test('12345678-1234-1234-1234-123456789abc'))
  assert.ok(!_UUID_RE.test('12345-1234-1234-1234-123456789abc'))
})
