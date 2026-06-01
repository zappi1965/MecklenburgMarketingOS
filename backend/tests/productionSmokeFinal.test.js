const test = require('node:test')
const assert = require('node:assert/strict')
const { verifyHmacSignature } = require('../src/services/webhookSignatureGuardService')
const { inspectFileUpload } = require('../src/services/fileUploadSecurityGuardService')
const { roleAllowed } = require('../src/services/rbacPermissionMatrixService')

test('webhook signature guard validates hmac payloads', () => {
  const secret = 'test-secret'
  const payload = JSON.stringify({ ok: true })
  const crypto = require('crypto')
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  assert.equal(verifyHmacSignature({ secret, payload, signature }).ok, true)
  assert.equal(verifyHmacSignature({ secret, payload, signature: 'wrong' }).ok, false)
})

test('file upload guard blocks executable extensions', () => {
  const result = inspectFileUpload({ filename: 'evil.exe', mime_type: 'application/octet-stream', size_bytes: 100, customer_id: 'c1' })
  assert.equal(result.ok, false)
  assert.equal(result.issues.some((i) => i.issue === 'blocked_extension'), true)
})

test('rbac matrix respects critical permissions', () => {
  assert.equal(roleAllowed('super_admin', 'create_admin'), true)
  assert.equal(roleAllowed('admin', 'create_admin'), false)
  assert.equal(roleAllowed('accounting', 'send_invoice'), true)
})
