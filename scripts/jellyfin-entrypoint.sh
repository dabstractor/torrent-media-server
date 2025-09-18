#!/bin/bash
set -e

CONFIG_DIR="/config"
TEMPLATE_DIR="/templates"

echo "[INIT] Jellyfin custom entrypoint starting..."

# Ensure config directory exists
mkdir -p "$CONFIG_DIR"

# Check if first run (no existing configuration)
if [ ! -f "$CONFIG_DIR/system.xml" ]; then
    echo "[INIT] First run detected - setting up initial configuration"

    # Create required directories
    mkdir -p "$CONFIG_DIR/data"
    mkdir -p "$CONFIG_DIR/log"
    mkdir -p "$CONFIG_DIR/cache"
    mkdir -p "$CONFIG_DIR/metadata"

    # Copy template to bypass setup wizard
    if [ -f "$TEMPLATE_DIR/system.xml.template" ]; then
        echo "[INIT] Applying system configuration template"
        envsubst < "$TEMPLATE_DIR/system.xml.template" > "$CONFIG_DIR/system.xml"

        # Verify the XML was generated correctly
        if [ ! -s "$CONFIG_DIR/system.xml" ]; then
            echo "[INIT] WARNING: Generated system.xml is empty, using template directly"
            cp "$TEMPLATE_DIR/system.xml.template" "$CONFIG_DIR/system.xml"
        fi

        chown 1000:1000 "$CONFIG_DIR/system.xml"
    else
        echo "[INIT] WARNING: Template not found at $TEMPLATE_DIR/system.xml.template"
    fi

    echo "[INIT] Initial configuration complete"
else
    echo "[INIT] Existing configuration found - skipping setup"
fi

# Set proper permissions
chown -R 1000:1000 "$CONFIG_DIR"

echo "[INIT] Starting Jellyfin..."
# Execute original LinuxServer.io entrypoint
exec /init