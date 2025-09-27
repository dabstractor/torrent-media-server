#!/bin/bash
# PIA VPN Provider Health Check
# Verifies PIA WireGuard connection by checking external IP access

set -e

# Check if we can reach external internet through the VPN
if curl -f --max-time 10 https://ipinfo.io/ip > /dev/null 2>&1; then
    echo "✅ PIA VPN connection is healthy"
    exit 0
else
    echo "❌ PIA VPN connection failed"
    exit 1
fi