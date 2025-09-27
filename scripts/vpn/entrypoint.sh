#!/bin/bash
# Smart VPN Entrypoint
# Detects VPN provider and delegates to provider-specific setup script

set -e

echo "=== VPN PROVIDER: ${VPN_PROVIDER:-none} ==="

# Provider validation and delegation
case "${VPN_PROVIDER,,}" in  # Convert to lowercase
    "warp"|"cloudflare")
        echo "Starting Cloudflare WARP VPN..."
        exec /scripts/vpn/warp/setup.sh "$@"
        ;;
    "pia"|"privateinternetaccess")
        echo "Starting Private Internet Access VPN..."
        exec /scripts/vpn/pia/setup.sh "$@"
        ;;
    "none"|"")
        echo "VPN disabled - running without VPN protection"
        echo "WARNING: Traffic will not be protected!"
        sleep infinity  # Keep container running
        ;;
    *)
        echo "ERROR: Unknown VPN provider: ${VPN_PROVIDER}"
        echo "Supported providers: warp, pia, none"
        echo "Set VPN_PROVIDER environment variable to one of the supported providers"
        exit 1
        ;;
esac