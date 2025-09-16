#!/bin/bash
# validate-path-visibility.sh - Test that all containers can see the same files

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_FILE="path_visibility_test_$(date +%s).txt"
TEST_CONTENT="Path visibility test $(date)"

echo "=== Path Visibility Validation ==="

# Create test file in downloads directory
echo "Creating test file: $TEST_FILE"
echo "$TEST_CONTENT" > "/home/dustin/projects/torrents-plex-organization/data/downloads/$TEST_FILE"

# Test each container can see the file
CONTAINERS=("plex-organization-qbittorrent" "plex-organization-sonarr" "plex-organization-radarr")
PATHS=("/downloads" "/downloads" "/downloads")
SUCCESS_COUNT=0

for i in "${!CONTAINERS[@]}"; do
    container="${CONTAINERS[$i]}"
    path="${PATHS[$i]}"

    echo -n "Testing $container at $path/$TEST_FILE ... "

    if docker exec "$container" test -f "$path/$TEST_FILE" 2>/dev/null; then
        # Verify content matches
        if docker exec "$container" cat "$path/$TEST_FILE" 2>/dev/null | grep -q "$TEST_CONTENT"; then
            echo "✓ PASS"
            ((SUCCESS_COUNT++))
        else
            echo "✗ FAIL (content mismatch)"
        fi
    else
        echo "✗ FAIL (file not found)"
    fi
done

# Test media directory visibility
echo -n "Testing Sonarr can see /tv directory ... "
if docker exec plex-organization-sonarr test -d "/tv" 2>/dev/null; then
    echo "✓ PASS"
    ((SUCCESS_COUNT++))
else
    echo "✗ FAIL"
fi

echo -n "Testing Radarr can see /movies directory ... "
if docker exec plex-organization-radarr test -d "/movies" 2>/dev/null; then
    echo "✓ PASS"
    ((SUCCESS_COUNT++))
else
    echo "✗ FAIL"
fi

# Cleanup test file
rm -f "/home/dustin/projects/torrents-plex-organization/data/downloads/$TEST_FILE"

echo "=== Path Visibility Results ==="
echo "Successful tests: $SUCCESS_COUNT/5"

if [ $SUCCESS_COUNT -eq 5 ]; then
    echo "✓ ALL TESTS PASSED - Path visibility is correct"
    exit 0
else
    echo "✗ SOME TESTS FAILED - Path visibility has issues"
    exit 1
fi