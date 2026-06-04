#!/usr/bin/env node
/**
 * MMOS V103.8 Tenant Isolation Smoke Test
 *
 * Required ENV:
 *   BACKEND_URL=https://...railway.app
 *   TENANT_A_TOKEN=<Supabase access token for customer/user A>
 *   TENANT_A_CUSTOMER_ID=<customer_id A>
 *   TENANT_B_CUSTOMER_ID=<customer_id B>
 * Optional:
 *   TENANT_B_TOKEN=<Supabase access token for customer/user B>
 *
 * Goal: token A must not read/write B-scoped data via common endpoints.
 */

const backend = String(process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '')
const tokenA = process.env.TENANT_A_TOKEN || ''
const tokenB = process.env.TENANT_B_TOKEN || ''
const customerA = process.env.TENANT_A_CUSTOMER_ID || ''
const customerB = process.env.TENANT_B_CUSTOMER_ID || ''

if (!backend || !tokenA || !customerA || !customerB) {
  console.error('Missing required ENV: BACKEND_URL, TENANT_A_TOKEN, TENANT_A_CUSTOMER_ID, TENANT_B_CUSTOMER_ID')
  process.exit(2)
}

const checks = [
  { name: 'store customers cross-read', method: 'GET', path: `/api/store/customers?customer_id=${encodeURIComponent(customerB)}&limit=5`, token: tokenA, expectBlocked: true },
  { name: 'store loyalty members cross-read', method: 'GET', path: `/api/store/loyalty_customers?customer_id=${encodeURIComponent(customerB)}&limit=5`, token: tokenA, expectBlocked: true },
  { name: 'store invoices cross-read', method: 'GET', path: `/api/store/invoices?customer_id=${encodeURIComponent(customerB)}&limit=5`, token: tokenA, expectBlocked: true },
  { name: 'pos summary cross-read', method: 'GET', path: `/api/pos/summary/${encodeURIComponent(customerB)}`, token: tokenA, expectBlocked: true },
  { name: 'customer intelligence cross-read', method: 'GET', path: `/api/customer-intelligence/${encodeURIComponent(customerB)}`, token: tokenA, expectBlocked: true },
  { name: 'own customer store read', method: 'GET', path: `/api/store/customers?customer_id=${encodeURIComponent(customerA)}&limit=5`, token: tokenA, expectBlocked: false }
]

if (tokenB) {
  checks.push({ name: 'tenant B own customer store read', method: 'GET', path: `/api/store/customers?customer_id=${encodeURIComponent(customerB)}&limit=5`, token: tokenB, expectBlocked: false })
}

async function runCheck(check) {
  const res = await fetch(`${backend}${check.path}`, {
    method: check.method,
    headers: { Authorization: `Bearer ${check.token}`, 'Content-Type': 'application/json' },
    cache: 'no-store'
  })
  const text = await res.text()
  let payload = null
  try { payload = text ? JSON.parse(text) : null } catch { payload = { raw: text.slice(0, 300) } }
  const blocked = res.status === 401 || res.status === 403 || payload?.code === 'CUSTOMER_ACCESS_DENIED' || /kein zugriff|forbidden|berechtigung/i.test(String(payload?.error || payload?.message || ''))
  const passed = check.expectBlocked ? blocked : res.ok && !blocked
  return { ...check, status: res.status, blocked, passed, payload }
}

const results = []
for (const check of checks) {
  try { results.push(await runCheck(check)) }
  catch (error) { results.push({ ...check, status: 0, blocked: false, passed: false, error: error?.message || String(error) }) }
}

for (const r of results) {
  const mark = r.passed ? '✅' : '❌'
  console.log(`${mark} ${r.name} -> HTTP ${r.status}${r.blocked ? ' blocked' : ''}`)
  if (!r.passed) console.log(JSON.stringify(r.payload || { error: r.error }, null, 2).slice(0, 1200))
}

const failed = results.filter((r) => !r.passed)
console.log(`\nTenant isolation smoke: ${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
