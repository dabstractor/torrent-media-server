#!/bin/bash

# Custom entrypoint for qBittorrent with authentication bypass and VPN monitoring
# Combines template processing, authentication bypass, and VPN monitoring

echo "[INIT] qBittorrent custom entrypoint starting..."

# Start the internal VPN monitor in the background
echo "[INIT] Starting internal VPN monitor..."
/scripts/qbittorrent-internal-monitor.sh &

# Give the monitor a moment to start
sleep 2

echo "[INIT] Configuration initialization complete"

# Chain to the main wrapper that includes authentication bypass
exec /scripts/qbittorrent-wrapper.sh "$@"