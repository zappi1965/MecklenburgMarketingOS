const test = require('node:test')
const assert = require('node:assert/strict')
const { ALLOWLIST, TABLES, tableConfig } = require('../src/services/storeService')

test('ALLOWLIST enthaelt kritische Settings-Tabellen', () => {
  for (const t of ['landing_page_settings', 'qr_campaigns', 'loyalty_programs', 'loyalty_rewards', 'workflow_rules', 'integrations']) {
    assert.ok(ALLOWLIST[t], `${t} fehlt in ALLOWLIST`)
  }
})

test('ALLOWLIST hat fuer jede Tabelle eine scope-Eigenschaft', () => {
  for (const [name, cfg] of Object.entries(ALLOWLIST)) {
    assert.ok(['admin', 'customer', 'customer_readonly'].includes(cfg.scope), `${name}.scope ist '${cfg.scope}', muss admin|customer|customer_readonly sein`)
  }
})

test('TABLES enthaelt mindestens 20 Tabellen', () => {
  assert.ok(TABLES.length >= 20, `nur ${TABLES.length} Tabellen, erwartet >= 20`)
})

test('tableConfig: bekannte Tabelle -> config', () => {
  assert.deepEqual(tableConfig('landing_page_settings'), { scope: 'admin' })
  assert.deepEqual(tableConfig('qr_campaigns'), { scope: 'customer' })
})

test('tableConfig: unbekannte Tabelle -> null', () => {
  assert.equal(tableConfig('beliebige_unbekannte_tabelle'), null)
  assert.equal(tableConfig(''), null)
  assert.equal(tableConfig(null), null)
})

test('tableConfig: case-insensitive', () => {
  assert.deepEqual(tableConfig('LANDING_PAGE_SETTINGS'), { scope: 'admin' })
  assert.deepEqual(tableConfig('Qr_Campaigns'), { scope: 'customer' })
})

test('Customer-scoped Tabellen umfassen typische CRUD-Tabellen', () => {
  const customerScoped = Object.entries(ALLOWLIST).filter(([_, c]) => c.scope === 'customer' || c.scope === 'customer_readonly').map(([t]) => t)
  for (const t of ['qr_campaigns', 'loyalty_programs', 'customer_notes', 'seo_snapshots']) {
    assert.ok(customerScoped.includes(t), `${t} sollte customer-scoped sein`)
  }
})

test('Admin-scoped Tabellen umfassen Workflow-/Branding-Tabellen', () => {
  const adminOnly = Object.entries(ALLOWLIST).filter(([_, c]) => c.scope === 'admin').map(([t]) => t)
  for (const t of ['landing_page_settings', 'workflow_rules', 'automations']) {
    assert.ok(adminOnly.includes(t), `${t} sollte admin-only sein`)
  }
})
