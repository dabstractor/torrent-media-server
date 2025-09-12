#!/bin/bash
# PIA Port Forwarding Script
# Handles port forwarding setup and Transmission integration

set -e

# Configuration paths
CONFIG_DIR="/config"
PIA_DIR="/config/pia"

# PIA port forwarding endpoints
PIA_PORT_URL="https://209.222.18.222:19999/getSignature"
PIA_BIND_URL="https://209.222.18.222:19999/bindPort"

# Logging functions
log_info() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1" >&2; }
log_warn() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] WARN: $1" >&2; }
log_error() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2; }

# Check if port forwarding is enabled
check_port_forwarding_enabled() {
    if [[ "${PORT_FORWARDING:-1}" != "1" ]]; then
        log_info "Port forwarding is disabled"
        return 1
    fi
    return 0
}

# Get PIA authentication token
get_token() {
    if [[ ! -f "$PIA_DIR/auth.json" ]]; then
        log_error "PIA authentication token not found"
        return 1
    fi
    
    local token
    token=$(jq -r '.token // empty' "$PIA_DIR/auth.json" 2>/dev/null)
    
    if [[ -z "$token" || "$token" == "null" ]]; then
        log_error "Invalid or missing authentication token"
        return 1
    fi
    
    echo "$token"
    return 0
}

# Request port forwarding from PIA
request_port_forwarding() {
    local token
    if ! token=$(get_token); then
        return 1
    fi
    
    log_info "Requesting port forwarding from PIA"
    
    local response
    response=$(curl -s -G "$PIA_PORT_URL" \
        --data-urlencode "token=$token" \
        --cacert "$PIA_DIR/ca.rsa.4096.crt" 2>/dev/null)
    
    if [[ -z "$response" ]]; then
        log_error "No response from PIA port forwarding service"
        return 1
    fi
    
    local status
    status=$(echo "$response" | jq -r '.status // "error"')
    
    if [[ "$status" != "OK" ]]; then
        log_error "Port forwarding request failed: $response"
        return 1
    fi
    
    local port
    port=$(echo "$response" | jq -r '.port // empty')
    
    if [[ -z "$port" || "$port" == "null" ]]; then
        log_error "No port received from PIA: $response"
        return 1
    fi
    
    local signature
    signature=$(echo "$response" | jq -r '.signature // empty')
    
    # Store port forwarding information
    echo "$port" > "$PIA_DIR/forwarded_port"
    echo "$response" > "$PIA_DIR/port_forward_response.json"
    
    log_info "Port forwarding granted: port $port"
    
    # Bind the port to keep it active
    bind_port "$token" "$port" "$signature"
}

# Bind port to keep port forwarding active
bind_port() {
    local token="$1"
    local port="$2"
    local signature="$3"
    
    log_info "Binding port $port to keep forwarding active"
    
    local payload
    payload=$(echo -n "${port}${token}" | sha256sum | cut -d' ' -f1)
    
    local bind_response
    bind_response=$(curl -s -G "$PIA_BIND_URL" \
        --data-urlencode "port=$port" \
        --data-urlencode "token=$token" \
        --data-urlencode "signature=$signature" \
        --data-urlencode "payload=$payload" \
        --cacert "$PIA_DIR/ca.rsa.4096.crt" 2>/dev/null)
    
    local bind_status
    bind_status=$(echo "$bind_response" | jq -r '.status // "error"')
    
    if [[ "$bind_status" == "OK" ]]; then
        log_info "Port $port successfully bound"
        echo "$bind_response" > "$PIA_DIR/port_bind_response.json"
    else
        log_warn "Port binding failed: $bind_response"
    fi
}

# Configure Transmission to use the forwarded port
configure_transmission() {
    if [[ ! -f "$PIA_DIR/forwarded_port" ]]; then
        log_error "No forwarded port available for Transmission configuration"
        return 1
    fi
    
    local forwarded_port
    forwarded_port=$(cat "$PIA_DIR/forwarded_port")
    
    log_info "Configuring Transmission to use port $forwarded_port"
    
    # Wait for Transmission to be available
    local attempts=0
    while [[ $attempts -lt 30 ]]; do
        if curl -s "http://localhost:9091/transmission/rpc" > /dev/null 2>&1; then
            break
        fi
        log_info "Waiting for Transmission to be available... (attempt $((attempts + 1)))"
        sleep 2
        ((attempts++))
    done
    
    if [[ $attempts -ge 30 ]]; then
        log_error "Transmission not available after 60 seconds"
        return 1
    fi
    
    # Get Transmission session ID
    local session_id
    session_id=$(curl -s "http://localhost:9091/transmission/rpc" 2>&1 | \
        sed -n 's/.*X-Transmission-Session-Id: \([^<]*\).*/\1/p')
    
    if [[ -z "$session_id" ]]; then
        log_error "Failed to get Transmission session ID"
        return 1
    fi
    
    # Configure Transmission peer port
    local transmission_response
    transmission_response=$(curl -s -X POST "http://localhost:9091/transmission/rpc" \
        -H "X-Transmission-Session-Id: $session_id" \
        -H "Content-Type: application/json" \
        -d "{\"method\":\"session-set\",\"arguments\":{\"peer-port\":$forwarded_port}}")
    
    local result
    result=$(echo "$transmission_response" | jq -r '.result // "error"')
    
    if [[ "$result" == "success" ]]; then
        log_info "Transmission configured successfully with port $forwarded_port"
        
        # Store configuration for verification
        echo "{\"port\": $forwarded_port, \"timestamp\": \"$(date -u)\", \"configured\": true}" > \
            "$PIA_DIR/transmission_port_config.json"
    else
        log_error "Failed to configure Transmission: $transmission_response"
        return 1
    fi
}

# Verify port forwarding is working
verify_port_forwarding() {
    if [[ ! -f "$PIA_DIR/forwarded_port" ]]; then
        log_warn "No forwarded port to verify"
        return 0
    fi
    
    local forwarded_port
    forwarded_port=$(cat "$PIA_DIR/forwarded_port")
    
    log_info "Verifying port forwarding on port $forwarded_port"
    
    # Check if port is listening
    if netstat -tulpn 2>/dev/null | grep -q ":${forwarded_port} "; then
        log_info "Port $forwarded_port is listening locally"
    else
        log_warn "Port $forwarded_port is not listening locally"
    fi
    
    return 0
}

# Monitor and maintain port forwarding
monitor_port_forwarding() {
    local token
    if ! token=$(get_token); then
        return 1
    fi
    
    local port
    local signature
    
    if [[ -f "$PIA_DIR/port_forward_response.json" ]]; then
        port=$(jq -r '.port // empty' "$PIA_DIR/port_forward_response.json")
        signature=$(jq -r '.signature // empty' "$PIA_DIR/port_forward_response.json")
        
        if [[ -n "$port" && -n "$signature" && "$port" != "null" && "$signature" != "null" ]]; then
            log_info "Re-binding existing port $port"
            bind_port "$token" "$port" "$signature"
        else
            log_warn "Invalid existing port forwarding data, requesting new port"
            request_port_forwarding
        fi
    else
        log_info "No existing port forwarding, requesting new port"
        request_port_forwarding
    fi
}

# Main execution
main() {
    log_info "Starting PIA port forwarding setup"
    
    if ! check_port_forwarding_enabled; then
        exit 0
    fi
    
    # Initial port forwarding setup
    if ! request_port_forwarding; then
        log_error "Failed to set up port forwarding"
        exit 1
    fi
    
    # Configure Transmission
    if ! configure_transmission; then
        log_warn "Failed to configure Transmission, but port forwarding is active"
    fi
    
    # Verify setup
    verify_port_forwarding
    
    log_info "Port forwarding setup completed"
}

# If script is run with 'monitor' argument, run monitoring loop
if [[ "$1" == "monitor" ]]; then
    log_info "Starting port forwarding monitor"
    while true; do
        monitor_port_forwarding
        sleep 1800  # Re-bind every 30 minutes
    done
else
    main "$@"
fi