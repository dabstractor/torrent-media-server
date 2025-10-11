#!/bin/bash

# Custom entrypoint for Cleanuparr with automatic configuration and torrent client detection
# Follows the established pattern from watchlistarr and sonarr entrypoints

set -e

CONFIG_DIR="/config"
TEMPLATE_DIR="/templates"

echo "[CLEANUPARR-INIT] Cleanuparr custom entrypoint starting..."

# Source torrent client selector for dynamic configuration
if [ -f "/scripts/common/torrent-client-selector.sh" ]; then
    echo "[CLEANUPARR-INIT] Loading torrent client selector..."
    source /scripts/common/torrent-client-selector.sh
    torrent_client_selector
else
    echo "[CLEANUPARR-INIT] Warning: torrent-client-selector.sh not found, using defaults"
    export TORRENT_CLIENT="qbittorrent"
    export TORRENT_CLIENT_NAME="qBittorrent"
    export TORRENT_CLIENT_PORT="8080"
fi

echo "[CLEANUPARR-INIT] Torrent client configuration:"
echo "[CLEANUPARR-INIT]   Client: $TORRENT_CLIENT_NAME"
echo "[CLEANUPARR-INIT]   Port: $TORRENT_CLIENT_PORT"
echo "[CLEANUPARR-INIT]   Access URL: http://vpn:$TORRENT_CLIENT_PORT"

# First-run detection and configuration
if [ ! -f "$CONFIG_DIR/config.json" ]; then
    echo "[CLEANUPARR-INIT] =============================================="
    echo "[CLEANUPARR-INIT] FIRST RUN DETECTED"
    echo "[CLEANUPARR-INIT] =============================================="
    echo "[CLEANUPARR-INIT] Applying Cleanuparr configuration from template..."

    # Ensure config directory exists
    mkdir -p "$CONFIG_DIR"

    # Verify template exists
    if [ ! -f "$TEMPLATE_DIR/config.json.template" ]; then
        echo "[CLEANUPARR-INIT] ERROR: Template file not found at $TEMPLATE_DIR/config.json.template"
        echo "[CLEANUPARR-INIT] Cannot proceed without configuration template"
        exit 1
    fi

    # Export environment variables for template substitution
    export TORRENT_CLIENT_NAME
    export TORRENT_CLIENT
    export TORRENT_CLIENT_PORT

    # Set default values for optional variables
    export QBITTORRENT_USERNAME="${QBITTORRENT_USERNAME:-admin}"
    export QBITTORRENT_PASSWORD="${QBITTORRENT_PASSWORD:-adminpass}"
    export NOTIFIARR_API_KEY="${NOTIFIARR_API_KEY:-}"
    export APPRISE_SERVER_URL="${APPRISE_SERVER_URL:-}"
    export APPRISE_CONFIG_KEY="${APPRISE_CONFIG_KEY:-}"

    echo "[CLEANUPARR-INIT] Processing configuration template with envsubst..."

    # Process template with environment variable substitution
    if command -v envsubst > /dev/null 2>&1; then
        envsubst < "$TEMPLATE_DIR/config.json.template" > "$CONFIG_DIR/config.json"
    else
        echo "[CLEANUPARR-INIT] ERROR: envsubst not found"
        echo "[CLEANUPARR-INIT] Installing gettext package..."

        # Try to install envsubst
        if command -v apt-get > /dev/null 2>&1; then
            apt-get update -qq && apt-get install -y -qq gettext
        elif command -v apk > /dev/null 2>&1; then
            apk add --no-cache gettext
        else
            echo "[CLEANUPARR-INIT] ERROR: Cannot install envsubst - unknown package manager"
            exit 1
        fi

        # Retry template processing
        envsubst < "$TEMPLATE_DIR/config.json.template" > "$CONFIG_DIR/config.json"
    fi

    # Validate generated JSON
    echo "[CLEANUPARR-INIT] Validating generated configuration..."
    if command -v jq > /dev/null 2>&1; then
        if jq empty "$CONFIG_DIR/config.json" 2>/dev/null; then
            echo "[CLEANUPARR-INIT] ✅ Configuration JSON is valid"
        else
            echo "[CLEANUPARR-INIT] ERROR: Generated config.json is invalid JSON"
            echo "[CLEANUPARR-INIT] Displaying generated content for debugging:"
            cat "$CONFIG_DIR/config.json"
            exit 1
        fi
    else
        echo "[CLEANUPARR-INIT] Warning: jq not found, skipping JSON validation"
    fi

    # Set proper permissions
    echo "[CLEANUPARR-INIT] Setting file permissions..."
    chown -R 1000:1000 "$CONFIG_DIR"
    chmod 644 "$CONFIG_DIR/config.json"

    echo "[CLEANUPARR-INIT] =============================================="
    echo "[CLEANUPARR-INIT] CONFIGURATION APPLIED SUCCESSFULLY"
    echo "[CLEANUPARR-INIT] =============================================="
    echo "[CLEANUPARR-INIT] Configuration Summary:"
    echo "[CLEANUPARR-INIT]   - Download Clients: qBittorrent + Transmission (both enabled)"
    echo "[CLEANUPARR-INIT]     • qBittorrent: http://vpn:8080"
    echo "[CLEANUPARR-INIT]     • Transmission: http://vpn:9091"
    echo "[CLEANUPARR-INIT]   - Sonarr: http://sonarr:8989"
    echo "[CLEANUPARR-INIT]   - Radarr: http://radarr:7878"
    echo "[CLEANUPARR-INIT]   - Malware Blocker: ENABLED (community blocklist)"
    echo "[CLEANUPARR-INIT]   - Queue Cleaner: ENABLED (3-strike minimum)"
    echo "[CLEANUPARR-INIT]   - Download Cleaner: ENABLED (2.0 ratio, 30 days)"
    echo "[CLEANUPARR-INIT]   - Dry Run Mode: DISABLED (active cleanup)"
    echo "[CLEANUPARR-INIT] =============================================="
    echo "[CLEANUPARR-INIT]"

    # Initialize database with download clients and *arr apps
    echo "[CLEANUPARR-INIT] Initializing database with download clients and *arr apps..."

    # Start Cleanuparr temporarily to create database schema
    echo "[CLEANUPARR-INIT] Starting Cleanuparr to create database schema..."
    /entrypoint.sh /app/Cleanuparr &
    CLEANUPARR_PID=$!

    # Wait for database to be created (max 30 seconds)
    for i in {1..30}; do
        if [ -f "$CONFIG_DIR/cleanuparr.db" ]; then
            echo "[CLEANUPARR-INIT] Database created successfully"
            break
        fi
        sleep 1
    done

    # Kill the temporary Cleanuparr process
    kill $CLEANUPARR_PID 2>/dev/null || true
    wait $CLEANUPARR_PID 2>/dev/null || true
    sleep 2

    # Check if sqlite3 is available, if not use SQL directly
    if command -v sqlite3 > /dev/null 2>&1; then
        SQLITE_CMD="sqlite3"
    else
        # Install sqlite3
        echo "[CLEANUPARR-INIT] Installing sqlite3..."
        if command -v apt-get > /dev/null 2>&1; then
            apt-get update -qq && apt-get install -y -qq sqlite3
        elif command -v apk > /dev/null 2>&1; then
            apk add --no-cache sqlite
        fi
        SQLITE_CMD="sqlite3"
    fi

    # Generate UUIDs in standard format with dashes (XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX)
    # Cleanuparr expects UUIDs with dashes to match pre-populated arr_configs format
    generate_uuid() {
        cat /dev/urandom | tr -dc 'A-F0-9' | fold -w 32 | head -n 1 | sed 's/\(........\)\(....\)\(....\)\(....\)\(............\)/\1-\2-\3-\4-\5/'
    }

    QBITTORRENT_UUID=$(generate_uuid)
    TRANSMISSION_UUID=$(generate_uuid)
    SONARR_UUID=$(generate_uuid)
    RADARR_UUID=$(generate_uuid)

    # Get arr_config_ids for Sonarr and Radarr
    SONARR_CONFIG_ID=$($SQLITE_CMD "$CONFIG_DIR/cleanuparr.db" "SELECT id FROM arr_configs WHERE type='sonarr';")
    RADARR_CONFIG_ID=$($SQLITE_CMD "$CONFIG_DIR/cleanuparr.db" "SELECT id FROM arr_configs WHERE type='radarr';")

    # Add BOTH download clients by default
    # Note: type must be numeric enum - 0 = qBittorrent, 1 = Transmission

    echo "[CLEANUPARR-INIT] Adding qBittorrent download client..."
    $SQLITE_CMD "$CONFIG_DIR/cleanuparr.db" <<EOF
INSERT INTO download_clients (id, enabled, name, type_name, type, host, username, password, url_base)
VALUES (
  '$QBITTORRENT_UUID',
  1,
  'qBittorrent',
  'qBittorrent',
  '0',
  'http://vpn:8080',
  NULL,
  NULL,
  NULL
);
EOF

    echo "[CLEANUPARR-INIT] Adding Transmission download client..."
    $SQLITE_CMD "$CONFIG_DIR/cleanuparr.db" <<EOF
INSERT INTO download_clients (id, enabled, name, type_name, type, host, username, password, url_base)
VALUES (
  '$TRANSMISSION_UUID',
  1,
  'Transmission',
  'Transmission',
  '1',
  'http://vpn:9091',
  NULL,
  NULL,
  NULL
);
EOF

    # Insert Sonarr if SONARR_API_KEY is set
    if [ -n "${SONARR_API_KEY}" ]; then
        echo "[CLEANUPARR-INIT] Adding Sonarr..."
        $SQLITE_CMD "$CONFIG_DIR/cleanuparr.db" <<EOF
INSERT INTO arr_instances (id, enabled, arr_config_id, name, url, api_key)
VALUES (
  '$SONARR_UUID',
  1,
  '$SONARR_CONFIG_ID',
  'Sonarr',
  'http://sonarr:8989',
  '$SONARR_API_KEY'
);
EOF
    fi

    # Insert Radarr if RADARR_API_KEY is set
    if [ -n "${RADARR_API_KEY}" ]; then
        echo "[CLEANUPARR-INIT] Adding Radarr..."
        $SQLITE_CMD "$CONFIG_DIR/cleanuparr.db" <<EOF
INSERT INTO arr_instances (id, enabled, arr_config_id, name, url, api_key)
VALUES (
  '$RADARR_UUID',
  1,
  '$RADARR_CONFIG_ID',
  'Radarr',
  'http://radarr:7878',
  '$RADARR_API_KEY'
);
EOF
    fi

    # Verify inserts
    DC_COUNT=$($SQLITE_CMD "$CONFIG_DIR/cleanuparr.db" "SELECT COUNT(*) FROM download_clients;")
    ARR_COUNT=$($SQLITE_CMD "$CONFIG_DIR/cleanuparr.db" "SELECT COUNT(*) FROM arr_instances;")

    echo "[CLEANUPARR-INIT] Database initialization complete:"
    echo "[CLEANUPARR-INIT]   - Download clients: $DC_COUNT"
    echo "[CLEANUPARR-INIT]   - *arr instances: $ARR_COUNT"
    echo "[CLEANUPARR-INIT] =============================================="
    echo "[CLEANUPARR-INIT]"
    echo "[CLEANUPARR-INIT] ⚡ ACTIVE MODE: Cleanuparr will automatically clean downloads"
    echo "[CLEANUPARR-INIT] Malware blocking, queue cleaning, and seeding management are LIVE"
    echo "[CLEANUPARR-INIT] Monitor activity in the web UI: http://localhost:11011"
    echo "[CLEANUPARR-INIT] =============================================="
else
    echo "[CLEANUPARR-INIT] Configuration found, no restoration needed"
    echo "[CLEANUPARR-INIT] Using existing config at: $CONFIG_DIR/config.json"
fi

# Ensure log directory exists
mkdir -p "$CONFIG_DIR/logs"
chown -R 1000:1000 "$CONFIG_DIR"

echo "[CLEANUPARR-INIT] Starting Cleanuparr service..."
echo "[CLEANUPARR-INIT] Web UI will be available at: http://localhost:11011"
echo "[CLEANUPARR-INIT] Health check endpoint: http://localhost:11011/health"

# Execute Cleanuparr's original entrypoint with the Cleanuparr binary
# The original entrypoint handles PUID/PGID setup, then execs to the binary
echo "[CLEANUPARR-INIT] Chaining to original entrypoint: /entrypoint.sh /app/Cleanuparr"
exec /entrypoint.sh /app/Cleanuparr
