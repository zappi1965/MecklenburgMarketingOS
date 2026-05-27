// Unit-Tests fuer den Validation-Service (E-Mail, PLZ).
// Geokodierung NICHT getestet (Netzwerk).
// Run: node --test tests/validationService.test.js

const test = require('node:test')
const assert = require('node:assert/strict')
const { EMAIL_RE, _emailDomain } = require('../src/services/validationService')

test('EMAIL_RE matcht valide Adressen', () => {
  assert.ok(EMAIL_RE.test('a@b.de'))
  assert.ok(EMAIL_RE.test('first.last+tag@example.co.uk'))
})

test('EMAIL_RE lehnt invalide Adressen ab', () => {
  assert.ok(!EMAIL_RE.test('keinAt'))
  assert.ok(!EMAIL_RE.test('a@b'))
  assert.ok(!EMAIL_RE.test('a@.de'))
  assert.ok(!EMAIL_RE.test('@b.de'))
  assert.ok(!EMAIL_RE.test(''))
})

test('emailDomain extrahiert die Domain in lowercase', () => {
  assert.equal(_emailDomain('Foo@Example.DE'), 'example.de')
})

test('emailDomain liefert null fuer invalide Eingabe', () => {
  assert.equal(_emailDomain('keinAt'), null)
})
