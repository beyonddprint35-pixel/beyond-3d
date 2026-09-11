#!/usr/bin/env bash
set -uo pipefail

PORT=5175
ROUTE="/menu-builder"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SUPERVISOR="$SCRIPT_DIR/menu-studio-supervisor.sh"
SUPERVISOR_LOG="/tmp/beyond-vite-supervisor-5175.log"
SUPERVISOR_PID_FILE="/tmp/beyond-vite-supervisor-5175.pid"
VITE_LOG="/tmp/beyond-vite-5175.log"
LOCK_FILE="/tmp/beyond-menu-studio-5175.lock"
LOCAL_ROOT="http://127.0.0.1:${PORT}"
LOCAL_URL="${LOCAL_ROOT}${ROUTE}"

# postStartCommand and postAttachCommand can run close together. Serialize them
# so there is only one supervisor for the development server.
exec 9>"$LOCK_FILE"
if command -v flock >/dev/null 2>&1; then
  flock -w 30 9 || {
    echo "Beyond Menu Studio startup is already being handled."
    exit 0
  }
fi

studio_ready() {
  curl -fsS --max-time 2 "$LOCAL_URL" >/dev/null 2>&1
}

supervisor_running() {
  [ -f "$SUPERVISOR_PID_FILE" ] || return 1
  local pid
  pid="$(cat "$SUPERVISOR_PID_FILE" 2>/dev/null || true)"
  [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1
}

listener_exists() {
  if command -v ss >/dev/null 2>&1; then
    ss -ltn 2>/dev/null | grep -qE "[:.]${PORT}[[:space:]]"
    return
  fi
  fuser "${PORT}/tcp" >/dev/null 2>&1
}

stop_existing_server() {
  # Always restart when this repair/start script is invoked. This prevents a
  # healthy-but-stale Vite process from continuing to serve code from an older
  # checkout after git pull.
  if supervisor_running; then
    local pid
    pid="$(cat "$SUPERVISOR_PID_FILE" 2>/dev/null || true)"
    [ -n "$pid" ] && kill "$pid" >/dev/null 2>&1 || true
    sleep 0.5
  fi

  rm -f "$SUPERVISOR_PID_FILE"

  if listener_exists; then
    fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
    sleep 1
  fi
}

start_supervisor() {
  touch "$VITE_LOG" "$SUPERVISOR_LOG"
  nohup setsid bash "$SUPERVISOR" >>"$SUPERVISOR_LOG" 2>&1 < /dev/null &
  echo $! >"$SUPERVISOR_PID_FILE"
}

stop_existing_server
start_supervisor

for _ in $(seq 1 120); do
  if studio_ready; then
    echo "BEYOND MENU STUDIO READY"
    echo "$LOCAL_URL"
    echo "Vite log: $VITE_LOG"
    echo "Supervisor log: $SUPERVISOR_LOG"

    if [ -n "${CODESPACE_NAME:-}" ] && command -v gh >/dev/null 2>&1; then
      BROWSE_URL="$(
        timeout 8s gh codespace ports -c "$CODESPACE_NAME" \
          --json sourcePort,browseUrl \
          --jq ".[] | select(.sourcePort == ${PORT}) | .browseUrl" \
          2>/dev/null | head -n 1 || true
      )"
      if [ -n "$BROWSE_URL" ]; then
        REMOTE_URL="${BROWSE_URL%/}${ROUTE}"
        printf '%s\n' "$REMOTE_URL" >/tmp/beyond-menu-studio-url
        echo "Codespaces URL: $REMOTE_URL"
      else
        echo "Port ${PORT} is healthy locally; Codespaces is registering the forwarded URL."
      fi
    fi
    exit 0
  fi
  sleep 0.5
done

echo "Beyond Menu Studio did not become ready on port ${PORT}." >&2
echo "--- supervisor log ---" >&2
tail -n 80 "$SUPERVISOR_LOG" 2>/dev/null >&2 || true
echo "--- vite log ---" >&2
tail -n 120 "$VITE_LOG" 2>/dev/null >&2 || true
exit 1
