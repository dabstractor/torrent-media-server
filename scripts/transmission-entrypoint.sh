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

# Start Transmission daemon using the standard LinuxServer.io entrypoint
echo "[INIT] Starting Transmission with original entrypoint..."

# Execute the original LinuxServer.io entrypoint
exec /init "$@"