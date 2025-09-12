#!/bin/bash

# Setup script for VPN container to act as NAT gateway for isolated network
# This script configures routing so isolated containers can only reach internet through VPN

echo "Setting up VPN routing for isolated network..."

# Wait for VPN tunnel to be established
while ! ip link show CloudflareWARP >/dev/null 2>&1; do
    echo "Waiting for VPN tunnel to establish..."
    sleep 2
done

echo "VPN tunnel detected, configuring routing..."

# Enable IP forwarding (should already be enabled via sysctls)
echo 1 > /proc/sys/net/ipv4/ip_forward

# Get the VPN tunnel interface (CloudflareWARP)
VPN_INTERFACE="CloudflareWARP"
ISOLATED_NETWORK="172.28.0.0/16"
ISOLATED_INTERFACE="eth1"

echo "VPN Interface: $VPN_INTERFACE"
echo "Isolated Network: $ISOLATED_NETWORK"
echo "Isolated Interface: $ISOLATED_INTERFACE"

# Install iptables if not available (may fail in restricted containers)
which iptables >/dev/null 2>&1 || {
    echo "iptables not available, trying to install..."
    apk add --no-cache iptables 2>/dev/null || echo "Could not install iptables"
}

# Configure NAT from isolated network through VPN tunnel
if which iptables >/dev/null 2>&1; then
    echo "Configuring iptables NAT rules..."
    
    # Clear any existing rules for our chain
    iptables -t nat -D POSTROUTING -s $ISOLATED_NETWORK -o $VPN_INTERFACE -j MASQUERADE 2>/dev/null || true
    iptables -D FORWARD -i $ISOLATED_INTERFACE -o $VPN_INTERFACE -j ACCEPT 2>/dev/null || true
    iptables -D FORWARD -i $VPN_INTERFACE -o $ISOLATED_INTERFACE -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT 2>/dev/null || true
    
    # Add NAT rule for isolated network traffic through VPN
    iptables -t nat -A POSTROUTING -s $ISOLATED_NETWORK -o $VPN_INTERFACE -j MASQUERADE
    
    # Allow forwarding from isolated network to VPN
    iptables -A FORWARD -i $ISOLATED_INTERFACE -o $VPN_INTERFACE -j ACCEPT
    
    # Allow return traffic
    iptables -A FORWARD -i $VPN_INTERFACE -o $ISOLATED_INTERFACE -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
    
    echo "iptables rules configured successfully"
    iptables -t nat -L POSTROUTING -v
    iptables -L FORWARD -v
else
    echo "WARNING: iptables not available, NAT routing may not work properly"
fi

echo "VPN routing setup complete"