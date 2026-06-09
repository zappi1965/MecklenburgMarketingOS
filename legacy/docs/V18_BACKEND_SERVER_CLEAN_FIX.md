# MMOS v18 Backend Server Clean Fix Fullbuild

Dieser Build ersetzt die kaputt gepatchte `backend/src/server.js` komplett durch eine saubere Version.

Behoben:
- `Unexpected token 'const'`
- zusammengeklebte require-Zeile
- doppelte `securityHeaders` Imports
- Worker-Fix bleibt enthalten

Deploy:
1. Railway Backend neu deployen.
   Root Directory: `backend`
   Start Command: `npm start`

2. Railway Worker neu deployen.
   Root Directory: `backend`
   Start Command: `npm run worker`

3. Vercel Frontend nur neu deployen, wenn du diesen Build auch als vollständigen Frontend-Stand übernehmen willst.

Erwartete Logs:
- Backend: `MMOS backend running on ...`
- Worker: `MMOS worker tick OK`
