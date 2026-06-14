const test = require('node:test')
const assert = require('node:assert/strict')

// Sicherstellen, dass der Service ohne Keys im Mock-Modus laeuft.
delete process.env.ANTHROPIC_API_KEY
delete process.env.OPENAI_API_KEY
process.env.AI_PROVIDER = 'anthropic'

const seo = require('../src/services/seoAutopilotService')

test('provider faellt ohne Key auf mock zurueck', () => {
  assert.equal(seo._provider(), 'mock')
})

test('slugify: Umlaute und Sonderzeichen werden normalisiert', () => {
  assert.equal(seo._slugify('Schöne Grüße aus Müritz!'), 'schoene-gruesse-aus-mueritz')
  assert.equal(seo._slugify('  A  B  '), 'a-b')
})

test('extractJson: liest JSON aus Codefence', () => {
  const out = seo._extractJson('Hier:\n```json\n{"a":1}\n```\nfertig')
  assert.deepEqual(out, { a: 1 })
})

test('extractJson: ungueltig -> null', () => {
  assert.equal(seo._extractJson('kein json hier'), null)
})

test('generateBrandProfile (mock): liefert vollstaendiges Profil', async () => {
  const { provider, profile } = await seo.generateBrandProfile({ businessName: 'Salon Test', branch: 'Friseur' })
  assert.equal(provider, 'mock')
  assert.ok(profile.audience.length > 0)
  assert.ok(Array.isArray(profile.topics) && profile.topics.length >= 5)
  assert.ok(Array.isArray(profile.value_props) && profile.value_props.length >= 1)
})

test('generateKeywords (mock): Anzahl, Felder und Grenzen', async () => {
  const { provider, keywords } = await seo.generateKeywords({ businessName: 'Cafe Test', branch: 'Cafe', city: 'Schwerin', count: 6 })
  assert.equal(provider, 'mock')
  assert.equal(keywords.length, 6)
  for (const k of keywords) {
    assert.ok(k.keyword.length > 0)
    assert.ok(['local', 'informational', 'transactional'].includes(k.intent))
    assert.ok(k.priority >= 1 && k.priority <= 5)
  }
})

test('generateKeywords: count wird auf 3..20 begrenzt', async () => {
  const { keywords } = await seo.generateKeywords({ branch: 'Test', count: 999 })
  assert.ok(keywords.length <= 20)
})

test('generateArticle (mock): Titel, Meta, Body, Slug', async () => {
  const { provider, article } = await seo.generateArticle({ keyword: 'friseur schwerin', businessName: 'Salon Test', branch: 'Friseur' })
  assert.equal(provider, 'mock')
  assert.ok(article.title.length > 0)
  assert.ok(article.meta_description.length > 0)
  assert.ok(article.body_markdown.includes('##'))
  assert.ok(article.body_markdown.toLowerCase().includes('friseur schwerin'))
  assert.equal(article.slug, seo._slugify(article.title))
  assert.equal(article.language, 'de')
})

test('generateArticle: ohne keyword -> Fehler', async () => {
  await assert.rejects(() => seo.generateArticle({}), /keyword erforderlich/)
})

const worker = require('../src/workers/seoAutopilotWorker')

test('worker nextRun: daily = +1 Tag, weekly = +7 Tage', () => {
  const from = new Date('2026-06-01T06:00:00.000Z')
  assert.equal(worker._nextRun('daily', from), '2026-06-02T06:00:00.000Z')
  assert.equal(worker._nextRun('weekly', from), '2026-06-08T06:00:00.000Z')
  // Default (unbekannt) faellt auf weekly zurueck
  assert.equal(worker._nextRun('xyz', from), '2026-06-08T06:00:00.000Z')
})
