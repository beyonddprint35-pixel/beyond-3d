#!/usr/bin/env bash
set -uo pipefail

PORT=5175
ROUTE="/menu-builder"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND="$ROOT/frontend"
VITE_LOG="/tmp/beyond-vite-5175.log"
SUPERVISOR_LOG="/tmp/beyond-vite-supervisor-5175.log"

is_ready() {
  curl -fsS --max-time 2 "http://127.0.0.1:${PORT}${ROUTE}" >/dev/null 2>&1
}

listener_exists() {
  if command -v ss >/dev/null 2>&1; then
    ss -ltn 2>/dev/null | grep -qE "[:.]${PORT}[[:space:]]"
    return
  fi
  fuser "${PORT}/tcp" >/dev/null 2>&1
}

while true; do
  if is_ready; then
    sleep 5
    continue
  fi

  if listener_exists; then
    echo "$(date -Is) unhealthy listener on ${PORT}; restarting" >>"$SUPERVISOR_LOG"
    fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
    sleep 1
  fi

  echo "$(date -Is) starting Beyond Vite on ${PORT}" >>"$SUPERVISOR_LOG"
  cd "$FRONTEND" || exit 1
  npm run dev -- --host 0.0.0.0 --port "$PORT" >>"$VITE_LOG" 2>&1
  exit_code=$?
  echo "$(date -Is) Vite exited with code ${exit_code}; restarting in 2s" >>"$SUPERVISOR_LOG"
  sleep 2
done
