const test = require('node:test')
const assert = require('node:assert/strict')
const { buildSystemPrompt, _mockReply, MAX_MESSAGES_PER_CONVERSATION, MAX_USER_MESSAGE_CHARS } = require('../src/services/chatbotService')

test('buildSystemPrompt: enthaelt Customer-Namen', () => {
  const s = buildSystemPrompt({ customer: { name: 'Friseur Mueller' }, slug: 'bonusclub' })
  assert.match(s, /Friseur Mueller/)
})

test('buildSystemPrompt: ohne Customer -> generischer Text', () => {
  const s = buildSystemPrompt({ customer: null, slug: 'x' })
  assert.match(s, /der Anbieter/)
})

test('buildSystemPrompt: ChatBot-Kontext aus metadata wird uebernommen', () => {
  const s = buildSystemPrompt({
    customer: { name: 'Test', metadata: { chatbot_context: 'Wir bieten Hochzeitsfrisuren ab 09:00.' } },
    slug: null
  })
  assert.match(s, /Hochzeitsfrisuren/)
})

test('buildSystemPrompt: Slug wird in Systemtext eingebettet', () => {
  const s = buildSystemPrompt({ customer: { name: 'Test' }, slug: 'aktion-2026' })
  assert.match(s, /aktion-2026/)
})

test('mockReply: zyklisch ueber MOCK_REPLIES', () => {
  const r1 = _mockReply([])
  const r2 = _mockReply([{ role: 'user' }])
  assert.notEqual(r1, r2)
})

test('Konstanten sind sinnvoll', () => {
  assert.ok(MAX_MESSAGES_PER_CONVERSATION >= 4)
  assert.ok(MAX_USER_MESSAGE_CHARS >= 200)
})
