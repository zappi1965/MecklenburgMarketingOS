// Smoke-Tests gegen den laufenden Backend.
// Start: PORT=4400 SUPABASE_URL=https://invalid SUPABASE_SERVICE_ROLE_KEY=fake \
//        node src/server.js &
//        API_BASE=http://localhost:4400 node --test tests/smoke.test.js
//
// Verifiziert die Phase-1-Auth-Haertung und die Phase-3-Public-Whitelist.

const test = require('node:test')
const assert = require('node:assert/strict')

const base = process.env.API_BASE || 'http://localhost:4000'

async function status(path, init = {}) {
  const res = await fetch(`${base}${path}`, init)
  let body = null
  try { body = await res.json() } catch (_) { /* ignore */ }
  return { status: res.status, body, contentType: res.headers.get('content-type') }
}

test('GET /api/health is public and returns ok', async () => {
  const r = await status('/api/health')
  assert.equal(r.status, 200)
  assert.equal(r.body?.ok, true)
})

test('GET /api/billing/packages requires auth (no token)', async () => {
  const r = await status('/api/billing/packages')
  assert.equal(r.status, 401)
  assert.equal(r.body?.code, 'UNAUTHENTICATED')
})

test('GET /api/customer-intelligence/score/<uuid> requires auth', async () => {
  const r = await status('/api/customer-intelligence/score/00000000-0000-0000-0000-000000000000')
  assert.equal(r.status, 401)
})

test('GET /api/admin-profiles requires auth', async () => {
  const r = await status('/api/admin-profiles')
  assert.equal(r.status, 401)
})

test('GET /api/gdpr/requests requires auth', async () => {
  const r = await status('/api/gdpr/requests')
  assert.equal(r.status, 401)
})

test('GET /api/automations/rules requires auth', async () => {
  const r = await status('/api/automations/rules')
  assert.equal(r.status, 401)
})

test('GET /api/v33-functional/public/loyalty/<slug>/status is whitelisted (public)', async () => {
  // Public surface — sollte den Auth-Layer nicht treffen, sondern ggf. 404 von
  // der Route selbst zurueckgeben.
  const r = await status('/api/v33-functional/public/loyalty/probe-slug/status')
  assert.notEqual(r.status, 401, `Expected non-401, got ${r.status}`)
})

test('GET /api/qr without value -> 400 not 401 (route is public)', async () => {
  const r = await status('/api/qr')
  assert.notEqual(r.status, 401)
  assert.equal(r.status, 400)
})

test('GET /api/qr with value -> 200 image/png', async () => {
  const res = await fetch(`${base}/api/qr?value=smoke-test&size=128`)
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type') || '', /image\/png/)
})

test('error responses never leak request body fields', async () => {
  const res = await fetch(`${base}/api/billing/packages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'leak-canary-xyz', token: 'jwt.leak' })
  })
  const text = await res.text()
  assert.equal(res.status, 401)
  assert.ok(!text.includes('leak-canary-xyz'), 'password darf nicht in Response stehen')
  assert.ok(!text.includes('jwt.leak'), 'token darf nicht in Response stehen')
})

test('invalid bearer token -> 401 INVALID_SESSION', async () => {
  const r = await status('/api/billing/packages', {
    headers: { Authorization: 'Bearer not-a-real-jwt' }
  })
  assert.equal(r.status, 401)
  assert.equal(r.body?.code, 'INVALID_SESSION')
})
