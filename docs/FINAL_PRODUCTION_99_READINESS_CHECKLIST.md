# MMOS 99/100 Production Readiness Checklist

## Noch erforderlich für 99/100

1. Aktuellsten Fullbuild live deployen.
2. Supabase Migration `0099_final_production_performance_indexes.sql` ausführen.
3. Final Hardening Center öffnen: `/admin/production/final-hardening`.
4. Production Smoke Test gegen Live-Backend ausführen.
5. Tenant Isolation Final Audit live prüfen.
6. Webhook Secrets für genutzte Provider setzen:
   - STRIPE_WEBHOOK_SECRET
   - RESEND_WEBHOOK_SECRET
   - SUMUP_WEBHOOK_SECRET, falls genutzt
7. Mail Domain beim Provider vollständig verifizieren:
   - SPF
   - DKIM
   - DMARC
8. Gotenberg/PDF live testen.
9. Restore-Test in Testumgebung durchführen.
10. Anwaltliche Prüfung der Verträge/AVV/Datenschutztexte.

## 99/100 bedeutet

- nicht bugfrei,
- aber kontrolliert produktionsfähig,
- mit Monitoring, Recovery, Isolation, Tests und klarer Betriebsroutine.
