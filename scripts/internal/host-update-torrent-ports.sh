#!/bin/bash
# Host script to update torrent containers with new port
# Runs on docker-host via VPN container

NEW_PORT=$1
LOG_FILE="/tmp/host-port-update.log"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [HOST-PORT-UPDATE] $1" >> "$LOG_FILE"
}

if [ -z "$NEW_PORT" ]; then
    log "ERROR: No port specified"
    exit 1
fi

log "Updating torrent containers on host with port: $NEW_PORT"

# Update Transmission
if docker exec transmission transmission-remote -p "$NEW_PORT" >/dev/null 2>&1; then
    log "✓ Updated Transmission with port: $NEW_PORT"
else
    log "⚠ Transmission not running or update failed"
fi

# Update qBittorrent
if docker exec qbittorrent qbittorrent-nox --version >/dev/null 2>&1; then
    # Update qBittorrent config directly
    docker exec qbittorrent sed -i "s/^Connection.*PortRange=.*/Connection\\PortRange=$NEW_PORT/" /config/qBittorrent/config/qBittorrent.ini 2>/dev/null || true

    # Also try updating via API if available
    QB_PORT=$(grep QBITTORRENT_PORT= .env 2>/dev/null | cut -d= -f2 || echo "8080")
    if curl -s -X POST -d "json={\"listen_port\":$NEW_PORT}" "http://localhost:$QB_PORT/api/v2/app/setPreferences" -H "Referer: http://localhost:$QB_PORT" >/dev/null 2>&1; then
        log "✓ Updated qBittorrent with port: $NEW_PORT (via API)"
    else
        log "⚠ qBittorrent API update failed"
    fi
else
    log "⚠ qBittorrent not running"
fi

log "Host update complete"