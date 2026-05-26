const test = require('node:test')
const assert = require('node:assert/strict')
const { _buildContext, _parseDraft, _mockDraft, buildPrompt, PURPOSES, draftMail } = require('../src/services/aiCrmMailService')

test('PURPOSES enthaelt sechs Use-Cases', () => {
  assert.equal(PURPOSES.length, 6)
  for (const p of ['reactivation', 'thank_you', 'dunning_intro', 'birthday', 'review_followup', 'free']) {
    assert.ok(PURPOSES.includes(p), `${p} fehlt`)
  }
})

test('buildContext: Sender + Empfaenger im Output', () => {
  const ctx = _buildContext({
    customer: { name: 'Friseur Mueller', brand_voice: 'leger' },
    recipient: { name: 'Anna', email: 'anna@example.com' },
    context: {}
  })
  assert.match(ctx, /Friseur Mueller/)
  assert.match(ctx, /Anna/)
  assert.match(ctx, /anna@example\.com/)
  assert.match(ctx, /leger/)
})

test('buildContext: Health-Score wird invertiert dargestellt (Risiko 30 -> Health 70/100)', () => {
  const ctx = _buildContext({
    customer: { name: 'X' },
    recipient: { name: 'Y' },
    context: { risk_score: 30 }
  })
  assert.match(ctx, /70\/100/)
})

test('parseDraft: gueltiges JSON wird strukturiert geparst', () => {
  const r = _parseDraft('{"subject":"Hallo","body":"Test"}')
  assert.equal(r.subject, 'Hallo')
  assert.equal(r.body, 'Test')
})

test('parseDraft: JSON eingebettet in Prosa', () => {
  const r = _parseDraft('Hier mein Vorschlag: {"subject":"S","body":"B"}\nViel Erfolg')
  assert.equal(r.subject, 'S')
  assert.equal(r.body, 'B')
})

test('parseDraft: ohne JSON -> erste Zeile als Subject, Rest als Body', () => {
  const r = _parseDraft('Kurze Erinnerung\nText ueber zwei Zeilen.\nDanke.')
  assert.equal(r.subject, 'Kurze Erinnerung')
  assert.match(r.body, /Text ueber zwei Zeilen/)
})

test('mockDraft: liefert vorgefertigte Inhalte pro Purpose', async () => {
  const r = await _mockDraft({ purpose: 'reactivation' })
  assert.ok(r.subject)
  assert.ok(r.body)
})

test('buildPrompt: enthaelt purpose-spezifisches Ziel', () => {
  const { user } = buildPrompt({
    purpose: 'dunning_intro',
    customer: { name: 'X' },
    recipient: { email: 'y@z.de' },
    context: {}
  })
  assert.match(user, /Zahlungserinnerung/i)
})

test('draftMail ohne ENV faellt auf mock-Provider zurueck', async () => {
  delete process.env.ANTHROPIC_API_KEY
  delete process.env.OPENAI_API_KEY
  const r = await draftMail({
    purpose: 'thank_you',
    customer: null,
    recipient: { email: 'a@b.de' }
  })
  assert.equal(r.provider, 'mock')
  assert.ok(r.draft.subject)
})

test('draftMail mit unbekanntem purpose -> 400', async () => {
  await assert.rejects(
    () => draftMail({ purpose: 'totally-invalid', customer: {}, recipient: {} }),
    /Unbekannter purpose/
  )
})
