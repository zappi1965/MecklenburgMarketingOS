const test = require('node:test')
const assert = require('node:assert/strict')
const { _generateKey, _hashKey, _verifyKeyHash, hasScope, VALID_SCOPES } = require('../src/services/apiKeyService')

test('generateKey: liefert prefix + body und beide sind eindeutig', () => {
  const a = _generateKey()
  const b = _generateKey()
  assert.notEqual(a.fullKey, b.fullKey)
  assert.equal(a.prefix.length, 12)
  assert.ok(a.fullKey.startsWith(a.prefix))
})

test('generateKey: prefix entspricht der Umgebung', () => {
  const { fullKey, prefix } = _generateKey()
  assert.ok(prefix.startsWith('mmos_'))
  assert.ok(/^mmos_(live|test)_/.test(fullKey))
})

test('hashKey + verifyKeyHash: korrekter Key matched', () => {
  const k = 'mmos_test_abcdefghijk'
  const stored = _hashKey(k)
  assert.equal(_verifyKeyHash(k, stored), true)
  assert.equal(_verifyKeyHash('mmos_test_wrong', stored), false)
})

test('verifyKeyHash: leerer/invalider Speicher matched nicht', () => {
  assert.equal(_verifyKeyHash('x', ''), false)
  assert.equal(_verifyKeyHash('x', 'invalid'), false)
})

test('hasScope: erkennt vorhandene Scopes', () => {
  assert.equal(hasScope(['read:invoices'], 'read:invoices'), true)
  assert.equal(hasScope(['read:invoices'], 'write:invoices'), false)
  assert.equal(hasScope([], 'read:invoices'), false)
  assert.equal(hasScope(null, 'read:invoices'), false)
})

test('VALID_SCOPES enthaelt Lese- und Schreibrechte', () => {
  assert.ok(VALID_SCOPES.includes('read:invoices'))
  assert.ok(VALID_SCOPES.includes('write:loyalty'))
  assert.ok(VALID_SCOPES.includes('read:reports'))
})
