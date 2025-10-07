#!/bin/bash
set -e

# Docker-based torrent migration script
# Runs migration in a Python container - no host Python installation required

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

echo "🐳 Running migration in Docker container..."

docker run --rm -i \
  --network host \
  -v "$SCRIPT_DIR:/scripts" \
  -v "$PROJECT_DIR/config:/config" \
  -w /scripts \
  python:3-slim \
  bash -c "pip install -q qbittorrent-api transmission-rpc && python migrate-torrents.py $*"
