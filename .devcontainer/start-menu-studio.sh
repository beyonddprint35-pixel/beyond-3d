#!/usr/bin/env bash
set -euo pipefail

PORT=5174
ROUTE="/dev/menu-studio-v3-draft"
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
FRONTEND="$ROOT/frontend"
VITE_LOG="/tmp/beyond-vite.log"
LOCAL_URL="http://127.0.0.1:${PORT}${ROUTE}"

# A stale listener can leave the Codespaces web tunnel pointing at a dead
# process after resume. Every explicit Studio start therefore replaces the
# listener instead of trusting an old process just because localhost answers.
fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
sleep 1

cd "$FRONTEND"
nohup setsid npm run dev -- --host 0.0.0.0 --port "$PORT" >"$VITE_LOG" 2>&1 < /dev/null &

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
  cat "$VITE_LOG" 2>/dev/null || true
  exit 1
fi

echo "BEYOND MENU STUDIO READY LOCALLY"
echo "$LOCAL_URL"
echo "Vite log: $VITE_LOG"

# VS Code's integrated browser can proxy localhost over the remote Codespace
# connection. This is the primary local preview path and does not depend on a
# GitHub forwarded-port URL being healthy.
if command -v code >/dev/null 2>&1; then
  code --open-url "$LOCAL_URL" >/dev/null 2>&1 || true
fi

# Also report the authoritative Codespaces browse URL when GitHub has created
# one. Never synthesize this address and never force public visibility.
if [ -n "${CODESPACE_NAME:-}" ] && command -v gh >/dev/null 2>&1; then
  BROWSE_URL=""

  for _ in $(seq 1 40); do
    BROWSE_URL="$(
      timeout 8s gh codespace ports \
        -c "$CODESPACE_NAME" \
        --json sourcePort,browseUrl \
        --jq ".[] | select(.sourcePort == ${PORT}) | .browseUrl" \
        2>/dev/null | head -n 1 || true
    )"

    if [ -n "$BROWSE_URL" ]; then
      break
    fi

    sleep 0.5
  done

  if [ -n "$BROWSE_URL" ]; then
    REMOTE_URL="${BROWSE_URL%/}${ROUTE}"
    printf '%s\n' "$REMOTE_URL" > /tmp/beyond-menu-studio-url
    echo "Codespaces browser URL: $REMOTE_URL"
  fi
fi
