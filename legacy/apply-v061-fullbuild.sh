#!/usr/bin/env bash
set -e

echo "Applying MMOS V061 Fullbuild..."

mkdir -p .github/workflows
mkdir -p scripts
mkdir -p docs
mkdir -p frontend/src/lib/mmos
mkdir -p frontend/src/app/api/health
mkdir -p frontend/src/app/api/public/review-feedback
mkdir -p supabase/migrations

cat > package.json <<'JSON'
{
  "name": "mecklenburg-marketing-os",
  "private": true,
  "packageManager": "yarn@1.22.19",
  "workspaces": [
    "frontend",
    "backend"
  ],
  "scripts": {
    "dev": "yarn --cwd frontend dev",
    "build": "yarn --cwd frontend build",
    "start": "yarn --cwd frontend start",
    "typecheck": "yarn --cwd frontend typecheck",
    "backend:start": "yarn --cwd backend start",
    "stability:check": "yarn quality:guard && yarn --cwd frontend typecheck && yarn --cwd frontend build",
    "quality:guard": "node scripts/quality-guard.mjs",
    "fullbuild:check": "node scripts/v061-fullbuild-check.mjs",
    "production:check": "yarn quality:guard && yarn fullbuild:check && yarn --cwd frontend typecheck",
    "production:final-check": "yarn quality:guard && yarn fullbuild:check && yarn --cwd frontend typecheck && yarn --cwd frontend build"
  },
  "dependencies": {
    "@supabase/supabase-js": "2.106.2",
    "lucide-react": "1.16.0",
    "next": "16.2.6",
    "qr-scanner": "1.4.2",
    "react": "19.2.6",
    "react-dom": "19.2.6",
    "react-is": "18.3.1",
    "recharts": "3.8.1"
  },
  "devDependencies": {
    "@playwright/test": "1.60.0",
    "@types/node": "25.9.1",
    "@types/react": "19.2.15",
    "@types/react-dom": "19.2.3",
    "typescript": "6.0.3"
  }
}
JSON

cat > frontend/package.json <<'JSON'
{
  "name": "mmos-v061-frontend",
  "version": "1.0.0",
  "private": true,
  "engines": {
    "node": ">=20 <23"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "e2e": "playwright test",
    "e2e:install": "playwright install --with-deps chromium webkit",
    "e2e:ci": "playwright test --reporter=list",
    "quality:guard": "node ../scripts/quality-guard.mjs",
    "fullbuild:check": "node ../scripts/v061-fullbuild-check.mjs"
  },
  "dependencies": {
    "@supabase/supabase-js": "2.106.2",
    "lucide-react": "1.16.0",
    "next": "16.2.6",
    "qr-scanner": "1.4.2",
    "react": "19.2.6",
    "react-dom": "19.2.6",
    "react-is": "18.3.1",
    "recharts": "3.8.1"
  },
  "devDependencies": {
    "@playwright/test": "1.60.0",
    "@types/node": "25.9.1",
    "@types/react": "19.2.15",
    "@types/react-dom": "19.2.3",
    "typescript": "6.0.3"
  }
}
JSON

cat > .github/workflows/build-check.yml <<'YML'
name: MMOS Fullbuild Check

on:
  push:
    branches:
      - main
  pull_request:
  workflow_dispatch:

jobs:
  fullbuild:
    name: MMOS V061 Fullbuild
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: yarn

      - name: Enable Corepack
        run: corepack enable

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: MMOS V061 Fullbuild Guard
        run: yarn fullbuild:check

      - name: Existing Quality Guard
        run: yarn quality:guard

      - name: TypeScript Check
        run: yarn --cwd frontend typecheck

      - name: Production Build
        run: yarn --cwd frontend build
YML

cat > scripts/v061-fullbuild-check.mjs <<'JS'
#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []
const warnings = []

const exists = (rel) => fs.existsSync(path.join(root, rel))
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')
const fail = (msg) => failures.push(msg)
const warn = (msg) => warnings.push(msg)

function readJson(rel) {
  try {
    return JSON.parse(read(rel))
  } catch (error) {
    fail(`${rel} ist kein gültiges JSON: ${error.message}`)
    return {}
  }
}

function requireFile(rel) {
  if (!exists(rel)) fail(`Pflichtdatei fehlt: ${rel}`)
}

function requireDependency(pkg, section, name, file) {
  if (!pkg?.[section]?.[name]) {
    fail(`${file}: ${section}.${name} fehlt`)
  }
}

requireFile('package.json')
requireFile('frontend/package.json')
requireFile('frontend/src/app/page.tsx')
requireFile('frontend/src/middleware.ts')
requireFile('frontend/src/lib/environmentMode.ts')
requireFile('frontend/src/lib/mmos/env.ts')
requireFile('frontend/src/lib/mmos/supabaseAdmin.ts')
requireFile('frontend/src/app/api/health/route.ts')
requireFile('frontend/src/app/api/public/review-feedback/route.ts')
requireFile('supabase/migrations/0082_v061_live_fullbuild_hardening.sql')

const rootPackage = exists('package.json') ? readJson('package.json') : {}
const frontendPackage = exists('frontend/package.json') ? readJson('frontend/package.json') : {}

for (const pkg of [
  [rootPackage, 'package.json'],
  [frontendPackage, 'frontend/package.json']
]) {
  const [json, file] = pkg
  requireDependency(json, 'dependencies', 'next', file)
  requireDependency(json, 'dependencies', 'react', file)
  requireDependency(json, 'dependencies', 'react-dom', file)
  requireDependency(json, 'dependencies', '@supabase/supabase-js', file)
  requireDependency(json, 'devDependencies', 'typescript', file)
  requireDependency(json, 'devDependencies', '@types/node', file)
}

if (exists('frontend/src/middleware.ts')) {
  const middleware = read('frontend/src/middleware.ts')

  if (middleware.includes('NextResponse.redirect')) {
    fail('Middleware enthält wieder harte Login-Redirects.')
  }

  if (!middleware.includes('NextResponse.next()')) {
    fail('Middleware gibt nicht sauber NextResponse.next() zurück.')
  }
}

if (exists('frontend/src/lib/environmentMode.ts')) {
  const envMode = read('frontend/src/lib/environmentMode.ts')

  if (!envMode.includes("return 'live'")) {
    warn('EnvironmentMode fällt eventuell nicht sauber auf live zurück.')
  }

  if (!envMode.includes('NEXT_PUBLIC_ENABLE_DEMO_MODE')) {
    warn('Demo-Modus ist nicht zentral über NEXT_PUBLIC_ENABLE_DEMO_MODE steuerbar.')
  }
}

if (exists('frontend/src/app/api/health/route.ts')) {
  const health = read('frontend/src/app/api/health/route.ts')

  if (!health.includes('v061-live-fullbuild')) {
    warn('Health Route meldet keine V061-Version.')
  }
}

if (exists('frontend/src/app/api/public/review-feedback/route.ts')) {
  const review = read('frontend/src/app/api/public/review-feedback/route.ts')

  if (!review.includes('review_feedback')) {
    fail('Review Feedback API schreibt nicht in review_feedback.')
  }

  if (!review.includes('rating <= 3')) {
    warn('Review Shield Logik für 1-3 Sterne wurde nicht erkannt.')
  }
}

const result = {
  ok: failures.length === 0,
  version: 'MMOS V061 Live Fullbuild',
  checkedAt: new Date().toISOString(),
  failures,
  warnings
}

console.log(JSON.stringify(result, null, 2))

if (failures.length) process.exit(1)
JS

cat > frontend/src/lib/mmos/env.ts <<'TS'
export function cleanEnvValue(value: unknown): string | null {
  const cleaned = String(value ?? '').trim()

  if (!cleaned) return null

  const lowered = cleaned.toLowerCase()

  if (
    lowered === 'null' ||
    lowered === 'undefined' ||
    lowered === 'false' ||
    lowered === 'none'
  ) {
    return null
  }

  return cleaned
}

export function getOptionalEnv(keys: string[]): string | null {
  for (const key of keys) {
    const value = cleanEnvValue(process.env[key])
    if (value) return value
  }

  return null
}

export function getRequiredEnv(keys: string[], label = keys.join(' oder ')): string {
  const value = getOptionalEnv(keys)

  if (!value) {
    throw new Error(`MMOS_ENV_MISSING: ${label}`)
  }

  return value
}

export function getOptionalAbsoluteUrl(keys: string[]): string | null {
  const value = getOptionalEnv(keys)

  if (!value) return null

  try {
    const url = new URL(value)
    return url.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

export function getPublicAppUrl(): string {
  const vercelUrl = getOptionalEnv(['VERCEL_URL'])

  if (vercelUrl && !vercelUrl.startsWith('http')) {
    return `https://${vercelUrl}`.replace(/\/$/, '')
  }

  return (
    getOptionalAbsoluteUrl([
      'NEXT_PUBLIC_APP_URL',
      'PUBLIC_APP_URL',
      'FRONTEND_URL',
      'VERCEL_URL'
    ]) ?? 'http://localhost:3000'
  )
}

export function getGotenbergUrl(): string | null {
  return getOptionalAbsoluteUrl(['GOTENBERG_URL'])
}

export function isLiveProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}
TS

cat > frontend/src/lib/mmos/supabaseAdmin.ts <<'TS'
import { createClient } from '@supabase/supabase-js'
import { getRequiredEnv } from './env'

export function createSupabaseAdminClient() {
  const supabaseUrl = getRequiredEnv(
    ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'],
    'SUPABASE_URL oder NEXT_PUBLIC_SUPABASE_URL'
  )

  const serviceRoleKey = getRequiredEnv(
    ['SUPABASE_SERVICE_ROLE_KEY'],
    'SUPABASE_SERVICE_ROLE_KEY'
  )

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}
TS

cat > frontend/src/app/api/health/route.ts <<'TS'
import { NextResponse } from 'next/server'
import { getGotenbergUrl, getOptionalEnv } from '../../../lib/mmos/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabaseUrl = getOptionalEnv(['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'])
  const serviceRoleKey = getOptionalEnv(['SUPABASE_SERVICE_ROLE_KEY'])
  const resendApiKey = getOptionalEnv(['RESEND_API_KEY'])
  const mailFrom = getOptionalEnv(['MAIL_FROM'])
  const gotenbergUrl = getGotenbergUrl()

  return NextResponse.json({
    ok: true,
    service: 'MecklenburgMarketingOS',
    version: 'v061-live-fullbuild',
    nodeEnv: process.env.NODE_ENV ?? 'unknown',
    checks: {
      supabaseConfigured: Boolean(supabaseUrl && serviceRoleKey),
      mailConfigured: Boolean(resendApiKey && mailFrom),
      gotenbergConfigured: Boolean(gotenbergUrl)
    },
    timestamp: new Date().toISOString()
  })
}
TS

cat > frontend/src/app/api/public/review-feedback/route.ts <<'TS'
import { NextRequest, NextResponse } from 'next/server'
import { getOptionalEnv, getPublicAppUrl } from '../../../../lib/mmos/env'
import { createSupabaseAdminClient } from '../../../../lib/mmos/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ReviewPayload = {
  customerId?: string
  customerName?: string
  rating?: number | string
  feedback?: string
  comment?: string
  reviewerName?: string
  name?: string
  customerEmail?: string
  email?: string
  source?: string
  googleReviewUrl?: string
}

function withCors(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

function json(payload: unknown, status = 200) {
  return withCors(NextResponse.json(payload, { status }))
}

function normalizeRating(value: unknown): number | null {
  const rating = Number(value)

  if (!Number.isFinite(rating)) return null

  const rounded = Math.round(rating)

  if (rounded < 1 || rounded > 5) return null

  return rounded
}

function cleanText(value: unknown, maxLength = 2000): string | null {
  const cleaned = String(value ?? '').trim()

  if (!cleaned) return null

  return cleaned.slice(0, maxLength)
}

async function sendInternalReviewAlert(input: {
  rating: number
  customerName: string | null
  feedback: string | null
  reviewerName: string | null
  customerEmail: string | null
}) {
  const apiKey = getOptionalEnv(['RESEND_API_KEY'])
  const from = getOptionalEnv(['MAIL_FROM'])
  const to = getOptionalEnv(['REVIEW_ALERT_TO', 'MAIL_TO', 'MAIL_FROM'])

  if (!apiKey || !from || !to) {
    return {
      sent: false,
      skipped: true,
      reason: 'mail_not_configured'
    }
  }

  const subject = `MMOS Review Shield: ${input.rating}-Sterne Feedback`

  const text = [
    'Neues internes Kundenfeedback ist eingegangen.',
    '',
    `Bewertung: ${input.rating} / 5`,
    `Betrieb: ${input.customerName ?? 'Nicht angegeben'}`,
    `Name: ${input.reviewerName ?? 'Nicht angegeben'}`,
    `E-Mail: ${input.customerEmail ?? 'Nicht angegeben'}`,
    '',
    'Feedback:',
    input.feedback ?? 'Kein Textfeedback angegeben.',
    '',
    `Quelle: ${getPublicAppUrl()}`
  ].join('\n')

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text
    })
  })

  if (!response.ok) {
    return {
      sent: false,
      skipped: false,
      reason: `resend_${response.status}`
    }
  }

  return {
    sent: true,
    skipped: false,
    reason: null
  }
}

export async function OPTIONS() {
  return json({ ok: true })
}

export async function POST(request: NextRequest) {
  let payload: ReviewPayload

  try {
    payload = await request.json()
  } catch {
    return json(
      {
        ok: false,
        error: 'invalid_json'
      },
      400
    )
  }

  const rating = normalizeRating(payload.rating)

  if (!rating) {
    return json(
      {
        ok: false,
        error: 'invalid_rating',
        message: 'rating muss eine Zahl zwischen 1 und 5 sein.'
      },
      400
    )
  }

  const feedback = cleanText(payload.feedback ?? payload.comment)
  const customerName = cleanText(payload.customerName, 180)
  const reviewerName = cleanText(payload.reviewerName ?? payload.name, 180)
  const customerEmail = cleanText(payload.customerEmail ?? payload.email, 240)
  const customerId = cleanText(payload.customerId, 120)
  const source = cleanText(payload.source, 120) ?? 'public_review_page'
  const googleReviewUrl = cleanText(payload.googleReviewUrl, 600)

  const shouldRedirectToGoogle = rating >= 4 && Boolean(googleReviewUrl)

  try {
    const supabase = createSupabaseAdminClient()

    const { error } = await supabase.from('review_feedback').insert({
      customer_id: customerId,
      customer_name: customerName,
      rating,
      feedback,
      reviewer_name: reviewerName,
      customer_email: customerEmail,
      source,
      google_review_url: googleReviewUrl,
      status: rating <= 3 ? 'internal_followup' : 'positive',
      is_demo: false,
      metadata: {
        user_agent: request.headers.get('user-agent'),
        ip_hint:
          request.headers.get('x-forwarded-for') ??
          request.headers.get('x-real-ip') ??
          null
      }
    })

    if (error) {
      return json(
        {
          ok: false,
          error: 'database_insert_failed',
          message: error.message
        },
        500
      )
    }

    const mail =
      rating <= 3
        ? await sendInternalReviewAlert({
            rating,
            customerName,
            feedback,
            reviewerName,
            customerEmail
          })
        : {
            sent: false,
            skipped: true,
            reason: 'positive_review'
          }

    return json({
      ok: true,
      rating,
      status: rating <= 3 ? 'internal_followup' : 'positive',
      redirectToGoogle: shouldRedirectToGoogle,
      googleReviewUrl: shouldRedirectToGoogle ? googleReviewUrl : null,
      mail
    })
  } catch (error) {
    return json(
      {
        ok: false,
        error: 'review_feedback_failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    )
  }
}
TS

cat > frontend/src/middleware.ts <<'TS'
import { NextRequest, NextResponse } from 'next/server'

/**
 * MMOS V061 Middleware
 *
 * Wichtig:
 * Supabase Browser-Sessions sind in Middleware nicht zuverlässig genug,
 * um harte Redirects für Admin-/Backoffice-Bereiche zu erzwingen.
 *
 * Daher bleibt die Middleware bewusst soft.
 * Zugriffsschutz erfolgt client- und datenbankseitig über:
 * - RoleGate
 * - AdminOnly
 * - ToolAccessGate
 * - Supabase RLS / Service Role APIs
 */
export function middleware(_req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/crm/:path*',
    '/automation/:path*',
    '/media/:path*',
    '/value-dashboard/:path*',
    '/growth-command/:path*',
    '/dashboard/:path*',
    '/portal/:path*',
    '/reviews/:path*',
    '/qr-campaigns/:path*',
    '/loyalty/:path*',
    '/tickets/:path*',
    '/invoices/:path*',
    '/analytics/:path*',
    '/booking/:path*',
    '/inbox/:path*',
    '/payments-vouchers/:path*',
    '/referrals/:path*',
    '/settings/:path*'
  ]
}
TS

cat > supabase/migrations/0082_v061_live_fullbuild_hardening.sql <<'SQL'
create extension if not exists pgcrypto;

create table if not exists public.review_feedback (
  id uuid primary key default gen_random_uuid(),
  customer_id text,
  customer_name text,
  rating integer not null check (rating between 1 and 5),
  feedback text,
  reviewer_name text,
  customer_email text,
  source text not null default 'public_review_page',
  google_review_url text,
  status text not null default 'new',
  is_demo boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists review_feedback_customer_id_idx
  on public.review_feedback(customer_id);

create index if not exists review_feedback_rating_idx
  on public.review_feedback(rating);

create index if not exists review_feedback_status_idx
  on public.review_feedback(status);

create index if not exists review_feedback_created_at_idx
  on public.review_feedback(created_at desc);

alter table public.review_feedback enable row level security;

drop policy if exists "service role can manage review feedback" on public.review_feedback;

create policy "service role can manage review feedback"
  on public.review_feedback
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.mmos_system_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null,
  event_label text,
  severity text not null default 'info',
  source text not null default 'system',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists mmos_system_events_event_key_idx
  on public.mmos_system_events(event_key);

create index if not exists mmos_system_events_created_at_idx
  on public.mmos_system_events(created_at desc);

alter table public.mmos_system_events enable row level security;

drop policy if exists "service role can manage system events" on public.mmos_system_events;

create policy "service role can manage system events"
  on public.mmos_system_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

insert into public.mmos_system_events (
  event_key,
  event_label,
  severity,
  source,
  payload
)
values (
  'v061_live_fullbuild',
  'MMOS V061 Live Fullbuild angewendet',
  'info',
  'migration',
  jsonb_build_object(
    'version', 'v061',
    'scope', 'health_api, review_feedback, build_guard, env_hardening',
    'applied_at', now()
  )
);
SQL

cat > docs/FULLBUILD_V061.md <<'MD'
# MMOS V061 – Live Fullbuild

Stand: 02.06.2026

## Enthalten

Dieser Fullbuild ergänzt und härtet MecklenburgMarketingOS um:

- GitHub Actions Build Check
- V061 Fullbuild Guard
- Health API
- Review Shield / öffentliches Feedback API
- Supabase Migration für `review_feedback`
- saubere Env-Behandlung
- Gotenberg-Fallback ohne `null` / `undefined`
- Middleware ohne harte Redirects
- TypeScript/Build-Sicherheit

## Lokal prüfen

```bash
yarn install
yarn fullbuild:check
yarn quality:guard
yarn --cwd frontend typecheck
yarn --cwd frontend build