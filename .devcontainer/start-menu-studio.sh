#!/usr/bin/env bash
set -euo pipefail

PORT=5174
ROUTE="/dev/menu-studio-v3-draft"
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
FRONTEND="$ROOT/frontend"
VITE_LOG="/tmp/beyond-vite.log"
PORT_LOG="/tmp/beyond-port-helper.log"
LOCAL_URL="http://localhost:${PORT}${ROUTE}"

healthy() {
  curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null 2>&1
}

if ! healthy; then
  fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
  (
    cd "$FRONTEND"
    nohup setsid npm run dev -- --host 0.0.0.0 --port "$PORT" >"$VITE_LOG" 2>&1 < /dev/null &
  )
fi

for _ in $(seq 1 120); do
  if healthy; then
    nohup setsid bash "$ROOT/.devcontainer/ensure-menu-port.sh" "$PORT" "$ROUTE" >"$PORT_LOG" 2>&1 < /dev/null &

    echo "BEYOND MENU STUDIO READY"
    echo "$LOCAL_URL"
    if [ -n "${CODESPACE_NAME:-}" ] && [ -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]; then
      echo "https://${CODESPACE_NAME}-${PORT}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}${ROUTE}"
    fi
    echo "Vite log: $VITE_LOG"
    echo "Port helper log: $PORT_LOG"
    exit 0
  fi
  sleep 0.5
done

echo "Beyond Menu Studio failed to start on port ${PORT}." >&2
cat "$VITE_LOG" 2>/dev/null || true
exit 1
