#!/bin/bash
# qBittorrent Wrapper with Internal Monitor
# Starts the internal monitor in the background and then starts qBittorrent

set -euo pipefail

echo "=== qBittorrent Wrapper with Internal Monitor ==="

# Start the internal monitor in the background
echo "Starting internal monitor..."
/scripts/qbittorrent-internal-monitor.sh &

# Give the monitor a moment to start
sleep 2

# Start qBittorrent
echo "Starting qBittorrent..."
exec /usr/bin/qbittorrent-nox --webui-port=${QBT_WEBUI_PORT:-8080} "$@"