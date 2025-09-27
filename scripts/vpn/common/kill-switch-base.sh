#!/bin/bash
# Provider-Agnostic VPN Kill Switch Base
# Shared kill switch logic that works with any VPN provider

set -e

# Use iptables-legacy consistently for compatibility
IPTABLES="iptables-legacy"

install_iptables() {
    echo "Installing iptables if needed..."

    if command -v apk >/dev/null 2>&1; then
        apk add --no-cache iptables
    elif command -v apt-get >/dev/null 2>&1; then
        export DEBIAN_FRONTEND=noninteractive
        apt-get update && apt-get install -y iptables iputils-ping
    elif command -v yum >/dev/null 2>&1; then
        yum install -y iptables
    elif command -v iptables >/dev/null 2>&1; then
        echo "iptables already available"
    else
        echo "ERROR: Cannot install iptables - unknown package manager"
        exit 1
    fi
}

apply_pre_connection_rules() {
    echo "Applying pre-connection rules - allowing VPN authentication traffic..."

    # Clear any existing rules
    $IPTABLES -F
    $IPTABLES -X 2>/dev/null || true

    # Allow all traffic during VPN establishment phase
    # This is temporary and will be locked down after VPN connects
    $IPTABLES -P INPUT ACCEPT
    $IPTABLES -P OUTPUT ACCEPT
    $IPTABLES -P FORWARD DROP

    echo "✅ Pre-connection rules applied - VPN can authenticate"
}

apply_base_kill_switch() {
    local vpn_interface="${1}"
    local allowed_ips="${2}"

    echo "Applying base kill switch for interface: ${vpn_interface}"

    # Clear existing rules first
    $IPTABLES -F
    $IPTABLES -X 2>/dev/null || true

    # CRITICAL: Set default DROP policies to prevent any leakage
    $IPTABLES -P INPUT DROP
    $IPTABLES -P OUTPUT DROP
    $IPTABLES -P FORWARD DROP

    # Allow loopback traffic only
    $IPTABLES -I INPUT 1 -i lo -j ACCEPT
    $IPTABLES -I OUTPUT 1 -o lo -j ACCEPT

    # Allow traffic within VPN network for nginx-proxy access
    $IPTABLES -I INPUT 1 -s 10.233.0.0/16 -j ACCEPT
    $IPTABLES -I OUTPUT 1 -d 10.233.0.0/16 -j ACCEPT

    # Allow established connections ONLY after policies are set
    $IPTABLES -I INPUT 1 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
    $IPTABLES -I OUTPUT 1 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

    # Allow traffic through VPN tunnel interface (priority rule - insert at top)
    if [ -n "${vpn_interface}" ]; then
        $IPTABLES -I OUTPUT 1 -o "${vpn_interface}" -j ACCEPT 2>/dev/null || true
        $IPTABLES -I INPUT 1 -i "${vpn_interface}" -j ACCEPT 2>/dev/null || true
        echo "✅ VPN interface ${vpn_interface} traffic allowed"
    fi

    # Create provider-specific whitelist chain if IPs provided
    if [ -n "${allowed_ips}" ]; then
        $IPTABLES -N VPN-PROVIDER-ALLOW 2>/dev/null || $IPTABLES -F VPN-PROVIDER-ALLOW

        # Allow provider-specific IPs for initial connection
        for ip in ${allowed_ips}; do
            [ -z "$ip" ] && continue
            $IPTABLES -A VPN-PROVIDER-ALLOW -d "$ip" -j ACCEPT
        done

        # Jump to provider whitelist for new outbound connections
        $IPTABLES -A OUTPUT -m conntrack --ctstate NEW -j VPN-PROVIDER-ALLOW
    fi

    # CRITICAL: Block all other traffic (Docker bridge, etc.)
    $IPTABLES -A OUTPUT -o eth0 -d 0.0.0.0/0 -j DROP 2>/dev/null || true
    $IPTABLES -A OUTPUT -d 172.16.0.0/12 -j DROP 2>/dev/null || true
    $IPTABLES -A OUTPUT -d 192.168.0.0/16 -j DROP 2>/dev/null || true

    # Log blocked traffic for debugging
    $IPTABLES -A OUTPUT -m limit --limit 1/sec -j LOG --log-prefix "VPN-KILLSWITCH: "

    # Final DROP for anything not explicitly allowed
    $IPTABLES -A OUTPUT -j DROP

    echo "✅ Base kill switch activated - VPN tunnel traffic allowed, all else blocked"
}

monitor_connection() {
    local check_command="${1}"
    local vpn_interface="${2}"

    echo "Starting connection monitoring with command: ${check_command}"

    while true; do
        if eval "${check_command}"; then
            # VPN is connected - ensure tunnel rules are active
            if [ -n "${vpn_interface}" ] && ! $IPTABLES -L OUTPUT | grep -q "${vpn_interface}"; then
                $IPTABLES -I OUTPUT 1 -o "${vpn_interface}" -j ACCEPT 2>/dev/null || true
                $IPTABLES -I INPUT 1 -i "${vpn_interface}" -j ACCEPT 2>/dev/null || true
                echo "✅ VPN tunnel traffic re-enabled for ${vpn_interface}"
            fi
        else
            echo "⚠️  VPN disconnected - kill switch protecting"
        fi
        sleep ${VPN_HEALTH_CHECK_INTERVAL:-30}
    done
}

apply_emergency_kill_switch() {
    echo "⚠️  Applying emergency kill switch - VPN not connected"

    # Apply basic protection but allow provider to retry
    $IPTABLES -A OUTPUT -o eth0 -d 0.0.0.0/0 -j DROP 2>/dev/null || true
    $IPTABLES -A OUTPUT -d 172.16.0.0/12 -j DROP 2>/dev/null || true
    $IPTABLES -A OUTPUT -d 192.168.0.0/16 -j DROP 2>/dev/null || true

    echo "✅ Emergency kill switch activated"
}

# Export functions for provider scripts to use
export -f install_iptables
export -f apply_pre_connection_rules
export -f apply_base_kill_switch
export -f monitor_connection
export -f apply_emergency_kill_switch