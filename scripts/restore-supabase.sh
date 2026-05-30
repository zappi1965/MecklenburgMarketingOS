#!/usr/bin/env bash
set -euo pipefail
DB_URL="${SUPABASE_DB_URL:-${DATABASE_URL:-}}"
BACKUP_FILE="${1:-}"
if [[ -z "$DB_URL" || -z "$BACKUP_FILE" ]]; then
  echo "Nutzung: SUPABASE_DB_URL=... ./scripts/restore-supabase.sh ./backups/mmos.dump" >&2
  exit 1
fi
echo "ACHTUNG: Restore nach $DB_URL"
read -r -p "Fortfahren? Schreibe RESTORE: " CONFIRM
if [[ "$CONFIRM" != "RESTORE" ]]; then
  echo "Abgebrochen."
  exit 1
fi
pg_restore --clean --if-exists --no-owner --no-acl --dbname="$DB_URL" "$BACKUP_FILE"
echo "Restore abgeschlossen."
