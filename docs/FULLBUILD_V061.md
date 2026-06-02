# MMOS V061 – Live Fullbuild

Stand: 02.06.2026

## Enthalten

Dieser Fullbuild ergänzt und härtet MecklenburgMarketingOS um:

- GitHub Actions Build Check
- V061 Fullbuild Guard
- Health API
- Review Shield / öffentliches Feedback API
- Supabase Migration für `review_feedback`
- saubere Env-Behandlung
- Gotenberg-Fallback ohne `null` / `undefined`
- Middleware ohne harte Redirects
- TypeScript/Build-Sicherheit

## Lokal prüfen

```bash
yarn install
yarn fullbuild:check
yarn quality:guard
yarn --cwd frontend typecheck
yarn --cwd frontend build
