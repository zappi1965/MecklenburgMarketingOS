const test = require('node:test')
const assert = require('node:assert/strict')
const { POST_TYPES } = require('../src/services/gmbService')

test('POST_TYPES enthaelt die vier Standard-Post-Typen', () => {
  assert.deepEqual([...POST_TYPES].sort(), ['ALERT', 'EVENT', 'OFFER', 'STANDARD'])
})
