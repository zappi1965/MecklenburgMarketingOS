import fs from 'fs'

let failed = false

function fail(message) {
  console.error(`❌ ${message}`)
  failed = true
}

function ok(message) {
  console.log(`✅ ${message}`)
}

function read(file) {
  if (!fs.existsSync(file)) {
    fail(`${file} fehlt`)
    return ''
  }
  return fs.readFileSync(file, 'utf8')
}

const page = read('frontend/src/app/page.tsx')

if (!page) {
  fail('frontend/src/app/page.tsx konnte nicht gelesen werden')
} else {
  if (page.includes('Backoffice öffnen')) {
    fail('Separater Backoffice-Einstieg ist nicht mehr erlaubt')
  } else {
    ok('Kein separater Backoffice-Einstieg')
  }

  if (page.includes("view==='backoffice'&&role==='admin'")) {
    fail('Backoffice darf nicht mehr als eigene View gerendert werden')
  } else {
    ok('Backoffice wird nicht mehr als eigene View gerendert')
  }

  if (page.includes('function BackofficeCenter')) {
    fail('BackofficeCenter darf nicht mehr als aktive Komponente existieren')
  } else {
    ok('Keine aktive BackofficeCenter-Komponente')
  }

  if (!page.includes('Akquise, Audits & Abschluss')) {
    fail('Audit-/Akquise-Kategorie fehlt')
  } else {
    ok('Audit-/Akquise-Kategorie vorhanden')
  }

  if (!page.includes('System, Sicherheit & Verwaltung')) {
    fail('System-/Verwaltungskategorie fehlt')
  } else {
    ok('System-/Verwaltungskategorie vorhanden')
  }

  if (!page.includes('const usedNavTools=new Set<string>()')) {
    fail('Navigation-Dedupe fehlt')
  } else {
    ok('Navigation-Dedupe vorhanden')
  }

  if (page.includes('Neu & wichtig')) {
    fail('Alter Bereich "Neu & wichtig" ist noch vorhanden')
  } else {
    ok('Alter Bereich "Neu & wichtig" nicht vorhanden')
  }

  if (!page.includes('sales_workflows')) {
    console.warn('⚠️ Hinweis: sales_workflows wurde nicht gefunden')
  }

  if (!page.includes('ProductionReadiness')) {
    console.warn('⚠️ Hinweis: ProductionReadiness wurde nicht gefunden')
  }

  if (!page.includes('SecurityCore')) {
    console.warn('⚠️ Hinweis: SecurityCore wurde nicht gefunden')
  }
}

const middleware = fs.existsSync('frontend/src/middleware.ts')
  ? fs.readFileSync('frontend/src/middleware.ts', 'utf8')
  : ''

if (middleware.includes('NextResponse.redirect')) {
  fail('Middleware enthält noch harte Redirects')
} else {
  ok('Middleware ohne harte Redirects')
}

if (failed) {
  console.error('\nMMOS Quality Guard fehlgeschlagen.')
  process.exit(1)
}

console.log('\nMMOS Quality Guard bestanden.')
