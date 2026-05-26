const test = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('crypto')
const { normalize, verifySignature, _normalizeSumUp, PROVIDERS } = require('../src/services/posService')

test('PROVIDERS enthaelt sumup, lightspeed, gastrosoft, mock', () => {
  assert.deepEqual([...PROVIDERS].sort(), ['gastrosoft', 'lightspeed', 'mock', 'sumup'])
})

test('normalizeSumUp: extrahiert id, amount, currency, status', () => {
  const body = { data: { id: 'tx_123', amount: 49.5, currency: 'EUR', status: 'SUCCESSFUL', timestamp: '2026-05-26T10:00:00Z' } }
  const n = _normalizeSumUp(body)
  assert.equal(n.provider_transaction_id, 'tx_123')
  assert.equal(n.amount, 49.5)
  assert.equal(n.currency, 'EUR')
  assert.equal(n.status, 'successful')
})

test('normalize mock: setzt Defaults', () => {
  const n = normalize('mock', { id: 'demo-1', amount: 12 })
  assert.equal(n.provider_transaction_id, 'demo-1')
  assert.equal(n.amount, 12)
  assert.equal(n.currency, 'EUR')
})

test('verifySignature: mock-Secret akzeptiert alles', () => {
  process.env.POS_MOCK_SECRET = 'mock'
  assert.equal(verifySignature({ provider: 'mock', payload: '{}', signature: 'whatever' }), true)
})

test('verifySignature: fehlende ENV -> ohne Pruefung als ok', () => {
  delete process.env.POS_TEST_SECRET
  assert.equal(verifySignature({ provider: 'test', payload: '{}', signature: '' }), true)
})

test('verifySignature: korrekter HMAC matched', () => {
  process.env.POS_SUMUP_SECRET = 'secret123'
  const payload = '{"amount":10}'
  const sig = crypto.createHmac('sha256', 'secret123').update(payload).digest('hex')
  assert.equal(verifySignature({ provider: 'sumup', payload, signature: sig }), true)
  assert.equal(verifySignature({ provider: 'sumup', payload, signature: 'wrong' }), false)
})
