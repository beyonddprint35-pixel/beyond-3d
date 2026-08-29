#!/usr/bin/env bash
set -u

PORT=5174
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
FRONTEND="$ROOT/frontend"
LOG="/tmp/beyond-vite.log"
URL_FILE="/tmp/beyond-menu-studio-url"

healthy() {
  curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null 2>&1
}

if ! healthy; then
  fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
  (
    cd "$FRONTEND" || exit 1
    nohup npm run dev -- --host 0.0.0.0 --port "$PORT" >"$LOG" 2>&1 < /dev/null &
  )
fi

READY=0
for _ in $(seq 1 120); do
  if healthy; then
    READY=1
    break
  fi
  sleep 0.5
done

if [ "$READY" -ne 1 ]; then
  echo "Beyond Menu Studio failed to start on port ${PORT}."
  echo "--- Vite log ---"
  cat "$LOG" 2>/dev/null || true
  exit 1
fi

if [ -n "${CODESPACE_NAME:-}" ] && [ -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]; then
  URL="https://${CODESPACE_NAME}-${PORT}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}/dev/menu-studio-v3-draft"
  printf '%s\n' "$URL" > "$URL_FILE"

  # Codespaces makes forwarded ports private by default and can reset public
  # visibility after a restart. Re-apply public visibility every attach so the
  # browser preview does not get stuck behind an expired private-port cookie.
  if command -v gh >/dev/null 2>&1; then
    for _ in $(seq 1 30); do
      if gh codespace ports -c "$CODESPACE_NAME" --json sourcePort 2>/dev/null | grep -q '"sourcePort": 5174'; then
        gh codespace ports visibility 5174:public -c "$CODESPACE_NAME" >/tmp/beyond-port.log 2>&1 && break
      fi
      sleep 1
    done
  fi

  echo ""
  echo "BEYOND MENU STUDIO READY"
  echo "$URL"
  echo ""
  echo "Vite log: $LOG"
  echo "Port log: /tmp/beyond-port.log"
else
  echo "Beyond Menu Studio ready at http://127.0.0.1:${PORT}/dev/menu-studio-v3-draft"
fi
