#!/bin/bash

# Custom entrypoint for Radarr with automatic configuration restoration
CONFIG_DIR="/config"
TEMPLATE_DIR="/templates"

echo "[INIT] Radarr custom entrypoint starting..."

# Check if database OR config.xml needs restoration
RESTORE_NEEDED=false

if [ ! -f "$CONFIG_DIR/radarr.db" ]; then
    echo "[INIT] Database missing - restoration needed"
    RESTORE_NEEDED=true
elif [ ! -f "$CONFIG_DIR/config.xml" ] || [ ! -s "$CONFIG_DIR/config.xml" ]; then
    echo "[INIT] Config.xml missing or empty - restoration needed"
    RESTORE_NEEDED=true
fi

if [ "$RESTORE_NEEDED" = true ] && [ -f "$TEMPLATE_DIR/radarr.db.template" ]; then
    echo "[INIT] Restoring Radarr configuration from templates..."

    # Restore database if missing
    if [ ! -f "$CONFIG_DIR/radarr.db" ]; then
        cp "$TEMPLATE_DIR/radarr.db.template" "$CONFIG_DIR/radarr.db"
        chown 1000:1000 "$CONFIG_DIR/radarr.db"
        chmod 644 "$CONFIG_DIR/radarr.db"
        echo "[INIT] Database restored from template"
    fi

    # Always restore config.xml when restoration is needed
    if [ -f "$TEMPLATE_DIR/config.xml.template" ]; then
        # Substitute environment variables in config template using sed
        sed -e "s/\${RADARR_API_KEY}/$RADARR_API_KEY/g" \
            -e "s/\${LOG_LEVEL:-info}/info/g" \
            -e "s/\${RADARR_INSTANCE_NAME:-Radarr}/Radarr/g" \
            -e "s/\${AUTH_METHOD:-Forms}/Forms/g" \
            -e "s/\${AUTH_REQUIRED:-DisabledForLocalAddresses}/DisabledForLocalAddresses/g" \
            "$TEMPLATE_DIR/config.xml.template" > "$CONFIG_DIR/config.xml"
        chown 1000:1000 "$CONFIG_DIR/config.xml"
        chmod 644 "$CONFIG_DIR/config.xml"
        echo "[INIT] Config.xml restored from template"
    fi

    echo "[INIT] Radarr configuration restored successfully!"
    echo "[INIT] - Root folder: /movies"
    echo "[INIT] - Download client: qBittorrent via nginx-proxy:8080"
    echo "[INIT] - Category: radarr"
    echo "[INIT] - Indexers synced from Prowlarr"
else
    echo "[INIT] Complete configuration found, no restoration needed"
fi

# Configure media organization (qBittorrent categories) if configuration script exists
if [ -f "/scripts/configure-media-organization.sh" ]; then
    echo "[INIT] Configuring media organization integration..."

    # Wait a moment for Radarr to be ready
    sleep 5

    # Run the media organization configuration in the background
    # This will set up qBittorrent categories for proper automation
    (/scripts/configure-media-organization.sh nginx-proxy 8080 60 &) || {
        echo "[INIT] Warning: Media organization configuration failed - continuing anyway"
    }

    echo "[INIT] Media organization configuration initiated"
else
    echo "[INIT] Media organization script not found - skipping configuration"
fi

echo "[INIT] Starting Radarr with original entrypoint..."

# Execute the original LinuxServer.io entrypoint
exec /init "$@"