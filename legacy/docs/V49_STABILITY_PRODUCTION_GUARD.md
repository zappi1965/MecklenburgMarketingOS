
# MMOS V49 Stability & Production Guard

Dieser Build setzt die Stability-Fixes auf den echten V48-Fullbuild plus V47.

## Umgesetzt

- Paketversionen in Root, Frontend und Backend gepinnt
- Zentrale Demo-/Live-Logik: `frontend/src/lib/environmentMode.ts`
- Kompatibilität zu altem `demoSandbox.ts`
- V46 TypeScript-Fix fuer `CSSProperties`
- Client-/Server-Error-Reporter: `frontend/src/lib/errorReporter.ts`
- Tool-Access-Guard: `frontend/src/lib/toolAccess.ts` und `frontend/src/components/guards/ToolAccessGate.tsx`
- Public Hub schreibt Feedback ueber `/api/public/review-feedback`
- Soft Middleware Guard: `frontend/src/middleware.ts`
- Schema Guard Migration: `supabase/migrations/0048_v49_stability_schema_guard.sql`
- GitHub Build Check Workflow: `.github/workflows/build-check.yml`
- `.env.example` um Stability-Flags erweitert
- Cleanup: docs/V42_5_NEXT_API_PROXY_FULLBUILD.md.cpgz, docs/V42_5_NEXT_API_PROXY_FULLBUILD.md 2

## Wichtige ENV-Flags

```env
NEXT_PUBLIC_ENABLE_DEMO_MODE=true
NEXT_PUBLIC_REQUIRE_ROUTE_GUARD=false
SUPABASE_SERVICE_ROLE_KEY=
```

`NEXT_PUBLIC_REQUIRE_ROUTE_GUARD` ist bewusst standardmäßig `false`, damit bestehende Demo-/Preview-Flows nicht versehentlich ausgesperrt werden. Für Produktion kann der Guard aktiviert werden.

## Migrationen

In Reihenfolge ausführen:

1. `0043_customer_tool_modules.sql`
2. `0044_v44_functional_customer_tools.sql`
3. `0045_v45_stability_demo_data.sql`
4. `0046_v46_value_dashboard_reports.sql`
5. `0047_v47_complete_existing_tools_upgrade.sql`
6. `0048_v49_stability_schema_guard.sql`

## Build Check

Lokal:

```bash
cd frontend
yarn install --frozen-lockfile
yarn typecheck
yarn build
```

Backend Dependency Check:

```bash
cd backend
npm ci
```
