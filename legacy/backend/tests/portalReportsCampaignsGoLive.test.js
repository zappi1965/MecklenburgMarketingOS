const test = require('node:test')
const assert = require('node:assert/strict')

const { reportHtml } = require('../src/services/monthlyReportDeliveryService')
const { campaignTemplateForSegment } = require('../src/services/retentionSegmentCampaignService')
const { goLiveCockpitOverview } = require('../src/services/goLiveCockpitService')

test('monthly report html contains metrics and recommendations', () => {
  const html = reportHtml({ month: '2026-06', customer_name: 'Demo', metrics: { review_count: 3, leads: 2 }, recommendations: ['Mehr Bewertungen sammeln.'] })
  assert.equal(html.includes('Monatsreport 2026-06'), true)
  assert.equal(html.includes('Mehr Bewertungen sammeln.'), true)
})

test('segment campaign template maps inactive customers to winback', () => {
  const tpl = campaignTemplateForSegment('inactive_customers')
  assert.equal(tpl.type, 'winback_inactive')
  assert.equal(tpl.title.includes('Winback'), true)
})

test('go live cockpit returns missing customer context as next step', async () => {
  const result = await goLiveCockpitOverview(null, { customer_id: null })
  assert.equal(Array.isArray(result.modules), true)
  assert.equal(result.next_steps.some((s) => s.title.includes('Kundenkontext')), true)
})
