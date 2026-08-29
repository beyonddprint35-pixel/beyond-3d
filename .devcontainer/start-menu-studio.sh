#!/usr/bin/env bash
set -uo pipefail

PORT=5174
ROUTE="/dev/menu-studio-v3-draft"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND="$ROOT/frontend"
VITE_LOG="/tmp/beyond-vite.log"
PID_FILE="/tmp/beyond-vite.pid"
LOCK_FILE="/tmp/beyond-menu-studio.lock"
LOCAL_ROOT="http://127.0.0.1:${PORT}"
LOCAL_URL="${LOCAL_ROOT}${ROUTE}"

# postStartCommand and postAttachCommand can run very close together. Serialize
# them so two lifecycle hooks never kill/restart the same Vite process.
exec 9>"$LOCK_FILE"
if command -v flock >/dev/null 2>&1; then
  flock -w 30 9 || {
    echo "Beyond Menu Studio startup is already being handled by another lifecycle hook."
    exit 0
  }
fi

studio_ready() {
  curl -fsS --max-time 2 "$LOCAL_URL" >/dev/null 2>&1
}

listener_exists() {
  if command -v ss >/dev/null 2>&1; then
    ss -ltn 2>/dev/null | grep -qE "[:.]${PORT}[[:space:]]"
    return
  fi
  fuser "${PORT}/tcp" >/dev/null 2>&1
}

start_vite() {
  # Only replace a listener when it is actually unhealthy. Repeatedly killing a
  # healthy listener causes Codespaces to tear down/recreate its forwarding
  # registration and was one source of the recurring 404 race.
  if listener_exists && ! studio_ready; then
    fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
    sleep 1
  fi

  : >"$VITE_LOG"
  cd "$FRONTEND"
  nohup setsid npm run dev -- --host 0.0.0.0 --port "$PORT" >"$VITE_LOG" 2>&1 < /dev/null &
  echo $! >"$PID_FILE"

  for _ in $(seq 1 120); do
    studio_ready && return 0
    sleep 0.5
  done
  return 1
}

if studio_ready; then
  STATUS="already running"
else
  if ! start_vite; then
    echo "Beyond Menu Studio failed to start on port ${PORT}." >&2
    echo "--- listener ---" >&2
    ss -ltnp 2>/dev/null | grep ":${PORT} " >&2 || true
    echo "--- vite log ---" >&2
    cat "$VITE_LOG" 2>/dev/null || true
    exit 1
  fi
  STATUS="started"
fi

# Printing a localhost URL is intentional. Codespaces watches lifecycle/terminal
# output for localhost URLs and can auto-forward the port; forwardPorts in
# devcontainer.json is the primary registration after the container is rebuilt.
echo "BEYOND MENU STUDIO READY (${STATUS})"
echo "$LOCAL_URL"
echo "Vite log: $VITE_LOG"

# Keep the forwarded port private. This is best-effort only because older gh
# clients have occasionally failed to list VS Code-forwarded ports. Never make
# the development server public just to work around forwarding issues.
if [ -n "${CODESPACE_NAME:-}" ] && command -v gh >/dev/null 2>&1; then
  PORT_FOUND=""
  for _ in $(seq 1 20); do
    PORT_FOUND="$(
      timeout 6s gh codespace ports -c "$CODESPACE_NAME" \
        --json sourcePort \
        --jq ".[] | select(.sourcePort == ${PORT}) | .sourcePort" \
        2>/dev/null | head -n 1 || true
    )"
    [ -n "$PORT_FOUND" ] && break
    sleep 0.5
  done

  if [ -n "$PORT_FOUND" ]; then
    timeout 8s gh codespace ports visibility "${PORT}:private" -c "$CODESPACE_NAME" >/dev/null 2>&1 || true
    BROWSE_URL="$(
      timeout 8s gh codespace ports -c "$CODESPACE_NAME" \
        --json sourcePort,browseUrl \
        --jq ".[] | select(.sourcePort == ${PORT}) | .browseUrl" \
        2>/dev/null | head -n 1 || true
    )"
    if [ -n "$BROWSE_URL" ]; then
      REMOTE_URL="${BROWSE_URL%/}${ROUTE}"
      printf '%s\n' "$REMOTE_URL" > /tmp/beyond-menu-studio-url
      echo "Codespaces URL: $REMOTE_URL"
    fi
  else
    echo "Port ${PORT} is healthy locally; Codespaces is still registering the forwarded port."
  fi
fi
