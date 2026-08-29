#!/usr/bin/env bash
set -euo pipefail

PORT=5174
ROUTE="/dev/menu-studio-v3-draft"
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
FRONTEND="$ROOT/frontend"
VITE_LOG="/tmp/beyond-vite.log"
LOCAL_URL="http://127.0.0.1:${PORT}${ROUTE}"

# Codespaces can keep a stale forwarding tunnel after resume. Replace the
# listener every time so Vite itself always starts from a known-good state.
fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
sleep 1

cd "$FRONTEND"
nohup setsid npm run dev -- --host 0.0.0.0 --port "$PORT" >"$VITE_LOG" 2>&1 < /dev/null &
VITE_PID=$!

studio_ready() {
  curl -fsS "$LOCAL_URL" >/dev/null 2>&1
}

for _ in $(seq 1 120); do
  if studio_ready; then
    break
  fi
  sleep 0.5
done

if ! studio_ready; then
  echo "Beyond Menu Studio failed to start on port ${PORT}." >&2
  echo "--- listener ---" >&2
  ss -ltnp 2>/dev/null | grep ":${PORT} " >&2 || true
  echo "--- vite log ---" >&2
  cat "$VITE_LOG" 2>/dev/null || true
  exit 1
fi

echo "BEYOND MENU STUDIO READY LOCALLY"
echo "$LOCAL_URL"
echo "Vite PID: $VITE_PID"
echo "Vite log: $VITE_LOG"

# IMPORTANT: this is the path that previously worked in this Codespace.
# With workbench.browser.enableRemoteProxy=true, VS Code opens localhost through
# the remote editor connection rather than requiring the app.github.dev tunnel.
if command -v code >/dev/null 2>&1; then
  code --open-url "$LOCAL_URL" >/dev/null 2>&1 || true
fi

# Keep the GitHub browse URL only as a diagnostic. If it returns 404 while the
# localhost curl above succeeds, the failure is the Codespaces forwarding
# tunnel, not Vite or the React route.
if [ -n "${CODESPACE_NAME:-}" ] && command -v gh >/dev/null 2>&1; then
  BROWSE_URL="$(
    timeout 8s gh codespace ports \
      -c "$CODESPACE_NAME" \
      --json sourcePort,browseUrl \
      --jq ".[] | select(.sourcePort == ${PORT}) | .browseUrl" \
      2>/dev/null | head -n 1 || true
  )"

  if [ -n "$BROWSE_URL" ]; then
    REMOTE_URL="${BROWSE_URL%/}${ROUTE}"
    printf '%s\n' "$REMOTE_URL" > /tmp/beyond-menu-studio-url
    echo "Codespaces forwarded URL (diagnostic): $REMOTE_URL"
  fi
fi
