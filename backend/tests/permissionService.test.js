const test = require('node:test')
const assert = require('node:assert/strict')
const { can, assertCan, scopedCustomerFilter } = require('../src/services/permissionService')

const admin = { id: 'a1', role: 'admin', status: 'active' }
const customerA = { id: 'u1', role: 'customer', status: 'active', customer_id: 'c-a' }
const customerBResource = { customer_id: 'c-b' }
const customerAResource = { customer_id: 'c-a' }

test('admin can access internal tools', () => {
  assert.equal(can(admin, 'generate', 'mini_audit', {}), true)
  assert.equal(can(admin, 'generate', 'document_generation', { customer_id: 'c-any' }), true)
})

test('customer cannot access internal generators', () => {
  assert.equal(can(customerA, 'generate', 'mini_audit', customerAResource), false)
  assert.throws(() => assertCan(customerA, 'generate', 'document_generation', customerAResource), /Keine Berechtigung/)
})

test('customer can read own output document only', () => {
  assert.equal(can(customerA, 'read', 'output_document', customerAResource), true)
  assert.equal(can(customerA, 'download', 'output_document', customerAResource), true)
  assert.equal(can(customerA, 'read', 'output_document', customerBResource), false)
  assert.equal(can(customerA, 'create', 'output_document', customerAResource), false)
})

test('customer scope cannot be switched', () => {
  assert.equal(scopedCustomerFilter(customerA, 'c-a'), 'c-a')
  assert.throws(() => scopedCustomerFilter(customerA, 'c-b'), /Kein Zugriff/)
})
