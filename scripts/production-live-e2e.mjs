#!/usr/bin/env node
import fs from 'node:fs'

const backend = process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_BACKEND_URL
const adminToken = process.env.ADMIN_BEARER_TOKEN || process.env.MMOS_ADMIN_TOKEN
const customerToken = process.env.CUSTOMER_BEARER_TOKEN || process.env.MMOS_CUSTOMER_TOKEN
const customerId = process.env.TEST_CUSTOMER_ID || process.argv[2] || ''

const results = []

function push(name, ok, detail = {}) {
  results.push({ name, ok: Boolean(ok), status: ok ? 'OK' : 'WARNUNG', detail })
}

async function request(path, token = adminToken, options = {}) {
  if (!backend) throw new Error('BACKEND_BASE_URL fehlt')
  const res = await fetch(`${backend.replace(/\/$/, '')}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  })
  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { json = { raw: text } }
  return { status: res.status, ok: res.ok && json?.ok !== false, json }
}

async function main() {
  push('ENV BACKEND_BASE_URL', Boolean(backend), { backend })
  push('ENV ADMIN_BEARER_TOKEN', Boolean(adminToken), { required: 'für Live-API-Prüfung' })
  if (!backend || !adminToken) {
    console.log(JSON.stringify({ ok: false, results, hint: 'Setze BACKEND_BASE_URL und ADMIN_BEARER_TOKEN.' }, null, 2))
    process.exit(1)
  }

  const health = await request('/api/production/health')
  push('Backend Production Health', health.ok, health)

  const summary = await request('/api/production/validation/summary')
  push('Production Summary', summary.ok, summary.json)

  const rls = await request('/api/production/validation/rls')
  push('Supabase RLS Audit', rls.ok && rls.json?.ok !== false, rls.json)

  if (customerId) {
    const docs = await request('/api/production/validation/documents', adminToken, { method: 'POST', body: JSON.stringify({ customer_id: customerId }) })
    push('Dokumentenvalidierung Kunde', docs.ok, docs.json)

    const invoices = await request('/api/production/validation/invoices', adminToken, { method: 'POST', body: JSON.stringify({ customer_id: customerId }) })
    push('Rechnung/E-Rechnung Validierung Kunde', invoices.ok, invoices.json)

    const live = await request(`/api/production/live-e2e/${customerId}`)
    push('End-to-End Live-Kunde', live.ok, live.json)
  } else {
    push('TEST_CUSTOMER_ID', false, { hint: 'Für echten Kundentest TEST_CUSTOMER_ID setzen.' })
  }

  if (customerToken) {
    const denied = await request('/api/production/validation/summary', customerToken)
    push('Customer darf Production API nicht öffnen', denied.status === 403, { status: denied.status, payload: denied.json })
  } else {
    push('CUSTOMER_BEARER_TOKEN', false, { hint: 'Optional setzen, um Kundenlogin gegen Backoffice zu testen.' })
  }

  const ok = results.every((r) => r.ok)
  const report = { ok, checkedAt: new Date().toISOString(), results }
  fs.writeFileSync('production-live-e2e-report.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  process.exit(ok ? 0 : 1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
