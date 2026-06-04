#!/usr/bin/env bash
set -euo pipefail

# MMOS V066 Package Matrix -> Landingpage Fix
# Fix:
# - Paketmatrix speichert live in landing_page_settings.packages
# - Landingpage kann gespeicherte Preise/Setup Fees aus mainLandingSettings lesen
# - package_matrix View wird auf den neuen Live-Editor umgeleitet
# - Default-Pakete bekommen price/setupFee in den Landingpage-Settings

echo "MMOS V066 Paketmatrix/Landingpage Fix startet..."

PAGE="frontend/src/app/page.tsx"
DOC="docs/FULLBUILD_V066_PACKAGE_MATRIX_LANDING_FIX.md"
MIGRATION="supabase/migrations/0096_v066_package_matrix_landing_settings.sql"

if [ ! -f "$PAGE" ]; then
  echo "FEHLER: $PAGE nicht gefunden. Bitte im Repo-Root ausführen."
  exit 1
fi

BACKUP_DIR=".mmos-patch-backups/v066-package-matrix-landing-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp "$PAGE" "$BACKUP_DIR/page.tsx.bak"

node <<'NODE'
const fs = require('fs')
const path = require('path')

const pagePath = 'frontend/src/app/page.tsx'
const docPath = 'docs/FULLBUILD_V066_PACKAGE_MATRIX_LANDING_FIX.md'
const migrationPath = 'supabase/migrations/0096_v066_package_matrix_landing_settings.sql'

function read(file) {
  return fs.readFileSync(file, 'utf8')
}
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

let page = read(pagePath)

function replaceOrWarn(search, replacement, label) {
  if (!page.includes(search)) {
    console.warn(`[WARN] Nicht gefunden: ${label}`)
    return
  }
  page = page.replace(search, replacement)
}

// 1) Landingpage default packages um Preisfelder erweitern
page = page.replace(
  "Starter:{headline:'Starter',audience:'Für Betriebe, die erstmal sichtbar und professionell auftreten wollen.',description:'Mehr Sichtbarkeit, mehr Vertrauen und ein sauberer digitaler Auftritt.',features:['Google Business Optimierung','Bewertungsaufbau','QR-Review-Kampagne','Kundenportal-Basis','Monatsreport PDF-Basis']}",
  "Starter:{headline:'Starter',price:199,setupFee:399,audience:'Für Betriebe, die erstmal sichtbar und professionell auftreten wollen.',description:'Mehr Sichtbarkeit, mehr Vertrauen und ein sauberer digitaler Auftritt.',features:['Google Business Optimierung','Bewertungsaufbau','QR-Review-Kampagne','Kundenportal-Basis','Monatsreport PDF-Basis']}"
)
page = page.replace(
  "Growth:{headline:'Growth',audience:'Für Betriebe, die aktiv mehr Anfragen, Wiederkehrer und bessere Bewertungen generieren wollen.',description:'Mehr lokale Reichweite, messbare Entwicklung, Loyalty und Retention Intelligence.',features:['Alles aus Starter','SEO & Sichtbarkeits-Dashboard','QR-/Loyalty-Kampagnen','SumUp Umsatzdaten','Retention Intelligence','Consent Center & Segment-Kampagnen']}",
  "Growth:{headline:'Growth',price:499,setupFee:749,audience:'Für Betriebe, die aktiv mehr Anfragen, Wiederkehrer und bessere Bewertungen generieren wollen.',description:'Mehr lokale Reichweite, messbare Entwicklung, Loyalty und Retention Intelligence.',features:['Alles aus Starter','SEO & Sichtbarkeits-Dashboard','QR-/Loyalty-Kampagnen','SumUp Umsatzdaten','Retention Intelligence','Consent Center & Segment-Kampagnen']}"
)
page = page.replace(
  "Premium:{headline:'Premium',audience:'Für Betriebe, die ihr Marketing und Kundenbindung vollständig steuern und automatisieren wollen.',description:'Volle Steuerung, Automatisierung, Service Recovery, Churn Prevention und Go-Live Sicherheit.',features:['Alles aus Growth','Churn Prevention & Service Recovery','Mail-Domain & Consent Guard','Go-Live Cockpit','Tool-Reife Center','Completeness Audit','Kundenportal Pro']}",
  "Premium:{headline:'Premium',price:899,setupFee:1199,audience:'Für Betriebe, die ihr Marketing und Kundenbindung vollständig steuern und automatisieren wollen.',description:'Volle Steuerung, Automatisierung, Service Recovery, Churn Prevention und Go-Live Sicherheit.',features:['Alles aus Growth','Churn Prevention & Service Recovery','Mail-Domain & Consent Guard','Go-Live Cockpit','Tool-Reife Center','Completeness Audit','Kundenportal Pro']}"
)

// 2) Helpers nach mainLandingSettings hinzufügen
const helperAnchor = `function mainLandingSettings(d:any){
 const saved=((d.landing_page_settings||[]).find((x:any)=>x.id==='main'||x.scope==='public_home')||{})
 const merged={...defaultMainLandingSettings,...saved,packages:{...defaultMainLandingSettings.packages,...(saved.packages||{})}}
 merged.steps=Array.isArray(saved.steps)&&saved.steps.length?saved.steps:defaultMainLandingSettings.steps
 merged.faq=Array.isArray(saved.faq)&&saved.faq.length?saved.faq:defaultMainLandingSettings.faq
 merged.example_metrics=Array.isArray(saved.example_metrics)&&saved.example_metrics.length?saved.example_metrics:defaultMainLandingSettings.example_metrics
 merged.optional_tools=Array.isArray(saved.optional_tools)&&saved.optional_tools.length?saved.optional_tools:defaultMainLandingSettings.optional_tools
 const savedAudit=saved.demo_audit||{}
 merged.demo_audit={...defaultMainLandingSettings.demo_audit,...savedAudit}
 merged.demo_audit.findings=Array.isArray(savedAudit.findings)&&savedAudit.findings.length?savedAudit.findings:defaultMainLandingSettings.demo_audit.findings
 merged.demo_audit.wins=Array.isArray(savedAudit.wins)&&savedAudit.wins.length?savedAudit.wins:defaultMainLandingSettings.demo_audit.wins
 merged.monthly_items=Array.isArray(saved.monthly_items)&&saved.monthly_items.length?saved.monthly_items:defaultMainLandingSettings.monthly_items
 merged.portal_preview_items=Array.isArray(saved.portal_preview_items)&&saved.portal_preview_items.length?saved.portal_preview_items:defaultMainLandingSettings.portal_preview_items
 merged.trust_points=Array.isArray(saved.trust_points)&&saved.trust_points.length?saved.trust_points:defaultMainLandingSettings.trust_points
 return merged
}
`

const liveHelpers = `function mainLandingSettings(d:any){
 const saved=((d.landing_page_settings||[]).find((x:any)=>x.id==='main'||x.scope==='public_home')||{})
 const merged={...defaultMainLandingSettings,...saved,packages:{...defaultMainLandingSettings.packages,...(saved.packages||{})}}
 merged.steps=Array.isArray(saved.steps)&&saved.steps.length?saved.steps:defaultMainLandingSettings.steps
 merged.faq=Array.isArray(saved.faq)&&saved.faq.length?saved.faq:defaultMainLandingSettings.faq
 merged.example_metrics=Array.isArray(saved.example_metrics)&&saved.example_metrics.length?saved.example_metrics:defaultMainLandingSettings.example_metrics
 merged.optional_tools=Array.isArray(saved.optional_tools)&&saved.optional_tools.length?saved.optional_tools:defaultMainLandingSettings.optional_tools
 const savedAudit=saved.demo_audit||{}
 merged.demo_audit={...defaultMainLandingSettings.demo_audit,...savedAudit}
 merged.demo_audit.findings=Array.isArray(savedAudit.findings)&&savedAudit.findings.length?savedAudit.findings:defaultMainLandingSettings.demo_audit.findings
 merged.demo_audit.wins=Array.isArray(savedAudit.wins)&&savedAudit.wins.length?savedAudit.wins:defaultMainLandingSettings.demo_audit.wins
 merged.monthly_items=Array.isArray(saved.monthly_items)&&saved.monthly_items.length?saved.monthly_items:defaultMainLandingSettings.monthly_items
 merged.portal_preview_items=Array.isArray(saved.portal_preview_items)&&saved.portal_preview_items.length?saved.portal_preview_items:defaultMainLandingSettings.portal_preview_items
 merged.trust_points=Array.isArray(saved.trust_points)&&saved.trust_points.length?saved.trust_points:defaultMainLandingSettings.trust_points
 return merged
}

function packageLandingKey(pkg:any){
 const raw=String(pkg?.key||pkg?.name||pkg||'Starter').toLowerCase()
 if(raw.includes('growth'))return 'Growth'
 if(raw.includes('premium'))return 'Premium'
 return 'Starter'
}
function packageLandingConfig(d:any,pkg:any){
 const key=packageLandingKey(pkg)
 const settings=mainLandingSettings(d)
 return {key,...(settings.packages?.[key]||{})}
}
function packageLandingPrice(d:any,pkg:any){
 const key=packageLandingKey(pkg)
 const cfg=packageLandingConfig(d,key)
 const price=Number(cfg.price ?? cfg.monthlyPrice ?? packageDefs[key]?.price ?? 0)
 return Number.isFinite(price)?price:0
}
function packageLandingSetupFee(d:any,pkg:any){
 const key=packageLandingKey(pkg)
 const cfg=packageLandingConfig(d,key)
 const setupFee=Number(cfg.setupFee ?? cfg.setup_fee ?? 0)
 return Number.isFinite(setupFee)?setupFee:0
}
function packageDisplayMatrix(d:any){
 const settings=mainLandingSettings(d)
 return ['Starter','Growth','Premium'].map((name:string)=>{
  const imported=(packageMatrix||[]).find((p:any)=>String(p.name||p.key).toLowerCase()===name.toLowerCase())||{}
  const cfg=settings.packages?.[name]||{}
  return {
   ...imported,
   key:String(imported.key||name).toLowerCase(),
   name:cfg.headline||imported.name||name,
   headline:cfg.headline||imported.name||name,
   subtitle:cfg.audience||cfg.description||imported.subtitle||'',
   price:packageLandingPrice(d,name),
   setupFee:packageLandingSetupFee(d,name),
   cta:settings.package_cta_label||imported.cta||'Paket anfragen',
   features:Array.isArray(cfg.features)&&cfg.features.length?cfg.features:(imported.features||[]),
   tools:Array.isArray(imported.tools)?imported.tools:[]
  }
 })
}
`

if (page.includes(helperAnchor) && !page.includes('function packageDisplayMatrix')) {
  page = page.replace(helperAnchor, liveHelpers)
} else if (!page.includes('function packageDisplayMatrix')) {
  console.warn('[WARN] mainLandingSettings-Block nicht exakt gefunden; füge Helper nach return merged Block per Fallback ein.')
  page = page.replace(
    " return merged\n}\n\nconst automationLabels=",
    " return merged\n}\n\n" + liveHelpers.split('}\n\n').slice(1).join('}\n\n') + "\nconst automationLabels="
  )
}

// 3) pprice auf Landing-Settings-fähig erweitern
page = page.replace(
  "function pprice(p:string){return packageDefs[p]?.price||199}",
  "function pprice(p:string,d?:any){return d?packageLandingPrice(d,p):(packageDefs[p]?.price||199)}"
)

// 4) Landingpage-Render, falls sie direkt packageMatrix nutzt, auf Live-Matrix umbiegen.
// Diese Ersetzungen sind bewusst generisch und greifen nur, wenn packageMatrix wirklich gemappt wird.
page = page.replace(/packageMatrix\.map\(\((p|pkg):any\)=>/g, "packageDisplayMatrix(store.data).map(($1:any)=>")
page = page.replace(/packageMatrix\.map\(\((p|pkg)\)=>/g, "packageDisplayMatrix(store.data).map(($1:any)=>")

// 5) Neuer Live-Editor vor V30ToolModule einfügen
const editor = `
function V66PackageMatrixEditor({store}:any){
 const [rows,setRows]=useState<any[]>([])
 const [msg,setMsg]=useState('')
 const [busy,setBusy]=useState(false)

 function toRows(data:any){
  const settings=mainLandingSettings(data)
  return ['Starter','Growth','Premium'].map((name:string)=>{
   const cfg=settings.packages?.[name]||{}
   const def=packageDefs[name]||{}
   return {
    key:name,
    headline:cfg.headline||name,
    price:Number(cfg.price ?? def.price ?? 0),
    setupFee:Number(cfg.setupFee ?? 0),
    audience:cfg.audience||'',
    description:cfg.description||'',
    features:Array.isArray(cfg.features)?cfg.features.join('\\\\n'):''
   }
  })
 }

 useEffect(()=>{setRows(toRows(store.data))},[store.data?.landing_page_settings?.length])

 function patchRow(key:string,patch:any){
  setRows((prev:any[])=>prev.map((r:any)=>r.key===key?{...r,...patch}:r))
 }

 async function save(){
  setBusy(true); setMsg('Speichere Paketmatrix...')
  try{
   const existing=safeList(store.data.landing_page_settings).find((x:any)=>x.id==='main'||x.scope==='public_home')
   const current=mainLandingSettings(store.data)
   const packages={...(current.packages||{})}
   for(const r of rows){
    packages[r.key]={
     ...(packages[r.key]||{}),
     headline:String(r.headline||r.key),
     price:Number(r.price||0),
     setupFee:Number(r.setupFee||0),
     audience:String(r.audience||''),
     description:String(r.description||''),
     features:String(r.features||'').split('\\\\n').map((x:string)=>x.trim()).filter(Boolean)
    }
   }
   const payload={...current,id:'main',scope:'public_home',packages,updated_at:new Date().toISOString()}
   if(existing?.id) await store.update('landing_page_settings',existing.id,payload)
   else await store.create('landing_page_settings',payload)
   store.setData?.((d:any)=>{
    const next=[payload,...safeList(d.landing_page_settings).filter((x:any)=>x.id!=='main'&&x.scope!=='public_home')]
    return {...d,landing_page_settings:next}
   })
   try{localStorage.setItem('mmos_landing_package_matrix',JSON.stringify(packages))}catch{}
   setMsg('Paketmatrix live gespeichert. Die Haupt-Landingpage nutzt jetzt diese Preise nach Reload/Deploy.')
   appToast('Paketmatrix gespeichert')
  }catch(e:any){
   setMsg('Speicherfehler: '+compactLiveError(e))
  }finally{setBusy(false)}
 }

 return <><Head title="Paket-Matrix" sub="Preise, Setup-Gebühren und Pakettexte der öffentlichen Haupt-Landingpage live speichern." action={<button className="btn" onClick={save} disabled={busy}>{busy?'Speichert...':'Paketmatrix speichern'}</button>}/>
  <Card title="Live-Hinweis"><p className="sub">Diese Werte werden in <code>landing_page_settings.packages</code> gespeichert. Dadurch ändern sich die Preise auf der Haupt-Landingpage, statt nur lokal in der App.</p>{msg&&<div className="sub">{msg}</div>}</Card>
  <div className="grid3">{rows.map((r:any)=><Card key={r.key} title={r.key}>
   <label className="fieldLabel"><span>Name/Headline</span></label>
   <input className="input" value={r.headline} onChange={e=>patchRow(r.key,{headline:e.target.value})}/>
   <label className="fieldLabel"><span>Monatlicher Preis</span></label>
   <input className="input" type="number" value={r.price} onChange={e=>patchRow(r.key,{price:Number(e.target.value)})}/>
   <label className="fieldLabel"><span>Einrichtung / Setup</span></label>
   <input className="input" type="number" value={r.setupFee} onChange={e=>patchRow(r.key,{setupFee:Number(e.target.value)})}/>
   <label className="fieldLabel"><span>Zielgruppe</span></label>
   <textarea className="input textarea" value={r.audience} onChange={e=>patchRow(r.key,{audience:e.target.value})}/>
   <label className="fieldLabel"><span>Beschreibung</span></label>
   <textarea className="input textarea" value={r.description} onChange={e=>patchRow(r.key,{description:e.target.value})}/>
   <label className="fieldLabel"><span>Features, je Zeile ein Punkt</span></label>
   <textarea className="input textarea" value={r.features} onChange={e=>patchRow(r.key,{features:e.target.value})}/>
  </Card>)}</div>
  <Card title="Vorschau der Landingpage-Preise">{rows.map((r:any)=><div className="item" key={r.key}><div><b>{r.headline}</b><div className="sub">{eur(r.price)} / Monat · Einrichtung {eur(r.setupFee)}</div></div><Badge type="green">Live-Konfig</Badge></div>)}</Card>
 </>
}
`

if (!page.includes('function V66PackageMatrixEditor')) {
  const anchor = "function V30ToolModule({view,store,cid,role,setCid}:any){"
  if (!page.includes(anchor)) {
    throw new Error("V30ToolModule-Anker nicht gefunden.")
  }
  page = page.replace(anchor, editor + "\n" + anchor)
}

// 6) package_matrix Routing auf den neuen Editor
page = page.replace(
  "if(view==='package_matrix')return <V42PackageMatrixEditor cid={cid}/>",
  "if(view==='package_matrix')return <V66PackageMatrixEditor store={store}/>"
)
page = page.replace(
  "if(view==='package_matrix')return <V41PackageMatrixDetail cid={cid}/>",
  "if(view==='package_matrix')return <V66PackageMatrixEditor store={store}/>"
)

// 7) Health Center: landing_page_settings bleibt relevant, Paketmatrix-Migration ergänzen
page = page.replace(
  "{version:'V42.21.5',file:'SQL_V42_21_5_INTERNAL_DEMO_ACCESS.sql',tables:['landing_page_settings']},",
  "{version:'V42.21.5',file:'SQL_V42_21_5_INTERNAL_DEMO_ACCESS.sql',tables:['landing_page_settings']},\n   {version:'V066',file:'0096_v066_package_matrix_landing_settings.sql',tables:['landing_page_settings']},"
)

if (!page.includes('function V66PackageMatrixEditor')) {
  throw new Error('V66PackageMatrixEditor fehlt nach Patch.')
}
if (!page.includes('landing_page_settings')) {
  throw new Error('landing_page_settings fehlt unerwartet.')
}
if (!page.includes('packageDisplayMatrix')) {
  throw new Error('packageDisplayMatrix fehlt nach Patch.')
}

write(pagePath, page)

write(migrationPath, `-- MMOS V066 Package Matrix Landing Settings
-- Sichert, dass landing_page_settings Pakete inkl. price/setupFee speichern kann.

create table if not exists public.landing_page_settings (
  id text primary key,
  scope text not null default 'public_home',
  brand_name text,
  nav_title text,
  logo_url text,
  logo_alt text,
  logo_mark_text text,
  logo_show_text boolean not null default true,
  hero_title text,
  hero_subline text,
  primary_cta_label text,
  secondary_cta_label text,
  package_headline text,
  package_subline text,
  footer_note text,
  packages jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.landing_page_settings enable row level security;

drop policy if exists authenticated_landing_page_settings on public.landing_page_settings;
create policy authenticated_landing_page_settings
on public.landing_page_settings
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists public_read_landing_page_settings on public.landing_page_settings;
create policy public_read_landing_page_settings
on public.landing_page_settings
for select
using (true);

insert into public.landing_page_settings (id, scope, packages, created_at, updated_at)
values (
  'main',
  'public_home',
  '{
    "Starter":{"headline":"Starter","price":199,"setupFee":399},
    "Growth":{"headline":"Growth","price":499,"setupFee":749},
    "Premium":{"headline":"Premium","price":899,"setupFee":1199}
  }'::jsonb,
  now(),
  now()
)
on conflict (id) do update
set
  scope = excluded.scope,
  packages = coalesce(public.landing_page_settings.packages, '{}'::jsonb) || excluded.packages,
  updated_at = now();
`)

write(docPath, `# MMOS V066 – Paketmatrix Landingpage Fix

## Problem

Die Paketmatrix war nur als Tool sichtbar, aber Änderungen wurden nicht als öffentliche Landingpage-Konfiguration gespeichert.

Die Haupt-Landingpage nutzt \`landing_page_settings\` mit \`id='main'\` und \`scope='public_home'\`. Dort existiert ein \`packages\` JSONB-Feld, das bisher für Texte genutzt wurde, aber nicht sauber als Preisquelle der Paketmatrix.

## Fix

- Neuer \`V66PackageMatrixEditor\`
- Speichern in \`landing_page_settings.packages\`
- Preise und Setup-Gebühren pro Paket:
  - Starter
  - Growth
  - Premium
- Landingpage-Helfer \`packageDisplayMatrix(store.data)\`
- Default Landingpage-Pakete enthalten jetzt \`price\` und \`setupFee\`
- Migration \`0096_v066_package_matrix_landing_settings.sql\`

## Nach dem Patch prüfen

\`\`\`bash
yarn quality:guard
yarn --cwd frontend typecheck
yarn --cwd frontend build
\`\`\`

Danach Migration in Supabase ausführen/deployen.
`)

console.log('V066 Paketmatrix-Fix geschrieben.')
NODE

echo ""
echo "V066 Paketmatrix/Landingpage Fix angewendet."
echo "Backup: $BACKUP_DIR"
echo ""
echo "Jetzt prüfen:"
echo "yarn quality:guard"
echo "yarn --cwd frontend typecheck"
echo "yarn --cwd frontend build"
echo ""
echo "Danach Supabase Migration ausführen:"
echo "$MIGRATION"
