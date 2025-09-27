#!/bin/bash
# WARP VPN Provider Setup Script
# Cloudflare WARP-specific initialization and connection management

set -e

echo "=== CLOUDFLARE WARP VPN PROVIDER ==="

# Source the common kill-switch functionality
source /scripts/vpn/common/kill-switch-base.sh

# WARP-specific configuration
VPN_INTERFACE="CloudflareWARP"

# Cloudflare IP ranges for WARP infrastructure
CLOUDFLARE_WARP_IPS="
162.159.192.0/24
162.159.193.0/24
162.159.195.0/24
188.114.97.0/24
188.114.98.0/24
104.16.0.0/13
104.24.0.0/14
172.64.0.0/13
173.245.48.0/20
103.21.244.0/22
103.22.200.0/22
103.31.4.0/22
141.101.64.0/18
108.162.192.0/18
190.93.240.0/20
188.114.96.0/20
197.234.240.0/22
198.41.128.0/17
162.158.0.0/15
131.0.72.0/22
1.1.1.1/32
1.0.0.1/32
"

# Install iptables for kill switch
install_iptables

# Phase 1: Apply pre-connection rules to allow WARP authentication
apply_pre_connection_rules

# Start WARP daemon using the original approach
echo "Setting up WARP daemon..."

# Create tun device if not exist
if [ ! -e /dev/net/tun ]; then
    mkdir -p /dev/net
    mknod /dev/net/tun c 10 200
    chmod 600 /dev/net/tun
fi

# Start dbus
mkdir -p /run/dbus
if [ -f /run/dbus/pid ]; then
    rm /run/dbus/pid
fi
dbus-daemon --config-file=/usr/share/dbus-1/system.conf

# Start the WARP daemon
echo "Starting WARP service daemon..."
warp-svc --accept-tos &
WARP_PID=$!

# Wait for daemon to start
echo "Waiting for WARP daemon to initialize..."
sleep ${WARP_SLEEP:-5}

# Register WARP if not already registered
echo "Checking WARP registration..."
if warp-cli --accept-tos status 2>/dev/null | grep -q 'Registration Missing'; then
    echo "Registering WARP..."
    if [ -n "${WARP_LICENSE_KEY}" ]; then
        echo "Using provided license key..."
        warp-cli --accept-tos registration new --license-key "${WARP_LICENSE_KEY}" || echo "Registration with license failed, trying without..."
    fi

    # Fallback to registration without license key
    warp-cli --accept-tos registration new || echo "Registration failed, continuing anyway..."
fi

# Try to connect WARP
echo "Connecting to WARP..."
timeout 30 bash -c '
    while ! warp-cli --accept-tos connect 2>/dev/null; do
        echo "Retrying WARP connection..."
        sleep 2
    done
'

# Wait for connection to establish
echo "Waiting for WARP connection to establish..."
sleep 15

# Check if connected and apply kill switch
if warp-cli --accept-tos status | grep -q "Connected"; then
    echo "✅ WARP connected successfully"

    # Wait for tunnel interface to be fully established
    echo "Waiting for tunnel interface to be ready..."
    timeout=30
    elapsed=0
    while [[ $elapsed -lt $timeout ]]; do
        if ip link show ${VPN_INTERFACE} >/dev/null 2>&1; then
            echo "✅ ${VPN_INTERFACE} interface is ready"
            break
        fi
        sleep 1
        ((elapsed++))
    done

    if [[ $elapsed -ge $timeout ]]; then
        echo "⚠️  ${VPN_INTERFACE} interface not found, applying basic kill switch"
        VPN_INTERFACE=""
    fi

    # Phase 2: Apply WARP-specific kill switch with Cloudflare IPs after connection
    apply_base_kill_switch "${VPN_INTERFACE}" "${CLOUDFLARE_WARP_IPS}"
else
    echo "⚠️  WARP not connected - applying emergency kill switch"
    apply_emergency_kill_switch
fi

# Start monitoring in background with WARP-specific health check
monitor_connection "warp-cli --accept-tos status | grep -q 'Connected'" "${VPN_INTERFACE}" &

# Keep WARP daemon running
echo "WARP VPN provider setup complete - monitoring active"
wait $WARP_PID