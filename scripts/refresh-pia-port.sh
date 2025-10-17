#!/bin/bash
# Script to refresh PIA port forwarding - client-agnostic version
# Use when port expires (after 60 days) or if port forwarding stops working

set -e

# Load environment variables
if [ -f .env ]; then
    # Simple approach: just get TORRENT_CLIENT directly
    TORRENT_CLIENT_FROM_ENV=$(grep "^TORRENT_CLIENT=" .env | cut -d= -f2 | tr -d '"' | tr -d "'" | head -1)
    if [ -n "$TORRENT_CLIENT_FROM_ENV" ]; then
        export TORRENT_CLIENT="$TORRENT_CLIENT_FROM_ENV"
    fi
else
    echo "ERROR: .env file not found"
    exit 1
fi

FORWARDED_PORT_FILE="/tmp/gluetun/forwarded_port"
VPN_CONTAINER="vpn"
TORRENT_CLIENT=${TORRENT_CLIENT:-transmission}

# Determine container name based on client
case "$TORRENT_CLIENT" in
    qbittorrent)
        TORRENT_CONTAINER="qbittorrent"
        ;;
    transmission)
        TORRENT_CONTAINER="transmission"
        ;;
    *)
        echo "ERROR: Unsupported torrent client: $TORRENT_CLIENT"
        exit 1
        ;;
esac

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Get current forwarded port from inside VPN container
get_current_port() {
    docker exec "$VPN_CONTAINER" cat "$FORWARDED_PORT_FILE" 2>/dev/null || echo "0"
}

# Get torrent client current peer port
get_client_port() {
    case "$TORRENT_CLIENT" in
        qbittorrent)
            # qBittorrent uses Session\Port in configuration file
            local port=$(docker exec "$TORRENT_CONTAINER" cat /config/qBittorrent/config/qBittorrent.conf 2>/dev/null | \
                grep '^Session\\Port=' | cut -d= -f2 || echo "0")
            if [ "$port" = "0" ]; then
                # Try the main config file
                port=$(docker exec "$TORRENT_CONTAINER" cat /config/qBittorrent/qBittorrent.conf 2>/dev/null | \
                    grep '^Session\\Port=' | cut -d= -f2 || echo "0")
            fi
            echo "$port"
            ;;
        transmission)
            # Transmission uses JSON settings
            docker exec "$TORRENT_CONTAINER" cat /config/settings.json 2>/dev/null | \
                grep -oP '"peer-port":\s*\K\d+' || echo "0"
            ;;
    esac
}

# Update torrent client peer port
update_client_port() {
    local port=$1
    case "$TORRENT_CLIENT" in
        qbittorrent)
            # Update qBittorrent configuration by editing config file directly
            # This works when API is not accessible due to network isolation
            local config_file="/config/qBittorrent/config/qBittorrent.conf"

            # Update Session\Port in the configuration file
            docker exec "$TORRENT_CONTAINER" sed -i "s/^Session\\\\Port=.*/Session\\\\Port=$port/" "$config_file"

            # Also try updating the main config file if it exists
            if docker exec "$TORRENT_CONTAINER" test -f "/config/qBittorrent/qBittorrent.conf"; then
                docker exec "$TORRENT_CONTAINER" sed -i "s/^Session\\\\Port=.*/Session\\\\Port=$port/" "/config/qBittorrent/qBittorrent.conf"
            fi

            # Restart qBittorrent container to apply the configuration change
            docker restart "$TORRENT_CONTAINER" > /dev/null 2>&1
            ;;
        transmission)
            # Update Transmission via RPC
            docker exec "$TORRENT_CONTAINER" transmission-remote -p "$port" > /dev/null 2>&1
            ;;
    esac
}

# Test if port is accessible
test_port() {
    case "$TORRENT_CLIENT" in
        qbittorrent)
            # Test if qBittorrent is running and port is set by checking config file
            # Since API is not accessible due to network isolation, we verify the config
            local config_file="/config/qBittorrent/config/qBittorrent.conf"
            local configured_port=$(docker exec "$TORRENT_CONTAINER" grep '^Session\\Port=' "$config_file" 2>/dev/null | cut -d= -f2 || echo "0")

            # Check if qBittorrent process is running
            if docker exec "$TORRENT_CONTAINER" pgrep qbittorrent-nox > /dev/null 2>&1; then
                # Return success if configured port matches expected port
                [ "$configured_port" = "$port" ]
            else
                return 1
            fi
            ;;
        transmission)
            # Use Transmission's built-in port test
            docker exec "$TORRENT_CONTAINER" transmission-remote -pt > /dev/null 2>&1
            ;;
    esac
}

main() {
    log "Starting PIA port refresh process for $TORRENT_CLIENT"

    # Check containers are running
    if ! docker ps | grep -q "$VPN_CONTAINER"; then
        log "ERROR: VPN container is not running"
        exit 1
    fi

    if ! docker ps | grep -q "$TORRENT_CONTAINER"; then
        log "ERROR: $TORRENT_CLIENT container is not running"
        exit 1
    fi

    # Get ports before refresh
    local old_vpn_port=$(get_current_port)
    local old_client_port=$(get_client_port)

    log "Current VPN forwarded port: $old_vpn_port"
    log "Current $TORRENT_CLIENT port: $old_client_port"

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

    # Update torrent client if port changed
    if [ "$new_port" != "$old_client_port" ]; then
        log "Updating $TORRENT_CLIENT port from $old_client_port to $new_port"
        update_client_port "$new_port"

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
    local env_var_name=""
    case "$TORRENT_CLIENT" in
        qbittorrent)
            env_var_name="QBITTORRENT_PEER_PORT"
            ;;
        transmission)
            env_var_name="TRANSMISSION_PORT"
            ;;
    esac

    if [ -n "$env_var_name" ] && [ "$new_port" != "$(grep "^${env_var_name}=" .env | cut -d= -f2)" ]; then
        log "Updating $env_var_name in .env file..."
        sed -i "s/^${env_var_name}=.*/${env_var_name}=$new_port/" .env
    fi

    log "Port refresh completed successfully!"
    log "New port: $new_port (valid for 60 days)"
}

# Run main function
main "$@"