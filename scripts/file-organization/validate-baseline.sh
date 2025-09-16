#!/bin/bash
# validate-baseline.sh - Document current state before making changes

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASELINE_DIR="$SCRIPT_DIR/baseline"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create baseline directory
mkdir -p "$BASELINE_DIR"

echo "=== Creating Baseline Documentation ==="

# 1. Document container status
echo "Checking container health..."
docker ps --filter name=plex-organization --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" > "$BASELINE_DIR/container_status_$TIMESTAMP.txt"

# 2. Document volume mounts
echo "Documenting volume mounts..."
docker inspect plex-organization-qbittorrent plex-organization-sonarr plex-organization-radarr | \
    jq -r '.[] | .Name + ": " + (.Mounts | map(.Source + " -> " + .Destination) | join(", "))' > "$BASELINE_DIR/volume_mounts_$TIMESTAMP.txt"

# 3. Document current qBittorrent categories
echo "Documenting qBittorrent categories..."
if [ -f "/home/dustin/projects/torrents-plex-organization/config/qbittorrent/qBittorrent/config/categories.json" ]; then
    cp "/home/dustin/projects/torrents-plex-organization/config/qbittorrent/qBittorrent/config/categories.json" "$BASELINE_DIR/qbt_categories_$TIMESTAMP.json"
else
    echo "categories.json not found" > "$BASELINE_DIR/qbt_categories_$TIMESTAMP.json"
fi

# 4. Document Sonarr download clients
echo "Documenting Sonarr download clients..."
if docker exec plex-organization-sonarr curl -s -H "X-Api-Key: $SONARR_API_KEY" "http://localhost:8989/api/v3/downloadclient" 2>/dev/null > "$BASELINE_DIR/sonarr_download_clients_$TIMESTAMP.json"; then
    echo "Sonarr download clients documented"
else
    echo "Failed to get Sonarr download clients" > "$BASELINE_DIR/sonarr_download_clients_$TIMESTAMP.json"
fi

# 5. Document Radarr download clients
echo "Documenting Radarr download clients..."
if docker exec plex-organization-radarr curl -s -H "X-Api-Key: $RADARR_API_KEY" "http://localhost:7878/api/v3/downloadclient" 2>/dev/null > "$BASELINE_DIR/radarr_download_clients_$TIMESTAMP.json"; then
    echo "Radarr download clients documented"
else
    echo "Failed to get Radarr download clients" > "$BASELINE_DIR/radarr_download_clients_$TIMESTAMP.json"
fi

# 6. Document current file structure
echo "Documenting file structure..."
find /home/dustin/projects/torrents-plex-organization/data -type f -name "*.mkv" -o -name "*.mp4" -o -name "*.avi" 2>/dev/null > "$BASELINE_DIR/current_media_files_$TIMESTAMP.txt" || echo "No media files found" > "$BASELINE_DIR/current_media_files_$TIMESTAMP.txt"

# 7. Document directory structure
echo "Documenting directory structure..."
tree /home/dustin/projects/torrents-plex-organization/data 2>/dev/null > "$BASELINE_DIR/directory_structure_$TIMESTAMP.txt" || \
    find /home/dustin/projects/torrents-plex-organization/data -type d | sort > "$BASELINE_DIR/directory_structure_$TIMESTAMP.txt"

echo "✓ Baseline documentation complete in $BASELINE_DIR"
echo "✓ Timestamp: $TIMESTAMP"

# Create symlink to latest baseline
ln -sf "$(basename "$BASELINE_DIR")" "$SCRIPT_DIR/latest-baseline" || true

echo "=== Baseline Summary ==="
echo "Containers: $(docker ps --filter name=plex-organization --format '{{.Names}}' | wc -l) running"
echo "Media files found: $(cat "$BASELINE_DIR/current_media_files_$TIMESTAMP.txt" | wc -l)"
echo "qBittorrent categories: $(if [ -f "$BASELINE_DIR/qbt_categories_$TIMESTAMP.json" ]; then jq -r 'keys | length' "$BASELINE_DIR/qbt_categories_$TIMESTAMP.json" 2>/dev/null || echo "unknown"; else echo "0"; fi)"