# MMOS V080 Demo Customer Schema Hotfix

Behebt den Supabase-Fehler aus 0106:

`column points_per_booking of relation loyalty_programs does not exist`

Änderung:
- 0106 wurde schema-sicher gemacht
- 0107 wurde als sichere Reparaturmigration ergänzt
- fehlende Loyalty-Spalten werden per `ALTER TABLE IF NOT EXISTS` ergänzt
- Demo-Rechnung wird ohne `ON CONFLICT` geschrieben, damit keine Unique-Index-Abhängigkeit entsteht

Nach dem Redeploy bevorzugt ausführen:

`supabase/migrations/0107_v080_demo_customer_loyalty_schema_hotfix.sql`
