#!/usr/bin/env node
/**
 * MMOS 99/100 Live Runner
 *
 * Required env:
 * - MMOS_BACKEND_URL=https://your-backend.up.railway.app
 * - MMOS_ADMIN_BEARER_TOKEN=<Supabase access token for an admin user>
 *
 * Optional:
 * - MMOS_CUSTOMER_ID=<customer id>
 */

const backend = String(process.env.MMOS_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/$/, '')
const token = process.env.MMOS_ADMIN_BEARER_TOKEN || process.env.SUPABASE_ACCESS_TOKEN || ''
const customerId = process.env.MMOS_CUSTOMER_ID || ''

if (!backend) {
  console.error('MMOS_BACKEND_URL fehlt.')
  process.exit(2)
}
if (!token) {
  console.error('MMOS_ADMIN_BEARER_TOKEN fehlt. Nutze einen Supabase Access Token eines Admin-Users.')
  process.exit(2)
}

async function call(path, options = {}) {
  const url = `${backend}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  })
  const text = await res.text()
  let body
  try { body = JSON.parse(text) } catch { body = { ok: false, error: text } }
  if (!res.ok) return { ok: false, status: res.status, url, body }
  return { ok: body?.ok !== false, status: res.status, url, body }
}

const qs = customerId ? `?customer_id=${encodeURIComponent(customerId)}` : ''
const checks = [
  ['health', '/api/health'],
  ['final_overview', `/api/production/final-hardening/overview${qs}`],
  ['smoke', `/api/production/final-hardening/smoke${qs}`],
  ['tenant_isolation', '/api/production/final-hardening/tenant-isolation'],
  ['activation_readiness', `/api/production/final-hardening/activation-readiness${qs}`],
  ['customer_readiness', `/api/production/customer-readiness/overview${qs}`],
  ['qr_e2e', `/api/production/customer-readiness/qr/e2e${qs}`]
]

const results = []
for (const [name, path] of checks) {
  const result = await call(path)
  results.push({ name, ok: result.ok, status: result.status, summary: result.body?.score !== undefined ? `score=${result.body.score}` : result.body?.recommendation || result.body?.error || 'ok' })
}

const failed = results.filter((r) => !r.ok)
console.log(JSON.stringify({ ok: failed.length === 0, backend, customerId: customerId || null, results }, null, 2))
process.exit(failed.length ? 1 : 0)
