#!/bin/bash
# fix-download-workflow.sh - Fix the download workflow configuration issues

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Fixing Download Workflow Configuration ==="

# Ensure we have API keys
if [ -z "${SONARR_API_KEY:-}" ] || [ -z "${RADARR_API_KEY:-}" ]; then
    echo "Error: SONARR_API_KEY and RADARR_API_KEY environment variables must be set"
    exit 1
fi

echo "Step 1: Fixing qBittorrent categories..."

# Fix qBittorrent categories using API
docker exec plex-organization-qbittorrent curl -s -X POST \
    -d "category=sonarr-tv&savePath=/downloads/complete" \
    "http://localhost:8081/api/v2/torrents/editCategory" || \
docker exec plex-organization-qbittorrent curl -s -X POST \
    -d "category=sonarr-tv&savePath=/downloads/complete" \
    "http://localhost:8081/api/v2/torrents/createCategory"

docker exec plex-organization-qbittorrent curl -s -X POST \
    -d "category=radarr-movies&savePath=/downloads/complete" \
    "http://localhost:8081/api/v2/torrents/editCategory" || \
docker exec plex-organization-qbittorrent curl -s -X POST \
    -d "category=radarr-movies&savePath=/downloads/complete" \
    "http://localhost:8081/api/v2/torrents/createCategory"

echo "✓ qBittorrent categories updated"

echo "Step 2: Fixing Sonarr download client configuration..."

# Get Sonarr download client ID
SONARR_DL_CLIENT_ID=$(docker exec plex-organization-sonarr curl -s -H "X-Api-Key: $SONARR_API_KEY" \
    "http://localhost:8989/api/v3/downloadclient" | \
    jq -r '.[] | select(.implementation == "QBittorrent") | .id')

if [ -n "$SONARR_DL_CLIENT_ID" ] && [ "$SONARR_DL_CLIENT_ID" != "null" ]; then
    # Update existing client
    SONARR_DL_CLIENT=$(docker exec plex-organization-sonarr curl -s -H "X-Api-Key: $SONARR_API_KEY" \
        "http://localhost:8989/api/v3/downloadclient/$SONARR_DL_CLIENT_ID")

    # Update the tvCategory and removeCompletedDownloads fields
    UPDATED_CLIENT=$(echo "$SONARR_DL_CLIENT" | jq '
        (.fields[] | select(.name == "tvCategory") | .value) = "sonarr-tv" |
        (.fields[] | select(.name == "removeCompletedDownloads") | .value) = true
    ')

    docker exec plex-organization-sonarr curl -s -X PUT \
        -H "X-Api-Key: $SONARR_API_KEY" \
        -H "Content-Type: application/json" \
        -d "$UPDATED_CLIENT" \
        "http://localhost:8989/api/v3/downloadclient/$SONARR_DL_CLIENT_ID" > /dev/null

    echo "✓ Sonarr download client updated"
else
    echo "✗ Sonarr qBittorrent download client not found"
fi

echo "Step 3: Fixing Radarr download client configuration..."

# Get Radarr download client ID
RADARR_DL_CLIENT_ID=$(docker exec plex-organization-radarr curl -s -H "X-Api-Key: $RADARR_API_KEY" \
    "http://localhost:7878/api/v3/downloadclient" | \
    jq -r '.[] | select(.implementation == "QBittorrent") | .id')

if [ -n "$RADARR_DL_CLIENT_ID" ] && [ "$RADARR_DL_CLIENT_ID" != "null" ]; then
    # Update existing client
    RADARR_DL_CLIENT=$(docker exec plex-organization-radarr curl -s -H "X-Api-Key: $RADARR_API_KEY" \
        "http://localhost:7878/api/v3/downloadclient/$RADARR_DL_CLIENT_ID")

    # Update the movieCategory and removeCompletedDownloads fields
    UPDATED_CLIENT=$(echo "$RADARR_DL_CLIENT" | jq '
        (.fields[] | select(.name == "movieCategory") | .value) = "radarr-movies" |
        (.fields[] | select(.name == "removeCompletedDownloads") | .value) = true
    ')

    docker exec plex-organization-radarr curl -s -X PUT \
        -H "X-Api-Key: $RADARR_API_KEY" \
        -H "Content-Type: application/json" \
        -d "$UPDATED_CLIENT" \
        "http://localhost:7878/api/v3/downloadclient/$RADARR_DL_CLIENT_ID" > /dev/null

    echo "✓ Radarr download client updated"
else
    echo "✗ Radarr qBittorrent download client not found"
fi

echo "Step 4: Triggering download scans..."

# Trigger download scans to process any existing files
docker exec plex-organization-sonarr curl -s -X POST \
    -H "X-Api-Key: $SONARR_API_KEY" \
    -d '{"name": "DownloadedEpisodesScan"}' \
    "http://localhost:8989/api/v3/command" > /dev/null

docker exec plex-organization-radarr curl -s -X POST \
    -H "X-Api-Key: $RADARR_API_KEY" \
    -d '{"name": "DownloadedMoviesScan"}' \
    "http://localhost:7878/api/v3/command" > /dev/null

echo "✓ Download scans triggered"
echo "✓ Download workflow fixes applied"
echo
echo "Waiting 10 seconds for changes to take effect..."
sleep 10