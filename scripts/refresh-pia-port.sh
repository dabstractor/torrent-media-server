#!/bin/bash
# Script to refresh PIA port forwarding
# Use when port expires (after 60 days) or if port forwarding stops working

set -e

FORWARDED_PORT_FILE="/tmp/gluetun/forwarded_port"
TRANSMISSION_CONTAINER="transmission"
VPN_CONTAINER="vpn"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Get current forwarded port from inside VPN container
get_current_port() {
    docker exec "$VPN_CONTAINER" cat "$FORWARDED_PORT_FILE" 2>/dev/null || echo "0"
}

# Get Transmission current peer port
get_transmission_port() {
    docker exec "$TRANSMISSION_CONTAINER" cat /config/settings.json 2>/dev/null | \
        grep -oP '"peer-port":\s*\K\d+' || echo "0"
}

# Update Transmission peer port
update_transmission_port() {
    local port=$1
    docker exec "$TRANSMISSION_CONTAINER" transmission-remote -p "$port" > /dev/null 2>&1
}

# Test if port is accessible
test_port() {
    local port=$1
    docker exec "$TRANSMISSION_CONTAINER" transmission-remote -pt > /dev/null 2>&1
}

main() {
    log "Starting PIA port refresh process"

    # Check containers are running
    if ! docker ps | grep -q "$VPN_CONTAINER"; then
        log "ERROR: VPN container is not running"
        exit 1
    fi

    if ! docker ps | grep -q "$TRANSMISSION_CONTAINER"; then
        log "ERROR: Transmission container is not running"
        exit 1
    fi

    # Get ports before refresh
    local old_vpn_port=$(get_current_port)
    local old_transmission_port=$(get_transmission_port)

    log "Current VPN forwarded port: $old_vpn_port"
    log "Current Transmission port: $old_transmission_port"

    # Restart VPN container to get new port
    log "Restarting VPN container..."
    docker compose restart vpn

    # Wait for VPN to connect and get new port
    log "Waiting for VPN to connect..."
    local retries=0
    local max_retries=60

    while [ $retries -lt $max_retries ]; do
        sleep 2
        ((retries++))

        if docker exec "$VPN_CONTAINER" cat "$FORWARDED_PORT_FILE" > /dev/null 2>&1; then
            new_port=$(get_current_port)
            if [ "$new_port" != "0" ]; then
                log "VPN connected with port $new_port"
                break
            fi
        fi

        if [ $((retries % 10)) -eq 0 ]; then
            log "Still waiting... ($retries/$max_retries)"
        fi
    done

    # Get new port
    local new_port=$(get_current_port)

    if [ "$new_port" = "0" ]; then
        log "ERROR: Could not get forwarded port after restart"
        exit 1
    fi

    log "New forwarded port: $new_port"

    # Update Transmission if port changed
    if [ "$new_port" != "$old_transmission_port" ]; then
        log "Updating Transmission port from $old_transmission_port to $new_port"
        update_transmission_port "$new_port"

        # Wait a moment for configuration to apply
        sleep 5

        # Test port accessibility
        log "Testing new port accessibility..."
        if test_port "$new_port"; then
            log "✓ Port $new_port is accessible and working"
        else
            log "⚠ Port $new_port may not be accessible from outside"
        fi
    else
        log "Port unchanged ($new_port), no update needed"
    fi

    # Update .env file for persistence
    if [ "$new_port" != "$(grep TRANSMISSION_PORT= .env | cut -d= -f2)" ]; then
        log "Updating TRANSMISSION_PORT in .env file..."
        sed -i "s/^TRANSMISSION_PORT=.*/TRANSMISSION_PORT=$new_port/" .env
    fi

    log "Port refresh completed successfully!"
    log "New port: $new_port (valid for 60 days)"
}

# Run main function
main "$@"