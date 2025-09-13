#!/bin/sh
# qbittorrent-wrapper.sh - Simple wrapper to configure qBittorrent authentication bypass
# Compatible with Alpine Linux's limited shell environment

echo "=== qBittorrent Authentication Bypass Wrapper ==="

# Configuration
WEBUI_PORT="${QBT_WEBUI_PORT:-8081}"
PROFILE_PATH="/config"
LOG_FILE="/tmp/qbt_startup.log"

# Process configuration template if it exists and config doesn't exist
if [ -f "/templates/qBittorrent.conf.template" ] && [ ! -f "$PROFILE_PATH/qBittorrent/qBittorrent.conf" ]; then
    echo "Processing qBittorrent configuration template..."
    mkdir -p "$PROFILE_PATH/qBittorrent"
    
    # Use envsubst to process template with environment variables
    if command -v envsubst >/dev/null 2>&1; then
        envsubst < "/templates/qBittorrent.conf.template" > "$PROFILE_PATH/qBittorrent/qBittorrent.conf"
        echo "✓ Configuration generated from template"
    else
        # Fallback: simple copy if envsubst not available
        cp "/templates/qBittorrent.conf.template" "$PROFILE_PATH/qBittorrent/qBittorrent.conf"
        echo "✓ Configuration copied from template (envsubst not available)"
    fi
fi

# Start qBittorrent and capture output
echo "Starting qBittorrent..."
/usr/bin/qbittorrent-nox --profile="$PROFILE_PATH" --webui-port="$WEBUI_PORT" 2>&1 | tee "$LOG_FILE" &
QBIT_PID=$!

echo "qBittorrent PID: $QBIT_PID"

# Wait for WebUI to be ready
echo "Waiting for WebUI to be available..."
COUNTER=0
while [ $COUNTER -lt 60 ]; do
    # Check if WebUI responds (even with auth error - means it's running)
    if curl -s "http://localhost:${WEBUI_PORT}/" | grep -q "qBittorrent" >/dev/null 2>&1; then
        echo "✓ WebUI is ready"
        break
    fi
    # Also check if API endpoint responds (even with 401/403)
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${WEBUI_PORT}/api/v2/app/version" | grep -E "^(200|401|403)$" >/dev/null 2>&1; then
        echo "✓ WebUI is ready (API responding)"
        break
    fi
    sleep 2
    COUNTER=$((COUNTER + 2))
done

# Configure authentication bypass using dedicated script
if [ -f "/scripts/qbittorrent-auth-bypass.sh" ]; then
    echo "Launching authentication bypass configuration..."
    /scripts/qbittorrent-auth-bypass.sh "$WEBUI_PORT" "$LOG_FILE" &
    BYPASS_PID=$!
    echo "Bypass configuration running in background (PID: $BYPASS_PID)"
else
    echo "⚠ Authentication bypass script not found"
fi

# Clean up log file after script has access to it
sleep 2
rm -f "$LOG_FILE"

echo "=== qBittorrent is running ==="
echo "WebUI accessible at: http://localhost:${WEBUI_PORT}"

# Keep qBittorrent running
wait $QBIT_PID