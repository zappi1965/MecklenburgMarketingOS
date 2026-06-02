#!/usr/bin/env bash
set -euo pipefail

# MMOS V065 Live Store Permission + Auth Fix
# Fixes:
# - /api/store/sales_workflows FORBIDDEN
# - /api/store/production_health_checks FORBIDDEN
# - /api/store/admin_action_logs FORBIDDEN
# - StoreClient refreshes Supabase session before failing as UNAUTHENTICATED
# - Adds Supabase migration for V065 admin store permissions

echo "MMOS V065 Live Store Permission Fix startet..."

STORE_SERVICE="backend/src/services/storeService.js"
STORE_CLIENT="frontend/src/lib/storeClient.ts"
MIGRATION="supabase/migrations/0095_v065_admin_store_permissions.sql"
DOC="docs/FULLBUILD_V065_LIVE_STORE_PERMISSION_FIX.md"

if [ ! -f "$STORE_SERVICE" ]; then
  echo "FEHLER: $STORE_SERVICE nicht gefunden."
  exit 1
fi

if [ ! -f "$STORE_CLIENT" ]; then
  echo "FEHLER: $STORE_CLIENT nicht gefunden."
  exit 1
fi

BACKUP_DIR=".mmos-patch-backups/v065-live-store-permissions-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp "$STORE_SERVICE" "$BACKUP_DIR/storeService.js.bak"
cp "$STORE_CLIENT" "$BACKUP_DIR/storeClient.ts.bak"

node <<'NODE'
const fs = require('fs')
const path = require('path')

function read(file) {
  return fs.readFileSync(file, 'utf8')
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

const storeServicePath = 'backend/src/services/storeService.js'
const storeClientPath = 'frontend/src/lib/storeClient.ts'
const migrationPath = 'supabase/migrations/0095_v065_admin_store_permissions.sql'
const docPath = 'docs/FULLBUILD_V065_LIVE_STORE_PERMISSION_FIX.md'

let service = read(storeServicePath)

const additions = [
  "sales_workflows:{scope:'admin'}",
  "sales_workflow_events:{scope:'admin'}",
  "sales_workflow_documents:{scope:'admin'}",
  "production_health_checks:{scope:'admin'}",
  "production_smoke_tests:{scope:'admin'}",
  "customer_access_audits:{scope:'admin'}",
  "admin_action_logs:{scope:'admin'}",
  "production_readiness_checks:{scope:'admin'}",
  "backup_runs:{scope:'admin'}"
]

if (!service.includes("sales_workflows:{scope:'admin'}")) {
  const anchor = "workflow_rules:{scope:'admin'},"
  if (!service.includes(anchor)) {
    throw new Error("ALLOWLIST-Anker workflow_rules nicht gefunden.")
  }

  service = service.replace(
    anchor,
    `${additions.join(', ')}, ${anchor}`
  )
}

const mapAdditions = [
  "sales_workflows:'sales_workflow'",
  "sales_workflow_events:'sales_workflow'",
  "sales_workflow_documents:'sales_workflow'",
  "production_health_checks:'production_health'",
  "production_smoke_tests:'smoke_test'",
  "admin_action_logs:'action_log'",
  "customer_access_audits:'security_center'",
  "production_readiness_checks:'production_readiness'",
  "backup_runs:'production_readiness'"
]

if (!service.includes("sales_workflows:'sales_workflow'")) {
  const mapAnchor = "customer_tool_access:'packages'"
  if (!service.includes(mapAnchor)) {
    throw new Error("TABLE_TOOL_ACCESS_MAP-Anker customer_tool_access nicht gefunden.")
  }

  service = service.replace(
    mapAnchor,
    `${mapAnchor},\n  ${mapAdditions.join(',\n  ')}`
  )
}

if (!service.includes("sales_workflows:{scope:'admin'}")) {
  throw new Error("sales_workflows wurde nicht in die ALLOWLIST aufgenommen.")
}

if (!service.includes("production_health_checks:{scope:'admin'}")) {
  throw new Error("production_health_checks wurde nicht in die ALLOWLIST aufgenommen.")
}

if (!service.includes("admin_action_logs:{scope:'admin'}")) {
  throw new Error("admin_action_logs wurde nicht in die ALLOWLIST aufgenommen.")
}

write(storeServicePath, service)

let client = read(storeClientPath)

client = client.replace(
  "import { getCurrentSession } from './authClient'",
  "import { getCurrentSession, supabaseAuth } from './authClient'"
)

const oldAuthHeaders = `async function authHeaders(): Promise<Record<string, string>> {
  const session = await getCurrentSession()
  if (!session?.access_token) throw new Error('Nicht authentifiziert: Bitte neu einloggen, bevor Live-Daten gespeichert werden.')
  return { Authorization: \`Bearer \${session.access_token}\` }
}`

const newAuthHeaders = `async function authHeaders(): Promise<Record<string, string>> {
  let session = await getCurrentSession()

  if (!session?.access_token) {
    try {
      const refreshed = await supabaseAuth.auth.refreshSession()
      session = refreshed.data.session as any
    } catch {}
  }

  if (!session?.access_token) {
    throw new Error('Nicht authentifiziert: Bitte neu einloggen, damit Live-Daten aus Supabase geladen und gespeichert werden können.')
  }

  return { Authorization: \`Bearer \${session.access_token}\` }
}`

if (client.includes(oldAuthHeaders)) {
  client = client.replace(oldAuthHeaders, newAuthHeaders)
} else if (!client.includes('supabaseAuth.auth.refreshSession()')) {
  throw new Error("authHeaders-Block in storeClient.ts nicht gefunden.")
}

const apiRetry = `
async function withAuthRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (e: any) {
    const message = String(e?.message || '')
    if (!/UNAUTHENTICATED|INVALID_SESSION|Nicht authentifiziert|Ungültige Session/i.test(message)) throw e
    try {
      await supabaseAuth.auth.refreshSession()
    } catch {}
    return await fn()
  }
}
`

if (!client.includes('function withAuthRetry')) {
  client = client.replace(
    `type ListQuery = {
  customer_id?: string
  limit?: number
  order_by?: string
  order_dir?: 'asc' | 'desc'
}`,
    `type ListQuery = {
  customer_id?: string
  limit?: number
  order_by?: string
  order_dir?: 'asc' | 'desc'
}${apiRetry}`
  )
}

client = client.replace(
  "return apiRequest<{ ok: boolean; tables: Record<string, { scope: string }>; count: number }>(",
  "return withAuthRetry(async () => apiRequest<{ ok: boolean; tables: Record<string, { scope: string }>; count: number }>("
)
client = client.replace(
  "      { headers, timeoutMs: 15000 }\n    )\n  },",
  "      { headers, timeoutMs: 15000 }\n    ))\n  },"
)

client = client.replace(
  "return apiRequest<{ ok: boolean; data: T[]; count: number }>(url, { headers, timeoutMs: 20000 })",
  "return withAuthRetry(async () => apiRequest<{ ok: boolean; data: T[]; count: number }>(url, { headers, timeoutMs: 20000 }))"
)
client = client.replace(
  "return apiRequest<{ ok: boolean; data: T }>(`${BROWSER_BACKEND_BASE}/api/store/${encodeURIComponent(table)}/${encodeURIComponent(id)}`, {",
  "return withAuthRetry(async () => apiRequest<{ ok: boolean; data: T }>(`${BROWSER_BACKEND_BASE}/api/store/${encodeURIComponent(table)}/${encodeURIComponent(id)}`, {"
)
client = client.replace(
  "      timeoutMs: 15000\n    })\n  },",
  "      timeoutMs: 15000\n    }))\n  },"
)
client = client.replace(
  "return apiRequest<{ ok: boolean; data: T }>(`${BROWSER_BACKEND_BASE}/api/store/${encodeURIComponent(table)}`, {",
  "return withAuthRetry(async () => apiRequest<{ ok: boolean; data: T }>(`${BROWSER_BACKEND_BASE}/api/store/${encodeURIComponent(table)}`, {"
)
client = client.replace(
  "      timeoutMs: 20000\n    })\n  },",
  "      timeoutMs: 20000\n    }))\n  },"
)
client = client.replace(
  "return apiRequest<{ ok: boolean; data: T }>(`${BROWSER_BACKEND_BASE}/api/store/${encodeURIComponent(table)}/${encodeURIComponent(id)}`, {",
  "return withAuthRetry(async () => apiRequest<{ ok: boolean; data: T }>(`${BROWSER_BACKEND_BASE}/api/store/${encodeURIComponent(table)}/${encodeURIComponent(id)}`, {"
)
client = client.replace(
  "return apiRequest<{ ok: boolean }>(`${BROWSER_BACKEND_BASE}/api/store/${encodeURIComponent(table)}/${encodeURIComponent(id)}`, {",
  "return withAuthRetry(async () => apiRequest<{ ok: boolean }>(`${BROWSER_BACKEND_BASE}/api/store/${encodeURIComponent(table)}/${encodeURIComponent(id)}`, {"
)

// Korrigiert mögliche Doppelpatch-Klammern defensiv.
client = client.replaceAll('))))', ')))')

if (!client.includes('supabaseAuth.auth.refreshSession()')) {
  throw new Error("storeClient refreshSession wurde nicht eingefügt.")
}

write(storeClientPath, client)

write(
  migrationPath,
  `-- MMOS V065 Live Store Permission Fix
-- Erlaubt den Admin-/Production-Tabellen konsistente Live-Nutzung über Backend Service Role.
-- Wichtig: Diese Migration im Supabase SQL Editor ausführen oder über Supabase CLI deployen.

create extension if not exists pgcrypto;

create table if not exists public.sales_workflows (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  status text not null default 'In Bearbeitung',
  current_step text,
  completed_steps jsonb not null default '[]'::jsonb,
  owner_name text,
  last_completed_step text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales_workflow_events (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid,
  customer_id uuid,
  step_key text,
  title text not null default 'Workflow Event',
  description text,
  actor_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sales_workflow_documents (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid,
  customer_id uuid,
  document_type text not null default 'document',
  source_table text,
  source_id uuid,
  title text,
  status text not null default 'Entwurf',
  public_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  action text not null default 'system',
  entity_type text,
  entity_id text,
  status text not null default 'OK',
  details text,
  actor_name text,
  mode text default 'live',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.production_health_checks (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  status text not null default 'checked',
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.production_smoke_tests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  status text not null default 'offen',
  results jsonb not null default '[]'::jsonb,
  actor_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_access_audits (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  route text,
  tool_key text,
  allowed boolean not null default false,
  reason text,
  actor_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.production_readiness_checks (
  id uuid primary key default gen_random_uuid(),
  check_key text not null,
  status text not null default 'unknown',
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.backup_runs (
  id uuid primary key default gen_random_uuid(),
  backup_type text,
  status text not null default 'pending',
  storage_path text,
  size_bytes bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_sales_workflows_customer_id on public.sales_workflows(customer_id);
create index if not exists idx_sales_workflow_events_customer_id on public.sales_workflow_events(customer_id);
create index if not exists idx_sales_workflow_documents_customer_id on public.sales_workflow_documents(customer_id);
create index if not exists idx_admin_action_logs_created_at on public.admin_action_logs(created_at desc);
create index if not exists idx_production_health_checks_created_at on public.production_health_checks(created_at desc);
create index if not exists idx_production_smoke_tests_created_at on public.production_smoke_tests(created_at desc);
create index if not exists idx_customer_access_audits_customer_id on public.customer_access_audits(customer_id);
create index if not exists idx_production_readiness_checks_key on public.production_readiness_checks(check_key);
create index if not exists idx_backup_runs_created_at on public.backup_runs(created_at desc);

alter table public.sales_workflows enable row level security;
alter table public.sales_workflow_events enable row level security;
alter table public.sales_workflow_documents enable row level security;
alter table public.admin_action_logs enable row level security;
alter table public.production_health_checks enable row level security;
alter table public.production_smoke_tests enable row level security;
alter table public.customer_access_audits enable row level security;
alter table public.production_readiness_checks enable row level security;
alter table public.backup_runs enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'sales_workflows',
    'sales_workflow_events',
    'sales_workflow_documents',
    'admin_action_logs',
    'production_health_checks',
    'production_smoke_tests',
    'customer_access_audits',
    'production_readiness_checks',
    'backup_runs'
  ]
  loop
    execute format('drop policy if exists authenticated_%I on public.%I', t, t);
    execute format('create policy authenticated_%I on public.%I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')', t, t);

    execute format('drop policy if exists service_role_%I on public.%I', t, t);
    execute format('create policy service_role_%I on public.%I for all using (auth.role() = ''service_role'') with check (auth.role() = ''service_role'')', t, t);
  end loop;
end $$;
`
)

write(
  docPath,
  `# MMOS V065 – Live Store Permission Fix

## Problem

Mehrere Admin-Tools riefen Tabellen über \`/api/store/:table\` auf, die im Backend-Store nicht freigegeben waren.

Betroffene Beispiele:

- \`sales_workflows\`
- \`production_health_checks\`
- \`admin_action_logs\`

Dadurch kam im Frontend:

\`\`\`txt
permission · Tabelle '...' ist nicht erlaubt [FORBIDDEN]
\`\`\`

Zusätzlich konnte der StoreClient bei abgelaufener Supabase-Session sofort \`UNAUTHENTICATED\` werfen.

## Fix

- Backend-Allowlist erweitert.
- Tool-Mapping für neue Admin-/Production-Tabellen ergänzt.
- StoreClient refreshes Supabase session before failing.
- Supabase Migration \`0095_v065_admin_store_permissions.sql\` ergänzt.

## Nach dem Patch

\`\`\`bash
yarn quality:guard
yarn --cwd frontend typecheck
yarn --cwd frontend build
\`\`\`

Danach Migration in Supabase ausführen/deployen.
`
)

console.log('V065 Dateien geschrieben.')
NODE

echo ""
echo "V065 Patch angewendet."
echo "Backup: $BACKUP_DIR"
echo ""
echo "Jetzt prüfen:"
echo "node --check backend/src/services/storeService.js"
echo "yarn quality:guard"
echo "yarn --cwd frontend typecheck"
echo "yarn --cwd frontend build"
echo ""
echo "Wichtig: Danach Supabase Migration ausführen:"
echo "$MIGRATION"
