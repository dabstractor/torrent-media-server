#!/bin/bash
# PIA VPN Provider Setup Script
# Private Internet Access WireGuard-specific initialization and connection management

set -e

echo "=== PRIVATE INTERNET ACCESS VPN PROVIDER ==="

# Source the common kill-switch functionality
source /scripts/vpn/common/kill-switch-base.sh

# Check required PIA credentials
if [ -z "${USER}" ] || [ -z "${PASS}" ]; then
    echo "ERROR: PIA credentials not provided"
    echo "Required: USER and PASS environment variables"
    exit 1
fi

echo "PIA credentials validated"

# Install iptables for kill switch
install_iptables

# Phase 1: Apply pre-connection rules to allow PIA authentication
apply_pre_connection_rules

# PIA container has its own entrypoint that handles WireGuard setup
# We need to start it and then detect the created interface
echo "Starting PIA WireGuard daemon..."

# Start PIA's original entrypoint in background
# The PIA container uses /sbin/tini -- /scripts/run
if [ -f "/scripts/run" ]; then
    /sbin/tini -- /scripts/run &
elif [ -f "/sbin/init" ]; then
    /sbin/init &
elif [ -f "/entrypoint.sh" ]; then
    /entrypoint.sh &
elif [ -f "/init" ]; then
    /init &
else
    echo "ERROR: PIA container entrypoint not found"
    exit 1
fi

PIA_PID=$!

# Wait for PIA to initialize and create WireGuard interface
echo "Waiting for PIA to establish WireGuard connection..."
VPN_INTERFACE=""
timeout=60
elapsed=0

while [[ $elapsed -lt $timeout ]]; do
    # Look for WireGuard interface (typically wg0)
    if interface=$(ip link show | grep -o "wg[0-9]*" | head -1); then
        VPN_INTERFACE="$interface"
        echo "✅ Found PIA WireGuard interface: ${VPN_INTERFACE}"
        break
    fi

    sleep 2
    ((elapsed+=2))
done

if [ -z "${VPN_INTERFACE}" ]; then
    echo "⚠️  PIA WireGuard interface not found, applying emergency kill switch"
    apply_emergency_kill_switch
else
    # Wait a bit more for the connection to fully establish
    echo "Waiting for WireGuard connection to stabilize..."
    sleep 10

    # Phase 2: Apply kill switch with the detected interface after connection
    # PIA doesn't need specific IP whitelisting as WireGuard handles the connection
    apply_base_kill_switch "${VPN_INTERFACE}" ""
fi

# Start monitoring in background with PIA-specific health check
# We'll use curl to check if we have internet access through the VPN
monitor_connection "curl -f --max-time 10 https://ipinfo.io/ip > /dev/null 2>&1" "${VPN_INTERFACE}" &

# Keep PIA daemon running
echo "PIA VPN provider setup complete - monitoring active"
wait $PIA_PID