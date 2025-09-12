#!/bin/bash
# PIA VPN Connection Script
# Handles PIA authentication, server selection, and WireGuard configuration

set -e

# Configuration paths
CONFIG_DIR="/config"
PIA_DIR="/config/pia"
WG_DIR="/config/wg_confs"

# PIA endpoints
PIA_AUTH_URL="https://privateinternetaccess.com/gtoken/generateToken"
PIA_SERVER_LIST="https://serverlist.piaservers.net/vpninfo/servers/v6"
PIA_CA_CERT_URL="https://raw.githubusercontent.com/pia-foss/manual-connections/master/ca.rsa.4096.crt"

# Logging functions
log_info() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1" >&2; }
log_warn() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] WARN: $1" >&2; }
log_error() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2; }

# Create required directories
mkdir -p "$PIA_DIR" "$WG_DIR"

# Download PIA CA certificate
download_ca_cert() {
    log_info "Downloading PIA CA certificate"
    curl -s "$PIA_CA_CERT_URL" -o "$PIA_DIR/ca.rsa.4096.crt"
}

# Generate WireGuard key pair
generate_keys() {
    log_info "Generating WireGuard key pair"
    local private_key
    private_key=$(wg genkey)
    echo "$private_key" > "$PIA_DIR/private_key"
    echo "$private_key" | wg pubkey > "$PIA_DIR/public_key"
    chmod 600 "$PIA_DIR/private_key"
}

# Authenticate with PIA and get token
authenticate_pia() {
    log_info "Authenticating with PIA"
    
    if [[ -z "$PIA_USER" || -z "$PIA_PASS" ]]; then
        log_error "PIA_USER and PIA_PASS environment variables must be set"
        return 1
    fi
    
    local pubkey
    pubkey=$(cat "$PIA_DIR/public_key")
    
    local response
    response=$(curl -s -u "$PIA_USER:$PIA_PASS" "$PIA_AUTH_URL" --data-urlencode "pubkey=$pubkey")
    
    if echo "$response" | jq -e '.status == "OK"' > /dev/null; then
        echo "$response" > "$PIA_DIR/auth.json"
        log_info "Authentication successful"
        return 0
    else
        log_error "Authentication failed: $response"
        return 1
    fi
}

# Get server list and select best server for region
select_server() {
    log_info "Selecting PIA server for region: ${PIA_REGION:-swiss}"
    
    local server_list
    server_list=$(curl -s "$PIA_SERVER_LIST")
    
    local server_info
    server_info=$(echo "$server_list" | jq -r --arg region "${PIA_REGION:-swiss}" '
        .regions[] | 
        select(.id==$region) | 
        .servers.wg[0] // empty
    ')
    
    if [[ -z "$server_info" ]]; then
        log_error "No WireGuard servers found for region: ${PIA_REGION:-swiss}"
        return 1
    fi
    
    echo "$server_info" > "$PIA_DIR/selected_server.json"
    log_info "Selected server: $(echo "$server_info" | jq -r '.hostname')"
}

# Generate WireGuard configuration
generate_wg_config() {
    log_info "Generating WireGuard configuration"
    
    local token
    token=$(jq -r '.token' "$PIA_DIR/auth.json")
    
    local server_ip
    server_ip=$(jq -r '.ip' "$PIA_DIR/selected_server.json")
    
    local server_pubkey
    server_pubkey=$(jq -r '.pubkey' "$PIA_DIR/selected_server.json")
    
    local server_port
    server_port=$(jq -r '.port' "$PIA_DIR/selected_server.json")
    
    # Get assigned IP from PIA
    local wg_response
    wg_response=$(curl -s -G "https://$server_ip:1337/addKey" \
        --data-urlencode "pt=$token" \
        --data-urlencode "pubkey=$(cat $PIA_DIR/public_key)" \
        --cacert "$PIA_DIR/ca.rsa.4096.crt")
    
    local assigned_ip
    assigned_ip=$(echo "$wg_response" | jq -r '.peer_ip')
    
    if [[ "$assigned_ip" == "null" || -z "$assigned_ip" ]]; then
        log_error "Failed to get assigned IP from PIA: $wg_response"
        return 1
    fi
    
    # Create WireGuard configuration
    cat > "$WG_DIR/wg0.conf" << EOF
[Interface]
PrivateKey = $(cat $PIA_DIR/private_key)
Address = $assigned_ip
DNS = 209.222.18.222, 209.222.18.218

[Peer]
PublicKey = $server_pubkey
AllowedIPs = 0.0.0.0/0
Endpoint = $server_ip:$server_port
PersistentKeepalive = 25
EOF
    
    # Store server IP for health checks
    echo "$server_ip" > "$PIA_DIR/server_ip"
    
    log_info "WireGuard configuration generated successfully"
}

# Main execution
main() {
    log_info "Starting PIA VPN connection process"
    
    download_ca_cert
    generate_keys
    authenticate_pia || exit 1
    select_server || exit 1
    generate_wg_config || exit 1
    
    log_info "PIA VPN configuration completed successfully"
}

main "$@"