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
