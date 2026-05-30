# MMOS Final 1:1 Fullbuild Replacement

Diese ZIP ist als vollständiger Repo-Ersatz gedacht.

## Verwendung

1. ZIP entpacken.
2. Den Inhalt 1:1 in dein GitHub-Repo hochladen.
3. Bestehende Dateien ersetzen lassen.
4. Committen und pushen.
5. Railway Backend zuerst deployen.
6. Vercel Frontend danach deployen.

## Enthalten

- vollständiges Frontend
- vollständiges Backend
- Supabase-Migrationen
- Docs
- GitHub Workflows
- Admin-Wissenstest unter `/admin/training`
- neue Admin-Sidebar
- Legacy-Sidebar-Fix für alte App-Ansicht
- Logo-Fix für Landingpage und Sidebar
- Mini-Audit Build-Fix
- Security Core
- Production Readiness
- Media Binding / Reports
- Internal Access / Kundenportal

## Wichtig

Supabase-Migrationen weiterhin manuell ausführen:

- `supabase/migrations/0090_production_readiness_observability.sql`
- `supabase/migrations/0091_security_core_jobs_permissions.sql`
