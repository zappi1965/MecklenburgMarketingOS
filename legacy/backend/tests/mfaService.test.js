// Unit-Tests fuer den MFA-Service (Backup-Code-Logik + Hashing).
// Run: node --test tests/mfaService.test.js

const test = require('node:test')
const assert = require('node:assert/strict')
const { _generateBackupCodes, _verifyCodeHash, _hashCode } = require('../src/services/mfaService')

test('generateBackupCodes: liefert 10 Codes im Format XXXXX-XXXXX', () => {
  const codes = _generateBackupCodes(10)
  assert.equal(codes.length, 10)
  for (const c of codes) assert.match(c, /^[A-F0-9]{5}-[A-F0-9]{5}$/)
})

test('generateBackupCodes: Codes sind eindeutig', () => {
  const codes = _generateBackupCodes(20)
  assert.equal(new Set(codes).size, codes.length)
})

test('hashCode + verifyCodeHash: korrekter Code matched, falscher nicht', () => {
  const code = 'ABCDE-12345'
  const stored = _hashCode(code)
  assert.equal(_verifyCodeHash(code, stored), true)
  assert.equal(_verifyCodeHash('WRONG-CODE!', stored), false)
})

test('verifyCodeHash: leerer Speicher matcht nie', () => {
  assert.equal(_verifyCodeHash('any', ''), false)
  assert.equal(_verifyCodeHash('any', null), false)
  assert.equal(_verifyCodeHash('any', 'invalid-format'), false)
})

test('hashCode: gleicher Code mit unterschiedlichem Salt liefert unterschiedlichen Hash', () => {
  const code = 'TESTC-ODE12'
  const a = _hashCode(code)
  const b = _hashCode(code)
  assert.notEqual(a, b)
  // Aber beide sollten den gleichen Code wieder verifizieren.
  assert.equal(_verifyCodeHash(code, a), true)
  assert.equal(_verifyCodeHash(code, b), true)
})
