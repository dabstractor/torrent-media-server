#!/bin/bash

# Custom entrypoint for Bazarr with automatic post-start configuration
CONFIG_DIR="/config"
CONFIG_FILE="/config/config/config.yaml"  # Bazarr stores config in subdirectory!
TEMPLATE_DIR="/templates"

echo "[INIT] Bazarr custom entrypoint starting..."

# Background configuration function (runs after Bazarr starts)
configure_bazarr_background() {
    echo "[INIT] Starting background configuration task..."

    # Wait for Bazarr to be fully ready
    for i in {1..30}; do
        if curl -s -f http://localhost:6767 > /dev/null 2>&1; then
            echo "[INIT] Bazarr is ready, applying configuration..."
            break
        fi
        sleep 2
    done

    # Check if already configured
    if grep -q "ip: sonarr" "$CONFIG_FILE" 2>/dev/null; then
        echo "[INIT] Bazarr already configured with Sonarr/Radarr"
        return 0
    fi

    # Wait for config.yaml to be populated by Bazarr
    echo "[INIT] Waiting for Bazarr to create config.yaml..."
    for i in {1..60}; do
        if [ -f "$CONFIG_FILE" ] && [ -s "$CONFIG_FILE" ]; then
            if grep -q "general:" "$CONFIG_FILE"; then
                echo "[INIT] config.yaml populated, applying Sonarr/Radarr configuration..."
                break
            fi
        fi
        sleep 2
    done

    # Use dedicated YAML configuration script
    if [ -f "/scripts/configure-bazarr-yaml.sh" ]; then
        /scripts/configure-bazarr-yaml.sh "${SONARR_API_KEY}" "${RADARR_API_KEY}"
    else
        echo "[INIT] ERROR: Configuration script not found!"
        return 1
    fi

    echo "[INIT] Configuration applied - Sonarr: http://sonarr:8989, Radarr: http://radarr:7878"
    echo "[INIT] Settings will be active after container restart"
}

# Start background configuration if this is a fresh install or unconfigured
if [ ! -f "$CONFIG_DIR/.bazarr_configured" ]; then
    (configure_bazarr_background && touch "$CONFIG_DIR/.bazarr_configured") &
    echo "[INIT] Background configuration task started"
fi

echo "[INIT] Starting Bazarr..."

# Execute the original LinuxServer.io entrypoint
exec /init "$@"
