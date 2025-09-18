#!/bin/sh
set -e

URL_FILE="/shared-data/tunnel-url.txt"
LOG_FILE="/tmp/cloudflared.log"
CONFIG_FILE="/home/nonroot/.cloudflared/config.yml"

# Ensure shared directory exists
mkdir -p "$(dirname "$URL_FILE")"

# Check if tunnel is configured
if [ ! -f "$CONFIG_FILE" ]; then
    echo "ERROR: Tunnel not configured. Please run setup commands first."
    echo "See documentation for tunnel setup instructions."
    exit 1
fi

# Start tunnel in background, capturing output
echo "Starting Cloudflare Tunnel..."
cloudflared tunnel --config "$CONFIG_FILE" run > "$LOG_FILE" 2>&1 &

echo "Waiting for tunnel URL..."
URL=""
ATTEMPTS=0
MAX_ATTEMPTS=60

# Poll logs for tunnel URL
while [ -z "$URL" ] && [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    sleep 2
    ATTEMPTS=$((ATTEMPTS + 1))
    URL=$(grep -o 'https://[a-zA-Z0-9-]\+\.cfargotunnel\.com' "$LOG_FILE" 2>/dev/null || true)
done

if [ -n "$URL" ]; then
    echo "Tunnel URL found: $URL"
    echo "$URL" > "$URL_FILE"
    echo "URL saved to $URL_FILE"
else
    echo "ERROR: Failed to obtain tunnel URL after $MAX_ATTEMPTS attempts"
    echo "Check logs: $LOG_FILE"
fi

# Keep container running and show logs
tail -f "$LOG_FILE"