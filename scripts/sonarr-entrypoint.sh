#!/bin/bash

# Custom entrypoint for Sonarr with automatic configuration restoration and dynamic torrent client selection
CONFIG_DIR="/config"
TEMPLATE_DIR="/templates"

echo "[INIT] Sonarr custom entrypoint starting..."

# Load torrent client selector for dynamic configuration
if [ -f "/scripts/common/torrent-client-selector.sh" ]; then
    source /scripts/common/torrent-client-selector.sh
    torrent_client_selector
else
    echo "[INIT] Warning: torrent-client-selector.sh not found, using defaults"
    export TORRENT_CLIENT_SQL_SUFFIX="qbittorrent"
fi

# Check if database OR config.xml needs restoration
RESTORE_NEEDED=false

if [ ! -f "$CONFIG_DIR/sonarr.db" ]; then
    echo "[INIT] Database missing - restoration needed"
    RESTORE_NEEDED=true
elif [ ! -f "$CONFIG_DIR/config.xml" ] || [ ! -s "$CONFIG_DIR/config.xml" ]; then
    echo "[INIT] Config.xml missing or empty - restoration needed"
    RESTORE_NEEDED=true
fi

if [ "$RESTORE_NEEDED" = true ]; then
    echo "[INIT] Restoring Sonarr configuration from templates..."

    # Restore database if missing - use client-specific SQL template
    if [ ! -f "$CONFIG_DIR/sonarr.db" ]; then
        CLIENT_SQL_TEMPLATE="$TEMPLATE_DIR/sonarr.db.${TORRENT_CLIENT_SQL_SUFFIX}.sql"
        FALLBACK_TEMPLATE="$TEMPLATE_DIR/sonarr.db.template"

        if [ -f "$CLIENT_SQL_TEMPLATE" ]; then
            echo "[INIT] Using client-specific database template: $CLIENT_SQL_TEMPLATE"
            # Create base database first
            if [ -f "$FALLBACK_TEMPLATE" ]; then
                cp "$FALLBACK_TEMPLATE" "$CONFIG_DIR/sonarr.db"
            else
                # Create minimal database if template doesn't exist
                sqlite3 "$CONFIG_DIR/sonarr.db" "CREATE TABLE IF NOT EXISTS Config (Id INTEGER PRIMARY KEY, Key TEXT, Value TEXT);"
            fi

            # Apply client-specific configuration
            sqlite3 "$CONFIG_DIR/sonarr.db" < "$CLIENT_SQL_TEMPLATE"
            echo "[INIT] Applied $TORRENT_CLIENT_NAME configuration"
        elif [ -f "$FALLBACK_TEMPLATE" ]; then
            echo "[INIT] Using fallback template: $FALLBACK_TEMPLATE"
            cp "$FALLBACK_TEMPLATE" "$CONFIG_DIR/sonarr.db"
        else
            echo "[INIT] Error: No database template found"
        fi

        chown 1000:1000 "$CONFIG_DIR/sonarr.db"
        chmod 644 "$CONFIG_DIR/sonarr.db"
        echo "[INIT] Database restored with $TORRENT_CLIENT_NAME configuration"
    fi

    # Always restore config.xml when restoration is needed
    if [ -f "$TEMPLATE_DIR/config.xml.template" ]; then
        # Substitute environment variables in config template using sed
        sed -e "s/\${SONARR_API_KEY}/$SONARR_API_KEY/g" \
            -e "s/\${LOG_LEVEL:-info}/info/g" \
            -e "s/\${SONARR_INSTANCE_NAME:-Sonarr}/Sonarr/g" \
            -e "s/\${AUTH_METHOD:-Forms}/Forms/g" \
            -e "s/\${AUTH_REQUIRED:-DisabledForLocalAddresses}/DisabledForLocalAddresses/g" \
            "$TEMPLATE_DIR/config.xml.template" > "$CONFIG_DIR/config.xml"
        chown 1000:1000 "$CONFIG_DIR/config.xml"
        chmod 644 "$CONFIG_DIR/config.xml"
        echo "[INIT] Config.xml restored from template"
    fi

    # Ensure Plex metadata is enabled in the database
    echo "[INIT] Ensuring Plex metadata is enabled in database..."
    sqlite3 "$CONFIG_DIR/sonarr.db" "UPDATE Metadata SET Enable = 1 WHERE Implementation = 'PlexMetadata';" || {
        echo "[INIT] Warning: Could not enable Plex metadata in database"
    }

    echo "[INIT] Sonarr configuration restored successfully!"
    echo "[INIT] - Root folder: /tv"
    echo "[INIT] - Download client: $TORRENT_CLIENT_NAME via nginx-proxy:$TORRENT_CLIENT_PORT"
    echo "[INIT] - Category: sonarr"
    echo "[INIT] - Indexers synced from Prowlarr"
    echo "[INIT] - Plex metadata enabled"
else
    echo "[INIT] Complete configuration found, no restoration needed"
fi

# Configure media organization (qBittorrent categories) if configuration script exists
if [ -f "/scripts/configure-media-organization.sh" ]; then
    echo "[INIT] Configuring media organization integration..."

    # Wait a moment for Sonarr to be ready
    sleep 5

    # Run the media organization configuration in the background
    # This will set up torrent client categories for proper automation
    (/scripts/configure-media-organization.sh nginx-proxy $TORRENT_CLIENT_PORT 60 &) || {
        echo "[INIT] Warning: Media organization configuration failed - continuing anyway"
    }

    echo "[INIT] Media organization configuration initiated"
else
    echo "[INIT] Media organization script not found - skipping configuration"
fi

# Ensure completed download handling is enabled for automation
if [ -f "/scripts/configure-download-handling.sh" ]; then
    echo "[INIT] Configuring download handling for automation..."

    # Wait for Sonarr to be fully ready
    sleep 10

    # Configure download handling in the background
    (/scripts/configure-download-handling.sh sonarr nginx-proxy $TORRENT_CLIENT_PORT 30 &) || {
        echo "[INIT] Warning: Download handling configuration failed - continuing anyway"
    }

    echo "[INIT] Download handling configuration initiated"
fi

# Ensure Plex metadata is enabled for proper media organization
if [ -f "/scripts/configure-plex-metadata.sh" ]; then
    echo "[INIT] Configuring Plex metadata integration..."

    # Wait for Sonarr to be fully ready
    sleep 15

    # Configure Plex metadata in the background
    (/scripts/configure-plex-metadata.sh sonarr localhost 8989 &) || {
        echo "[INIT] Warning: Plex metadata configuration failed - continuing anyway"
    }

    echo "[INIT] Plex metadata configuration initiated"
fi

# Fix download client configuration (dynamic based on selected client)
if [ -n "$SONARR_API_KEY" ]; then
    echo "[INIT] Configuring $TORRENT_CLIENT_NAME download client..."

    # Wait for Sonarr to be fully ready
    sleep 20

    # Update download client configuration in the background
    (
        sleep 5

        # Build client-specific configuration
        if [ "$TORRENT_CLIENT" = "transmission" ]; then
            CLIENT_CONFIG='{
                "enable": true,
                "protocol": "torrent",
                "priority": 1,
                "removeCompletedDownloads": true,
                "removeFailedDownloads": true,
                "name": "Transmission",
                "fields": [
                    {"name": "host", "value": "nginx-proxy"},
                    {"name": "port", "value": '${TORRENT_CLIENT_PORT}'},
                    {"name": "username", "value": ""},
                    {"name": "password", "value": ""},
                    {"name": "tvCategory", "value": "sonarr"}
                ],
                "implementationName": "Transmission",
                "implementation": "Transmission",
                "configContract": "TransmissionSettings"
            }'
        else
            CLIENT_CONFIG='{
                "enable": true,
                "protocol": "torrent",
                "priority": 1,
                "removeCompletedDownloads": true,
                "removeFailedDownloads": true,
                "name": "qBittorrent",
                "fields": [
                    {"name": "host", "value": "nginx-proxy"},
                    {"name": "port", "value": '${TORRENT_CLIENT_PORT}'},
                    {"name": "username", "value": "admin"},
                    {"name": "password", "value": "adminpass"},
                    {"name": "tvCategory", "value": "sonarr"}
                ],
                "implementationName": "qBittorrent",
                "implementation": "QBittorrent",
                "configContract": "QBittorrentSettings"
            }'
        fi

        # Check if download client exists and matches current configuration
        EXISTING_CLIENTS=$(curl -s -H "X-Api-Key: $SONARR_API_KEY" "http://localhost:8989/api/v3/downloadclient" 2>/dev/null)
        CLIENT_COUNT=$(echo "$EXISTING_CLIENTS" | jq '. | length' 2>/dev/null || echo "0")

        # Determine target implementation based on TORRENT_CLIENT
        if [ "$TORRENT_CLIENT" = "transmission" ]; then
            TARGET_IMPL="Transmission"
        else
            TARGET_IMPL="QBittorrent"
        fi

        if [ "$CLIENT_COUNT" -eq 0 ]; then
            # No download client exists, create new one with POST
            curl -s -X POST "http://localhost:8989/api/v3/downloadclient" \
                -H "X-Api-Key: $SONARR_API_KEY" \
                -H "Content-Type: application/json" \
                -d "$CLIENT_CONFIG" > /dev/null 2>&1
            echo "[INIT] $TORRENT_CLIENT_NAME download client created"
        else
            # Check if existing client matches the target implementation
            FIRST_CLIENT_ID=$(echo "$EXISTING_CLIENTS" | jq '.[0].id' 2>/dev/null || echo "1")
            EXISTING_IMPL=$(echo "$EXISTING_CLIENTS" | jq -r '.[0].implementation' 2>/dev/null || echo "")

            if [ "$EXISTING_IMPL" = "$TARGET_IMPL" ]; then
                # Same implementation, update it with PUT
                curl -s -X PUT "http://localhost:8989/api/v3/downloadclient/$FIRST_CLIENT_ID" \
                    -H "X-Api-Key: $SONARR_API_KEY" \
                    -H "Content-Type: application/json" \
                    -d "$(echo "$CLIENT_CONFIG" | jq ". + {id: $FIRST_CLIENT_ID}")" > /dev/null 2>&1
                echo "[INIT] $TORRENT_CLIENT_NAME download client updated"
            else
                # Different implementation, delete old and create new
                curl -s -X DELETE "http://localhost:8989/api/v3/downloadclient/$FIRST_CLIENT_ID" \
                    -H "X-Api-Key: $SONARR_API_KEY" > /dev/null 2>&1
                sleep 2
                curl -s -X POST "http://localhost:8989/api/v3/downloadclient" \
                    -H "X-Api-Key: $SONARR_API_KEY" \
                    -H "Content-Type: application/json" \
                    -d "$CLIENT_CONFIG" > /dev/null 2>&1
                echo "[INIT] $TORRENT_CLIENT_NAME download client replaced (was $EXISTING_IMPL)"
            fi
        fi
    ) &

    echo "[INIT] $TORRENT_CLIENT_NAME configuration initiated"
fi

echo "[INIT] Starting Sonarr with original entrypoint..."

# Execute the original LinuxServer.io entrypoint
exec /init "$@"