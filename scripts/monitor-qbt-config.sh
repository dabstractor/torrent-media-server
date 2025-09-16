#!/bin/sh
# monitor-qbt-config.sh - Monitor qBittorrent configuration changes

echo "=== Monitoring qBittorrent configuration changes ==="

CONFIG_FILE="/config/qBittorrent/qBittorrent.conf"

# Wait for config file to exist
while [ ! -f "$CONFIG_FILE" ]; do
    echo "Waiting for config file to be created..."
    sleep 5
done

echo "Config file found. Monitoring for changes..."

# Initial check
echo "Initial config:"
grep -E "(SavePath|TempPath)" "$CONFIG_FILE"

# Monitor for changes
while true; do
    sleep 10
    echo "Checking for changes..."
    CURRENT_SAVE_PATH=$(grep "Session\\\\DefaultSavePath" "$CONFIG_FILE" | cut -d'=' -f2)
    if [ "$CURRENT_SAVE_PATH" != "/downloads/complete" ]; then
        echo "Configuration changed! Current SavePath: $CURRENT_SAVE_PATH"
        echo "Full config:"
        grep -E "(SavePath|TempPath)" "$CONFIG_FILE"
    fi
done