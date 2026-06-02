# MMOS V074 – Schema Status & Supabase Note Hotfix

Behebt zwei V073-Reste:

- `v33FunctionalClient.schemaStatus()` als Alias auf `/v39/schema-health`, damit Vercel TypeScript besteht.
- `customer_tool_access.note` wird per Migration abgesichert, bevor SumUp-Freischaltungen deaktiviert werden.

Nach Deploy bevorzugt ausführen:

```sql
supabase/migrations/0103_v074_schema_status_and_tool_access_note_hotfix.sql
```

Die Migration ist idempotent und unabhängig von `landing_page_settings.settings`.
