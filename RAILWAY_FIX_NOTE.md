# Railway Fix: Supabase WebSocket / Node 20

Dieser Fullbuild entfernt das veraltete `backend/package-lock.json`, weil Railway sonst `npm ci` nutzt und abbricht, sobald `backend/package.json` die neue Dependency `ws` enthält.

Relevante Änderungen:

- `backend/package.json` enthält `ws` als Dependency.
- `backend/src/lib/supabaseAdmin.js` setzt für Supabase Realtime den WebSocket-Transport über `ws`.
- `backend/src/workers/apiReadyWorker.js` nutzt den zentralen `getSupabaseAdmin()` Client.
- `backend/src/workers/securityAuditWorker.js` nutzt den zentralen `getSupabaseAdmin()` Client.
- `backend/src/config.js` nutzt den zentralen `getSupabaseAdmin()` Client.
- `backend/package-lock.json` wurde entfernt, damit Railway ohne veraltetes Lockfile neu installieren kann.

Nach Upload/Push zu GitHub in Railway den Backend- und Worker-Service neu deployen.
