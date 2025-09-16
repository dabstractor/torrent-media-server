#!/bin/bash
# configure-plex-metadata.sh - Ensure Plex metadata is enabled in Sonarr/Radarr

set -euo pipefail

SERVICE_NAME="${1:-sonarr}"
HOST="${2:-localhost}"
PORT="${3:-8989}"

if [ "$SERVICE_NAME" = "sonarr" ]; then
    API_KEY="${SONARR_API_KEY}"
    DEFAULT_PORT="8989"
elif [ "$SERVICE_NAME" = "radarr" ]; then
    API_KEY="${RADARR_API_KEY}"
    DEFAULT_PORT="7878"
else
    echo "Error: SERVICE_NAME must be 'sonarr' or 'radarr'"
    exit 1
fi

PORT="${PORT:-$DEFAULT_PORT}"

echo "=== Configuring Plex Metadata for $SERVICE_NAME ==="

# Function to wait for service API
wait_for_api() {
    local counter=0
    local timeout=30

    while [ $counter -lt $timeout ]; do
        if curl -s -H "X-Api-Key: $API_KEY" "http://$HOST:$PORT/api/v3/system/status" >/dev/null 2>&1; then
            echo "✓ $SERVICE_NAME API is ready"
            return 0
        fi
        sleep 2
        counter=$((counter + 2))
    done

    echo "✗ $SERVICE_NAME API not available after ${timeout}s"
    return 1
}

# Function to configure Plex metadata
configure_plex_metadata() {
    echo "Checking Plex metadata configuration..."

    # Get current metadata providers
    METADATA_PROVIDERS=$(curl -s -H "X-Api-Key: $API_KEY" "http://$HOST:$PORT/api/v3/metadata")

    # Find Plex metadata provider
    PLEX_PROVIDER=$(echo "$METADATA_PROVIDERS" | jq '.[] | select(.implementation == "PlexMetadata")')

    if [ -z "$PLEX_PROVIDER" ] || [ "$PLEX_PROVIDER" = "null" ]; then
        echo "✗ Plex metadata provider not found"
        return 1
    fi

    PLEX_ID=$(echo "$PLEX_PROVIDER" | jq -r '.id')
    PLEX_ENABLED=$(echo "$PLEX_PROVIDER" | jq -r '.enable')

    if [ "$PLEX_ENABLED" = "true" ]; then
        echo "✓ Plex metadata already enabled (ID: $PLEX_ID)"
        return 0
    fi

    # Enable Plex metadata
    echo "Enabling Plex metadata provider..."

    UPDATED_PROVIDER=$(echo "$PLEX_PROVIDER" | jq '.enable = true')

    UPDATE_RESULT=$(curl -s -X PUT \
        -H "X-Api-Key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d "$UPDATED_PROVIDER" \
        "http://$HOST:$PORT/api/v3/metadata/$PLEX_ID")

    if echo "$UPDATE_RESULT" | jq -e '.enable == true' >/dev/null 2>&1; then
        echo "✓ Plex metadata enabled successfully"
        return 0
    else
        echo "✗ Failed to enable Plex metadata"
        return 1
    fi
}

# Main execution
if wait_for_api; then
    configure_plex_metadata
    echo "✓ Plex metadata configuration complete"
else
    echo "✗ Failed to configure Plex metadata - API not available"
    exit 1
fi