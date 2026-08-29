#!/usr/bin/env bash
set -euo pipefail

PORT=5174
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
FRONTEND="$ROOT/frontend"
LOG="/tmp/beyond-vite.log"
LOCAL_URL="http://localhost:${PORT}/dev/menu-studio-v3-draft"

healthy() {
  curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null 2>&1
}

if ! healthy; then
  fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
  cd "$FRONTEND"
  nohup setsid npm run dev -- --host 0.0.0.0 --port "$PORT" >"$LOG" 2>&1 < /dev/null &
fi

for _ in $(seq 1 120); do
  if healthy; then
    echo "BEYOND MENU STUDIO READY"
    echo "$LOCAL_URL"
    echo "Vite log: $LOG"
    exit 0
  fi
  sleep 0.5
done

echo "Beyond Menu Studio failed to start on port ${PORT}." >&2
cat "$LOG" 2>/dev/null || true
exit 1
