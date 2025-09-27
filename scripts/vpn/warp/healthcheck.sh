#!/bin/bash
# WARP VPN Provider Health Check
# Verifies Cloudflare WARP connection status

set -e

# Check if WARP is connected
if warp-cli --accept-tos status | grep -q 'Connected'; then
    echo "✅ WARP VPN connection is healthy"
    exit 0
else
    echo "❌ WARP VPN connection failed"
    exit 1
fi