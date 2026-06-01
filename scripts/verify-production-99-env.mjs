#!/usr/bin/env node

const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'FRONTEND_URL',
  'PUBLIC_APP_URL',
  'MAIL_FROM'
]

const recommended = [
  'RESEND_API_KEY',
  'MAIL_DOMAIN',
  'ADMIN_NOTIFY_EMAIL',
  'GOTENBERG_URL',
  'SENTRY_DSN',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_WEBHOOK_SECRET'
]

const final99Flags = [
  'MMOS_FINAL_99_DEPLOYED',
  'MMOS_MIGRATION_0099_CONFIRMED',
  'MMOS_LIVE_SMOKE_GREEN',
  'MMOS_TENANT_AUDIT_GREEN',
  'MMOS_MAIL_DOMAIN_VERIFIED',
  'MMOS_GOTENBERG_LIVE_GREEN',
  'MMOS_RESTORE_TEST_GREEN',
  'MMOS_PLAYWRIGHT_E2E_GREEN',
  'MMOS_LEGAL_REVIEW_DONE'
]

function present(key) { return Boolean(String(process.env[key] || '').trim()) }

const missingRequired = required.filter((key) => !present(key))
const missingRecommended = recommended.filter((key) => !present(key))
const missingFinalFlags = final99Flags.filter((key) => String(process.env[key] || '').toLowerCase() !== 'true')

console.log(JSON.stringify({
  ok: missingRequired.length === 0,
  missingRequired,
  missingRecommended,
  missingFinalFlags,
  note: 'Final-Flags erst nach realer Live-Prüfung auf true setzen.'
}, null, 2))

process.exit(missingRequired.length ? 1 : 0)
