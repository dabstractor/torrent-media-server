#!/bin/sh
# fix-qbt-paths-while-running.sh - Fix qBittorrent paths while it's running

echo "=== Fixing qBittorrent paths while running ==="

# Wait for qBittorrent to fully start
sleep 30

# Stop qBittorrent
echo "Stopping qBittorrent..."
pkill -f qbittorrent-nox
sleep 5

# Fix the configuration
echo "Fixing configuration..."
sed -i 's|Session\\DefaultSavePath=/downloads/|Session\\DefaultSavePath=/data/downloads/complete|g' /config/qBittorrent/qBittorrent.conf
sed -i 's|Session\\TempPath=/downloads/incomplete/|Session\\TempPath=/data/downloads/incomplete|g' /config/qBittorrent/qBittorrent.conf
sed -i 's|Downloads\\SavePath=/downloads/|Downloads\\SavePath=/data/downloads/complete|g' /config/qBittorrent/qBittorrent.conf
sed -i 's|Downloads\\TempPath=/downloads/incomplete/|Downloads\\TempPath=/data/downloads/incomplete|g' /config/qBittorrent/qBittorrent.conf

echo "✓ Configuration fixed"

# Restart qBittorrent
echo "Restarting qBittorrent..."
/usr/bin/qbittorrent-nox --profile=/config --webui-port=8081 &

echo "✓ qBittorrent restarted with correct paths"