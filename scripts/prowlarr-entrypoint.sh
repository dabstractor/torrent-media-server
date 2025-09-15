#!/bin/bash

# Custom entrypoint for Prowlarr with automatic configuration restoration
CONFIG_DIR="/config"
TEMPLATE_DIR="/templates"

echo "[INIT] Prowlarr custom entrypoint starting..."

# If no database exists, restore from template
if [ ! -f "$CONFIG_DIR/prowlarr.db" ] && [ -f "$TEMPLATE_DIR/prowlarr.db.template" ]; then
    echo "[INIT] Fresh installation - restoring complete configuration..."
    
    # Restore database
    cp "$TEMPLATE_DIR/prowlarr.db.template" "$CONFIG_DIR/prowlarr.db"
    chown 1000:1000 "$CONFIG_DIR/prowlarr.db"
    chmod 644 "$CONFIG_DIR/prowlarr.db"
    
    # Restore config.xml
    if [ -f "$TEMPLATE_DIR/config.xml.template" ]; then
        cp "$TEMPLATE_DIR/config.xml.template" "$CONFIG_DIR/config.xml"
        chown 1000:1000 "$CONFIG_DIR/config.xml"
        chmod 644 "$CONFIG_DIR/config.xml"
    fi
    
    echo "[INIT] Configuration restored successfully!"
    echo "[INIT] Prowlarr configuration includes:"
    echo "[INIT] - Download client: qBittorrent via nginx-proxy:8080"
    echo "[INIT] - Indexer proxies: FlareSolverr for Cloudflare protection"
    echo "[INIT] - Applications can sync indexers and download clients"
fi

echo "[INIT] Starting Prowlarr with original entrypoint..."

# Execute the original LinuxServer.io entrypoint
exec /init "$@"