# Veraltete SQL-Dateien nicht mehr ausführen

Für die gewünschte Trennung gilt ab V42.24.7:

- Live-Daten bleiben live (`is_demo=false`).
- Demo-Daten bleiben erhalten (`is_demo=true` oder `demo_*`).
- Keine Demo-Daten werden gelöscht.
- Alte Purge-/Full-Cleanup-SQLs dürfen nicht mehr ausgeführt werden.

Nicht mehr verwenden:

- `SQL_V42_24_2_LIVE_ONLY_PURGE_DEMO_FALLBACK.sql`
- `supabase/migrations/0040_v42_24_2_live_only_purge_demo_fallback.sql`
- `SQL_V42_23_7_LIVE_DEMO_FULL_CLEANUP.sql`

Stattdessen verwenden:

- `SQL_V42_24_4_TYPE_SAFE_LIVE_DEMO_SPLIT.sql`
- optional `SQL_V42_24_7_BACKEND_ENV_PROVIDER_HOTFIX.sql`
