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

// --- Milestone 4 -----------------------------------------------------------

const md = require('../src/services/seoMarkdown')

test('seoMarkdown: HTML wird escaped (kein XSS)', () => {
  const out = md.markdownToHtml('Hallo <script>alert(1)</script> Welt')
  assert.ok(!out.includes('<script>'))
  assert.ok(out.includes('&lt;script&gt;'))
})

test('seoMarkdown: Subset (Ueberschrift, Liste, fett)', () => {
  const out = md.markdownToHtml('## Titel\n\n- a\n- b\n\n**fett**')
  assert.ok(out.includes('<h2>Titel</h2>'))
  assert.ok(out.includes('<ul><li>a</li><li>b</li></ul>'))
  assert.ok(out.includes('<strong>fett</strong>'))
})

const img = require('../src/services/seoImageService')

test('seoImageService (mock): liefert data:-SVG-URI', async () => {
  delete process.env.OPENAI_API_KEY
  assert.equal(img._provider(), 'mock')
  const { provider, url } = await img.generateCoverImage({ title: 'Friseur Schwerin Tipps', branch: 'Friseur' })
  assert.equal(provider, 'mock')
  assert.ok(url.startsWith('data:image/svg+xml,'))
})

const wp = require('../src/services/wordpressPublishService')

test('wordpressPublishService (mock): ohne Zugangsdaten simulierte URL', async () => {
  const r = await wp.publishPost({ wpUrl: 'https://kunde.de', title: 'X', contentHtml: '<p>x</p>' })
  assert.equal(r.mocked, true)
  assert.ok(r.url.startsWith('https://kunde.de/?p=mock-'))
})

test('wordpressPublishService: hasCredentials nur bei allen Feldern', () => {
  assert.equal(wp._hasCredentials({ wpUrl: 'a', wpUser: 'b', wpAppPassword: 'c' }), true)
  assert.equal(wp._hasCredentials({ wpUrl: 'a', wpUser: 'b' }), false)
})

// --- Milestone 5 + Verschluesselung ---------------------------------------

const links = require('../src/services/seoInternalLinks')

test('seoInternalLinks: verlinkt erstes Vorkommen, max-Limit, ueberspringt Ueberschriften', () => {
  const md = '## Friseur Schwerin\n\nEin guter Friseur in Schwerin ist wichtig. Noch ein Friseur Satz.'
  const out = links.injectInternalLinks(md, [{ keyword: 'Friseur', url: '/blog/x/friseur' }], 3)
  // Ueberschrift bleibt unveraendert
  assert.ok(out.includes('## Friseur Schwerin'))
  // genau ein Link gesetzt
  assert.equal((out.match(/\]\(\/blog\/x\/friseur\)/g) || []).length, 1)
})

test('seoInternalLinks: respektiert maxLinks', () => {
  const md = 'alpha beta gamma'
  const out = links.injectInternalLinks(md, [
    { keyword: 'alpha', url: '/a' }, { keyword: 'beta', url: '/b' }, { keyword: 'gamma', url: '/c' }
  ], 2)
  const count = (out.match(/\]\(/g) || []).length
  assert.equal(count, 2)
})

const secretBox = require('../src/lib/secretBox')

test('secretBox: Round-Trip mit Schluessel', () => {
  process.env.SEO_SECRET_KEY = 'test-key-123'
  const enc = secretBox.encrypt('geheim!')
  assert.ok(secretBox.isEncrypted(enc))
  assert.ok(enc.startsWith('enc:v1:'))
  assert.equal(secretBox.decrypt(enc), 'geheim!')
  delete process.env.SEO_SECRET_KEY
})

test('secretBox: ohne Schluessel Klartext (Dev) und idempotentes decrypt', () => {
  delete process.env.SEO_SECRET_KEY
  delete process.env.APP_ENCRYPTION_KEY
  assert.equal(secretBox.encrypt('abc'), 'abc')
  assert.equal(secretBox.decrypt('abc'), 'abc')
  assert.equal(secretBox.encrypt(''), '')
})

// --- Ausbau: Keyword-Daten, CMS-Ziele, Metriken ---------------------------

const kwData = require('../src/services/seoKeywordDataService')

test('seoKeywordDataService (mock): reichert mit plausiblen Kennzahlen an', async () => {
  delete process.env.DATAFORSEO_LOGIN
  delete process.env.DATAFORSEO_PASSWORD
  assert.equal(kwData._provider(), 'mock')
  const { provider, keywords } = await kwData.enrichKeywords([{ keyword: 'friseur schwerin', intent: 'local', priority: 5 }])
  assert.equal(provider, 'mock')
  const k = keywords[0]
  assert.ok(k.search_volume >= 10)
  assert.ok(k.difficulty >= 0 && k.difficulty <= 100)
  assert.ok(k.cpc >= 0)
  assert.equal(k.data_provider, 'mock')
})

test('seoKeywordDataService: deterministisch fuer gleiches Keyword', () => {
  const a = kwData._mockMetrics('cafe schwerin')
  const b = kwData._mockMetrics('cafe schwerin')
  assert.deepEqual(a, b)
})

const shopify = require('../src/services/shopifyPublishService')
const webflow = require('../src/services/webflowPublishService')

test('shopifyPublishService (mock): simulierte URL ohne Zugang', async () => {
  const r = await shopify.publishPost({ shop: 'kunde.myshopify.com', title: 'X', contentHtml: '<p>x</p>' })
  assert.equal(r.mocked, true)
  assert.ok(r.url.includes('kunde.myshopify.com/blogs/news/mock-'))
})

test('webflowPublishService (mock): simulierte URL ohne Zugang', async () => {
  const r = await webflow.publishPost({ siteUrl: 'https://kunde.webflow.io', title: 'Mein Titel', contentHtml: '<p>x</p>' })
  assert.equal(r.mocked, true)
  assert.ok(r.url.includes('/post/mein-titel'))
})

const metrics = require('../src/services/seoMetricsService')

test('seoMetricsService (mock): Kennzahlen in plausiblen Grenzen', async () => {
  const m = await metrics.fetchMetrics({ id: 'abc-123', published_at: '2026-05-01T00:00:00Z' })
  assert.ok(m.impressions >= 0)
  assert.ok(m.clicks >= 0 && m.clicks <= m.impressions)
  assert.ok(m.position >= 1)
  assert.equal(m.source, 'mock')
})
