const test = require('node:test')
const assert = require('node:assert/strict')
const { slugify, boosterFromAudit, buildPublicSiteDto } = require('../src/services/miniWebsiteService')

test('slugify normalisiert', () => {
  assert.equal(slugify('Café Glück'), 'cafe-glueck')
  assert.equal(slugify(''), 'site')
})

test('boosterFromAudit mappt quickCheck und zählt offene Punkte', () => {
  const b = boosterFromAudit({
    score: 70,
    overallStatus: 'bedingt',
    quickCheck: [
      { key: 'rating', area: 'Bewertungen', status: 'kritisch', note: 'zu wenige' },
      { key: 'photos', area: 'Fotos', status: 'stark', note: 'ok' }
    ]
  })
  assert.equal(b.items.length, 2)
  assert.equal(b.open_count, 1)
  assert.equal(b.items[0].action_needed, true)
  assert.equal(b.items[1].done, true)
})

test('buildPublicSiteDto liefert null wenn deaktiviert', () => {
  assert.equal(buildPublicSiteDto({ site: { enabled: false } }), null)
})

test('buildPublicSiteDto enthält keine internen Felder', () => {
  const dto = buildPublicSiteDto({
    site: { id: 'x', customer_id: 'c', slug: 's', enabled: true, brand: { name: 'B' }, booster_state: { secret: 1 }, show_reviews: true },
    customer: { branch: 'Friseur', name: 'B' },
    reviewAggregate: { average: 4.5, count: 8 }
  })
  assert.equal('id' in dto, false)
  assert.equal('customer_id' in dto, false)
  assert.equal('booster_state' in dto, false)
  assert.equal(dto.branch, 'Friseur')
  assert.equal(dto.reviews.count, 8)
})

test('buildPublicSiteDto blendet Reviews aus wenn show_reviews=false', () => {
  const dto = buildPublicSiteDto({ site: { slug: 's', enabled: true, show_reviews: false, brand: {} }, customer: {}, reviewAggregate: { average: 4, count: 3 } })
  assert.equal(dto.reviews, null)
})
