# MMOS V073 – V072 Hotfix

Behoben:

- Supabase Migration `0101_v071_stable_cleanup_mobile_package_lock.sql` nutzt keine nicht vorhandene Spalte `settings` mehr.
- Zusätzliche sichere Reparaturmigration `0102_v073_landing_page_settings_and_public_link_hotfix.sql` ergänzt.
- Vercel Typecheck: `v33FunctionalClient.publicLinkStatus(...)` als Kompatibilitäts-Alias ergänzt.

Nach Deploy:

1. Vercel neu deployen.
2. Railway neu deployen.
3. In Supabase bevorzugt `0102_v073_landing_page_settings_and_public_link_hotfix.sql` ausführen, falls `0101` bereits Probleme gemacht hat.
