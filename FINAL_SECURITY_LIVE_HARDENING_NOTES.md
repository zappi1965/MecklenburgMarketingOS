# Final Security Live Hardening

Umgesetzt:

- `productionRoutes` wieder unter `/api/production` gemountet.
- Final-Hardening-Routen ergänzt.
- Supabase Helper/RPC für Tenant-Audit ergänzt.
- RLS für Kern-Tabellen aktiviert und tenant-spezifische Policies ergänzt.
- Server-seitige Toolfreigabe im StoreService ergänzt.
- Kundenportal-Live-Check ergänzt.
- Paket-/Toolfreigabe-Abgleich mit optionalem Sync ergänzt.
- Dokumenten-, E-Rechnung-, Backup- und Monitoring-Checks ergänzt.
- Final-Live-Acceptance-Script ergänzt.

Migration:

```txt
supabase/migrations/0098_final_security_live_hardening.sql
```

Script:

```txt
yarn production:final-live
```
