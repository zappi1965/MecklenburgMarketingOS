const test = require('node:test')
const assert = require('node:assert/strict')
const { registerJobHandler } = require('../src/services/jobQueueService')

test('registerJobHandler validates handler', () => {
  assert.throws(() => registerJobHandler('x', null), /function/)
  assert.doesNotThrow(() => registerJobHandler('unit.noop', async () => ({ ok: true })))
})
