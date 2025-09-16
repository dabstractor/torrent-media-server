#!/bin/bash
# validate-qbittorrent-categories.sh - Comprehensive validation of qBittorrent category configuration
# Ensures categories are properly configured for automated media organization

echo "$(date): [QBT-CATEGORY-VALIDATE] Starting qBittorrent category validation..."

# Configuration
QBITTORRENT_HOST="${1:-nginx-proxy}"
QBITTORRENT_PORT="${2:-8080}"
TIMEOUT="${3:-30}"
LOG_FILE="/tmp/qbt_category_validation.log"

# Expected paths
RADARR_EXPECTED_PATH="/data/downloads/complete/movies"
SONARR_EXPECTED_PATH="/data/downloads/complete/tv"

# Configuration files
CATEGORIES_FILE="/config/qBittorrent/config/categories.json"

# Validation counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Testing $test_name... "

    if eval "$test_command" >/dev/null 2>&1; then
        echo "✓ PASS"
        echo "$(date): [QBT-CATEGORY-VALIDATE] PASS - $test_name" >> "$LOG_FILE"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo "✗ FAIL"
        echo "$(date): [QBT-CATEGORY-VALIDATE] FAIL - $test_name" >> "$LOG_FILE"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Function to run a test with detailed output
run_detailed_test() {
    local test_name="$1"
    local test_command="$2"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo "Testing $test_name..."

    local result
    result=$(eval "$test_command" 2>&1)
    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        echo "✓ PASS: $test_name"
        [ -n "$result" ] && echo "  Result: $result"
        echo "$(date): [QBT-CATEGORY-VALIDATE] PASS - $test_name: $result" >> "$LOG_FILE"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo "✗ FAIL: $test_name"
        [ -n "$result" ] && echo "  Error: $result"
        echo "$(date): [QBT-CATEGORY-VALIDATE] FAIL - $test_name: $result" >> "$LOG_FILE"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Function to wait for qBittorrent API
wait_for_qbittorrent_api() {
    local host="$1"
    local port="$2"
    local timeout="$3"
    local counter=0

    while [ "$counter" -lt "$timeout" ]; do
        response_code=$(curl -s -m 5 -o /dev/null -w "%{http_code}" "http://${host}:${port}/api/v2/app/version" 2>/dev/null)
        if echo "$response_code" | grep -E "^(200|401|403)$" >/dev/null; then
            return 0
        fi
        sleep 2
        counter=$((counter + 2))
    done
    return 1
}

# Function to get qBittorrent session
get_qbittorrent_session() {
    local host="$1"
    local port="$2"

    # Check if no authentication is required
    version_check=$(curl -s -m 5 "http://${host}:${port}/api/v2/app/version" 2>/dev/null)
    if echo "$version_check" | grep -q "^v"; then
        echo "no-auth"
        return 0
    fi

    # Try authentication
    local login_result=$(curl -s -m 10 -c /tmp/qbt_validate_session \
        -d "username=admin&password=${QBITTORRENT_PASSWORD:-adminadmin}" \
        "http://${host}:${port}/api/v2/auth/login" 2>/dev/null)

    if [ "$login_result" = "Ok." ]; then
        echo "/tmp/qbt_validate_session"
        return 0
    fi
    return 1
}

# Function to get categories via API
get_categories_api() {
    local host="$1"
    local port="$2"
    local session="$3"

    if [ "$session" = "no-auth" ]; then
        curl -s -m 10 "http://${host}:${port}/api/v2/torrents/categories" 2>/dev/null
    else
        curl -s -m 10 -b "$session" "http://${host}:${port}/api/v2/torrents/categories" 2>/dev/null
    fi
}

# Validation test functions

# Test 1: Basic Dependencies
validate_dependencies() {
    echo "=== Dependency Validation ==="

    run_test "jq availability" "command -v jq"
    run_test "curl availability" "command -v curl"

    if [ -f "$CATEGORIES_FILE" ]; then
        run_test "categories file exists" "test -f '$CATEGORIES_FILE'"
        run_test "categories file readable" "test -r '$CATEGORIES_FILE'"
        run_test "valid JSON syntax" "jq empty '$CATEGORIES_FILE'"
    else
        echo "⚠ Categories file not found: $CATEGORIES_FILE"
        echo "$(date): [QBT-CATEGORY-VALIDATE] Categories file missing" >> "$LOG_FILE"
    fi
}

# Test 2: API Connectivity
validate_api_connectivity() {
    echo ""
    echo "=== API Connectivity Validation ==="

    run_detailed_test "qBittorrent API availability" "wait_for_qbittorrent_api '$QBITTORRENT_HOST' '$QBITTORRENT_PORT' 10"

    if [ $? -eq 0 ]; then
        SESSION=$(get_qbittorrent_session "$QBITTORRENT_HOST" "$QBITTORRENT_PORT")
        if [ $? -eq 0 ]; then
            run_test "session establishment" "test -n '$SESSION'"

            # Test API endpoints
            run_test "version endpoint" "curl -s -m 5 'http://${QBITTORRENT_HOST}:${QBITTORRENT_PORT}/api/v2/app/version' | grep -q '^v'"

            local categories_response
            if [ "$SESSION" = "no-auth" ]; then
                categories_response=$(curl -s -m 10 "http://${QBITTORRENT_HOST}:${QBITTORRENT_PORT}/api/v2/torrents/categories" 2>/dev/null)
            else
                categories_response=$(curl -s -m 10 -b "$SESSION" "http://${QBITTORRENT_HOST}:${QBITTORRENT_PORT}/api/v2/torrents/categories" 2>/dev/null)
            fi

            run_test "categories endpoint" "echo '$categories_response' | jq empty"

            # Store for later use
            export VALIDATION_CATEGORIES_API="$categories_response"
            export VALIDATION_SESSION="$SESSION"
        else
            echo "✗ Failed to establish API session"
            FAILED_TESTS=$((FAILED_TESTS + 1))
            TOTAL_TESTS=$((TOTAL_TESTS + 1))
        fi
    fi
}

# Test 3: Category Configuration
validate_category_configuration() {
    echo ""
    echo "=== Category Configuration Validation ==="

    # API-based validation
    if [ -n "$VALIDATION_CATEGORIES_API" ]; then
        echo "--- API Configuration ---"

        # Check if categories exist
        run_test "radarr category exists (API)" "echo '$VALIDATION_CATEGORIES_API' | jq -e '.radarr'"
        run_test "sonarr category exists (API)" "echo '$VALIDATION_CATEGORIES_API' | jq -e '.sonarr'"

        # Check category paths
        local api_radarr_path=$(echo "$VALIDATION_CATEGORIES_API" | jq -r '.radarr.save_path' 2>/dev/null)
        local api_sonarr_path=$(echo "$VALIDATION_CATEGORIES_API" | jq -r '.sonarr.save_path' 2>/dev/null)

        run_detailed_test "radarr path correct (API)" "test '$api_radarr_path' = '$RADARR_EXPECTED_PATH'"
        run_detailed_test "sonarr path correct (API)" "test '$api_sonarr_path' = '$SONARR_EXPECTED_PATH'"

        if [ "$api_radarr_path" != "$RADARR_EXPECTED_PATH" ]; then
            echo "  Expected: $RADARR_EXPECTED_PATH"
            echo "  Actual:   $api_radarr_path"
        fi
        if [ "$api_sonarr_path" != "$SONARR_EXPECTED_PATH" ]; then
            echo "  Expected: $SONARR_EXPECTED_PATH"
            echo "  Actual:   $api_sonarr_path"
        fi
    fi

    # File-based validation
    if [ -f "$CATEGORIES_FILE" ]; then
        echo "--- File Configuration ---"

        # Check if categories exist in file
        run_test "radarr category exists (file)" "jq -e '.radarr' '$CATEGORIES_FILE'"
        run_test "sonarr category exists (file)" "jq -e '.sonarr' '$CATEGORIES_FILE'"

        # Check category paths in file
        local file_radarr_path=$(jq -r '.radarr.save_path' "$CATEGORIES_FILE" 2>/dev/null)
        local file_sonarr_path=$(jq -r '.sonarr.save_path' "$CATEGORIES_FILE" 2>/dev/null)

        run_detailed_test "radarr path correct (file)" "test '$file_radarr_path' = '$RADARR_EXPECTED_PATH'"
        run_detailed_test "sonarr path correct (file)" "test '$file_sonarr_path' = '$SONARR_EXPECTED_PATH'"

        if [ "$file_radarr_path" != "$RADARR_EXPECTED_PATH" ]; then
            echo "  Expected: $RADARR_EXPECTED_PATH"
            echo "  Actual:   $file_radarr_path"
        fi
        if [ "$file_sonarr_path" != "$SONARR_EXPECTED_PATH" ]; then
            echo "  Expected: $SONARR_EXPECTED_PATH"
            echo "  Actual:   $file_sonarr_path"
        fi

        # Check file permissions
        run_test "file permissions" "test -r '$CATEGORIES_FILE' && test -w '$CATEGORIES_FILE'"

        # Check file ownership (if running as root or with appropriate permissions)
        if [ "$(id -u)" -eq 0 ] || [ "$(stat -c '%u' "$CATEGORIES_FILE" 2>/dev/null)" = "$(id -u)" ]; then
            local file_owner=$(stat -c '%u:%g' "$CATEGORIES_FILE" 2>/dev/null)
            run_detailed_test "file ownership" "test '$file_owner' = '1000:1000'"
        else
            echo "⚠ Skipping ownership check (insufficient permissions)"
        fi
    fi
}

# Test 4: Directory Structure
validate_directory_structure() {
    echo ""
    echo "=== Directory Structure Validation ==="

    # Check if target directories exist
    run_test "downloads base directory" "test -d '/data/downloads'"
    run_test "complete downloads directory" "test -d '/data/downloads/complete'"
    run_test "movies target directory" "test -d '/data/downloads/complete/movies' || mkdir -p '/data/downloads/complete/movies'"
    run_test "tv target directory" "test -d '/data/downloads/complete/tv' || mkdir -p '/data/downloads/complete/tv'"

    # Check directory permissions
    run_test "downloads directory writable" "test -w '/data/downloads/complete'"

    # Check if directories are accessible to container user
    if [ -d "/data/downloads/complete" ]; then
        run_test "create test file in downloads" "touch '/data/downloads/complete/.test' && rm '/data/downloads/complete/.test'"
    fi
}

# Test 5: Integration Validation
validate_integration() {
    echo ""
    echo "=== Integration Validation ==="

    # Test media directories
    run_test "media base directory" "test -d '/data/media'"
    run_test "movies media directory" "test -d '/data/media/movies' || mkdir -p '/data/media/movies'"
    run_test "tv media directory" "test -d '/data/media/tv' || mkdir -p '/data/media/tv'"

    # Test hardlink capability (critical for media organization)
    if [ -d "/data/downloads/complete" ] && [ -d "/data/media" ]; then
        run_detailed_test "hardlink capability" "
            echo 'test' > '/data/downloads/complete/.hardlink_test' &&
            ln '/data/downloads/complete/.hardlink_test' '/data/media/.hardlink_test' &&
            test \$(stat -c '%h' '/data/downloads/complete/.hardlink_test') -eq 2 &&
            rm -f '/data/downloads/complete/.hardlink_test' '/data/media/.hardlink_test'
        "
    fi

    # Test if qBittorrent can create files in target directories
    if [ -d "/data/downloads/complete/movies" ] && [ -d "/data/downloads/complete/tv" ]; then
        run_test "movies directory writable" "touch '/data/downloads/complete/movies/.test' && rm '/data/downloads/complete/movies/.test'"
        run_test "tv directory writable" "touch '/data/downloads/complete/tv/.test' && rm '/data/downloads/complete/tv/.test'"
    fi
}

# Main validation function
main() {
    # Initialize log
    echo "$(date): [QBT-CATEGORY-VALIDATE] Starting validation with host=$QBITTORRENT_HOST, port=$QBITTORRENT_PORT" > "$LOG_FILE"

    echo "=== qBittorrent Category Configuration Validation ==="
    echo "Validating category configuration for automated media organization..."
    echo "Expected paths: radarr -> $RADARR_EXPECTED_PATH, sonarr -> $SONARR_EXPECTED_PATH"
    echo ""

    # Run all validation tests
    validate_dependencies
    validate_api_connectivity
    validate_category_configuration
    validate_directory_structure
    validate_integration

    # Cleanup
    [ -n "$VALIDATION_SESSION" ] && [ "$VALIDATION_SESSION" != "no-auth" ] && rm -f "$VALIDATION_SESSION"

    # Summary
    echo ""
    echo "=== Validation Summary ==="
    echo "Total tests: $TOTAL_TESTS"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $FAILED_TESTS"

    if [ $FAILED_TESTS -eq 0 ]; then
        echo "✓ All validations passed - qBittorrent category configuration is correct"
        echo "$(date): [QBT-CATEGORY-VALIDATE] SUCCESS - All validations passed" >> "$LOG_FILE"
        return 0
    else
        echo "✗ $FAILED_TESTS validation(s) failed - category configuration needs attention"
        echo "$(date): [QBT-CATEGORY-VALIDATE] FAILED - $FAILED_TESTS failures" >> "$LOG_FILE"

        echo ""
        echo "To fix category configuration, run:"
        echo "  ./scripts/fix-qbittorrent-category-paths.sh"
        echo ""
        echo "For detailed logs, check: $LOG_FILE"
        return 1
    fi
}

# Script usage information
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [qbittorrent_host] [qbittorrent_port] [timeout]"
    echo ""
    echo "Environment variables:"
    echo "  QBITTORRENT_PASSWORD - Password for qBittorrent (default: adminadmin)"
    echo ""
    echo "Examples:"
    echo "  $0                      # Use defaults (nginx-proxy:8080)"
    echo "  $0 localhost 18080 30   # Custom host/port/timeout"
    echo ""
    echo "This script validates qBittorrent category configuration to ensure"
    echo "proper paths are set for automated media organization workflow."
    echo ""
    echo "Validation includes:"
    echo "  - API connectivity and authentication"
    echo "  - Category existence and correct save paths"
    echo "  - File system permissions and directory structure"
    echo "  - Integration with media organization pipeline"
    exit 0
fi

# Run main validation
main "$@"
exit $?