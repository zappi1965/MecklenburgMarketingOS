// Unit-Tests fuer den AI-Review-Response-Generator (Mock-Provider).
// Run: node --test tests/aiReviewResponse.test.js

const test = require('node:test')
const assert = require('node:assert/strict')
const { _buildPrompt, _parseJsonArray, _mockGenerate, generateResponses } = require('../src/services/aiReviewResponseService')

test('buildPrompt: rating <=2 -> sehr kritisch', () => {
  const { user } = _buildPrompt({ rating: 1, text: 'schlimm', language: 'de' })
  assert.match(user, /sehr kritisch/)
})

test('buildPrompt: rating 4 -> positiv', () => {
  const { user } = _buildPrompt({ rating: 4, text: 'ganz ok', language: 'de' })
  assert.match(user, /\bpositiv\b/)
})

test('buildPrompt: rating 5 -> sehr positiv', () => {
  const { user } = _buildPrompt({ rating: 5, text: 'super', language: 'de' })
  assert.match(user, /sehr positiv/)
})

test('buildPrompt: brandVoice landet im System-Prompt', () => {
  const { system } = _buildPrompt({ rating: 3, text: '...', brandVoice: 'locker mit Du', language: 'de' })
  assert.match(system, /locker mit Du/)
})

test('parseJsonArray: gueltiges JSON-Array', () => {
  const arr = _parseJsonArray('["a", "b", "c"]')
  assert.deepEqual(arr, ['a', 'b', 'c'])
})

test('parseJsonArray: JSON eingebettet in Text', () => {
  const arr = _parseJsonArray('Hier sind die Antworten:\n["x", "y"]\nDanke')
  assert.deepEqual(arr, ['x', 'y'])
})

test('parseJsonArray: ohne JSON -> Newline-Split', () => {
  const arr = _parseJsonArray('1. erste Antwort\n2. zweite\n3. dritte')
  assert.equal(arr.length, 3)
  assert.match(arr[0], /erste Antwort/)
})

test('mockGenerate: 1-Sterne-Bewertung -> entschuldigender Tonfall', async () => {
  const r = await _mockGenerate({ rating: 1 })
  assert.equal(r.length, 3)
  assert.ok(r.some((s) => /tut.*leid|entschuld/i.test(s)))
})

test('mockGenerate: 5-Sterne -> dankbar', async () => {
  const r = await _mockGenerate({ rating: 5 })
  assert.equal(r.length, 3)
  assert.ok(r.some((s) => /freut|danke|herzlich/i.test(s)))
})

test('generateResponses ohne ENV faellt auf mock zurueck und liefert 3 Vorschlaege', async () => {
  // Ohne ANTHROPIC_API_KEY und OPENAI_API_KEY ist der Provider 'mock'.
  delete process.env.ANTHROPIC_API_KEY
  delete process.env.OPENAI_API_KEY
  const r = await generateResponses({
    review: { rating: 2, feedback_text: 'War nicht gut.' },
    customer: { name: 'Test GmbH' }
  })
  assert.equal(r.provider, 'mock')
  assert.equal(r.suggestions.length, 3)
})
