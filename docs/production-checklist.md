# Production Checklist

## Vor Launch
- JWT_SECRET ändern
- DB_MODE=supabase setzen
- Supabase Schema importieren
- Service Role Key nur im Backend speichern
- SMTP einrichten
- Stripe Webhook Secret setzen
- Domain + HTTPS verbinden
- Backups aktivieren
- Sentry DSN setzen
- Redis URL setzen
- APP_URL korrekt setzen
- DSGVO/Impressum finalisieren
- Security Audit durchführen

## Optional
- Cloudflare vor Domain
- Rate Limits pro Tenant
- S3/Supabase Storage statt Local Uploads
- Worker getrennt deployen
- Monitoring Alerts
