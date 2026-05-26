
# MMOS v18 Worker Supabase Fix

## Behoben
Der Worker ist wegen folgender Stelle gecrasht:

`supabase.from(...).insert(...).catch is not a function`

Grund:
Supabase Querybuilder sollten im Worker nicht mit `.catch()` direkt verkettet werden.

## Änderung
- `apiReadyWorker.js` wurde vollständig auf `await` + `try/catch` umgestellt.
- Supabase-Fehler werden geloggt, crashen den Worker aber nicht mehr.
- Mail-Jobs, API-Sync-Jobs, Rechnungsreminder und Paketanfragen laufen weiter.
- `recordJob()` crasht nicht mehr.

## Deploy
1. Railway Worker redeployen.
2. Root Directory: `backend`
3. Start Command:
`npm run worker`

Backend, Frontend, Supabase und Gotenberg müssen für diesen Worker-Fix nicht geändert werden.
