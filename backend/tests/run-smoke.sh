#!/usr/bin/env bash
# Startet den Backend mit Dummy-Supabase-ENV, fuehrt die smoke-Tests aus
# und beendet den Server sauber.
set -euo pipefail

PORT="${SMOKE_PORT:-4400}"
export SUPABASE_URL="${SUPABASE_URL:-https://invalid.supabase.co}"
export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-fake-test-key}"
export API_BASE="http://localhost:${PORT}"
export PORT

cd "$(dirname "$0")/.."

PORT=${PORT} node src/server.js > /tmp/mmos-smoke-server.log 2>&1 &
SERVER_PID=$!
trap 'kill ${SERVER_PID} 2>/dev/null || true' EXIT

# Warten bis Health antwortet (max 30 s)
for i in $(seq 1 60); do
  if curl -sf "${API_BASE}/api/health" > /dev/null; then
    break
  fi
  sleep 0.5
done

node --test tests/smoke.test.js
