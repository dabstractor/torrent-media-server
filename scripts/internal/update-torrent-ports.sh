#!/bin/bash
# Update torrent clients with new forwarded port
# Called from VPN container when port changes

NEW_PORT=$1
LOG_FILE="/tmp/port-update.log"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [PORT-UPDATE] $1" >> "$LOG_FILE"
}

if [ -z "$NEW_PORT" ]; then
    # Read from forwarded port file if not provided
    NEW_PORT=$(cat /tmp/gluetun/forwarded_port 2>/dev/null || echo "")
fi

if [ -z "$NEW_PORT" ]; then
    log "ERROR: No port specified"
    exit 1
fi

log "Updating torrent clients with port: $NEW_PORT"

# Update .env file for persistence
if [ -f /workspace/.env ]; then
    sed -i "s/^TRANSMISSION_PORT=.*/TRANSMISSION_PORT=$NEW_PORT/" /workspace/.env
    sed -i "s/^QBITTORRENT_PEER_PORT=.*/QBITTORRENT_PEER_PORT=$NEW_PORT/" /workspace/.env
    log "✓ Updated .env file with port: $NEW_PORT"
fi

# Trigger host script to update containers
if [ -x /scripts/host-update-torrent-ports.sh ]; then
    /scripts/host-update-torrent-ports.sh "$NEW_PORT"
else
    log "Host update script not available - manual restart required"
fi

log "Port update complete"