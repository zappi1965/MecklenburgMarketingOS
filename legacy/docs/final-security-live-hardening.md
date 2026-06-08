# MMOS Final Security & Live Hardening

Dieses Paket bindet die vorbereiteten Produktionsprüfungen stärker zusammen:

- volle Production API wieder gemountet (`/api/production/validation/*`, `/api/production/live-e2e/:customer_id`)
- finale Hardening-Endpunkte unter `/api/production/final-hardening/*`
- serverseitige ToolAccess-Prüfung für kundenbezogene Store-Tabellen
- Tenant-/RLS-Audit über `mmos_tenant_security_audit`
- Kundenportal-Live-Check
- Paket-/Toolfreigabe-Abgleich
- Dokumenten-Deep-Check
- E-Rechnung/XRechnung-Deep-Check
- Backup-Restore-Dry-Run
- Monitoring-Testalarm
- Final-Acceptance-Script

## Supabase Migration

Nach Upload ausführen:

```txt
supabase/migrations/0098_final_security_live_hardening.sql
```

## Live-Abnahme

```txt
BACKEND_BASE_URL=https://dein-backend
ADMIN_BEARER_TOKEN=...
TEST_CUSTOMER_ID=...
yarn production:final-live
```

Das Ergebnis wird als `final-live-acceptance-report.json` geschrieben.

## Wichtiger Hinweis zu RLS

Die Migration aktiviert RLS und ergänzt tenant-spezifische Policies. Bereits existierende breite `authenticated` Policies werden bewusst nicht automatisch gelöscht, sondern vom Audit als `WARN_BROAD_AUTHENTICATED_POLICY` gemeldet. So wird das Live-System nicht durch eine harte Policy-Löschung zerstört.

Nach erfolgreichem Test können breite Policies gezielt entfernt werden.
