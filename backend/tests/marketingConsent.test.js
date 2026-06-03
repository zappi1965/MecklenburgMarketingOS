const test = require('node:test')
const assert = require('node:assert/strict')
const { hasMarketingConsent } = require('../src/services/marketingReminderAutomationService')

test('marketing consent accepts metadata consent flag', () => {
  assert.equal(hasMarketingConsent({ raw: { metadata: { consent_marketing: true } } }), true)
})

test('marketing consent rejects missing consent', () => {
  assert.equal(hasMarketingConsent({ raw: { metadata: {} } }), false)
})

const { inspectMarketingConsentWording } = require('../src/services/marketingConsentComplianceService')

test('marketing consent wording passes technical legal guard', () => {
  const result = inspectMarketingConsentWording({
    text: 'Ich möchte per E-Mail Informationen zu meinem Punktekonto, Bonuspunkten, Rewards, Coupons und persönlichen Reaktivierungsaktionen dieses Anbieters erhalten. Ich kann diese Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen.',
    checkbox_preselected: false,
    participation_coupled: false,
    double_opt_in_enabled: true,
    unsubscribe_link_enabled: true
  })
  assert.equal(result.ok, true)
})

test('preselected checkbox fails legal guard', () => {
  const result = inspectMarketingConsentWording({
    text: 'Ich möchte per E-Mail zu Angeboten kontaktiert werden und kann widerrufen.',
    checkbox_preselected: true,
    participation_coupled: false,
    double_opt_in_enabled: true,
    unsubscribe_link_enabled: true
  })
  assert.equal(result.ok, false)
})
