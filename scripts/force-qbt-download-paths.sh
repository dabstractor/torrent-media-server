#!/bin/sh
# force-qbt-download-paths.sh - Force correct download paths in qBittorrent configuration

echo "=== Forcing correct qBittorrent download paths ==="

# Wait for qBittorrent to start and create initial config
sleep 15

# Check if config file exists
if [ ! -f "/config/qBittorrent/qBittorrent.conf" ]; then
    echo "⚠ qBittorrent config file not found, waiting..."
    sleep 10
fi

# Force the correct paths in the configuration
if [ -f "/config/qBittorrent/qBittorrent.conf" ]; then
    echo "Updating qBittorrent configuration..."
    sed -i 's|Session\\DefaultSavePath=/data/downloads/complete|Session\\DefaultSavePath=/downloads/complete|g' /config/qBittorrent/qBittorrent.conf
    sed -i 's|Session\\TempPath=/data/downloads/incomplete|Session\\TempPath=/downloads/incomplete|g' /config/qBittorrent/qBittorrent.conf
    sed -i 's|Downloads\\SavePath=/data/downloads/complete|Downloads\\SavePath=/downloads/complete|g' /config/qBittorrent/qBittorrent.conf
    sed -i 's|Downloads\\TempPath=/data/downloads/incomplete|Downloads\\TempPath=/downloads/incomplete|g' /config/qBittorrent/qBittorrent.conf

    echo "✓ Forced correct download paths in qBittorrent configuration"
else
    echo "⚠ Could not find qBittorrent config file to update"
fi