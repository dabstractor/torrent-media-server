#!/bin/sh
# qbittorrent-wrapper.sh - Simple wrapper to configure qBittorrent authentication bypass
# Compatible with Alpine Linux's limited shell environment

echo "=== qBittorrent Authentication Bypass Wrapper ==="

# Configuration
WEBUI_PORT="${QBT_WEBUI_PORT:-8081}"
PROFILE_PATH="/config"
LOG_FILE="/tmp/qbt_startup.log"
FIRST_RUN_MARKER="$PROFILE_PATH/.qbt_config_initialized"

# PIA Port Detection (only when using PIA OpenVPN)
PIA_PORT=""
if [ "$VPN_SERVICE_PROVIDER" = "private internet access" ] && [ "$VPN_TYPE" = "openvpn" ]; then
    FORWARDED_PORT_FILE="/tmp/gluetun/forwarded_port"
    echo "Checking for PIA forwarded port..."

    # Wait up to 30 seconds for forwarded port file
    for i in {1..30}; do
        if [ -f "$FORWARDED_PORT_FILE" ]; then
            PIA_PORT=$(cat "$FORWARDED_PORT_FILE" 2>/dev/null)
            if [ -n "$PIA_PORT" ] && [ "$PIA_PORT" != "0" ]; then
                echo "✓ Found PIA forwarded port: $PIA_PORT"
                export QBITTORRENT_PEER_PORT=$PIA_PORT
                break
            fi
        fi
        sleep 1
    done

    if [ -z "$PIA_PORT" ] || [ "$PIA_PORT" = "0" ]; then
        echo "⚠ No PIA forwarded port found, using default port"
    fi
fi

# Ensure download directories exist with correct permissions
# Create category subdirectories to match Transmission behavior
echo "Ensuring download directories exist..."
mkdir -p /downloads/complete /downloads/incomplete /downloads/watch
mkdir -p /downloads/complete/radarr /downloads/complete/sonarr
chown -R 1000:1000 /downloads 2>/dev/null || true

# Only process configuration template on first run to preserve user settings
if [ -f "/templates/qBittorrent.conf.template" ] && [ ! -f "$FIRST_RUN_MARKER" ]; then
    echo "Processing qBittorrent configuration template..."
    mkdir -p "$PROFILE_PATH/qBittorrent"

    # Backup existing config if it exists
    if [ -f "$PROFILE_PATH/qBittorrent/qBittorrent.conf" ]; then
        cp "$PROFILE_PATH/qBittorrent/qBittorrent.conf" "$PROFILE_PATH/qBittorrent/qBittorrent.conf.backup"
        echo "✓ Backed up existing configuration"
    fi

    # Process template with environment variables
    # Use sed to expand ${VAR:-default} patterns since envsubst may not be available
    cp "/templates/qBittorrent.conf.template" "$PROFILE_PATH/qBittorrent/qBittorrent.conf"
    mkdir -p "$PROFILE_PATH/qBittorrent/config"
    cp "/templates/qBittorrent.conf.template" "$PROFILE_PATH/qBittorrent/config/qBittorrent.conf"

    # Expand environment variables using sed
    for config_file in "$PROFILE_PATH/qBittorrent/qBittorrent.conf" "$PROFILE_PATH/qBittorrent/config/qBittorrent.conf"; do
        # Replace ${QBITTORRENT_PORT:-8080} with actual value
        sed -i "s|\${QBITTORRENT_PORT:-8080}|${QBITTORRENT_PORT:-8080}|g" "$config_file"
        # Replace ${QBITTORRENT_PEER_PORT:-6881} with actual value
        sed -i "s|\${QBITTORRENT_PEER_PORT:-6881}|${QBITTORRENT_PEER_PORT:-6881}|g" "$config_file"
        # Replace ${QBITTORRENT_USERNAME:-admin} with actual value
        sed -i "s|\${QBITTORRENT_USERNAME:-admin}|${QBITTORRENT_USERNAME:-admin}|g" "$config_file"
    done
    echo "✓ Configuration generated from template with environment variable expansion"

    # Force correct download paths immediately after generation
    echo "Forcing correct download paths in generated configuration..."
    # Fix main config file
    sed -i 's|Session\\DefaultSavePath=/data/downloads/complete|Session\\DefaultSavePath=/downloads/complete|g' "$PROFILE_PATH/qBittorrent/qBittorrent.conf"
    sed -i 's|Session\\SavePath=/data/downloads/complete|Session\\SavePath=/downloads/complete|g' "$PROFILE_PATH/qBittorrent/qBittorrent.conf"
    sed -i 's|Session\\TempPath=/data/downloads/incomplete|Session\\TempPath=/downloads/incomplete|g' "$PROFILE_PATH/qBittorrent/qBittorrent.conf"
    sed -i 's|Downloads\\SavePath=/data/downloads/complete|Downloads\\SavePath=/downloads/complete|g' "$PROFILE_PATH/qBittorrent/qBittorrent.conf"
    sed -i 's|Downloads\\DefaultSavePath=/data/downloads/complete|Downloads\\DefaultSavePath=/downloads/complete|g' "$PROFILE_PATH/qBittorrent/qBittorrent.conf"
    sed -i 's|Downloads\\TempPath=/data/downloads/incomplete|Downloads\\TempPath=/downloads/incomplete|g' "$PROFILE_PATH/qBittorrent/qBittorrent.conf"

    # Fix config subdirectory file too
    sed -i 's|Session\\DefaultSavePath=/data/downloads/complete|Session\\DefaultSavePath=/downloads/complete|g' "$PROFILE_PATH/qBittorrent/config/qBittorrent.conf"
    sed -i 's|Session\\SavePath=/data/downloads/complete|Session\\SavePath=/downloads/complete|g' "$PROFILE_PATH/qBittorrent/config/qBittorrent.conf"
    sed -i 's|Session\\TempPath=/data/downloads/incomplete|Session\\TempPath=/downloads/incomplete|g' "$PROFILE_PATH/qBittorrent/config/qBittorrent.conf"
    sed -i 's|Downloads\\SavePath=/data/downloads/complete|Downloads\\SavePath=/downloads/complete|g' "$PROFILE_PATH/qBittorrent/config/qBittorrent.conf"
    sed -i 's|Downloads\\DefaultSavePath=/data/downloads/complete|Downloads\\DefaultSavePath=/downloads/complete|g' "$PROFILE_PATH/qBittorrent/config/qBittorrent.conf"
    sed -i 's|Downloads\\TempPath=/data/downloads/incomplete|Downloads\\TempPath=/downloads/incomplete|g' "$PROFILE_PATH/qBittorrent/config/qBittorrent.conf"

    # Ensure configuration is writable for qBittorrent
    echo "Ensuring configuration is writable..."
    chmod 644 "$PROFILE_PATH/qBittorrent/qBittorrent.conf"
    chmod 644 "$PROFILE_PATH/qBittorrent/config/qBittorrent.conf"

    # Create marker file to indicate configuration has been initialized
    touch "$FIRST_RUN_MARKER"
    echo "✓ First-run configuration complete - marker file created"
else
    if [ -f "$FIRST_RUN_MARKER" ]; then
        echo "Configuration already initialized - preserving existing user settings"
    else
        echo "Template not found - skipping configuration initialization"
    fi
fi

# Start qBittorrent and capture output
echo "Starting qBittorrent..."
/usr/bin/qbittorrent-nox --profile="$PROFILE_PATH" --webui-port="$WEBUI_PORT" --confirm-legal-notice 2>&1 | tee "$LOG_FILE" &
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

# Only fix download paths on first run to avoid overwriting user settings
if [ ! -f "$FIRST_RUN_MARKER" ]; then
    echo "First run - ensuring download paths are correct..."
    sleep 5

    echo "Fixing download paths in all config files..."

    # Fix main config file
    if [ -f "$PROFILE_PATH/qBittorrent/qBittorrent.conf" ]; then
        echo "Updating main config file..."
        # Remove any existing download path settings
        sed -i '/^Session\\DefaultSavePath=/d' "$PROFILE_PATH/qBittorrent/qBittorrent.conf"
        sed -i '/^Session\\SavePath=/d' "$PROFILE_PATH/qBittorrent/qBittorrent.conf"
        sed -i '/^Session\\TempPath=/d' "$PROFILE_PATH/qBittorrent/qBittorrent.conf"
        sed -i '/^Downloads\\SavePath=/d' "$PROFILE_PATH/qBittorrent/qBittorrent.conf"
        sed -i '/^Downloads\\DefaultSavePath=/d' "$PROFILE_PATH/qBittorrent/qBittorrent.conf"
        sed -i '/^Downloads\\TempPath=/d' "$PROFILE_PATH/qBittorrent/qBittorrent.conf"

        # Add correct download paths to BitTorrent section
        sed -i '/^\[BitTorrent\]/a Session\\DefaultSavePath=/downloads/complete\nSession\\SavePath=/downloads/complete\nSession\\TempPath=/downloads/incomplete' "$PROFILE_PATH/qBittorrent/qBittorrent.conf"

        # Add correct download paths to Preferences section
        sed -i '/^\[Preferences\]/a Downloads\\SavePath=/downloads/complete\nDownloads\\DefaultSavePath=/downloads/complete\nDownloads\\TempPath=/downloads/incomplete\nDownloads\\TempPathEnabled=true' "$PROFILE_PATH/qBittorrent/qBittorrent.conf"
    fi

    # Fix runtime config file (this is the key one that was being ignored)
    if [ -f "$PROFILE_PATH/qBittorrent/config/qBittorrent.conf" ]; then
        echo "Updating runtime config file..."
        # Create a new runtime config with correct paths
        cat > "$PROFILE_PATH/qBittorrent/config/qBittorrent.conf" << 'EOF'
[BitTorrent]
Session\Port=43117
Session\QueueingSystemEnabled=false
Session\SSL\Port=21077
Session\DefaultSavePath=/downloads/complete
Session\SavePath=/downloads/complete
Session\TempPath=/downloads/incomplete

[Meta]
MigrationVersion=8

[Preferences]
WebUI\AuthSubnetWhitelist=0.0.0.0/0, ::/0
WebUI\AuthSubnetWhitelistEnabled=true
WebUI\LocalHostAuth=false
WebUI\Port=8081
Downloads\SavePath=/downloads/complete
Downloads\DefaultSavePath=/downloads/complete
Downloads\TempPath=/downloads/incomplete
Downloads\TempPathEnabled=true
EOF
        echo "✓ Runtime config updated with correct download paths"
    fi

    echo "✓ Download paths fixed in all config files"
else
    echo "Configuration already initialized - skipping download path fixes to preserve user settings"
fi

# Fix category paths for proper media organization (only on first run)
if [ ! -f "$FIRST_RUN_MARKER" ] && [ -f "/scripts/fix-qbittorrent-category-paths.sh" ]; then
    echo "First run - fixing qBittorrent category paths for media organization..."
    /scripts/fix-qbittorrent-category-paths.sh "localhost" "$WEBUI_PORT" 30 >> "$LOG_FILE" 2>&1 &
    FIX_PID=$!
    echo "Category path fix running in background (PID: $FIX_PID)"
else
    if [ -f "$FIRST_RUN_MARKER" ]; then
        echo "Configuration already initialized - skipping category path fixes to preserve user settings"
    else
        echo "⚠ Category path fix script not found"
    fi
fi

# Clean up log file after script has access to it
sleep 2
rm -f "$LOG_FILE"

echo "=== qBittorrent is running ==="
echo "WebUI accessible at: http://localhost:${WEBUI_PORT}"

# Keep qBittorrent running
wait $QBIT_PID