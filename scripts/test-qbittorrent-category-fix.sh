#!/bin/bash
# test-qbittorrent-category-fix.sh - Comprehensive end-to-end test of qBittorrent category fix functionality
# Tests API-based fix, file-based fix, backup/restore, and validation functionality

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_LOG="$PROJECT_ROOT/data/downloads/qbt-category-test.log"
TEST_FLAG="$PROJECT_ROOT/data/downloads/.qbt-category-test-status"

# Test configuration
QBITTORRENT_HOST="${1:-nginx-proxy}"
QBITTORRENT_PORT="${2:-8080}"
TEST_CATEGORIES_FILE="/tmp/test_categories.json"
BACKUP_TEST_DIR="/tmp/qbt_test_backup"

# Expected paths
RADARR_TARGET_PATH="/data/downloads/complete/movies"
SONARR_TARGET_PATH="/data/downloads/complete/tv"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Ensure test directories exist
mkdir -p "$(dirname "$TEST_LOG")"
mkdir -p "$BACKUP_TEST_DIR"

# Initialize test log
echo "=== qBittorrent Category Fix Test Suite ===" > "$TEST_LOG"
echo "Test started: $(date)" >> "$TEST_LOG"
echo "Host: $QBITTORRENT_HOST:$QBITTORRENT_PORT" >> "$TEST_LOG"
echo "" >> "$TEST_LOG"

# Function to run a test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "[$TOTAL_TESTS] Testing $test_name... "
    echo "[$TOTAL_TESTS] Testing $test_name..." >> "$TEST_LOG"

    if eval "$test_command" >> "$TEST_LOG" 2>&1; then
        echo "✓ PASS"
        echo "  Result: PASS" >> "$TEST_LOG"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo "✗ FAIL"
        echo "  Result: FAIL" >> "$TEST_LOG"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Function to create test categories file with wrong paths
create_test_categories_wrong() {
    cat > "$TEST_CATEGORIES_FILE" << 'EOF'
{
    "radarr": {
        "save_path": "/downloads/movies"
    },
    "sonarr": {
        "save_path": "/downloads/tv"
    }
}
EOF
}

# Function to create test categories file with correct paths
create_test_categories_correct() {
    cat > "$TEST_CATEGORIES_FILE" << EOF
{
    "radarr": {
        "save_path": "$RADARR_TARGET_PATH"
    },
    "sonarr": {
        "save_path": "$SONARR_TARGET_PATH"
    }
}
EOF
}

# Function to backup original categories file
backup_original_categories() {
    local categories_file="/config/qBittorrent/config/categories.json"
    if [ -f "$categories_file" ]; then
        cp "$categories_file" "${categories_file}.test_backup"
        echo "Original categories backed up" >> "$TEST_LOG"
    fi
}

# Function to restore original categories file
restore_original_categories() {
    local categories_file="/config/qBittorrent/config/categories.json"
    local backup_file="${categories_file}.test_backup"
    if [ -f "$backup_file" ]; then
        cp "$backup_file" "$categories_file"
        rm -f "$backup_file"
        echo "Original categories restored" >> "$TEST_LOG"
    fi
}

# Test 1: Dependency Checks
test_dependencies() {
    echo ""
    echo "=== Test 1: Dependency Checks ==="
    echo "=== Test 1: Dependency Checks ===" >> "$TEST_LOG"

    run_test "jq availability" "command -v jq"
    run_test "curl availability" "command -v curl"
    run_test "backup script exists" "test -f '$SCRIPT_DIR/backup-qbittorrent-config.sh'"
    run_test "fix script exists" "test -f '$SCRIPT_DIR/fix-qbittorrent-category-paths.sh'"
    run_test "validation script exists" "test -f '$SCRIPT_DIR/validate-qbittorrent-categories.sh'"
}

# Test 2: Backup Functionality
test_backup_functionality() {
    echo ""
    echo "=== Test 2: Backup Functionality ==="
    echo "=== Test 2: Backup Functionality ===" >> "$TEST_LOG"

    # Create test categories file to backup
    create_test_categories_wrong
    mkdir -p "$(dirname "/config/qBittorrent/config")"
    cp "$TEST_CATEGORIES_FILE" "/config/qBittorrent/config/categories.json"

    run_test "backup script execution" "$SCRIPT_DIR/backup-qbittorrent-config.sh"
    run_test "backup creates template directory" "test -d 'config/templates/qbittorrent'"
    run_test "backup creates categories template" "test -f 'config/templates/qbittorrent/categories.json.template'"

    # Test versioned backup
    run_test "versioned backup created" "ls /tmp/qbt_config_backup_* | head -1 | xargs test -d"

    # Cleanup
    rm -f "$TEST_CATEGORIES_FILE"
}

# Test 3: Direct File Fix
test_direct_file_fix() {
    echo ""
    echo "=== Test 3: Direct File Fix (No API) ==="
    echo "=== Test 3: Direct File Fix (No API) ===" >> "$TEST_LOG"

    # Create test file with wrong paths
    create_test_categories_wrong
    local test_file="/tmp/test_direct_categories.json"
    cp "$TEST_CATEGORIES_FILE" "$test_file"

    # Test dry run mode first
    run_test "dry run mode" "DRYRUN=true $SCRIPT_DIR/fix-qbittorrent-category-paths.sh localhost 99999 5"

    # Backup original and replace with test file
    backup_original_categories
    mkdir -p "$(dirname "/config/qBittorrent/config")"
    cp "$test_file" "/config/qBittorrent/config/categories.json"

    # Run fix with unreachable API (forces file-based fix)
    run_test "file-based fix execution" "$SCRIPT_DIR/fix-qbittorrent-category-paths.sh localhost 99999 5"

    # Verify results
    if [ -f "/config/qBittorrent/config/categories.json" ]; then
        local radarr_path=$(jq -r '.radarr.save_path' "/config/qBittorrent/config/categories.json" 2>/dev/null)
        local sonarr_path=$(jq -r '.sonarr.save_path' "/config/qBittorrent/config/categories.json" 2>/dev/null)

        run_test "radarr path fixed" "test '$radarr_path' = '$RADARR_TARGET_PATH'"
        run_test "sonarr path fixed" "test '$sonarr_path' = '$SONARR_TARGET_PATH'"
        run_test "backup created during fix" "ls /config/qBittorrent/config/categories.json.backup.* | head -1 | xargs test -f"
    fi

    # Restore original
    restore_original_categories
    rm -f "$test_file" "$TEST_CATEGORIES_FILE"
}

# Test 4: Validation Functionality
test_validation_functionality() {
    echo ""
    echo "=== Test 4: Validation Functionality ==="
    echo "=== Test 4: Validation Functionality ===" >> "$TEST_LOG"

    # Create categories file with correct paths for validation
    create_test_categories_correct
    backup_original_categories
    mkdir -p "$(dirname "/config/qBittorrent/config")"
    cp "$TEST_CATEGORIES_FILE" "/config/qBittorrent/config/categories.json"
    chown 1000:1000 "/config/qBittorrent/config/categories.json" 2>/dev/null || true

    # Test validation with correct configuration
    run_test "validation with correct config" "$SCRIPT_DIR/validate-qbittorrent-categories.sh localhost 99999 5"

    # Test validation with wrong configuration
    create_test_categories_wrong
    cp "$TEST_CATEGORIES_FILE" "/config/qBittorrent/config/categories.json"

    # This should fail validation
    if "$SCRIPT_DIR"/validate-qbittorrent-categories.sh localhost 99999 5 >/dev/null 2>&1; then
        echo "✗ Validation should have failed with wrong paths"
        echo "  Validation should have failed with wrong paths" >> "$TEST_LOG"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    else
        echo "✓ Validation correctly detected wrong paths"
        echo "  Validation correctly detected wrong paths" >> "$TEST_LOG"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    # Restore original
    restore_original_categories
    rm -f "$TEST_CATEGORIES_FILE"
}

# Test 5: Directory Structure
test_directory_structure() {
    echo ""
    echo "=== Test 5: Directory Structure ==="
    echo "=== Test 5: Directory Structure ===" >> "$TEST_LOG"

    # Create necessary directories for testing
    run_test "create downloads base" "mkdir -p /data/downloads/complete"
    run_test "create movies directory" "mkdir -p /data/downloads/complete/movies"
    run_test "create tv directory" "mkdir -p /data/downloads/complete/tv"
    run_test "create media base" "mkdir -p /data/media"
    run_test "create media movies" "mkdir -p /data/media/movies"
    run_test "create media tv" "mkdir -p /data/media/tv"

    # Test permissions
    run_test "downloads writable" "touch /data/downloads/complete/.test && rm /data/downloads/complete/.test"
    run_test "movies writable" "touch /data/downloads/complete/movies/.test && rm /data/downloads/complete/movies/.test"
    run_test "tv writable" "touch /data/downloads/complete/tv/.test && rm /data/downloads/complete/tv/.test"

    # Test hardlink capability (critical for media organization)
    run_test "hardlink capability" "
        echo 'test' > /data/downloads/complete/.hardlink_test &&
        ln /data/downloads/complete/.hardlink_test /data/media/.hardlink_test &&
        test \$(stat -c '%h' /data/downloads/complete/.hardlink_test) -eq 2 &&
        rm -f /data/downloads/complete/.hardlink_test /data/media/.hardlink_test
    "
}

# Test 6: Integration with Wrapper Script
test_wrapper_integration() {
    echo ""
    echo "=== Test 6: Wrapper Script Integration ==="
    echo "=== Test 6: Wrapper Script Integration ===" >> "$TEST_LOG"

    local wrapper_script="$SCRIPT_DIR/qbittorrent-wrapper.sh"

    run_test "wrapper script exists" "test -f '$wrapper_script'"
    run_test "wrapper contains category fix call" "grep -q 'fix-qbittorrent-category-paths.sh' '$wrapper_script'"
    run_test "wrapper has correct integration logic" "grep -A5 -B5 'fix-qbittorrent-category-paths.sh' '$wrapper_script' | grep -q 'media organization'"
}

# Test 7: API-based Fix (if qBittorrent is available)
test_api_fix() {
    echo ""
    echo "=== Test 7: API-based Fix (if available) ==="
    echo "=== Test 7: API-based Fix (if available) ===" >> "$TEST_LOG"

    # Check if qBittorrent API is reachable
    local api_available=false
    if curl -s -m 5 "http://$QBITTORRENT_HOST:$QBITTORRENT_PORT/api/v2/app/version" >/dev/null 2>&1; then
        api_available=true
        echo "qBittorrent API is available for testing" >> "$TEST_LOG"
    else
        echo "qBittorrent API not available, skipping API tests" >> "$TEST_LOG"
    fi

    if [ "$api_available" = "true" ]; then
        # Setup wrong categories for API fix test
        create_test_categories_wrong
        backup_original_categories
        mkdir -p "$(dirname "/config/qBittorrent/config")"
        cp "$TEST_CATEGORIES_FILE" "/config/qBittorrent/config/categories.json"

        # Test API-based fix
        run_test "API-based fix execution" "$SCRIPT_DIR/fix-qbittorrent-category-paths.sh '$QBITTORRENT_HOST' '$QBITTORRENT_PORT' 30"

        # Verify via validation
        run_test "API fix validation" "$SCRIPT_DIR/validate-qbittorrent-categories.sh '$QBITTORRENT_HOST' '$QBITTORRENT_PORT' 10"

        # Restore original
        restore_original_categories
        rm -f "$TEST_CATEGORIES_FILE"
    else
        echo "⚠ Skipping API tests - qBittorrent not accessible"
        echo "  To test API functionality, ensure qBittorrent is running at $QBITTORRENT_HOST:$QBITTORRENT_PORT"
    fi
}

# Test 8: Error Handling and Edge Cases
test_error_handling() {
    echo ""
    echo "=== Test 8: Error Handling ==="
    echo "=== Test 8: Error Handling ===" >> "$TEST_LOG"

    # Test with missing categories file
    backup_original_categories
    rm -f "/config/qBittorrent/config/categories.json"

    run_test "handles missing categories file" "$SCRIPT_DIR/fix-qbittorrent-category-paths.sh localhost 99999 5"
    run_test "creates categories file when missing" "test -f '/config/qBittorrent/config/categories.json'"

    # Test with invalid JSON
    echo "invalid json content" > "/config/qBittorrent/config/categories.json"
    run_test "handles invalid JSON gracefully" "$SCRIPT_DIR/fix-qbittorrent-category-paths.sh localhost 99999 5"

    # Restore original
    restore_original_categories
}

# Main test execution
main() {
    echo "=== qBittorrent Category Fix Test Suite ==="
    echo "Testing comprehensive category fix functionality..."
    echo "Target paths: radarr -> $RADARR_TARGET_PATH, sonarr -> $SONARR_TARGET_PATH"
    echo ""

    # Run all test suites
    test_dependencies
    test_backup_functionality
    test_direct_file_fix
    test_validation_functionality
    test_directory_structure
    test_wrapper_integration
    test_api_fix
    test_error_handling

    # Generate final report
    echo ""
    echo "=== Test Suite Summary ==="
    echo "Total tests: $TOTAL_TESTS"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $FAILED_TESTS"

    # Update test status flag
    cat > "$TEST_FLAG" << EOF
LAST_TEST_TIME=$(date)
TOTAL_TESTS=$TOTAL_TESTS
PASSED_TESTS=$PASSED_TESTS
FAILED_TESTS=$FAILED_TESTS
TEST_SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))%
EOF

    echo "" >> "$TEST_LOG"
    echo "=== Test Suite Summary ===" >> "$TEST_LOG"
    echo "Test completed: $(date)" >> "$TEST_LOG"
    echo "Total tests: $TOTAL_TESTS" >> "$TEST_LOG"
    echo "Passed: $PASSED_TESTS" >> "$TEST_LOG"
    echo "Failed: $FAILED_TESTS" >> "$TEST_LOG"

    if [ $FAILED_TESTS -eq 0 ]; then
        echo "✓ All tests passed - qBittorrent category fix functionality is working correctly"
        echo "SUCCESS: All tests passed" >> "$TEST_LOG"
        return 0
    else
        echo "✗ $FAILED_TESTS test(s) failed - please review the issues"
        echo "FAILURE: $FAILED_TESTS tests failed" >> "$TEST_LOG"
        echo ""
        echo "For detailed test results, check: $TEST_LOG"
        return 1
    fi
}

# Script usage information
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [qbittorrent_host] [qbittorrent_port]"
    echo ""
    echo "Examples:"
    echo "  $0                        # Test with defaults (nginx-proxy:8080)"
    echo "  $0 localhost 18080        # Test with custom host/port"
    echo ""
    echo "This script runs comprehensive tests of qBittorrent category fix functionality:"
    echo "  - Backup and restore operations"
    echo "  - Direct file manipulation fixes"
    echo "  - API-based fixes (if qBittorrent is available)"
    echo "  - Validation functionality"
    echo "  - Directory structure requirements"
    echo "  - Error handling and edge cases"
    echo ""
    echo "Test results are logged to: $TEST_LOG"
    echo "Test status is saved to: $TEST_FLAG"
    exit 0
fi

# Cleanup function
cleanup() {
    echo ""
    echo "Cleaning up test artifacts..."
    rm -f "$TEST_CATEGORIES_FILE"
    rm -rf "$BACKUP_TEST_DIR"
    restore_original_categories 2>/dev/null || true
    echo "Cleanup completed"
}

# Set trap for cleanup on exit
trap cleanup EXIT

# Run main test function
main "$@"
exit $?