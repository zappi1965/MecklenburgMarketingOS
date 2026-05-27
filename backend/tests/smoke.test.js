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

test('GET /api/e-invoice/invoices/<id>/xml requires auth', async () => {
  const r = await status('/api/e-invoice/invoices/00000000-0000-0000-0000-000000000000/xml')
  assert.equal(r.status, 401)
})

test('GET /api/referrals/customer/<id> requires auth', async () => {
  const r = await status('/api/referrals/customer/00000000-0000-0000-0000-000000000000')
  assert.equal(r.status, 401)
})

test('POST /api/referrals/redeem requires auth', async () => {
  const r = await status('/api/referrals/redeem', { method: 'POST' })
  assert.equal(r.status, 401)
})

test('GET /api/wallet/loyalty-member/<id> requires auth', async () => {
  const r = await status('/api/wallet/loyalty-member/00000000-0000-0000-0000-000000000000')
  assert.equal(r.status, 401)
})

test('POST /api/newsletter/subscribe requires auth (per global guard)', async () => {
  const r = await status('/api/newsletter/subscribe', { method: 'POST' })
  assert.equal(r.status, 401)
})

test('POST /api/vouchers/redeem requires auth', async () => {
  const r = await status('/api/vouchers/redeem', { method: 'POST' })
  assert.equal(r.status, 401)
})

test('GET /api/e-invoice/invoices/<id>/zugferd requires auth', async () => {
  const r = await status('/api/e-invoice/invoices/00000000-0000-0000-0000-000000000000/zugferd')
  assert.equal(r.status, 401)
})

test('POST /api/security/mfa/enroll requires auth', async () => {
  const r = await status('/api/security/mfa/enroll', { method: 'POST' })
  assert.equal(r.status, 401)
})

test('POST /api/security/mfa/verify requires auth', async () => {
  const r = await status('/api/security/mfa/verify', { method: 'POST' })
  assert.equal(r.status, 401)
})

test('GET /api/data-quality/duplicates requires auth', async () => {
  const r = await status('/api/data-quality/duplicates')
  assert.equal(r.status, 401)
})

test('POST /api/data-quality/duplicates/merge requires auth', async () => {
  const r = await status('/api/data-quality/duplicates/merge', { method: 'POST' })
  assert.equal(r.status, 401)
})

test('POST /api/data-quality/ai/review-response requires auth', async () => {
  const r = await status('/api/data-quality/ai/review-response', { method: 'POST' })
  assert.equal(r.status, 401)
})

test('POST /api/data-quality/validate/email requires auth', async () => {
  const r = await status('/api/data-quality/validate/email', { method: 'POST' })
  assert.equal(r.status, 401)
})

test('GET /api/accounting/export requires auth', async () => {
  const r = await status('/api/accounting/export?format=datev_extf&period_start=2026-01-01&period_end=2026-01-31')
  assert.equal(r.status, 401)
})

test('GET /api/dunning/levels/<id> requires auth', async () => {
  const r = await status('/api/dunning/levels/00000000-0000-0000-0000-000000000000')
  assert.equal(r.status, 401)
})

test('POST /api/dunning/run-now requires auth', async () => {
  const r = await status('/api/dunning/run-now', { method: 'POST' })
  assert.equal(r.status, 401)
})

test('POST /api/pos/webhook/mock is public (no auth required)', async () => {
  // Webhook ist whitelisted; ohne Body -> 400/415, NIE 401.
  const r = await status('/api/pos/webhook/mock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'smoke-test', amount: 0, status: 'failed' })
  })
  assert.notEqual(r.status, 401)
})

test('GET /api/pos/transactions/<id> requires auth', async () => {
  const r = await status('/api/pos/transactions/00000000-0000-0000-0000-000000000000')
  assert.equal(r.status, 401)
})

test('POST /api/no-show/scan requires auth', async () => {
  const r = await status('/api/no-show/scan', { method: 'POST' })
  assert.equal(r.status, 401)
})

test('POST /api/chatbot/start is public (no auth required)', async () => {
  const r = await status('/api/chatbot/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: 'probe' })
  })
  // ohne Supabase wird 503 oder 400, niemals 401.
  assert.notEqual(r.status, 401)
})

test('POST /api/chatbot/message is public (no auth required)', async () => {
  const r = await status('/api/chatbot/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversation_id: 'x', message: 'hi' })
  })
  assert.notEqual(r.status, 401)
})

test('POST /api/analytics/peer-benchmark/<id> requires auth', async () => {
  const r = await status('/api/analytics/peer-benchmark/00000000-0000-0000-0000-000000000000', { method: 'POST' })
  assert.equal(r.status, 401)
})

test('POST /api/analytics/cohorts/<id> requires auth', async () => {
  const r = await status('/api/analytics/cohorts/00000000-0000-0000-0000-000000000000', { method: 'POST' })
  assert.equal(r.status, 401)
})

test('POST /api/analytics/clv/<id> requires auth', async () => {
  const r = await status('/api/analytics/clv/00000000-0000-0000-0000-000000000000', { method: 'POST' })
  assert.equal(r.status, 401)
})

test('GET /api/gmb/posts/<id> requires auth', async () => {
  const r = await status('/api/gmb/posts/00000000-0000-0000-0000-000000000000')
  assert.equal(r.status, 401)
})

test('POST /api/ai-crm-mail/draft/<id> requires auth', async () => {
  const r = await status('/api/ai-crm-mail/draft/00000000-0000-0000-0000-000000000000', { method: 'POST' })
  assert.equal(r.status, 401)
})

test('GET /api/review-widget/customer/<id> requires auth', async () => {
  const r = await status('/api/review-widget/customer/00000000-0000-0000-0000-000000000000')
  assert.equal(r.status, 401)
})

test('GET /api/review-widget/embed/<slug> is public (no auth required)', async () => {
  const r = await status('/api/review-widget/embed/probe')
  // Ohne Supabase: 503 oder 404 — niemals 401.
  assert.notEqual(r.status, 401)
})

test('GET /api/compliance/snapshot requires auth', async () => {
  const r = await status('/api/compliance/snapshot')
  assert.equal(r.status, 401)
})

test('GET /api/api-keys/scopes requires auth', async () => {
  const r = await status('/api/api-keys/scopes')
  assert.equal(r.status, 401)
})

test('GET /api/api-keys/customer/<id> requires auth', async () => {
  const r = await status('/api/api-keys/customer/00000000-0000-0000-0000-000000000000')
  assert.equal(r.status, 401)
})

test('GET /api/public/v1/me without key -> 401 API_KEY_MISSING', async () => {
  const r = await status('/api/public/v1/me')
  assert.equal(r.status, 401)
  assert.equal(r.body?.code, 'API_KEY_MISSING')
})

test('GET /api/public/v1/me with invalid key -> 401 API_KEY_INVALID', async () => {
  const r = await status('/api/public/v1/me', {
    headers: { 'X-API-Key': 'mmos_test_garbage_key' }
  })
  assert.equal(r.status, 401)
  assert.equal(r.body?.code, 'API_KEY_INVALID')
})

test('GET /api/pricing/rules/<id> requires auth', async () => {
  const r = await status('/api/pricing/rules/00000000-0000-0000-0000-000000000000')
  assert.equal(r.status, 401)
})

test('POST /api/pricing/calculate/<id> requires auth', async () => {
  const r = await status('/api/pricing/calculate/00000000-0000-0000-0000-000000000000', { method: 'POST' })
  assert.equal(r.status, 401)
})

test('GET /api/onboarding/status/<id> requires auth', async () => {
  const r = await status('/api/onboarding/status/00000000-0000-0000-0000-000000000000')
  assert.equal(r.status, 401)
})

test('POST /api/onboarding/brand/<id> requires auth', async () => {
  const r = await status('/api/onboarding/brand/00000000-0000-0000-0000-000000000000', { method: 'POST' })
  assert.equal(r.status, 401)
})

test('POST /api/loyalty/staff-scan/<id> requires auth', async () => {
  const r = await status('/api/loyalty/staff-scan/00000000-0000-0000-0000-000000000000', { method: 'POST' })
  assert.equal(r.status, 401)
})

test('POST /api/loyalty/lookup-member/<id> requires auth', async () => {
  const r = await status('/api/loyalty/lookup-member/00000000-0000-0000-0000-000000000000', { method: 'POST' })
  assert.equal(r.status, 401)
})

test('POST /api/wallet/me/request-link is public (no auth)', async () => {
  const r = await status('/api/wallet/me/request-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'smoke@example.com' })
  })
  // Antwort immer ok (kein User-Enumeration), nie 401.
  assert.notEqual(r.status, 401)
})

test('GET /api/wallet/me without token -> 401 TOKEN_INVALID (not auth wall)', async () => {
  const r = await status('/api/wallet/me')
  // Route ist public, gibt aber 401 mit code TOKEN_INVALID zurueck wenn
  // kein Token mitgeliefert wird.
  assert.equal(r.status, 401)
  assert.equal(r.body?.code, 'TOKEN_INVALID')
})

test('GET /api/wallet/me with invalid token -> 401 TOKEN_INVALID', async () => {
  const r = await status('/api/wallet/me?email=a@b.de&exp=9999999999999&sig=garbage')
  assert.equal(r.status, 401)
  assert.equal(r.body?.code, 'TOKEN_INVALID')
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
