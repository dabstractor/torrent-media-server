#!/bin/bash
# fix-qbittorrent-category-paths.sh - Fix qBittorrent category save paths for proper media organization
# Uses dual approach: API + direct file manipulation to ensure category paths are correct

echo "$(date): [QBT-CATEGORY-FIX] Starting qBittorrent category path fix..."

# Configuration
QBITTORRENT_HOST="${1:-nginx-proxy}"
QBITTORRENT_PORT="${2:-8080}"
TIMEOUT="${3:-30}"
DRYRUN="${DRYRUN:-false}"
LOG_FILE="/tmp/qbt_category_fix.log"

# Target paths - the correct Docker volume-mapped paths
# Matches Transmission behavior: completed/[category_name]
RADARR_TARGET_PATH="/downloads/complete/radarr"
SONARR_TARGET_PATH="/downloads/complete/sonarr"

# Configuration files
CATEGORIES_FILE="/config/qBittorrent/config/categories.json"

# Function to wait for qBittorrent API
wait_for_qbittorrent_api() {
    local host="$1"
    local port="$2"
    local timeout="$3"
    local counter=0

    echo "$(date): [QBT-CATEGORY-FIX] Waiting for qBittorrent API at $host:$port..." >> "$LOG_FILE"

    while [ $counter -lt "$timeout" ]; do
        response_code=$(curl -s -m 5 -o /dev/null -w "%{http_code}" "http://${host}:${port}/api/v2/app/version" 2>/dev/null)
        if echo "$response_code" | grep -E "^(200|401|403)$" >/dev/null; then
            echo "$(date): [QBT-CATEGORY-FIX] qBittorrent API responding with code: $response_code" >> "$LOG_FILE"
            return 0
        fi
        sleep 2
        counter=$((counter + 2))
    done

    echo "$(date): [QBT-CATEGORY-FIX] API timeout waiting for qBittorrent" >> "$LOG_FILE"
    return 1
}

# Function to get qBittorrent session cookie (handles both auth and no-auth scenarios)
get_qbittorrent_session() {
    local host="$1"
    local port="$2"

    echo "$(date): [QBT-CATEGORY-FIX] Attempting to get qBittorrent session..." >> "$LOG_FILE"

    # First, check if no authentication is required (bypass configured)
    version_check=$(curl -s -m 5 "http://${host}:${port}/api/v2/app/version" 2>/dev/null)
    if echo "$version_check" | grep -q "^v"; then
        echo "$(date): [QBT-CATEGORY-FIX] No authentication required (bypass active)" >> "$LOG_FILE"
        echo "no-auth"
        return 0
    fi

    # If auth is required, try with default credentials
    echo "$(date): [QBT-CATEGORY-FIX] Authentication required, attempting login..." >> "$LOG_FILE"

    local login_result=$(curl -s -m 10 -c /tmp/qbt_category_session \
        -d "username=admin&password=${QBITTORRENT_PASSWORD:-adminadmin}" \
        "http://${host}:${port}/api/v2/auth/login" 2>/dev/null)

    echo "$(date): [QBT-CATEGORY-FIX] Login result: $login_result" >> "$LOG_FILE"

    if [ "$login_result" = "Ok." ]; then
        echo "/tmp/qbt_category_session"
        return 0
    fi

    echo "$(date): [QBT-CATEGORY-FIX] Authentication failed" >> "$LOG_FILE"
    return 1
}

# Function to get current categories via API
get_categories() {
    local host="$1"
    local port="$2"
    local session="$3"

    if [ "$session" = "no-auth" ]; then
        curl -s -m 10 "http://${host}:${port}/api/v2/torrents/categories" 2>/dev/null
    else
        curl -s -m 10 -b "$session" "http://${host}:${port}/api/v2/torrents/categories" 2>/dev/null
    fi
}

# Function to fix category via API
fix_category_via_api() {
    local host="$1"
    local port="$2"
    local session="$3"
    local category="$4"
    local new_path="$5"

    echo "$(date): [QBT-CATEGORY-FIX] Updating category '$category' to path '$new_path' via API..." >> "$LOG_FILE"

    local api_data="category=${category}&savePath=${new_path}"

    if [ "$DRYRUN" = "true" ]; then
        echo "✓ [DRY RUN] Would update category '$category' to '$new_path' via API"
        echo "$(date): [QBT-CATEGORY-FIX] DRY RUN - Would update category via API" >> "$LOG_FILE"
        return 0
    fi

    if [ "$session" = "no-auth" ]; then
        local result=$(curl -s -m 10 -X POST \
            -d "$api_data" \
            "http://${host}:${port}/api/v2/torrents/editCategory" 2>/dev/null)
    else
        local result=$(curl -s -m 10 -b "$session" -X POST \
            -d "$api_data" \
            "http://${host}:${port}/api/v2/torrents/editCategory" 2>/dev/null)
    fi

    echo "$(date): [QBT-CATEGORY-FIX] API update result: '$result'" >> "$LOG_FILE"

    # Verify the change by fetching categories again
    sleep 1
    local categories=$(get_categories "$host" "$port" "$session")
    if echo "$categories" | jq -r ".${category}.save_path" 2>/dev/null | grep -q "$new_path"; then
        echo "✓ Category '$category' updated to '$new_path' via API"
        echo "$(date): [QBT-CATEGORY-FIX] API verification successful for $category" >> "$LOG_FILE"
        return 0
    else
        echo "✗ API update failed for category '$category'"
        echo "$(date): [QBT-CATEGORY-FIX] API verification failed for $category" >> "$LOG_FILE"
        return 1
    fi
}

# Function to fix categories via direct file manipulation
fix_categories_direct() {
    local categories_file="$1"

    echo "$(date): [QBT-CATEGORY-FIX] Attempting direct file manipulation on $categories_file..." >> "$LOG_FILE"

    if [ ! -f "$categories_file" ]; then
        echo "$(date): [QBT-CATEGORY-FIX] Categories file not found, creating default..." >> "$LOG_FILE"

        if [ "$DRYRUN" = "true" ]; then
            echo "✓ [DRY RUN] Would create categories file with correct paths"
            return 0
        fi

        # Create the directory if needed
        mkdir -p "$(dirname "$categories_file")"

        # Create default categories file with correct paths
        cat > "$categories_file" << EOF
{
    "radarr": {
        "save_path": "$RADARR_TARGET_PATH"
    },
    "sonarr": {
        "save_path": "$SONARR_TARGET_PATH"
    }
}
EOF
        chown 1000:1000 "$categories_file" 2>/dev/null || true
        chmod 644 "$categories_file"
        echo "✓ Created categories file with correct paths"
        return 0
    fi

    # Backup before modification
    local backup_file="${categories_file}.backup.$(date +%Y%m%d_%H%M%S)"

    if [ "$DRYRUN" = "true" ]; then
        echo "✓ [DRY RUN] Would backup $categories_file to $backup_file"
        echo "✓ [DRY RUN] Would update radarr path to $RADARR_TARGET_PATH"
        echo "✓ [DRY RUN] Would update sonarr path to $SONARR_TARGET_PATH"
        echo "$(date): [QBT-CATEGORY-FIX] DRY RUN - Would perform direct file manipulation" >> "$LOG_FILE"
        return 0
    fi

    cp "$categories_file" "$backup_file"
    echo "$(date): [QBT-CATEGORY-FIX] Backed up categories to $backup_file" >> "$LOG_FILE"

    # Use jq for safe JSON manipulation
    local temp_file="${categories_file}.tmp"

    if ! jq ".radarr.save_path = \"$RADARR_TARGET_PATH\" | .sonarr.save_path = \"$SONARR_TARGET_PATH\"" \
        "$categories_file" > "$temp_file"; then
        echo "✗ Failed to update categories file with jq"
        echo "$(date): [QBT-CATEGORY-FIX] jq manipulation failed" >> "$LOG_FILE"
        rm -f "$temp_file"
        return 1
    fi

    # Atomic move and permission fix
    mv "$temp_file" "$categories_file"
    chown 1000:1000 "$categories_file" 2>/dev/null || true
    chmod 644 "$categories_file"

    echo "✓ Updated categories file directly"
    echo "$(date): [QBT-CATEGORY-FIX] Direct file manipulation successful" >> "$LOG_FILE"
    return 0
}

# Function to verify current category configuration
verify_categories() {
    local host="$1"
    local port="$2"
    local session="$3"

    echo "$(date): [QBT-CATEGORY-FIX] Verifying category configuration..." >> "$LOG_FILE"

    # Try API verification first
    local categories=$(get_categories "$host" "$port" "$session")

    if [ -n "$categories" ] && [ "$categories" != "null" ]; then
        local radarr_path=$(echo "$categories" | jq -r '.radarr.save_path' 2>/dev/null)
        local sonarr_path=$(echo "$categories" | jq -r '.sonarr.save_path' 2>/dev/null)

        echo "$(date): [QBT-CATEGORY-FIX] Current API paths - radarr: $radarr_path, sonarr: $sonarr_path" >> "$LOG_FILE"

        local api_success=true
        if [ "$radarr_path" = "$RADARR_TARGET_PATH" ]; then
            echo "✓ Radarr category path correct via API: $radarr_path"
        else
            echo "✗ Radarr category path incorrect via API: $radarr_path (should be $RADARR_TARGET_PATH)"
            api_success=false
        fi

        if [ "$sonarr_path" = "$SONARR_TARGET_PATH" ]; then
            echo "✓ Sonarr category path correct via API: $sonarr_path"
        else
            echo "✗ Sonarr category path incorrect via API: $sonarr_path (should be $SONARR_TARGET_PATH)"
            api_success=false
        fi

        if [ "$api_success" = "true" ]; then
            return 0
        fi
    fi

    # Fallback to file verification
    if [ -f "$CATEGORIES_FILE" ]; then
        echo "$(date): [QBT-CATEGORY-FIX] Verifying via categories file..." >> "$LOG_FILE"

        local file_radarr_path=$(jq -r '.radarr.save_path' "$CATEGORIES_FILE" 2>/dev/null)
        local file_sonarr_path=$(jq -r '.sonarr.save_path' "$CATEGORIES_FILE" 2>/dev/null)

        echo "$(date): [QBT-CATEGORY-FIX] File paths - radarr: $file_radarr_path, sonarr: $file_sonarr_path" >> "$LOG_FILE"

        if [ "$file_radarr_path" = "$RADARR_TARGET_PATH" ] && [ "$file_sonarr_path" = "$SONARR_TARGET_PATH" ]; then
            echo "✓ Category paths correct in file"
            return 0
        else
            echo "✗ Category paths incorrect in file"
            return 1
        fi
    else
        echo "✗ Categories file not found"
        return 1
    fi
}

# Function to create categories if they don't exist
ensure_categories_exist() {
    local host="$1"
    local port="$2"
    local session="$3"

    echo "$(date): [QBT-CATEGORY-FIX] Ensuring categories exist..." >> "$LOG_FILE"

    local categories=$(get_categories "$host" "$port" "$session")

    # Check if radarr category exists
    if ! echo "$categories" | grep -q '"radarr"'; then
        echo "$(date): [QBT-CATEGORY-FIX] Creating radarr category..." >> "$LOG_FILE"

        if [ "$DRYRUN" = "true" ]; then
            echo "✓ [DRY RUN] Would create radarr category"
        else
            local api_data="category=radarr&savePath=$RADARR_TARGET_PATH"
            if [ "$session" = "no-auth" ]; then
                curl -s -m 10 -X POST -d "$api_data" "http://${host}:${port}/api/v2/torrents/createCategory" >/dev/null 2>&1
            else
                curl -s -m 10 -b "$session" -X POST -d "$api_data" "http://${host}:${port}/api/v2/torrents/createCategory" >/dev/null 2>&1
            fi
            echo "✓ Created radarr category"
        fi
    fi

    # Check if sonarr category exists
    if ! echo "$categories" | grep -q '"sonarr"'; then
        echo "$(date): [QBT-CATEGORY-FIX] Creating sonarr category..." >> "$LOG_FILE"

        if [ "$DRYRUN" = "true" ]; then
            echo "✓ [DRY RUN] Would create sonarr category"
        else
            local api_data="category=sonarr&savePath=$SONARR_TARGET_PATH"
            if [ "$session" = "no-auth" ]; then
                curl -s -m 10 -X POST -d "$api_data" "http://${host}:${port}/api/v2/torrents/createCategory" >/dev/null 2>&1
            else
                curl -s -m 10 -b "$session" -X POST -d "$api_data" "http://${host}:${port}/api/v2/torrents/createCategory" >/dev/null 2>&1
            fi
            echo "✓ Created sonarr category"
        fi
    fi
}

# Main execution function
main() {
    # Initialize log
    echo "$(date): [QBT-CATEGORY-FIX] Starting with host=$QBITTORRENT_HOST, port=$QBITTORRENT_PORT, dryrun=$DRYRUN" > "$LOG_FILE"

    echo "=== qBittorrent Category Path Fix ==="
    if [ "$DRYRUN" = "true" ]; then
        echo "*** DRY RUN MODE - No changes will be made ***"
    fi
    echo "Fixing category paths for proper media organization..."
    echo "Target paths: radarr -> $RADARR_TARGET_PATH, sonarr -> $SONARR_TARGET_PATH"

    # Check dependencies
    if ! command -v jq >/dev/null 2>&1; then
        echo "✗ jq is required but not installed"
        echo "$(date): [QBT-CATEGORY-FIX] FAILED - jq not available" >> "$LOG_FILE"
        return 1
    fi

    # Create backup before making any changes
    if [ "$DRYRUN" != "true" ]; then
        echo "Creating configuration backup..."
        if [ -f "/scripts/backup-qbittorrent-config.sh" ]; then
            /scripts/backup-qbittorrent-config.sh
            echo "✓ Configuration backed up"
        else
            echo "⚠ Backup script not found, continuing without backup"
        fi
    fi

    # Step 1: Try API approach
    echo ""
    echo "=== Attempting API-based fix ==="

    if wait_for_qbittorrent_api "$QBITTORRENT_HOST" "$QBITTORRENT_PORT" "$TIMEOUT"; then
        echo "✓ qBittorrent API is available"

        SESSION=$(get_qbittorrent_session "$QBITTORRENT_HOST" "$QBITTORRENT_PORT")
        if [ $? -eq 0 ]; then
            echo "✓ qBittorrent session established"

            # Ensure categories exist
            ensure_categories_exist "$QBITTORRENT_HOST" "$QBITTORRENT_PORT" "$SESSION"

            # Try to fix categories via API
            local api_success=true
            if ! fix_category_via_api "$QBITTORRENT_HOST" "$QBITTORRENT_PORT" "$SESSION" "radarr" "$RADARR_TARGET_PATH"; then
                api_success=false
            fi
            if ! fix_category_via_api "$QBITTORRENT_HOST" "$QBITTORRENT_PORT" "$SESSION" "sonarr" "$SONARR_TARGET_PATH"; then
                api_success=false
            fi

            # Cleanup session
            [ "$SESSION" != "no-auth" ] && rm -f "$SESSION"

            if [ "$api_success" = "true" ]; then
                echo "✓ API-based fix successful"
                echo "$(date): [QBT-CATEGORY-FIX] API fix successful" >> "$LOG_FILE"
            else
                echo "✗ API-based fix failed, trying direct file manipulation"
                echo "$(date): [QBT-CATEGORY-FIX] API fix failed, falling back to direct" >> "$LOG_FILE"
            fi
        else
            echo "✗ Failed to establish qBittorrent session"
            api_success=false
        fi
    else
        echo "✗ qBittorrent API not available, trying direct file manipulation"
        api_success=false
    fi

    # Step 2: Direct file manipulation approach (if API failed)
    if [ "$api_success" != "true" ]; then
        echo ""
        echo "=== Attempting direct file manipulation ==="

        if fix_categories_direct "$CATEGORIES_FILE"; then
            echo "✓ Direct file manipulation successful"
            echo "$(date): [QBT-CATEGORY-FIX] Direct fix successful" >> "$LOG_FILE"
        else
            echo "✗ Direct file manipulation failed"
            echo "$(date): [QBT-CATEGORY-FIX] Both API and direct fixes failed" >> "$LOG_FILE"
            return 1
        fi
    fi

    # Step 3: Final verification
    echo ""
    echo "=== Final Verification ==="

    if [ "$DRYRUN" = "true" ]; then
        echo "✓ [DRY RUN] Verification skipped in dry run mode"
        echo "$(date): [QBT-CATEGORY-FIX] DRY RUN completed successfully" >> "$LOG_FILE"
        return 0
    fi

    # Wait a moment for changes to take effect
    sleep 2

    # Try API verification first
    if wait_for_qbittorrent_api "$QBITTORRENT_HOST" "$QBITTORRENT_PORT" 10; then
        SESSION=$(get_qbittorrent_session "$QBITTORRENT_HOST" "$QBITTORRENT_PORT")
        if [ $? -eq 0 ]; then
            verify_categories "$QBITTORRENT_HOST" "$QBITTORRENT_PORT" "$SESSION"
            local verification_result=$?
            [ "$SESSION" != "no-auth" ] && rm -f "$SESSION"

            if [ $verification_result -eq 0 ]; then
                echo "✓ Final verification successful"
                echo "$(date): [QBT-CATEGORY-FIX] SUCCESS - All category paths fixed" >> "$LOG_FILE"
                return 0
            fi
        fi
    fi

    # Fallback to file verification
    if verify_categories "" "" ""; then
        echo "✓ Final verification successful (file-based)"
        echo "$(date): [QBT-CATEGORY-FIX] SUCCESS - Category paths fixed via file" >> "$LOG_FILE"
        return 0
    else
        echo "✗ Final verification failed"
        echo "$(date): [QBT-CATEGORY-FIX] FAILED - Verification failed" >> "$LOG_FILE"
        return 1
    fi
}

# Script usage information
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [qbittorrent_host] [qbittorrent_port] [timeout]"
    echo ""
    echo "Environment variables:"
    echo "  DRYRUN=true          - Show what would be done without making changes"
    echo "  QBITTORRENT_PASSWORD - Password for qBittorrent (default: adminadmin)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Use defaults"
    echo "  $0 nginx-proxy 8080 30               # Custom host/port/timeout"
    echo "  DRYRUN=true $0                       # Dry run mode"
    echo ""
    echo "This script fixes qBittorrent category paths from incorrect Docker-relative"
    echo "paths to proper container-mapped paths for automated media organization."
    exit 0
fi

# Run main function
main "$@"
exit_code=$?

# Final status
echo ""
if [ $exit_code -eq 0 ]; then
    if [ "$DRYRUN" = "true" ]; then
        echo "=== Dry run completed ==="
        echo "✓ Script would fix category paths successfully"
        echo "Run without DRYRUN=true to apply changes"
    else
        echo "=== Category path fix complete ==="
        echo "✓ qBittorrent categories configured with correct paths"
        echo "✓ radarr -> $RADARR_TARGET_PATH"
        echo "✓ sonarr -> $SONARR_TARGET_PATH"
        echo "✓ Automated media organization should now work properly"
    fi
else
    echo "=== Category path fix failed ==="
    echo "Check $LOG_FILE for details"
    echo "Try running with DRYRUN=true first to test the script"
fi

exit $exit_code