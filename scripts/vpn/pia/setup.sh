#!/bin/bash
# PIA VPN Provider Setup Script
# Private Internet Access has built-in kill-switch, just start it

set -e

echo "=== PRIVATE INTERNET ACCESS VPN PROVIDER ==="

# Check required PIA credentials
if [ -z "${USER}" ] || [ -z "${PASS}" ]; then
    echo "ERROR: PIA credentials not provided"
    echo "Required: USER and PASS environment variables"
    exit 1
fi

echo "PIA credentials validated"

# Start PIA's original entrypoint - it handles everything including kill-switch
echo "Starting PIA WireGuard with built-in kill-switch..."
if [ -f "/scripts/run" ]; then
    exec /sbin/tini -- /scripts/run
elif [ -f "/sbin/init" ]; then
    exec /sbin/init
elif [ -f "/entrypoint.sh" ]; then
    exec /entrypoint.sh
elif [ -f "/init" ]; then
    exec /init
else
    echo "ERROR: PIA container entrypoint not found"
    exit 1
fi