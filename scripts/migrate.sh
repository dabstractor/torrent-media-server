#!/bin/bash
set -e

# Docker-based torrent migration script
# Copies torrent files from Transmission container then runs migration

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Default config location
CONFIG_FILE="${SCRIPT_DIR}/config.json"

# Check if config exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Config file not found: $CONFIG_FILE"
    echo ""
    echo "See scripts/TORRENT-MIGRATION.md for setup instructions"
    exit 1
fi

# Create temporary directory for torrent files
TEMP_DIR="${SCRIPT_DIR}/.temp-torrents"
mkdir -p "$TEMP_DIR"

echo "📂 Copying torrent files from Transmission container..."

# Copy torrent files from Transmission container to host
docker cp transmission:/config/torrents/ "$TEMP_DIR/" 2>/dev/null || {
    echo "❌ Could not copy files from Transmission container"
    echo "   Make sure Transmission container is running:"
    echo "   docker-compose ps transmission"
    exit 1
}

echo "✓ Torrent files copied to $TEMP_DIR"

# Update config to use temporary directory (use container path /temp/torrents)
sed 's|/config/torrents|/temp/torrents|g' "$CONFIG_FILE" > "$TEMP_DIR/config.json"

echo "🐳 Running migration in Docker container..."

docker run --rm -i \
  --network host \
  -v "$SCRIPT_DIR:/scripts" \
  -v "$TEMP_DIR:/temp" \
  -w /scripts \
  python:3-slim \
  bash -c "pip install -q qbittorrent-api transmission-rpc && python migrate-torrents.py -c /temp/config.json $*"

# Cleanup
echo "🧹 Cleaning up temporary files..."
rm -rf "$TEMP_DIR"
