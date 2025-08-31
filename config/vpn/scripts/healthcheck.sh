#!/bin/bash
# PIA VPN Health Check Script
# Verifies VPN connectivity, IP verification, and token validity

set -e

# Configuration paths
CONFIG_DIR="/config"
PIA_DIR="/config/pia"

# Logging functions
log_info() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1" >&2; }
log_warn() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] WARN: $1" >&2; }
log_error() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2; }

# Check if WireGuard interface is up
check_wg_interface() {
    if ! ip link show wg0 > /dev/null 2>&1; then
        log_error "WireGuard interface wg0 not found"
        return 1
    fi
    
    if ! ip addr show wg0 | grep -q "inet "; then
        log_error "WireGuard interface wg0 has no IP address"
        return 1
    fi
    
    log_info "WireGuard interface is up and configured"
    return 0
}

# Check if current external IP matches PIA server
check_external_ip() {
    local current_ip
    local expected_ip
    
    # Get current external IP with timeout
    if ! current_ip=$(timeout 10 curl -s ipinfo.io/ip 2>/dev/null); then
        log_error "Failed to get current external IP"
        return 1
    fi
    
    # Get expected PIA server IP
    if [[ ! -f "$PIA_DIR/server_ip" ]]; then
        log_warn "PIA server IP file not found, skipping IP verification"
        return 0
    fi
    
    expected_ip=$(cat "$PIA_DIR/server_ip")
    
    if [[ "$current_ip" != "$expected_ip" ]]; then
        log_error "IP mismatch - Current: $current_ip, Expected: $expected_ip"
        return 1
    fi
    
    log_info "External IP verification passed: $current_ip"
    return 0
}

# Check token validity and expiration
check_token_validity() {
    if [[ ! -f "$PIA_DIR/auth.json" ]]; then
        log_error "PIA authentication token not found"
        return 1
    fi
    
    local token_expires
    local current_time
    local expires_timestamp
    
    # Extract expiration time from token
    if ! token_expires=$(jq -r '.expires_at // empty' "$PIA_DIR/auth.json" 2>/dev/null); then
        log_error "Failed to read token expiration time"
        return 1
    fi
    
    if [[ -z "$token_expires" || "$token_expires" == "null" ]]; then
        log_warn "Token expiration time not found, cannot verify validity"
        return 0
    fi
    
    current_time=$(date -u +%s)
    
    # Convert expiration time to timestamp
    if ! expires_timestamp=$(date -d "$token_expires" +%s 2>/dev/null); then
        log_warn "Invalid token expiration format: $token_expires"
        return 0
    fi
    
    # Check if token expires within 1 hour (3600 seconds)
    local time_until_expiry=$((expires_timestamp - current_time))
    
    if [[ $time_until_expiry -lt 0 ]]; then
        log_error "Token has expired"
        return 1
    elif [[ $time_until_expiry -lt 3600 ]]; then
        log_warn "Token expires soon (in ${time_until_expiry}s), renewal recommended"
    else
        log_info "Token is valid for ${time_until_expiry}s"
    fi
    
    return 0
}

# Check internet connectivity through VPN
check_internet_connectivity() {
    local test_hosts=("1.1.1.1" "8.8.8.8" "9.9.9.9")
    
    for host in "${test_hosts[@]}"; do
        if timeout 5 ping -c 1 "$host" > /dev/null 2>&1; then
            log_info "Internet connectivity verified (pinged $host)"
            return 0
        fi
    done
    
    log_error "No internet connectivity through VPN"
    return 1
}

# Check DNS resolution through VPN
check_dns_resolution() {
    local test_domains=("google.com" "cloudflare.com" "quad9.net")
    
    for domain in "${test_domains[@]}"; do
        if timeout 5 nslookup "$domain" > /dev/null 2>&1; then
            log_info "DNS resolution verified (resolved $domain)"
            return 0
        fi
    done
    
    log_error "DNS resolution failed through VPN"
    return 1
}

# Check if port forwarding is enabled and working
check_port_forwarding() {
    if [[ "${PORT_FORWARDING:-1}" != "1" ]]; then
        log_info "Port forwarding disabled, skipping check"
        return 0
    fi
    
    if [[ -f "$PIA_DIR/forwarded_port" ]]; then
        local forwarded_port
        forwarded_port=$(cat "$PIA_DIR/forwarded_port")
        log_info "Port forwarding enabled on port: $forwarded_port"
    else
        log_warn "Port forwarding enabled but no forwarded port found"
    fi
    
    return 0
}

# Main health check execution
main() {
    local exit_code=0
    
    log_info "Starting PIA VPN health check"
    
    # Run all health checks
    check_wg_interface || exit_code=1
    check_external_ip || exit_code=1
    check_token_validity || exit_code=1
    check_internet_connectivity || exit_code=1
    check_dns_resolution || exit_code=1
    check_port_forwarding || exit_code=1
    
    if [[ $exit_code -eq 0 ]]; then
        log_info "All health checks passed"
    else
        log_error "One or more health checks failed"
    fi
    
    exit $exit_code
}

main "$@"