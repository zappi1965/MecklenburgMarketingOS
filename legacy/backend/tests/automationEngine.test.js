// Unit-Tests fuer die AutomationEngine.
// Mockt das Supabase-Client-Interface mit den Methoden, die die Engine
// tatsaechlich benutzt (from().select().eq() ... ).
// Run: node --test tests/automationEngine.test.js

const test = require('node:test')
const assert = require('node:assert/strict')
const { AutomationEngine, DEFAULT_RULES } = require('../src/services/automationEngine')

// Helper: erstellt ein chainable Query-Builder-Mock.
function queryBuilder(rows, capture) {
  const filters = {}
  const builder = {
    select() { return builder },
    eq(col, val) { filters[col] = val; capture && capture.push(['eq', col, val]); return builder },
    ilike(col, val) { filters[col] = String(val).toLowerCase(); capture && capture.push(['ilike', col, val]); return builder },
    gt(col, val) { capture && capture.push(['gt', col, val]); return builder },
    lte(col, val) { capture && capture.push(['lte', col, val]); return builder },
    or() { capture && capture.push(['or']); return builder },
    order() { return builder },
    limit() { return builder },
    maybeSingle() {
      const matching = (rows || []).find((r) =>
        Object.entries(filters).every(([k, v]) => String(r[k] ?? '').toLowerCase() === String(v ?? '').toLowerCase())
      )
      return Promise.resolve({ data: matching || null, error: null })
    },
    single() {
      const matching = (rows || []).find((r) =>
        Object.entries(filters).every(([k, v]) => String(r[k] ?? '').toLowerCase() === String(v ?? '').toLowerCase())
      )
      return Promise.resolve({ data: matching || null, error: null })
    },
    then(resolve) {
      // Wenn keine maybeSingle/single aufgerufen wird, gibt die Engine direkt
      // ein array-Result zurueck.
      const matching = Object.keys(filters).length === 0
        ? rows || []
        : (rows || []).filter((r) =>
            Object.entries(filters).every(([k, v]) => String(r[k] ?? '').toLowerCase() === String(v ?? '').toLowerCase())
          )
      return Promise.resolve({ data: matching, error: null }).then(resolve)
    },
    insert(row) {
      capture && capture.push(['insert', row])
      return { select: () => ({ single: () => Promise.resolve({ data: { id: 'new-id', ...row }, error: null }) }), then: (r) => Promise.resolve({ data: [{ id: 'new-id', ...row }], error: null }).then(r) }
    },
    update(patch) {
      capture && capture.push(['update', patch])
      return { eq: () => ({ then: (r) => Promise.resolve({ data: null, error: null }).then(r) }) }
    },
    upsert(row) {
      capture && capture.push(['upsert', row])
      return { select: () => ({ single: () => Promise.resolve({ data: { id: 'snap-id', ...row }, error: null }) }) }
    }
  }
  return builder
}

function makeSupabase(tables, capture) {
  return {
    from(name) {
      capture && capture.push(['from', name])
      return queryBuilder(tables[name] || [], capture)
    }
  }
}

test('resolveRule: liefert Default, wenn keine DB-Zeile existiert', async () => {
  const supabase = makeSupabase({ workflow_rules: [] })
  const engine = new AutomationEngine(supabase)
  const rule = await engine.resolveRule('auto_invoice_after_appointment')
  assert.ok(rule, 'Default-Regel muss zurueckkommen')
  assert.equal(rule.name, 'auto_invoice_after_appointment')
  assert.equal(rule.enabled, true)
})

test('resolveRule: DB-Eintrag uebersteuert Default', async () => {
  const supabase = makeSupabase({
    workflow_rules: [
      {
        name: 'auto_invoice_after_appointment',
        trigger_type: 'appointment.completed',
        conditions: {},
        actions: [],
        enabled: false
      }
    ]
  })
  const engine = new AutomationEngine(supabase)
  const rule = await engine.resolveRule('auto_invoice_after_appointment')
  assert.equal(rule.enabled, false, 'DB-disabled muss den Default ueberstimmen')
})

test('resolveRule: unbekannter Name -> null', async () => {
  const supabase = makeSupabase({ workflow_rules: [] })
  const engine = new AutomationEngine(supabase)
  const rule = await engine.resolveRule('does_not_exist')
  assert.equal(rule, null)
})

test('alreadyHandled: erkennt bestehende Timeline-Events', async () => {
  const supabase = makeSupabase({
    customer_timeline_events: [{
      customer_id: 'c1',
      event_type: 'invoice_created_from_booking',
      source_id: 'a1'
    }]
  })
  const engine = new AutomationEngine(supabase)
  const handled = await engine.alreadyHandled({
    customer_id: 'c1',
    event_type: 'invoice_created_from_booking',
    source_id: 'a1'
  })
  assert.equal(handled, true)
})

test('alreadyHandled: anderer source_id -> nicht handled', async () => {
  const supabase = makeSupabase({
    customer_timeline_events: [{
      customer_id: 'c1',
      event_type: 'invoice_created_from_booking',
      source_id: 'a1'
    }]
  })
  const engine = new AutomationEngine(supabase)
  const handled = await engine.alreadyHandled({
    customer_id: 'c1',
    event_type: 'invoice_created_from_booking',
    source_id: 'a2'
  })
  assert.equal(handled, false)
})

test('runAppointmentToInvoice: skipped wenn Regel disabled', async () => {
  const supabase = makeSupabase({
    workflow_rules: [{
      name: 'auto_invoice_after_appointment',
      trigger_type: 'appointment.completed',
      conditions: {},
      actions: [],
      enabled: false
    }]
  })
  const engine = new AutomationEngine(supabase)
  const result = await engine.runAppointmentToInvoice()
  assert.equal(result.skipped, true)
  assert.equal(result.reason, 'rule_disabled')
})

test('DEFAULT_RULES enthaelt die vier erwarteten Workflows', () => {
  const names = DEFAULT_RULES.map((r) => r.name).sort()
  assert.deepEqual(names, [
    'auto_invoice_after_appointment',
    'monthly_intelligence_snapshot',
    'ticket_for_negative_review',
    'upsell_lead_from_qr_traction'
  ])
  for (const rule of DEFAULT_RULES) {
    assert.ok(rule.trigger_type, `${rule.name} hat keinen trigger_type`)
    assert.ok(Array.isArray(rule.actions), `${rule.name}.actions muss Array sein`)
    assert.equal(typeof rule.enabled, 'boolean')
  }
})

test('runMonthlySnapshotIfDue: skipped wenn nicht 1. eines Monats', async () => {
  const supabase = makeSupabase({ workflow_rules: [] })
  const engine = new AutomationEngine(supabase)
  const result = await engine.runMonthlySnapshotIfDue(new Date('2026-05-15T10:00:00Z'))
  assert.equal(result.skipped, true)
  assert.equal(result.reason, 'not_first_of_month')
})
