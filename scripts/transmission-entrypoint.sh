#!/bin/bash

# Custom entrypoint for Transmission with template processing and VPN monitoring
# Follows the same pattern as qbittorrent-entrypoint.sh

echo "[INIT] Transmission custom entrypoint starting..."

# Configuration
CONFIG_DIR="/config"
TEMPLATE_DIR="/templates"
FIRST_RUN_MARKER="$CONFIG_DIR/.transmission_config_initialized"

# Ensure download directories exist with correct permissions
echo "[INIT] Ensuring download directories exist..."
mkdir -p /downloads/complete /downloads/incomplete /downloads/watch
chown -R 1000:1000 /downloads 2>/dev/null || true

# Only process configuration template on first run to preserve user settings
if [ -f "$TEMPLATE_DIR/settings.json.template" ] && [ ! -f "$FIRST_RUN_MARKER" ]; then
    echo "[INIT] Processing Transmission configuration template..."
    mkdir -p "$CONFIG_DIR/transmission-daemon"

    # Backup existing config if it exists
    if [ -f "$CONFIG_DIR/transmission-daemon/settings.json" ]; then
        cp "$CONFIG_DIR/transmission-daemon/settings.json" "$CONFIG_DIR/transmission-daemon/settings.json.backup"
        echo "[INIT] ✓ Backed up existing configuration"
    fi

    # Use envsubst to process template with environment variables
    if command -v envsubst >/dev/null 2>&1; then
        envsubst < "$TEMPLATE_DIR/settings.json.template" > "$CONFIG_DIR/transmission-daemon/settings.json"
        echo "[INIT] ✓ Configuration generated from template"
    else
        # Fallback: manual substitution using sed
        echo "[INIT] envsubst not available, using sed for template processing..."
        sed -e "s/\${TRANSMISSION_PORT:-51413}/${TRANSMISSION_PORT:-51413}/g" \
            -e "s/\${TRANSMISSION_RPC_PORT:-9091}/${TRANSMISSION_RPC_PORT:-9091}/g" \
            -e "s/\${TRANSMISSION_USERNAME:-}/${TRANSMISSION_USERNAME:-}/g" \
            -e "s/\${TRANSMISSION_PASSWORD:-}/${TRANSMISSION_PASSWORD:-}/g" \
            "$TEMPLATE_DIR/settings.json.template" > "$CONFIG_DIR/transmission-daemon/settings.json"
        echo "[INIT] ✓ Configuration processed with sed"
    fi

    # Ensure configuration is readable for Transmission
    echo "[INIT] Setting proper permissions..."
    chmod 644 "$CONFIG_DIR/transmission-daemon/settings.json"
    chown 1000:1000 "$CONFIG_DIR/transmission-daemon/settings.json" 2>/dev/null || true

    # Create marker file to indicate configuration has been initialized
    touch "$FIRST_RUN_MARKER"
    echo "[INIT] ✓ First-run configuration complete - marker file created"
else
    if [ -f "$FIRST_RUN_MARKER" ]; then
        echo "[INIT] Configuration already initialized - preserving existing user settings"
    else
        echo "[INIT] Template not found - skipping configuration initialization"
    fi
fi

echo "[INIT] Configuration initialization complete"

# Apply PEERPORT environment variable to settings.json (fix for environment variable not being applied)
# This runs every time the container starts, not just on first run
if [[ -n "$PEERPORT" ]]; then
    echo "[INIT] Updating peer-port to $PEERPORT from environment variable"
    jq --arg peerport "$PEERPORT" '.["peer-port"] = $peerport' /config/transmission-daemon/settings.json > /tmp/settings.json.tmp
    mv /tmp/settings.json.tmp /config/transmission-daemon/settings.json
fi

# Update port from PIA if available (for PIA port forwarding)
if [ "$VPN_SERVICE_PROVIDER" = "private internet access" ] && [ "$VPN_TYPE" = "openvpn" ]; then
    echo "[INIT] Checking for PIA forwarded port..."
    FORWARDED_PORT_FILE="/tmp/gluetun/forwarded_port"

    # Wait up to 30 seconds for forwarded port file
    for i in {1..30}; do
        if [ -f "$FORWARDED_PORT_FILE" ]; then
            PIA_PORT=$(cat "$FORWARDED_PORT_FILE" 2>/dev/null)
            if [ -n "$PIA_PORT" ] && [ "$PIA_PORT" != "0" ]; then
                echo "[INIT] Found PIA forwarded port: $PIA_PORT"
                echo "[INIT] Updating Transmission peer port..."
                export PEERPORT=$PIA_PORT
                break
            fi
        fi
        sleep 1
    done
fi

# Start Transmission daemon using the standard LinuxServer.io entrypoint
echo "[INIT] Starting Transmission with original entrypoint..."

# Execute the original LinuxServer.io entrypoint
exec /init "$@"