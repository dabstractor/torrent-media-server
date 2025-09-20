#!/bin/sh
set -e

URL_FILE="/shared-data/tunnel-url.txt"
LOG_FILE="/tmp/cloudflared.log"

echo "🚀 Starting Cloudflare Quick Tunnel for Jellyfin..."
echo "This creates a temporary tunnel that doesn't require authentication."

# Ensure shared directory exists
mkdir -p "$(dirname "$URL_FILE")"

# Start cloudflared with quick tunnel
echo "Starting tunnel..."
cloudflared tunnel --url http://jellyfin:8096 > "$LOG_FILE" 2>&1 &
TUNNEL_PID=$!

# Wait for tunnel URL and save it
echo "Waiting for tunnel URL..."
URL=""
ATTEMPTS=0
MAX_ATTEMPTS=60

while [ -z "$URL" ] && [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    sleep 2
    ATTEMPTS=$((ATTEMPTS + 1))
    URL=$(grep -o 'https://[a-zA-Z0-9-]\+\.trycloudflare\.com' "$LOG_FILE" 2>/dev/null || true)
done

if [ -n "$URL" ]; then
    echo "✅ Quick Tunnel URL: $URL"
    echo "$URL" > "$URL_FILE"
    echo "✅ URL saved to $URL_FILE"
else
    echo "⚠️  Could not extract tunnel URL"
fi

# Wait for the tunnel process and show logs
wait $TUNNEL_PID