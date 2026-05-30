#!/usr/bin/env bash
set -euo pipefail
DB_URL="${SUPABASE_DB_URL:-${DATABASE_URL:-}}"
OUT_DIR="${BACKUP_OUTPUT_DIR:-./backups}"
if [[ -z "$DB_URL" ]]; then
  echo "SUPABASE_DB_URL oder DATABASE_URL fehlt." >&2
  exit 1
fi
mkdir -p "$OUT_DIR"
TS="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
OUT="$OUT_DIR/mmos-$TS.dump"
pg_dump --format=custom --no-owner --no-acl --file="$OUT" "$DB_URL"
sha256sum "$OUT" > "$OUT.sha256"
echo "Backup erstellt: $OUT"
