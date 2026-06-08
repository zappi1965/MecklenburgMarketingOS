// Unit-Tests fuer Dublettensuche.
// Run: node --test tests/duplicateFinder.test.js

const test = require('node:test')
const assert = require('node:assert/strict')
const {
  pairScore,
  _normalizeText,
  _normalizePhone,
  _levenshtein,
  _similarity
} = require('../src/services/duplicateFinderService')

test('normalizeText: entfernt Umlaute, Sonderzeichen, Lowercase', () => {
  assert.equal(_normalizeText('Mueller-Lüdenscheidt GmbH'), 'muellerludenscheidtgmbh')
  assert.equal(_normalizeText('Friseur Möbius & Söhne'), 'friseurmobiussohne')
})

test('normalizePhone: entfernt alle Nicht-Ziffern, behaelt alle Ziffern', () => {
  assert.equal(_normalizePhone('+49 (0) 30 / 123 456'), '49030123456')
  assert.equal(_normalizePhone('030-123456'), '030123456')
  assert.equal(_normalizePhone(undefined), '')
})

test('levenshtein: identische Strings -> 0', () => {
  assert.equal(_levenshtein('abc', 'abc'), 0)
})

test('levenshtein: ein Zeichen Unterschied -> 1', () => {
  assert.equal(_levenshtein('abc', 'abd'), 1)
})

test('similarity: identische Namen -> 1', () => {
  assert.equal(_similarity('test', 'test'), 1)
})

test('similarity: voellig unterschiedlich -> < 0.5', () => {
  assert.ok(_similarity('abc', 'xyz') < 0.5)
})

test('pairScore: identische Eintraege -> 1.0', () => {
  const c = { name: 'Mueller GmbH', email: 'info@m.de', phone: '030123', postal_code: '10115' }
  assert.equal(pairScore(c, { ...c }), 1)
})

test('pairScore: nur gleiche E-Mail -> ca 0.3', () => {
  const c1 = { name: 'Mueller', email: 'info@m.de', phone: '111', postal_code: '10115' }
  const c2 = { name: 'Schmidt', email: 'info@m.de', phone: '222', postal_code: '20095' }
  const score = pairScore(c1, c2)
  assert.ok(score >= 0.2 && score <= 0.5, `score ${score} sollte zwischen 0.2 und 0.5 liegen`)
})

test('pairScore: gleicher Name + PLZ aber andere E-Mail -> >= 0.55', () => {
  const c1 = { name: 'Mueller GmbH', email: 'a@m.de', phone: '111', postal_code: '10115' }
  const c2 = { name: 'Mueller GmbH', email: 'b@m.de', phone: '222', postal_code: '10115' }
  const score = pairScore(c1, c2)
  assert.ok(score >= 0.55, `score ${score} sollte >= 0.55 sein`)
})
