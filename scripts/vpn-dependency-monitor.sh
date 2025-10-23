#!/bin/bash
# VPN Dependency Monitor - Restarts torrent containers when VPN restarts
# This script monitors the VPN container and restarts dependent containers when VPN changes

CONTAINER_PREFIX="${CONTAINER_PREFIX:-}"
VPN_CONTAINER="${CONTAINER_PREFIX}vpn"
QBITTORRENT_CONTAINER="${CONTAINER_PREFIX}qbittorrent"
TRANSMISSION_CONTAINER="${CONTAINER_PREFIX}transmission"
VPN_START_FILE="/tmp/vpn_start_time"
LOG_FILE="/tmp/vpn-dependency-monitor.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

get_vpn_start_time() {
    docker inspect "$VPN_CONTAINER" --format='{{.State.StartedAt}}' 2>/dev/null || echo ""
}

is_container_running() {
    local container="$1"
    docker inspect "$container" --format='{{.State.Running}}' 2>/dev/null | grep -q "true"
}

restart_container() {
    local container="$1"
    if is_container_running "$container"; then
        log "Restarting $container due to VPN restart"
        docker restart "$container"
        if [ $? -eq 0 ]; then
            log "Successfully restarted $container"
        else
            log "Failed to restart $container"
        fi
    else
        log "Container $container is not running, skipping restart"
    fi
}

# Main monitoring loop
log "VPN Dependency Monitor started"

while true; do
    CURRENT_VPN_START=$(get_vpn_start_time)

    if [ -z "$CURRENT_VPN_START" ]; then
        log "VPN container not found or not accessible, waiting..."
        sleep 30
        continue
    fi

    if [[ -f "$VPN_START_FILE" ]]; then
        SAVED_VPN_START=$(cat "$VPN_START_FILE")
        if [[ "$CURRENT_VPN_START" != "$SAVED_VPN_START" ]]; then
            log "VPN container restarted (old: $SAVED_VPN_START, new: $CURRENT_VPN_START)"

            # Restart torrent containers
            restart_container "$QBITTORRENT_CONTAINER"
            restart_container "$TRANSMISSION_CONTAINER"

            log "VPN dependency restart cycle completed"
        fi
    fi

    echo "$CURRENT_VPN_START" > "$VPN_START_FILE"
    sleep 60  # Check every minute
done