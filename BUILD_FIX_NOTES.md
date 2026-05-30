# Build Fix

Gefixt wurde:

`frontend/src/components/mini-audit/MiniAuditGeneratorClient.tsx`

Ursache:
Beim vorherigen Mini-Audit-Fullbuild war versehentlich ein Shell-Heredoc-Rest (`cat > /mnt/data/...`) am Ende der TSX-Datei enthalten. Turbopack hat das als JavaScript/TypeScript geparst und deshalb mit `Unknown regular expression flags` abgebrochen.

Diese Version enthält die bereinigte Datei.
