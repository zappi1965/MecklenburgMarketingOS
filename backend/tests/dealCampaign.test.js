const test = require('node:test')
const assert = require('node:assert/strict')
const { slugify, effectiveDealStatus, isDealPubliclyVisible, publicDealDto } = require('../src/services/dealCampaignService')

test('slugify normalisiert Umlaute und Sonderzeichen', () => {
  assert.equal(slugify('Sommer Spaß 20% Ä'), 'sommer-spass-20-ae')
  assert.equal(slugify(''), 'deal')
  assert.equal(slugify('   '), 'deal')
})

test('effectiveDealStatus: draft/archived bleiben', () => {
  assert.equal(effectiveDealStatus({ status: 'draft' }), 'draft')
  assert.equal(effectiveDealStatus({ status: 'archived' }), 'archived')
})

test('effectiveDealStatus: scheduled vor Start, expired nach Ende, sonst active', () => {
  const future = new Date(Date.now() + 3600_000).toISOString()
  const past = new Date(Date.now() - 3600_000).toISOString()
  assert.equal(effectiveDealStatus({ status: 'active', starts_at: future }), 'scheduled')
  assert.equal(effectiveDealStatus({ status: 'active', expires_at: past }), 'expired')
  assert.equal(effectiveDealStatus({ status: 'active', starts_at: past, expires_at: future }), 'active')
  assert.equal(effectiveDealStatus({ status: 'active' }), 'active')
})

test('isDealPubliclyVisible nur bei active', () => {
  const future = new Date(Date.now() + 3600_000).toISOString()
  assert.equal(isDealPubliclyVisible({ status: 'active', expires_at: future }), true)
  assert.equal(isDealPubliclyVisible({ status: 'draft' }), false)
  assert.equal(isDealPubliclyVisible({ status: 'active', expires_at: new Date(Date.now() - 1000).toISOString() }), false)
})

test('publicDealDto enthält keine internen Felder', () => {
  const dto = publicDealDto({ id: 'x', customer_id: 'c', view_count: 5, share_count: 2, slug: 's', title: 'T', status: 'active' })
  assert.equal(dto.slug, 's')
  assert.equal(dto.title, 'T')
  assert.equal('id' in dto, false)
  assert.equal('customer_id' in dto, false)
  assert.equal('view_count' in dto, false)
})
