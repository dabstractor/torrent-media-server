#!/bin/sh
# qbittorrent-wrapper.sh - Simple wrapper to configure qBittorrent authentication bypass
# Compatible with Alpine Linux's limited shell environment

echo "=== qBittorrent Authentication Bypass Wrapper ==="

# Configuration
WEBUI_PORT="${QBT_WEBUI_PORT:-8080}"
PROFILE_PATH="/config"
LOG_FILE="/tmp/qbt_startup.log"

# Start qBittorrent and capture output
echo "Starting qBittorrent..."
/usr/bin/qbittorrent-nox --profile="$PROFILE_PATH" --webui-port="$WEBUI_PORT" 2>&1 | tee "$LOG_FILE" &
QBIT_PID=$!

echo "qBittorrent PID: $QBIT_PID"

# Wait for password to appear in output
echo "Waiting for qBittorrent to generate temporary password..."
TEMP_PASS=""
COUNTER=0

while [ -z "$TEMP_PASS" ] && [ $COUNTER -lt 30 ]; do
    # Check if process is still running
    if ! kill -0 $QBIT_PID 2>/dev/null; then
        echo "ERROR: qBittorrent process died"
        exit 1
    fi
    
    # Look for temporary password in log file
    if [ -f "$LOG_FILE" ]; then
        # Extract password using sed
        TEMP_PASS=$(grep "temporary password" "$LOG_FILE" | sed 's/.*temporary password.*: //g' | head -1)
    fi
    
    if [ -n "$TEMP_PASS" ]; then
        echo "✓ Found temporary password: $TEMP_PASS"
        break
    fi
    
    sleep 1
    COUNTER=$((COUNTER + 1))
done

if [ -z "$TEMP_PASS" ]; then
    echo "ERROR: Could not capture temporary password"
    echo "qBittorrent will require manual authentication"
    wait $QBIT_PID
    exit 0
fi

# Wait for WebUI to be ready
echo "Waiting for WebUI to be available..."
COUNTER=0
while [ $COUNTER -lt 60 ]; do
    if curl -sf "http://localhost:${WEBUI_PORT}/api/v2/auth/login" >/dev/null 2>&1; then
        echo "✓ WebUI is ready"
        break
    fi
    sleep 1
    COUNTER=$((COUNTER + 1))
done

# Login and configure bypass
echo "Configuring authentication bypass..."

# Login with temporary password
curl -c /tmp/qbt_cookies.txt \
    -d "username=admin&password=${TEMP_PASS}" \
    -X POST "http://localhost:${WEBUI_PORT}/api/v2/auth/login" >/dev/null 2>&1

# Set authentication bypass
curl -b /tmp/qbt_cookies.txt \
    -X POST "http://localhost:${WEBUI_PORT}/api/v2/app/setPreferences" \
    -d 'json={"bypass_local_auth":true,"bypass_auth_subnet_whitelist":"0.0.0.0/0,::/0","bypass_auth_subnet_whitelist_enabled":true}' >/dev/null 2>&1

# Clean up
rm -f /tmp/qbt_cookies.txt
rm -f "$LOG_FILE"

# Test if bypass works
sleep 2
if curl -sf "http://localhost:${WEBUI_PORT}/api/v2/app/version" | grep -q "^v"; then
    echo "✓ Authentication bypass is working!"
    echo "✓ qBittorrent is accessible without authentication"
else
    echo "WARNING: Authentication bypass may not be configured"
fi

echo "=== qBittorrent is running ==="
echo "WebUI accessible at: http://localhost:${WEBUI_PORT}"

# Keep qBittorrent running
wait $QBIT_PID