#!/usr/bin/env node
import fs from 'node:fs'

const base = (process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/$/, '')
const adminToken = process.env.ADMIN_BEARER_TOKEN || process.env.MMOS_ADMIN_TOKEN
const customerId = process.env.TEST_CUSTOMER_ID || process.argv[2]

if (!base || !adminToken || !customerId) {
  console.error('BACKEND_BASE_URL, ADMIN_BEARER_TOKEN und TEST_CUSTOMER_ID sind Pflicht.')
  process.exit(1)
}

async function request(path, init = {}) {
  const res = await fetch(`${base}${path}`, {
    method: init.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
      ...(init.headers || {})
    },
    body: init.body ? JSON.stringify(init.body) : undefined
  })
  const json = await res.json().catch(() => ({ raw: null }))
  return { ok: res.ok && json?.ok !== false, status: res.status, json }
}

const checks = []
async function push(name, fn) {
  try {
    const r = await fn()
    checks.push({ name, ok: r.ok, status: r.status, payload: r.json })
  } catch (e) {
    checks.push({ name, ok: false, error: e.message })
  }
}

await push('Production Health', () => request('/api/production/health'))
await push('RLS / Tenant Audit', () => request('/api/production/final-hardening/rls'))
await push('Customer Portal Live Check', () => request(`/api/production/final-hardening/customer/${encodeURIComponent(customerId)}`))
await push('Package Access Sync Check', () => request('/api/production/final-hardening/package-access', { method: 'POST', body: { customer_id: customerId, sync: false } }))
await push('Document Deep Validation', () => request('/api/production/final-hardening/documents', { method: 'POST', body: { customer_id: customerId } }))
await push('E-Invoice Deep Validation', () => request('/api/production/final-hardening/e-invoice', { method: 'POST', body: { customer_id: customerId } }))
await push('Backup Restore Dry Run', () => request('/api/production/final-hardening/backup-restore', { method: 'POST', body: {} }))
await push('Final Acceptance', () => request('/api/production/final-hardening/acceptance', { method: 'POST', body: { customer_id: customerId } }))

const ok = checks.every((c) => c.ok)
const report = { ok, checkedAt: new Date().toISOString(), customerId, checks }
fs.writeFileSync('final-live-acceptance-report.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
process.exit(ok ? 0 : 1)
