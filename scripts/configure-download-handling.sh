#!/bin/bash
# configure-download-handling.sh - Ensure Radarr/Sonarr have completed download handling enabled
# This script ensures automation works by enabling RemoveCompletedDownloads

echo "$(date): [DOWNLOAD-HANDLING] Starting download handling configuration..."

# Configuration
SERVICE="${1:-radarr}"
PROXY_HOST="${2:-nginx-proxy}"
PROXY_PORT="${3:-8080}"
TIMEOUT="${4:-30}"
LOG_FILE="/tmp/download_handling_config.log"

# Service-specific settings
if [ "$SERVICE" = "radarr" ]; then
    API_KEY="$RADARR_API_KEY"
    DEFAULT_PORT="7878"
    SERVICE_NAME="Radarr"
elif [ "$SERVICE" = "sonarr" ]; then
    API_KEY="$SONARR_API_KEY"
    DEFAULT_PORT="8989"
    SERVICE_NAME="Sonarr"
else
    echo "$(date): [DOWNLOAD-HANDLING] ERROR: Invalid service '$SERVICE'. Must be 'radarr' or 'sonarr'"
    exit 1
fi

# Function to wait for service API
wait_for_service_api() {
    local host="$1"
    local port="$2"
    local timeout="$3"
    local counter=0

    echo "$(date): [DOWNLOAD-HANDLING] Waiting for $SERVICE_NAME API at $host:$port..." >> "$LOG_FILE"

    while [ $counter -lt $timeout ]; do
        response_code=$(curl -s -m 5 -o /dev/null -w "%{http_code}" \
            -H "X-Api-Key: $API_KEY" \
            "http://${host}:${port}/api/v3/system/status" 2>/dev/null)

        if echo "$response_code" | grep -E "^(200|401|403)$" >/dev/null; then
            echo "$(date): [DOWNLOAD-HANDLING] $SERVICE_NAME API responding with code: $response_code" >> "$LOG_FILE"
            return 0
        fi
        sleep 2
        counter=$((counter + 2))
    done

    echo "$(date): [DOWNLOAD-HANDLING] API timeout waiting for $SERVICE_NAME" >> "$LOG_FILE"
    return 1
}

# Function to get download clients
get_download_clients() {
    local host="$1"
    local port="$2"

    curl -s -m 10 \
        -H "X-Api-Key: $API_KEY" \
        "http://${host}:${port}/api/v3/downloadclient" 2>/dev/null
}

# Function to update download client
update_download_client() {
    local host="$1"
    local port="$2"
    local client_id="$3"
    local client_config="$4"

    echo "$(date): [DOWNLOAD-HANDLING] Updating download client ID $client_id..." >> "$LOG_FILE"

    local response=$(curl -s -m 10 \
        -H "X-Api-Key: $API_KEY" \
        -H "Content-Type: application/json" \
        -X PUT \
        -d "$client_config" \
        "http://${host}:${port}/api/v3/downloadclient/${client_id}" 2>/dev/null)

    echo "$(date): [DOWNLOAD-HANDLING] Update response: $response" >> "$LOG_FILE"
    return 0
}

# Function to configure download handling
configure_download_handling() {
    local host="$1"
    local port="$2"

    echo "$(date): [DOWNLOAD-HANDLING] Configuring $SERVICE_NAME download handling..." >> "$LOG_FILE"

    # Get current download clients
    local clients=$(get_download_clients "$host" "$port")

    if [ -z "$clients" ] || [ "$clients" = "null" ] || [ "$clients" = "[]" ]; then
        echo "$(date): [DOWNLOAD-HANDLING] No download clients found" >> "$LOG_FILE"
        return 1
    fi

    echo "$(date): [DOWNLOAD-HANDLING] Found download clients: $clients" >> "$LOG_FILE"

    # Process each download client
    echo "$clients" | jq -r '.[] | select(.name == "qBittorrent") | @base64' | while read -r client_b64; do
        if [ -n "$client_b64" ]; then
            local client=$(echo "$client_b64" | base64 -d)
            local client_id=$(echo "$client" | jq -r '.id')
            local current_remove_completed=$(echo "$client" | jq -r '.removeCompletedDownloads')

            echo "$(date): [DOWNLOAD-HANDLING] Processing qBittorrent client ID $client_id" >> "$LOG_FILE"
            echo "$(date): [DOWNLOAD-HANDLING] Current removeCompletedDownloads: $current_remove_completed" >> "$LOG_FILE"

            if [ "$current_remove_completed" = "false" ]; then
                echo "$(date): [DOWNLOAD-HANDLING] Enabling completed download handling for client $client_id" >> "$LOG_FILE"

                # Update the client configuration
                local updated_client=$(echo "$client" | jq '.removeCompletedDownloads = true')

                if update_download_client "$host" "$port" "$client_id" "$updated_client"; then
                    echo "✓ Enabled completed download handling for qBittorrent"
                    echo "$(date): [DOWNLOAD-HANDLING] Successfully enabled completed download handling" >> "$LOG_FILE"
                else
                    echo "✗ Failed to update qBittorrent download client"
                    echo "$(date): [DOWNLOAD-HANDLING] Failed to update download client" >> "$LOG_FILE"
                fi
            else
                echo "✓ Completed download handling already enabled for qBittorrent"
                echo "$(date): [DOWNLOAD-HANDLING] Already enabled" >> "$LOG_FILE"
            fi
        fi
    done

    return 0
}

# Function to verify configuration
verify_configuration() {
    local host="$1"
    local port="$2"

    echo "$(date): [DOWNLOAD-HANDLING] Verifying download handling configuration..." >> "$LOG_FILE"

    local clients=$(get_download_clients "$host" "$port")
    local qbt_client=$(echo "$clients" | jq -r '.[] | select(.name == "qBittorrent")')

    if [ -n "$qbt_client" ] && [ "$qbt_client" != "null" ]; then
        local remove_completed=$(echo "$qbt_client" | jq -r '.removeCompletedDownloads')

        if [ "$remove_completed" = "true" ]; then
            echo "✓ Download handling verification successful"
            echo "$(date): [DOWNLOAD-HANDLING] Verification successful" >> "$LOG_FILE"
            return 0
        else
            echo "✗ Download handling verification failed"
            echo "$(date): [DOWNLOAD-HANDLING] Verification failed" >> "$LOG_FILE"
            return 1
        fi
    else
        echo "✗ qBittorrent download client not found"
        echo "$(date): [DOWNLOAD-HANDLING] qBittorrent client not found" >> "$LOG_FILE"
        return 1
    fi
}

# Main execution
main() {
    # Initialize log
    echo "$(date): [DOWNLOAD-HANDLING] Starting with service=$SERVICE, host=$PROXY_HOST, port=$PROXY_PORT" > "$LOG_FILE"

    echo "=== $SERVICE_NAME Download Handling Configuration ==="
    echo "Ensuring completed download handling is enabled for automation..."

    # Check if jq is available
    if ! command -v jq >/dev/null 2>&1; then
        echo "✗ jq is required but not installed"
        echo "$(date): [DOWNLOAD-HANDLING] FAILED - jq not available" >> "$LOG_FILE"
        return 1
    fi

    # Check if API key is set
    if [ -z "$API_KEY" ]; then
        echo "✗ API key not set for $SERVICE_NAME"
        echo "$(date): [DOWNLOAD-HANDLING] FAILED - No API key" >> "$LOG_FILE"
        return 1
    fi

    # Step 1: Wait for service API
    if ! wait_for_service_api "$PROXY_HOST" "$PROXY_PORT" "$TIMEOUT"; then
        echo "✗ $SERVICE_NAME API not available at $PROXY_HOST:$PROXY_PORT"
        echo "$(date): [DOWNLOAD-HANDLING] FAILED - API not available" >> "$LOG_FILE"
        return 1
    fi

    echo "✓ $SERVICE_NAME API is available"

    # Step 2: Configure download handling
    if configure_download_handling "$PROXY_HOST" "$PROXY_PORT"; then
        echo "✓ Download handling configuration complete"
    else
        echo "✗ Download handling configuration failed"
        return 1
    fi

    # Step 3: Verify configuration
    if verify_configuration "$PROXY_HOST" "$PROXY_PORT"; then
        echo "✓ Configuration verified"
        echo "$(date): [DOWNLOAD-HANDLING] SUCCESS - Configuration complete" >> "$LOG_FILE"
        success=0
    else
        echo "✗ Configuration verification failed"
        echo "$(date): [DOWNLOAD-HANDLING] FAILED - Verification failed" >> "$LOG_FILE"
        success=1
    fi

    return $success
}

# Run main function
main "$@"
exit_code=$?

# Final status
echo ""
if [ $exit_code -eq 0 ]; then
    echo "=== $SERVICE_NAME download handling configuration complete ==="
    echo "✓ Completed download handling is enabled"
    echo "✓ $SERVICE_NAME will automatically process finished downloads"
    echo "✓ Files will be moved and renamed to Plex directories"
else
    echo "=== $SERVICE_NAME download handling configuration failed ==="
    echo "Check $LOG_FILE for details"
fi

exit $exit_code