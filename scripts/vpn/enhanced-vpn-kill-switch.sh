#!/bin/bash
# Enhanced WARP with Kill Switch
# Starts WARP, lets it connect, then applies enhanced kill switch with continuous monitoring

set -e

echo "=== CLOUDFLARE WARP WITH ENHANCED KILL SWITCH ==="

# Install iptables in WARP container
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

apply_kill_switch() {
    echo "Applying enhanced kill switch..."

    # Use iptables-legacy consistently for compatibility
    IPTABLES="iptables-legacy"

    # CRITICAL: Set default DROP policies FIRST to prevent any leakage
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
    $IPTABLES -I OUTPUT 1 -o CloudflareWARP -j ACCEPT 2>/dev/null || true
    $IPTABLES -I INPUT 1 -i CloudflareWARP -j ACCEPT 2>/dev/null || true

    # Create Cloudflare whitelist chain for WARP infrastructure
    $IPTABLES -N CLOUDFLARE-ALLOW 2>/dev/null || $IPTABLES -F CLOUDFLARE-ALLOW

    # Allow ONLY Cloudflare WARP infrastructure for initial connection
    for ip in $CLOUDFLARE_WARP_IPS; do
        [ -z "$ip" ] && continue
        $IPTABLES -A CLOUDFLARE-ALLOW -d "$ip" -j ACCEPT
    done

    # Jump to Cloudflare whitelist for new outbound connections
    $IPTABLES -A OUTPUT -m conntrack --ctstate NEW -j CLOUDFLARE-ALLOW

    # CRITICAL: Block all other traffic (Docker bridge, etc.)
    $IPTABLES -A OUTPUT -o eth0 -d 0.0.0.0/0 -j DROP 2>/dev/null || true
    $IPTABLES -A OUTPUT -d 172.16.0.0/12 -j DROP 2>/dev/null || true
    $IPTABLES -A OUTPUT -d 192.168.0.0/16 -j DROP 2>/dev/null || true

    # Log blocked traffic for debugging
    $IPTABLES -A OUTPUT -m limit --limit 1/sec -j LOG --log-prefix "ENHANCED-KILLSWITCH: "

    # Final DROP for anything not explicitly allowed
    $IPTABLES -A OUTPUT -j DROP

    # Policies already set at the beginning for maximum security

    echo "✅ Enhanced kill switch activated - VPN tunnel traffic allowed, all else blocked"
}

monitor_and_maintain() {
    while true; do
        if warp-cli --accept-tos status | grep -q "Connected"; then
            # VPN is connected - ensure tunnel rules are active
            if ! iptables -L OUTPUT | grep -q CloudflareWARP; then
                iptables -I OUTPUT 1 -o CloudflareWARP -j ACCEPT 2>/dev/null || true
                iptables -I INPUT 1 -i CloudflareWARP -j ACCEPT 2>/dev/null || true
                echo "✅ VPN tunnel traffic allowed"
            fi
        else
            echo "⚠️  VPN disconnected - kill switch protecting"
        fi
        sleep 10
    done
}

# Start WARP daemon in background
echo "Starting WARP daemon..."
/entrypoint.sh &
WARP_PID=$!

# Wait for WARP to start
echo "Waiting for WARP daemon to initialize..."
sleep 30

# Register WARP if not already registered
echo "Checking WARP registration..."
if warp-cli --accept-tos status 2>/dev/null | grep -q 'Registration Missing'; then
    echo "Registering WARP..."
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

# Check if connected
if warp-cli --accept-tos status | grep -q "Connected"; then
    echo "✅ WARP connected successfully"

    # Wait for tunnel interface to be fully established
    echo "Waiting for tunnel interface to be ready..."
    timeout=30
    elapsed=0
    while [[ $elapsed -lt $timeout ]]; do
        if ip link show CloudflareWARP >/dev/null 2>&1; then
            echo "✅ CloudflareWARP interface is ready"
            break
        fi
        sleep 1
        ((elapsed++))
    done

    if [[ $elapsed -ge $timeout ]]; then
        echo "⚠️  CloudflareWARP interface not found, applying basic kill switch"
    fi

    # Apply enhanced kill switch only after WARP is fully connected
    apply_kill_switch
else
    echo "⚠️  WARP not connected - applying emergency kill switch"
    # Apply basic protection but allow WARP to retry
    iptables -A OUTPUT -o eth0 -d 0.0.0.0/0 -j DROP 2>/dev/null || true
    iptables -A OUTPUT -d 172.16.0.0/12 -j DROP 2>/dev/null || true
    iptables -A OUTPUT -d 192.168.0.0/16 -j DROP 2>/dev/null || true
fi

# Start monitoring in background
monitor_and_maintain &

# Keep WARP daemon running
echo "WARP with enhanced kill switch is active"
wait $WARP_PID