const test = require('node:test')
const assert = require('node:assert/strict')
const social = require('../src/services/aiSocialPostService')

test('generatePosts: faellt ohne Keys auf Mock zurueck und liefert count Posts', async () => {
  const r = await social.generatePosts({ platform: 'instagram', topic: 'Sommer-Aktion', count: 3 })
  assert.equal(r.provider, 'mock')
  assert.equal(r.platform, 'instagram')
  assert.equal(r.posts.length, 3)
  for (const p of r.posts) {
    assert.equal(typeof p.text, 'string')
    assert.ok(p.text.length > 0)
    assert.ok(Array.isArray(p.hashtags))
  }
})

test('generatePosts: unbekannte Plattform faellt auf instagram zurueck', async () => {
  const r = await social.generatePosts({ platform: 'tiktok', count: 2 })
  assert.equal(r.platform, 'instagram')
  assert.equal(r.posts.length, 2)
})

test('generatePosts: count wird auf 1..5 begrenzt', async () => {
  const hi = await social.generatePosts({ platform: 'facebook', count: 99 })
  assert.ok(hi.posts.length <= 5)
  const lo = await social.generatePosts({ platform: 'facebook', count: 0 })
  assert.ok(lo.posts.length >= 1)
})

test('google_post-Mock hat keine Hashtags', async () => {
  const r = await social.generatePosts({ platform: 'google_post', count: 3 })
  for (const p of r.posts) assert.equal(p.hashtags.length, 0)
})

test('_parsePosts: liest JSON-Array von Objekten', () => {
  const posts = social._parsePosts('Hier: [{"text":"Hallo Welt","hashtags":["#a","#b"]},{"text":"Zweiter","hashtags":[]}]')
  assert.equal(posts.length, 2)
  assert.equal(posts[0].text, 'Hallo Welt')
  assert.deepEqual(posts[0].hashtags, ['#a', '#b'])
})

test('_parsePosts: Fallback extrahiert Hashtags aus Klartext', () => {
  const posts = social._parsePosts('1. Toller Post #lokal #service\n2. Noch einer #qualitaet')
  assert.ok(posts.length >= 2)
  assert.deepEqual(posts[0].hashtags, ['#lokal', '#service'])
})

test('_normalizePost: String-Eingabe extrahiert Hashtags', () => {
  const p = social._normalizePost('Komm vorbei! #willkommen #region')
  assert.equal(p.text, 'Komm vorbei! #willkommen #region')
  assert.deepEqual(p.hashtags, ['#willkommen', '#region'])
})

test('_buildPrompt: enthaelt Plattform, Sprache und count', () => {
  const { system, user } = social._buildPrompt({ platform: 'linkedin', topic: 'Neueroeffnung', language: 'de', count: 4 })
  assert.match(system, /linkedin/)
  assert.match(system, /GENAU 4/)
  assert.match(user, /Neueroeffnung/)
})
