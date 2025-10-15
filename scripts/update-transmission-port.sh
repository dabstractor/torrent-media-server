#!/bin/bash
# Script to update Transmission peer port with Gluetun forwarded port
# This ensures Transmission always uses the port forwarded by PIA

FORWARDED_PORT_FILE="/tmp/gluetun/forwarded_port"
TRANSMISSION_RPC_URL="http://localhost:9091/transmission/rpc"
MAX_RETRIES=30
RETRY_INTERVAL=5

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Wait for forwarded port file to exist
wait_for_port_file() {
    local retries=0
    while [ ! -f "$FORWARDED_PORT_FILE" ] && [ $retries -lt $MAX_RETRIES ]; do
        log "Waiting for forwarded port file... ($((retries + 1))/$MAX_RETRIES)"
        sleep $RETRY_INTERVAL
        ((retries++))
    done

    if [ ! -f "$FORWARDED_PORT_FILE" ]; then
        log "ERROR: Forwarded port file not found after $MAX_RETRIES retries"
        exit 1
    fi
}

# Get current forwarded port
get_forwarded_port() {
    if [ -f "$FORWARDED_PORT_FILE" ]; then
        cat "$FORWARDED_PORT_FILE"
    else
        echo "0"
    fi
}

# Get Transmission session ID
get_session_id() {
    curl -s -I "$TRANSMISSION_RPC_URL" | grep -i "X-Transmission-Session-Id" | cut -d' ' -f2 | tr -d '\r\n'
}

# Update Transmission peer port
update_transmission_port() {
    local port=$1
    local session_id=$(get_session_id)

    if [ -z "$session_id" ]; then
        log "ERROR: Could not get Transmission session ID"
        return 1
    fi

    local response=$(curl -s -H "X-Transmission-Session-Id: $session_id" \
        -H "Content-Type: application/json" \
        -d "{\"arguments\": {\"peer-port\": $port}, \"method\": \"session-set\"}" \
        "$TRANSMISSION_RPC_URL")

    if echo "$response" | grep -q '"result": "success"'; then
        log "Successfully updated Transmission peer port to $port"
        return 0
    else
        log "ERROR: Failed to update Transmission port: $response"
        return 1
    fi
}

# Test if port is open from Transmission's perspective
test_port_status() {
    local session_id=$(get_session_id)

    if [ -z "$session_id" ]; then
        return 1
    fi

    local response=$(curl -s -H "X-Transmission-Session-Id: $session_id" \
        -H "Content-Type: application/json" \
        -d '{"arguments": {}, "method": "port-test"}' \
        "$TRANSMISSION_RPC_URL")

    if echo "$response" | grep -q '"port-is-open": true'; then
        return 0
    else
        return 1
    fi
}

# Main execution
main() {
    log "Starting Transmission port update script"

    # Wait for forwarded port file
    wait_for_port_file

    # Get initial port
    local current_port=$(get_forwarded_port)
    log "Forwarded port: $current_port"

    # Wait for Transmission to be ready
    local retries=0
    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -s "$TRANSMISSION_RPC_URL" > /dev/null 2>&1; then
            break
        fi
        log "Waiting for Transmission RPC... ($((retries + 1))/$MAX_RETRIES)"
        sleep $RETRY_INTERVAL
        ((retries++))
    done

    # Update Transmission port
    if update_transmission_port "$current_port"; then
        # Test port status
        sleep 5
        if test_port_status; then
            log "Port $current_port is open and accessible"
        else
            log "WARNING: Port $current_port may not be accessible from outside"
        fi
    else
        log "Failed to update Transmission port"
        exit 1
    fi

    log "Port update completed successfully"
}

# Run main function
main "$@"