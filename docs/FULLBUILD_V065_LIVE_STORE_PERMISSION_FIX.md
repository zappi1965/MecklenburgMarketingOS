# MMOS V065 – Live Store Permission Fix

## Problem

Mehrere Admin-Tools riefen Tabellen über `/api/store/:table` auf, die im Backend-Store nicht freigegeben waren.

Betroffene Beispiele:

- `sales_workflows`
- `production_health_checks`
- `admin_action_logs`

Dadurch kam im Frontend:

```txt
permission · Tabelle '...' ist nicht erlaubt [FORBIDDEN]
```

Zusätzlich konnte der StoreClient bei abgelaufener Supabase-Session sofort `UNAUTHENTICATED` werfen.

## Fix

- Backend-Allowlist erweitert.
- Tool-Mapping für neue Admin-/Production-Tabellen ergänzt.
- StoreClient refreshes Supabase session before failing.
- Supabase Migration `0095_v065_admin_store_permissions.sql` ergänzt.

## Nach dem Patch

```bash
yarn quality:guard
yarn --cwd frontend typecheck
yarn --cwd frontend build
```

Danach Migration in Supabase ausführen/deployen.
