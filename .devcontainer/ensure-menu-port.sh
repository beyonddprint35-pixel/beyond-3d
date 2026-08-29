#!/usr/bin/env bash
set -u

PORT="${1:-5174}"
ROUTE="${2:-/dev/menu-studio-v3-draft}"
LOG="/tmp/beyond-port.log"
PID_FILE="/tmp/beyond-menu-port-keeper.pid"

if [ -z "${CODESPACE_NAME:-}" ] || [ -z "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]; then
  exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
  exit 0
fi

if [ -f "$PID_FILE" ]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    exit 0
  fi
fi

echo $$ > "$PID_FILE"
trap 'rm -f "$PID_FILE"' EXIT

export GH_PROMPT_DISABLED=1
URL="https://${CODESPACE_NAME}-${PORT}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}${ROUTE}"
OPENED=0

port_state() {
  timeout 8s gh codespace ports -c "$CODESPACE_NAME" --json sourcePort,visibility,browseUrl 2>/dev/null || true
}

while true; do
  STATE="$(port_state)"

  if printf '%s' "$STATE" | grep -Eq '"sourcePort"[[:space:]]*:[[:space:]]*'"${PORT}"; then
    if ! printf '%s' "$STATE" | grep -Eq '"visibility"[[:space:]]*:[[:space:]]*"public"'; then
      timeout 10s gh codespace ports visibility "${PORT}:public" -c "$CODESPACE_NAME" >"$LOG" 2>&1 || true
      sleep 1
      STATE="$(port_state)"
    fi

    if printf '%s' "$STATE" | grep -Eq '"visibility"[[:space:]]*:[[:space:]]*"public"'; then
      printf '%s\n' "$URL" > /tmp/beyond-menu-studio-url
      if [ "$OPENED" -eq 0 ]; then
        echo "Beyond Menu Studio forwarded URL: $URL" >> "$LOG"
        if command -v code >/dev/null 2>&1; then
          timeout 8s code --open-url "$URL" >/dev/null 2>&1 || true
        fi
        OPENED=1
      fi
    fi
  fi

  sleep 15
done
