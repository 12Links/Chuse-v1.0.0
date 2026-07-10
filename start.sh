#!/bin/bash

# ── Chuse Backend Boot Script ──────────────────────────────────────────────────
# Starts the Cloud SQL Auth Proxy, waits for it to be ready, then starts FastAPI.
# Both processes are cleaned up cleanly on exit.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROXY_BIN="$SCRIPT_DIR/cloud-sql-proxy.exe"
CREDENTIALS="$SCRIPT_DIR/choose-edec8-firebase-adminsdk-fbsvc-fbd12dd4c8.json"
INSTANCE="choose-edec8:us-east4:frontend-fdc"
BACKEND_DIR="$SCRIPT_DIR/backend"
PROXY_LOG="$SCRIPT_DIR/proxy.log"

# ── Validation ─────────────────────────────────────────────────────────────────

if [ ! -f "$PROXY_BIN" ]; then
  echo "✗ cloud-sql-proxy.exe not found at $PROXY_BIN"
  echo "  Download it from: https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.15.2/cloud-sql-proxy.x86_64.exe"
  echo "  and place it in the root of the project as cloud-sql-proxy.exe"
  exit 1
fi

if [ ! -f "$CREDENTIALS" ]; then
  echo "✗ Credentials file not found at $CREDENTIALS"
  exit 1
fi

if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "✗ backend/.env not found — create it with DB_USER, DB_PASS, DB_NAME"
  exit 1
fi

# ── Cleanup on exit ────────────────────────────────────────────────────────────

PROXY_PID=""
cleanup() {
  echo ""
  echo "→ Shutting down..."
  if [ -n "$PROXY_PID" ] && kill -0 "$PROXY_PID" 2>/dev/null; then
    kill "$PROXY_PID" 2>/dev/null
    echo "✓ Proxy stopped (PID $PROXY_PID)"
  fi
}
trap cleanup EXIT INT TERM

# ── Start Proxy ────────────────────────────────────────────────────────────────

echo "→ Starting Cloud SQL Auth Proxy..."
# Convert credential path to Windows format for the .exe
CREDENTIALS_WIN=$(wslpath -w "$CREDENTIALS")
# Listen on all interfaces to be reachable from WSL
"$PROXY_BIN" --address 0.0.0.0 --credentials-file "$CREDENTIALS_WIN" "$INSTANCE" > "$PROXY_LOG" 2>&1 &
PROXY_PID=$!
echo "  PID: $PROXY_PID  |  Log: $PROXY_LOG"

# ── Wait for proxy to be ready ─────────────────────────────────────────────────

# In WSL, the Windows host has a different IP. We need to use it to connect.
# We get it from the default route and export it for the Python script.
WIN_HOST_IP=$(ip route | grep default | awk '{print $3}')
export DB_HOST=$WIN_HOST_IP
echo "→ Waiting for proxy on $WIN_HOST_IP:5432..."

for i in $(seq 1 30); do
  if ! kill -0 "$PROXY_PID" 2>/dev/null; then
    echo "✗ Proxy process died unexpectedly. Last log:"
    tail -5 "$PROXY_LOG"
    exit 1
  fi
  if python3 -c "import socket; s=socket.create_connection(('$WIN_HOST_IP',5432),1); s.close()" 2>/dev/null; then
    echo "✓ Proxy ready (${i}s)"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "✗ Proxy did not become ready in 30s. Last log:"
    tail -5 "$PROXY_LOG"
    exit 1
  fi
  sleep 1
done

# ── Start FastAPI ──────────────────────────────────────────────────────────────

echo "→ Starting FastAPI..."
cd "$BACKEND_DIR" && source venv/bin/activate && python pnp_scraper_postgres.py