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
  if (!page.includes("'backoffice'") || !page.includes('InternalToolsLegacyCenter')) {
    fail('Backoffice ist nicht vollständig wiederhergestellt')
  } else {
    ok('Backoffice mit alten Funktionen vorhanden')
  }

  if (!page.includes("label:'Akquise'") || !page.includes("label:'Google & Audits'")) {
    fail('V070 Akquise-/Google-&-Audits-Kategorien fehlen')
  } else {
    ok('V070 Akquise und Google & Audits vorhanden')
  }

  if (!page.includes("label:'Backoffice'")) {
    fail('V070 Backoffice-Kategorie fehlt')
  } else {
    ok('V070 Backoffice-Kategorie vorhanden')
  }

  if (!page.includes("const customer=['dashboard','seo','qr','reports','documents_billing']")) {
    fail('V070 strikte Kunden-Navigation fehlt')
  } else {
    ok('V070 strikte Kunden-Navigation vorhanden')
  }

  if (!page.includes('function qrKpiSnapshot') || !page.includes('Punkte gesammelt') || !page.includes('Prämien eingelöst')) {
    fail('V070 QR-KPIs fehlen')
  } else {
    ok('V070 QR-KPIs vorhanden')
  }

  if (!page.includes("retention_intelligence:'Kundenbindung'") || !page.includes("churn_prevention:'Rückhol-Chancen'") || !page.includes("segment_campaigns:'Kundenaktionen'") || !page.includes("consent_center:'Einwilligungen'")) {
    fail('V071 kundenfreundliche Toolnamen fehlen')
  } else {
    ok('V071 kundenfreundliche Toolnamen vorhanden')
  }

  if (!page.includes("const isStarterPackage=packageName==='Starter'") || !page.includes('individuallyEnabledSections')) {
    fail('V071 QR-Paketlogik oder Zusatzfreischaltungen fehlen')
  } else {
    ok('V071 QR-Paketlogik und Zusatzfreischaltungen vorhanden')
  }

  if (page.includes("Growth:{") && page.includes("SumUp Integration") && page.indexOf("Growth:{") < page.indexOf("SumUp Integration") && page.indexOf("SumUp Integration") < page.indexOf("Premium:{")) {
    fail('Growth enthält noch SumUp')
  } else {
    ok('Growth ohne SumUp')
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


const css = read('frontend/src/app/globals.css')
if (!css.includes('MMOS V071 Stable Cleanup') || !css.includes('mobileTabRail')) {
  fail('V071 Mobile-Optimierung fehlt')
} else {
  ok('V071 Mobile-Optimierung vorhanden')
}

if (!fs.existsSync('yarn.lock')) {
  fail('Root yarn.lock fehlt')
} else {
  ok('Root yarn.lock vorhanden')
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
