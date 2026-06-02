#!/usr/bin/env bash
set -euo pipefail

# MMOS V067 – Restore Package Matrix Tools after Frontoffice/Backoffice Fusion
#
# Fix:
# - Churn Prevention wieder sichtbar
# - SumUp Integration / SumUp Umsatzdaten wieder sichtbar
# - Retention Intelligence wieder sichtbar
# - Consent Center wieder sichtbar
# - Segment Kampagnen wieder sichtbar
# - Paketmatrix kennt diese Tools wieder
# - Kunden-/Admin-Navigation kann diese Tools wieder öffnen
# - Backend-Store erlaubt die neuen Tabellen optional
# - Migration legt einfache Live-Tabellen für die Tools an

echo "MMOS V067 Restore Package Tools startet..."

PAGE="frontend/src/app/page.tsx"
STORE_SERVICE="backend/src/services/storeService.js"
DOC="docs/FULLBUILD_V067_RESTORE_PACKAGE_TOOLS.md"
MIGRATION="supabase/migrations/0097_v067_restore_package_tools.sql"

if [ ! -f "$PAGE" ]; then
  echo "FEHLER: $PAGE nicht gefunden. Bitte im Repo-Root ausführen."
  exit 1
fi

BACKUP_DIR=".mmos-patch-backups/v067-restore-package-tools-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp "$PAGE" "$BACKUP_DIR/page.tsx.bak"
[ -f "$STORE_SERVICE" ] && cp "$STORE_SERVICE" "$BACKUP_DIR/storeService.js.bak" || true

node <<'NODE'
const fs = require('fs')
const path = require('path')

const pagePath = 'frontend/src/app/page.tsx'
const storeServicePath = 'backend/src/services/storeService.js'
const docPath = 'docs/FULLBUILD_V067_RESTORE_PACKAGE_TOOLS.md'
const migrationPath = 'supabase/migrations/0097_v067_restore_package_tools.sql'

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
}
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}
function uniq(list) {
  return Array.from(new Set(list.filter(Boolean)))
}
function quoteList(list) {
  return uniq(list).map((x) => `'${x}'`).join(',')
}
function injectAfter(source, anchor, insert, label) {
  if (source.includes(insert.trim())) return source
  if (!source.includes(anchor)) {
    console.warn(`[WARN] Anker nicht gefunden: ${label}`)
    return source
  }
  return source.replace(anchor, `${anchor}${insert}`)
}
function addQuotedItemsInArrayNear(source, marker, items, label) {
  const idx = source.indexOf(marker)
  if (idx < 0) {
    console.warn(`[WARN] Array-Marker nicht gefunden: ${label}`)
    return source
  }
  const start = source.lastIndexOf('[', idx)
  const end = source.indexOf(']', idx)
  if (start < 0 || end < 0 || end <= start) {
    console.warn(`[WARN] Array-Grenzen nicht gefunden: ${label}`)
    return source
  }
  const before = source.slice(0, start + 1)
  const body = source.slice(start + 1, end)
  const after = source.slice(end)
  const existing = Array.from(body.matchAll(/'([^']+)'/g)).map((m) => m[1])
  const next = uniq([...existing, ...items])
  return `${before}${quoteList(next)}${after}`
}

let page = read(pagePath)

const missingToolKeys = [
  'retention_intelligence',
  'consent_center',
  'segment_campaigns',
  'churn_prevention',
  'sumup_revenue_connection'
]

// 1) Admin-Hauptliste wieder ergänzen
if (!missingToolKeys.every((k) => page.includes(`'${k}'`))) {
  const adminMarker = "'package_matrix'"
  page = addQuotedItemsInArrayNear(page, adminMarker, missingToolKeys, 'admin tool list')
}

// 2) Customer scoped views ergänzen, damit bei Kundenwahl nichts blockiert
page = page.replace(
  "function customerScopedView(view:string){return ['crm','finance','booking','media','qr','public_landing','loyalty','loyalty_rewards','loyalty_rules','staff_codes','loyalty_segments','smart_loyalty','reviews','integrations','seo','heatmap','kpi','competitors','customer_health','customer_intelligence','dynamic_billing','package_recommendations','package_matrix','business_audit','mini_audit','offer_generator','contract_generator','output_engine','onboarding','reports','monthly_reports','approvals','packages'].includes(view)}",
  "function customerScopedView(view:string){return ['crm','finance','booking','media','qr','public_landing','loyalty','loyalty_rewards','loyalty_rules','staff_codes','loyalty_segments','smart_loyalty','retention_intelligence','consent_center','segment_campaigns','churn_prevention','sumup_revenue_connection','reviews','integrations','seo','heatmap','kpi','competitors','customer_health','customer_intelligence','dynamic_billing','package_recommendations','package_matrix','business_audit','mini_audit','offer_generator','contract_generator','output_engine','onboarding','reports','monthly_reports','approvals','packages'].includes(view)}"
)

// 3) Paket-Tool-Routen ergänzen, damit Paketmatrix/Package-Tools zur richtigen View führen
const routeInsert = `,
    'Retention Intelligence':'retention_intelligence',
    'Consent Center & Double-Opt-in':'consent_center',
    'Consent Center':'consent_center',
    'Segment-Kampagnen':'segment_campaigns',
    'Segment Kampagnen':'segment_campaigns',
    'Churn Prevention':'churn_prevention',
    'SumUp Umsatzdaten':'sumup_revenue_connection',
    'SumUp Integration':'sumup_revenue_connection'`

page = injectAfter(
  page,
  "'Output Engine':'output_engine'",
  routeInsert,
  'packageToolRoutes missing tools'
)

// 4) Labels ergänzen
if (!page.includes("retention_intelligence:'Retention Intelligence'")) {
  page = page.replace(
    "package_matrix:'Paket-Matrix',",
    "package_matrix:'Paket-Matrix',retention_intelligence:'Retention Intelligence',consent_center:'Consent Center',segment_campaigns:'Segment Kampagnen',churn_prevention:'Churn Prevention',sumup_revenue_connection:'SumUp Integration',"
  )
}

// 5) Feature-Beschreibungen ergänzen
if (!page.includes("'SumUp Integration':'Verbindet SumUp")) {
  page = page.replace(
    "  'SumUp Umsatzdaten':'Verbindet SumUp fuer Tagesumsatz, Monatsumsatz, Transaktionen und Umsatzentwicklung.',",
    "  'SumUp Umsatzdaten':'Verbindet SumUp fuer Tagesumsatz, Monatsumsatz, Transaktionen und Umsatzentwicklung.',\n  'SumUp Integration':'Verbindet SumUp fuer Tagesumsatz, Monatsumsatz, Transaktionen und Umsatzentwicklung.',"
  )
}

// 6) packageDefs.tools erweitern, damit Kunden-/Paketnavigation die Tools wieder bekommt
const growthOld = "'QR Kampagnen','Öffentliche /l/[slug] Seite','Loyalty Programm','Rewards','Reviews'"
const growthNew = "'QR Kampagnen','Öffentliche /l/[slug] Seite','Loyalty Programm','Rewards','Reviews','SumUp Umsatzdaten','Retention Intelligence','Consent Center & Double-Opt-in','Segment-Kampagnen'"
if (page.includes(growthOld) && !page.includes("'Retention Intelligence','Consent Center & Double-Opt-in','Segment-Kampagnen'")) {
  page = page.replace(growthOld, growthNew)
}

const premiumOld = "'Paket-Matrix','Pipeline','Timeline Events'"
const premiumNew = "'Paket-Matrix','Pipeline','Timeline Events','SumUp Umsatzdaten','Retention Intelligence','Consent Center & Double-Opt-in','Segment-Kampagnen','Churn Prevention'"
if (page.includes(premiumOld) && !page.includes("'Churn Prevention'")) {
  page = page.replace(premiumOld, premiumNew)
}

// 7) Admin NavGroups V064/V066 erweitern, falls diese Struktur vorhanden ist
page = page.replace(
  "tools:['qr','public_landing','loyalty','loyalty_rewards','loyalty_rules','staff_codes','loyalty_segments','smart_loyalty','automations'",
  "tools:['qr','public_landing','loyalty','loyalty_rewards','loyalty_rules','staff_codes','loyalty_segments','smart_loyalty','retention_intelligence','consent_center','segment_campaigns','churn_prevention','automations'"
)

page = page.replace(
  "tools:['finance','dunning','dynamic_billing'",
  "tools:['finance','sumup_revenue_connection','dunning','dynamic_billing'"
)

// 8) v33ToolConfigs ergänzen, damit die Views nicht leer/fallbackartig verschwinden
if (!page.includes("retention_intelligence:{title:'Retention Intelligence'")) {
  const configAnchor = "package_matrix:{title:'Paket-Matrix',category:'Analytics & Billing',resource:'package_matrix',fields:['name','tools','price'],defaults:[]},"
  const configs = `
  retention_intelligence:{title:'Retention Intelligence',category:'QR, Loyalty & Automation',resource:'retention_intelligence',fields:['name','score','recommendation','status'],defaults:[]},
  consent_center:{title:'Consent Center',category:'QR, Loyalty & Automation',resource:'consent_center',fields:['name','channel','status','note'],defaults:[]},
  segment_campaigns:{title:'Segment Kampagnen',category:'QR, Loyalty & Automation',resource:'segment_campaigns',fields:['name','audience','reward','status'],defaults:[]},
  churn_prevention:{title:'Churn Prevention',category:'QR, Loyalty & Automation',resource:'churn_prevention',fields:['name','risk','action','status'],defaults:[]},
  sumup_revenue_connection:{title:'SumUp Integration',category:'Finanzen & Pakete',resource:'sumup_revenue_connection',fields:['name','provider','status','note'],defaults:[]},`
  if (!page.includes(configAnchor)) {
    console.warn('[WARN] v33ToolConfigs-Anker nicht gefunden.')
  } else {
    page = page.replace(configAnchor, `${configAnchor}\n${configs}`)
  }
}

// 9) packageDisplayMatrix: sicherstellen, dass die Features aus packageConfig nicht verloren gehen
// Kein harter Umbau, nur Fallback, falls V066 schon da ist.
if (page.includes('function packageDisplayMatrix') && !page.includes('const restoredPackageToolFeatures')) {
  page = page.replace(
    "function packageDisplayMatrix(d:any){",
    `const restoredPackageToolFeatures:any={
 Starter:['SumUp Umsatzdaten','Retention Intelligence','Consent Center & Double-Opt-in','Segment-Kampagnen','Churn Prevention'],
 Growth:['SumUp Umsatzdaten','Retention Intelligence','Consent Center & Double-Opt-in','Segment-Kampagnen'],
 Premium:['SumUp Umsatzdaten','Retention Intelligence','Consent Center & Double-Opt-in','Segment-Kampagnen','Churn Prevention']
}
function packageDisplayMatrix(d:any){`
  )

  page = page.replace(
    "features:Array.isArray(cfg.features)&&cfg.features.length?cfg.features:(imported.features||[]),",
    "features:Array.from(new Set([...(Array.isArray(cfg.features)&&cfg.features.length?cfg.features:(imported.features||[])),...(restoredPackageToolFeatures[name]||[])])),"
  )
}

// 10) Seed-Arrays ergänzen, damit lokale/Live-Zählung sauber arbeiten kann
const seedInsertAnchor = "landing_page_settings:[defaultMainLandingSettings]"
if (!page.includes("retention_intelligence:[]")) {
  page = page.replace(
    seedInsertAnchor,
    "retention_intelligence:[],\n  consent_center:[],\n  segment_campaigns:[],\n  churn_prevention:[],\n  sumup_revenue_connection:[],\n  " + seedInsertAnchor
  )
}

// 11) Demo-scope Tabellen ergänzen
if (!page.includes("'retention_intelligence','consent_center'")) {
  page = page.replace(
    "'customers','customer_subscriptions'",
    "'customers','customer_subscriptions','retention_intelligence','consent_center','segment_campaigns','churn_prevention','sumup_revenue_connection'"
  )
}

// 12) Quality checks
const mustContain = [
  "retention_intelligence",
  "consent_center",
  "segment_campaigns",
  "churn_prevention",
  "sumup_revenue_connection",
  "Retention Intelligence",
  "Consent Center",
  "Segment Kampagnen",
  "Churn Prevention",
  "SumUp Integration"
]
for (const needle of mustContain) {
  if (!page.includes(needle)) throw new Error(`page.tsx enthält ${needle} nicht.`)
}

write(pagePath, page)

// Backend Store-Allowlist optional erweitern, damit store.create nicht FORBIDDEN wirft.
let service = read(storeServicePath)
if (service) {
  const serviceAdditions = "retention_intelligence:{scope:'admin'}, consent_center:{scope:'admin'}, segment_campaigns:{scope:'admin'}, churn_prevention:{scope:'admin'}, sumup_revenue_connection:{scope:'admin'}, "
  if (!service.includes("retention_intelligence:{scope:'admin'}")) {
    const anchor = "customer_health_scores:{scope:'customer_readonly'},"
    if (service.includes(anchor)) {
      service = service.replace(anchor, `${serviceAdditions}${anchor}`)
    } else {
      console.warn('[WARN] StoreService-Allowlist-Anker nicht gefunden.')
    }
  }

  const mapAdditions = `
  retention_intelligence:'retention_intelligence',
  consent_center:'consent_center',
  segment_campaigns:'segment_campaigns',
  churn_prevention:'churn_prevention',
  sumup_revenue_connection:'sumup_revenue_connection',`

  if (!service.includes("retention_intelligence:'retention_intelligence'")) {
    const mapAnchor = "customer_tool_access:'packages'"
    if (service.includes(mapAnchor)) {
      service = service.replace(mapAnchor, `${mapAnchor},${mapAdditions}`)
    } else {
      console.warn('[WARN] StoreService-ToolMap-Anker nicht gefunden.')
    }
  }

  write(storeServicePath, service)
}

write(migrationPath, `-- MMOS V067 Restore Package Tools
-- Legt einfache Live-Tabellen fuer die nach der Front-/Backoffice-Fusion verschwundenen Tools an.

create extension if not exists pgcrypto;

create table if not exists public.retention_intelligence (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  name text,
  score numeric,
  recommendation text,
  status text not null default 'Aktiv',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consent_center (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  name text,
  channel text,
  status text not null default 'Aktiv',
  note text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.segment_campaigns (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  name text,
  audience text,
  reward text,
  status text not null default 'Entwurf',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.churn_prevention (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  name text,
  risk numeric,
  action text,
  status text not null default 'Aktiv',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sumup_revenue_connection (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  name text,
  provider text not null default 'SumUp',
  status text not null default 'Vorbereitet',
  note text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_retention_intelligence_customer_id on public.retention_intelligence(customer_id);
create index if not exists idx_consent_center_customer_id on public.consent_center(customer_id);
create index if not exists idx_segment_campaigns_customer_id on public.segment_campaigns(customer_id);
create index if not exists idx_churn_prevention_customer_id on public.churn_prevention(customer_id);
create index if not exists idx_sumup_revenue_connection_customer_id on public.sumup_revenue_connection(customer_id);

alter table public.retention_intelligence enable row level security;
alter table public.consent_center enable row level security;
alter table public.segment_campaigns enable row level security;
alter table public.churn_prevention enable row level security;
alter table public.sumup_revenue_connection enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'retention_intelligence',
    'consent_center',
    'segment_campaigns',
    'churn_prevention',
    'sumup_revenue_connection'
  ]
  loop
    execute format('drop policy if exists authenticated_%I on public.%I', t, t);
    execute format('create policy authenticated_%I on public.%I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')', t, t);

    execute format('drop policy if exists service_role_%I on public.%I', t, t);
    execute format('create policy service_role_%I on public.%I for all using (auth.role() = ''service_role'') with check (auth.role() = ''service_role'')', t, t);
  end loop;
end $$;
`)

write(docPath, `# MMOS V067 – Restore Package Tools

## Problem

Nach der Fusion von Backoffice und Frontoffice waren mehrere verkaufbare Growth/Premium-Tools nicht mehr sichtbar:

- Churn Prevention
- SumUp Integration / SumUp Umsatzdaten
- Retention Intelligence
- Consent Center
- Segment Kampagnen

## Fix

- Tool-Keys wieder in Admin-Navigation aufgenommen
- Paket-Routen wieder gemappt
- Paketmatrix erkennt diese Tools wieder
- V33 ToolConfig ergänzt
- Seed-/Live-Zählung erweitert
- Backend Store-Allowlist optional ergänzt
- Migration fuer Live-Tabellen ergänzt

## Prüfen

\`\`\`bash
yarn quality:guard
yarn --cwd frontend typecheck
yarn --cwd frontend build
\`\`\`

Danach Migration ausführen:

\`\`\`txt
supabase/migrations/0097_v067_restore_package_tools.sql
\`\`\`
`)

console.log('V067 Restore Package Tools erfolgreich geschrieben.')
NODE

echo ""
echo "V067 Restore Package Tools angewendet."
echo "Backup: $BACKUP_DIR"
echo ""
echo "Jetzt prüfen:"
echo "node --check backend/src/services/storeService.js"
echo "yarn quality:guard"
echo "yarn --cwd frontend typecheck"
echo "yarn --cwd frontend build"
echo ""
echo "Danach Migration ausführen/deployen:"
echo "$MIGRATION"
