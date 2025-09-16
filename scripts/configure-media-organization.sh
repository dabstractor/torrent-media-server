#!/bin/bash
# configure-media-organization.sh - Configure qBittorrent categories for Radarr/Sonarr automation
# Sets up proper download categories to enable automated media organization

echo "$(date): [MEDIA-ORG] Starting media organization configuration..."

# Configuration
QBITTORRENT_HOST="${1:-nginx-proxy}"
QBITTORRENT_PORT="${2:-8080}"
TIMEOUT="${3:-30}"
LOG_FILE="/tmp/media_org_config.log"

# Function to wait for qBittorrent API
wait_for_qbittorrent_api() {
    local host="$1"
    local port="$2"
    local timeout="$3"
    local counter=0

    echo "$(date): [MEDIA-ORG] Waiting for qBittorrent API at $host:$port..." >> "$LOG_FILE"

    while [ $counter -lt $timeout ]; do
        response_code=$(curl -s -m 5 -o /dev/null -w "%{http_code}" "http://${host}:${port}/api/v2/app/version" 2>/dev/null)
        if echo "$response_code" | grep -E "^(200|401|403)$" >/dev/null; then
            echo "$(date): [MEDIA-ORG] qBittorrent API responding with code: $response_code" >> "$LOG_FILE"
            return 0
        fi
        sleep 2
        counter=$((counter + 2))
    done

    echo "$(date): [MEDIA-ORG] API timeout waiting for qBittorrent" >> "$LOG_FILE"
    return 1
}

# Function to get qBittorrent session cookie (handles both auth and no-auth scenarios)
get_qbittorrent_session() {
    local host="$1"
    local port="$2"

    echo "$(date): [MEDIA-ORG] Attempting to get qBittorrent session..." >> "$LOG_FILE"

    # First, check if no authentication is required (bypass configured)
    version_check=$(curl -s -m 5 "http://${host}:${port}/api/v2/app/version" 2>/dev/null)
    if echo "$version_check" | grep -q "^v"; then
        echo "$(date): [MEDIA-ORG] No authentication required (bypass active)" >> "$LOG_FILE"
        echo "no-auth"
        return 0
    fi

    # If auth is required, try with default credentials (should not be needed if bypass works)
    echo "$(date): [MEDIA-ORG] Authentication required, attempting login..." >> "$LOG_FILE"

    local login_result=$(curl -s -m 10 -c /tmp/qbt_media_session \
        -d "username=admin&password=adminpass" \
        "http://${host}:${port}/api/v2/auth/login" 2>/dev/null)

    echo "$(date): [MEDIA-ORG] Login result: $login_result" >> "$LOG_FILE"

    if [ "$login_result" = "Ok." ]; then
        echo "/tmp/qbt_media_session"
        return 0
    fi

    echo "$(date): [MEDIA-ORG] Authentication failed" >> "$LOG_FILE"
    return 1
}

# Function to check if category exists
category_exists() {
    local host="$1"
    local port="$2"
    local session="$3"
    local category="$4"

    if [ "$session" = "no-auth" ]; then
        local categories=$(curl -s -m 10 "http://${host}:${port}/api/v2/torrents/categories" 2>/dev/null)
    else
        local categories=$(curl -s -m 10 -b "$session" "http://${host}:${port}/api/v2/torrents/categories" 2>/dev/null)
    fi

    echo "$categories" | grep -q "\"$category\""
}

# Function to create qBittorrent category
create_category() {
    local host="$1"
    local port="$2"
    local session="$3"
    local category="$4"
    local save_path="$5"

    echo "$(date): [MEDIA-ORG] Creating category '$category' with path '$save_path'..." >> "$LOG_FILE"

    # Prepare the category creation request
    local category_data="category=${category}&savePath=${save_path}"

    if [ "$session" = "no-auth" ]; then
        local result=$(curl -s -m 10 -X POST \
            -d "$category_data" \
            "http://${host}:${port}/api/v2/torrents/createCategory" 2>/dev/null)
    else
        local result=$(curl -s -m 10 -b "$session" -X POST \
            -d "$category_data" \
            "http://${host}:${port}/api/v2/torrents/createCategory" 2>/dev/null)
    fi

    echo "$(date): [MEDIA-ORG] Category creation result: '$result'" >> "$LOG_FILE"

    # Empty response or "OK" usually means success for qBittorrent API
    if [ -z "$result" ] || [ "$result" = "OK" ]; then
        return 0
    else
        return 1
    fi
}

# Function to configure media organization categories
configure_categories() {
    local host="$1"
    local port="$2"
    local session="$3"

    local success=true

    # Define categories with their save paths
    # Point to the shared downloads directory that all containers can access
    # Radarr/Sonarr will process and move files from here to final media directories
    local categories="radarr:/downloads/complete sonarr:/downloads/complete"

    for category_config in $categories; do
        local category=$(echo "$category_config" | cut -d':' -f1)
        local save_path=$(echo "$category_config" | cut -d':' -f2)

        echo "$(date): [MEDIA-ORG] Processing category: $category -> $save_path" >> "$LOG_FILE"

        # Check if category already exists
        if category_exists "$host" "$port" "$session" "$category"; then
            echo "✓ Category '$category' already exists"
            echo "$(date): [MEDIA-ORG] Category '$category' already exists" >> "$LOG_FILE"
        else
            echo "Creating category '$category' with save path '$save_path'..."
            if create_category "$host" "$port" "$session" "$category" "$save_path"; then
                echo "✓ Category '$category' created successfully"
                echo "$(date): [MEDIA-ORG] Category '$category' created successfully" >> "$LOG_FILE"
            else
                echo "✗ Failed to create category '$category'"
                echo "$(date): [MEDIA-ORG] Failed to create category '$category'" >> "$LOG_FILE"
                success=false
            fi
        fi
    done

    if [ "$success" = true ]; then
        echo "$(date): [MEDIA-ORG] All categories configured successfully" >> "$LOG_FILE"
        return 0
    else
        echo "$(date): [MEDIA-ORG] Some category configurations failed" >> "$LOG_FILE"
        return 1
    fi
}

# Function to verify configuration
verify_configuration() {
    local host="$1"
    local port="$2"
    local session="$3"

    echo "$(date): [MEDIA-ORG] Verifying category configuration..." >> "$LOG_FILE"

    if [ "$session" = "no-auth" ]; then
        local categories=$(curl -s -m 10 "http://${host}:${port}/api/v2/torrents/categories" 2>/dev/null)
    else
        local categories=$(curl -s -m 10 -b "$session" "http://${host}:${port}/api/v2/torrents/categories" 2>/dev/null)
    fi

    echo "$(date): [MEDIA-ORG] Current categories: $categories" >> "$LOG_FILE"

    # Check for required categories
    local required_categories="radarr sonarr"
    local all_found=true

    for category in $required_categories; do
        if echo "$categories" | grep -q "\"$category\""; then
            echo "✓ Category '$category' verified"
        else
            echo "✗ Category '$category' missing"
            all_found=false
        fi
    done

    if [ "$all_found" = true ]; then
        echo "✓ All required categories configured properly"
        echo "$(date): [MEDIA-ORG] Verification successful" >> "$LOG_FILE"
        return 0
    else
        echo "✗ Category verification failed"
        echo "$(date): [MEDIA-ORG] Verification failed" >> "$LOG_FILE"
        return 1
    fi
}

# Main execution
main() {
    # Initialize log
    echo "$(date): [MEDIA-ORG] Starting with host=$QBITTORRENT_HOST, port=$QBITTORRENT_PORT" > "$LOG_FILE"

    echo "=== qBittorrent Media Organization Configuration ==="
    echo "Configuring categories for Radarr/Sonarr automation..."

    # Step 1: Wait for qBittorrent API
    if ! wait_for_qbittorrent_api "$QBITTORRENT_HOST" "$QBITTORRENT_PORT" "$TIMEOUT"; then
        echo "✗ qBittorrent API not available at $QBITTORRENT_HOST:$QBITTORRENT_PORT"
        echo "$(date): [MEDIA-ORG] FAILED - API not available" >> "$LOG_FILE"
        return 1
    fi

    echo "✓ qBittorrent API is available"

    # Step 2: Get session (handles both auth and no-auth scenarios)
    SESSION=$(get_qbittorrent_session "$QBITTORRENT_HOST" "$QBITTORRENT_PORT")
    if [ $? -ne 0 ]; then
        echo "✗ Failed to establish qBittorrent session"
        echo "$(date): [MEDIA-ORG] FAILED - No session" >> "$LOG_FILE"
        return 1
    fi

    echo "✓ qBittorrent session established"

    # Step 3: Configure categories
    if configure_categories "$QBITTORRENT_HOST" "$QBITTORRENT_PORT" "$SESSION"; then
        echo "✓ Categories configured successfully"
    else
        echo "✗ Category configuration failed"
        [ "$SESSION" != "no-auth" ] && rm -f "$SESSION"
        return 1
    fi

    # Step 4: Verify configuration
    if verify_configuration "$QBITTORRENT_HOST" "$QBITTORRENT_PORT" "$SESSION"; then
        echo "✓ Configuration verified"
        echo "$(date): [MEDIA-ORG] SUCCESS - Configuration complete" >> "$LOG_FILE"
        success=0
    else
        echo "✗ Configuration verification failed"
        echo "$(date): [MEDIA-ORG] FAILED - Verification failed" >> "$LOG_FILE"
        success=1
    fi

    # Cleanup
    [ "$SESSION" != "no-auth" ] && rm -f "$SESSION"

    return $success
}

# Run main function
main "$@"
exit_code=$?

# Final status
echo ""
if [ $exit_code -eq 0 ]; then
    echo "=== Media organization configuration complete ==="
    echo "✓ Categories 'radarr' and 'sonarr' are ready for automated downloads"
    echo "✓ Both services will download to /downloads/complete"
    echo "✓ Radarr will process and move movies to /movies"
    echo "✓ Sonarr will process and move TV shows to /tv"
else
    echo "=== Media organization configuration failed ==="
    echo "Check $LOG_FILE for details"
fi

exit $exit_code