#!/bin/bash

# Custom entrypoint for Prowlarr with automatic configuration restoration and dynamic torrent client selection
CONFIG_DIR="/config"
TEMPLATE_DIR="/templates"

echo "[INIT] Prowlarr custom entrypoint starting..."

# Load torrent client selector for dynamic configuration
if [ -f "/scripts/common/torrent-client-selector.sh" ]; then
    source /scripts/common/torrent-client-selector.sh
    torrent_client_selector
else
    echo "[INIT] Warning: torrent-client-selector.sh not found, using defaults"
    export TORRENT_CLIENT_SQL_SUFFIX="qbittorrent"
fi

# If no database exists, restore from template
if [ ! -f "$CONFIG_DIR/prowlarr.db" ]; then
    echo "[INIT] Fresh installation - restoring complete configuration..."

    # Restore base database
    if [ -f "$TEMPLATE_DIR/prowlarr.db.template" ]; then
        cp "$TEMPLATE_DIR/prowlarr.db.template" "$CONFIG_DIR/prowlarr.db"
    elif [ -f "$TEMPLATE_DIR/complete_database.sql" ]; then
        # Create database from SQL if template doesn't exist
        sqlite3 "$CONFIG_DIR/prowlarr.db" < "$TEMPLATE_DIR/complete_database.sql"
    else
        echo "[INIT] Error: No base database template found"
        exit 1
    fi

    chown 1000:1000 "$CONFIG_DIR/prowlarr.db"
    chmod 644 "$CONFIG_DIR/prowlarr.db"

    # Apply client-specific applications configuration
    CLIENT_APPS_TEMPLATE="$TEMPLATE_DIR/applications.${TORRENT_CLIENT_SQL_SUFFIX}.sql"
    if [ -f "$CLIENT_APPS_TEMPLATE" ]; then
        echo "[INIT] Applying $TORRENT_CLIENT_NAME applications configuration..."
        sqlite3 "$CONFIG_DIR/prowlarr.db" < "$CLIENT_APPS_TEMPLATE"
        echo "[INIT] Applied $TORRENT_CLIENT_NAME download client configuration"
    else
        echo "[INIT] Warning: No client-specific applications template found: $CLIENT_APPS_TEMPLATE"
    fi
    
    # Restore config.xml
    if [ -f "$TEMPLATE_DIR/config.xml.template" ]; then
        cp "$TEMPLATE_DIR/config.xml.template" "$CONFIG_DIR/config.xml"
        chown 1000:1000 "$CONFIG_DIR/config.xml"
        chmod 644 "$CONFIG_DIR/config.xml"
    fi
    
    echo "[INIT] Configuration restored successfully!"
    echo "[INIT] Prowlarr configuration includes:"
    echo "[INIT] - Download client: $TORRENT_CLIENT_NAME via nginx-proxy:$TORRENT_CLIENT_PORT"
    echo "[INIT] - Indexer proxies: FlareSolverr for Cloudflare protection"
    echo "[INIT] - Applications: Sonarr and Radarr sync configured for $TORRENT_CLIENT_NAME"
    echo "[INIT] - Applications can sync indexers and download clients"
fi

echo "[INIT] Starting Prowlarr with original entrypoint..."

# Execute the original LinuxServer.io entrypoint
exec /init "$@"