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
    apt-get update && apt-get install -y iptables
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

    # CRITICAL: Default DROP policy (fail-secure)
    iptables -P INPUT DROP
    iptables -P OUTPUT DROP
    iptables -P FORWARD DROP

    # Allow loopback
    iptables -A INPUT -i lo -j ACCEPT
    iptables -A OUTPUT -o lo -j ACCEPT

    # CRITICAL: Block Docker bridge explicitly to prevent leaks
    iptables -A OUTPUT -o eth0 -d 0.0.0.0/0 -j DROP 2>/dev/null || true
    iptables -A OUTPUT -d 172.16.0.0/12 -j DROP 2>/dev/null || true
    iptables -A OUTPUT -d 192.168.0.0/16 -j DROP 2>/dev/null || true

    # Create Cloudflare whitelist chain
    iptables -N CLOUDFLARE-ALLOW 2>/dev/null || iptables -F CLOUDFLARE-ALLOW

    # Allow ONLY Cloudflare WARP infrastructure
    for ip in $CLOUDFLARE_WARP_IPS; do
        [ -z "$ip" ] && continue
        iptables -A CLOUDFLARE-ALLOW -d "$ip" -j ACCEPT
    done

    # Jump to Cloudflare whitelist for outbound connections
    iptables -A OUTPUT -m conntrack --ctstate NEW -j CLOUDFLARE-ALLOW

    # Allow established connections
    iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
    iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

    # Allow traffic through VPN tunnel interface
    iptables -A OUTPUT -o CloudflareWARP -j ACCEPT 2>/dev/null || true
    iptables -A INPUT -i CloudflareWARP -j ACCEPT 2>/dev/null || true

    # Log blocked traffic
    iptables -A OUTPUT -m limit --limit 1/sec -j LOG --log-prefix "ENHANCED-KILLSWITCH: "
    iptables -A OUTPUT -j DROP

    echo "✅ Enhanced kill switch activated"
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
else
    echo "⚠️  WARP not connected, but applying kill switch anyway for security"
fi

# Apply enhanced kill switch
apply_kill_switch

# Start monitoring in background
monitor_and_maintain &

# Keep WARP daemon running
echo "WARP with enhanced kill switch is active"
wait $WARP_PID