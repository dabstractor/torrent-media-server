#!/bin/bash
set -e

CONFIG_DIR="/config"
TEMPLATE_DIR="/templates"

echo "[INIT] Autoscan custom entrypoint starting..."

# Set default values for environment variables if not provided
export AUTOSCAN_WEBHOOK_TOKEN="${AUTOSCAN_WEBHOOK_TOKEN:-autoscan}"
export PLEX_TOKEN="${PLEX_TOKEN:-}"
export JELLYFIN_API_KEY="${JELLYFIN_API_KEY:-}"

# Ensure config directory exists
mkdir -p "$CONFIG_DIR"

# Check if first run (no existing configuration)
if [ ! -f "$CONFIG_DIR/config.json" ]; then
    echo "[INIT] First run detected - setting up initial configuration"

    # Process main configuration template
    if [ -f "$TEMPLATE_DIR/config.json.template" ]; then
        echo "[INIT] Applying autoscan configuration template"
        envsubst < "$TEMPLATE_DIR/config.json.template" > "$CONFIG_DIR/config.json"

        # Verify the JSON was generated correctly
        if [ ! -s "$CONFIG_DIR/config.json" ]; then
            echo "[INIT] WARNING: Generated config.json is empty, using template directly"
            cp "$TEMPLATE_DIR/config.json.template" "$CONFIG_DIR/config.json"
        fi
    else
        echo "[INIT] WARNING: Template not found at $TEMPLATE_DIR/config.json.template"
    fi

    echo "[INIT] Initial configuration complete"
else
    echo "[INIT] Existing configuration found - skipping setup"
fi

# Set proper permissions
chown -R 1000:1000 "$CONFIG_DIR"

# Create anchor file for mount verification
mkdir -p /media
touch /media/.anchor
chown 1000:1000 /media/.anchor

echo "[INIT] Starting Autoscan..."
# Execute the original s6 init system to start autoscan service
exec /init