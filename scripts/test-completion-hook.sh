#!/bin/bash

# Test script to prove qBittorrent completion hooks work
# This script will be called by qBittorrent when a torrent completes
# It demonstrates file creation/modification on download completion

# Configuration - Use relative paths for testing
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPLETION_LOG="$PROJECT_ROOT/data/downloads/completion-test.log"
COMPLETION_FLAG="$PROJECT_ROOT/data/downloads/.completion-triggered"

# Ensure the directory exists
mkdir -p "$(dirname "$COMPLETION_LOG")"

# qBittorrent provides these environment variables when calling external programs:
# %N - Torrent name
# %L - Category
# %G - Tags (space-separated)
# %F - Content path (same as %R for single file torrents)
# %R - Root path (first torrent subdirectory path)
# %D - Save path
# %C - Number of files
# %Z - Torrent size (bytes)
# %T - Current tracker
# %I - Info hash v1
# %J - Info hash v2
# %K - Torrent ID

# Accept parameters from qBittorrent
TORRENT_NAME="$1"
TORRENT_PATH="$2"
SAVE_PATH="$3"

# Create timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Create completion log entry
echo "=== TORRENT COMPLETION DETECTED ===" >> "$COMPLETION_LOG"
echo "Timestamp: $TIMESTAMP" >> "$COMPLETION_LOG"
echo "Torrent Name: ${TORRENT_NAME:-Unknown}" >> "$COMPLETION_LOG"
echo "Torrent Path: ${TORRENT_PATH:-Unknown}" >> "$COMPLETION_LOG"
echo "Save Path: ${SAVE_PATH:-Unknown}" >> "$COMPLETION_LOG"
echo "Script called with args: $@" >> "$COMPLETION_LOG"
echo "" >> "$COMPLETION_LOG"

# Update completion flag file with latest completion info
cat > "$COMPLETION_FLAG" << EOF
LAST_COMPLETION_TIME=$TIMESTAMP
LAST_TORRENT_NAME=${TORRENT_NAME:-Unknown}
LAST_TORRENT_PATH=${TORRENT_PATH:-Unknown}
LAST_SAVE_PATH=${SAVE_PATH:-Unknown}
COMPLETION_COUNT=$(($(grep -c "TORRENT COMPLETION DETECTED" "$COMPLETION_LOG" 2>/dev/null || echo 0)))
EOF

# Example: Trigger video conversion pipeline
if [[ -f "$TORRENT_PATH" ]] && [[ "$TORRENT_PATH" =~ \.(mkv|mp4|avi|mov|wmv)$ ]]; then
    echo "Video file detected: $TORRENT_PATH" >> "$COMPLETION_LOG"
    echo "VIDEO_CONVERSION_READY=true" >> "$COMPLETION_FLAG"
    
    # Here you would typically call your video conversion service
    # For now, we'll just log the action
    echo "Would trigger video conversion for: $TORRENT_PATH" >> "$COMPLETION_LOG"
fi

# Make script executable and log success
echo "Test completion hook executed successfully" >> "$COMPLETION_LOG"
chmod +x "$0" 2>/dev/null || true

exit 0