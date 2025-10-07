#!/bin/bash
# Automates switching the primary torrent client.
# REQUIRES: Docker (for database operations) + standard Unix tools (grep, sed)

set -e

# --- Configuration ---
ENV_FILE=".env"
COMPOSE_FILE="docker-compose.yml"
SONARR_DB="./config/sonarr/sonarr.db"
RADARR_DB="./config/radarr/radarr.db"
DEPENDENT_SERVICES="sonarr radarr web-ui nginx-proxy"

# --- Validation ---
if [ -z "$1" ] || { [ "$1" != "qbittorrent" ] && [ "$1" != "transmission" ]; }; then
    echo "Usage: $0 [qbittorrent|transmission]"
    exit 1
fi

if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running."
    exit 1
fi

if [ ! -f "$ENV_FILE" ] || [ ! -f "$COMPOSE_FILE" ]; then
    echo "Error: Required files not found."
    exit 1
fi

NEW_CLIENT=$1

# --- Read current state (host tools - universally available) ---
CURRENT_CLIENT=$(grep '^TORRENT_CLIENT=' "$ENV_FILE" | cut -d '=' -f2)

if [ "$CURRENT_CLIENT" = "$NEW_CLIENT" ]; then
    echo "Already using '$NEW_CLIENT'. No changes needed."
    exit 0
fi

echo "Switching from '$CURRENT_CLIENT' to '$NEW_CLIENT'."

# --- Get port values (host tools) ---
QBIT_PORT=$(grep '^NGINX_QBITTORRENT_PORT=' "$ENV_FILE" | cut -d '=' -f2 || echo 8080)
TRANS_PORT=$(grep '^NGINX_TRANSMISSION_PORT=' "$ENV_FILE" | cut -d '=' -f2 || echo 9091)

if [ "$NEW_CLIENT" = "qbittorrent" ]; then
    NEW_PORT="$QBIT_PORT"
    NEW_IMPLEMENTATION="QBittorrent"
else
    NEW_PORT="$TRANS_PORT"
    NEW_IMPLEMENTATION="Transmission"
fi

# --- User Confirmation ---
SERVICES_TO_RESTART="$CURRENT_CLIENT $DEPENDENT_SERVICES"
echo
echo "This will update databases and restart these services:"
for service in $SERVICES_TO_RESTART; do
    echo "  - $service"
done
echo "All other services will remain running."
echo
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# --- Update .env (host tools - universally available) ---
echo "Updating .env..."
sed -i.bak "s/^TORRENT_CLIENT=.*/TORRENT_CLIENT=$NEW_CLIENT/" "$ENV_FILE"
sed -i.bak "s/^COMPOSE_PROFILES=.*/COMPOSE_PROFILES=$NEW_CLIENT/" "$ENV_FILE"
sed -i.bak "s/^NGINX_TORRENT_PORT=.*/NGINX_TORRENT_PORT=$NEW_PORT/" "$ENV_FILE"
rm -f "${ENV_FILE}.bak"
echo "✓ .env updated."

# --- Stop Services ---
echo "Stopping services..."
docker compose stop $SERVICES_TO_RESTART 2>/dev/null || echo "Some services already stopped."

# --- Update Sonarr Database using Docker ---
if [ -f "$SONARR_DB" ]; then
    echo "Updating Sonarr database..."
    docker run --rm -v "$(pwd)/config/sonarr:/db" alpine:latest sh -c "
        apk add --no-cache sqlite > /dev/null 2>&1 && \
        cp /db/sonarr.db /db/sonarr.db.bak && \
        sqlite3 /db/sonarr.db \"UPDATE DownloadClients SET Settings = json_set(Settings, '\$.host', 'nginx-proxy', '\$.port', $NEW_PORT), Implementation = '$NEW_IMPLEMENTATION' WHERE Implementation IN ('QBittorrent', 'Transmission');\""
    echo "✓ Sonarr database updated (backup: sonarr.db.bak)"
else
    echo "⚠ Sonarr database not found."
fi

# --- Update Radarr Database using Docker ---
if [ -f "$RADARR_DB" ]; then
    echo "Updating Radarr database..."
    docker run --rm -v "$(pwd)/config/radarr:/db" alpine:latest sh -c "
        apk add --no-cache sqlite > /dev/null 2>&1 && \
        cp /db/radarr.db /db/radarr.db.bak && \
        sqlite3 /db/radarr.db \"UPDATE DownloadClients SET Settings = json_set(Settings, '\$.host', 'nginx-proxy', '\$.port', $NEW_PORT), Implementation = '$NEW_IMPLEMENTATION' WHERE Implementation IN ('QBittorrent', 'Transmission');\""
    echo "✓ Radarr database updated (backup: radarr.db.bak)"
else
    echo "⚠ Radarr database not found."
fi

# --- Start Services ---
echo "Starting new client and dependent services..."
if docker compose up -d --remove-orphans; then
    echo "✓ Successfully switched to $NEW_CLIENT!"
else
    echo "Error: docker compose up failed."
    exit 1
fi
