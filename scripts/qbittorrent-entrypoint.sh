#!/bin/bash

# Custom entrypoint for qBittorrent with authentication bypass
# Removed VPN monitoring that was causing crashes

echo "[INIT] qBittorrent custom entrypoint starting..."

echo "[INIT] Configuration initialization complete"

# Chain to the main wrapper that includes authentication bypass
exec /scripts/qbittorrent-wrapper.sh "$@"