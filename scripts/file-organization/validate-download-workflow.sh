#!/bin/bash
# validate-download-workflow.sh - Test end-to-end download workflow

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Download Workflow Validation ==="

SUCCESS_COUNT=0
TOTAL_TESTS=0

# Test 1: Check qBittorrent categories are configured correctly
echo -n "Testing qBittorrent categories configuration ... "
((TOTAL_TESTS++))

CATEGORIES=$(docker exec plex-organization-qbittorrent curl -s "http://localhost:8081/api/v2/torrents/categories" 2>/dev/null)
if echo "$CATEGORIES" | jq -e '.["sonarr"] and .["radarr"]' >/dev/null 2>&1; then
    SONARR_PATH=$(echo "$CATEGORIES" | jq -r '.["sonarr"].savePath')
    RADARR_PATH=$(echo "$CATEGORIES" | jq -r '.["radarr"].savePath')

    if [ "$SONARR_PATH" = "/downloads/complete" ] && [ "$RADARR_PATH" = "/downloads/complete" ]; then
        echo "✓ PASS"
        ((SUCCESS_COUNT++))
    else
        echo "✗ FAIL (incorrect paths: sonarr=$SONARR_PATH, radarr=$RADARR_PATH)"
    fi
else
    echo "✗ FAIL (missing categories)"
fi

# Test 2: Check Sonarr download client configuration
echo -n "Testing Sonarr download client configuration ... "
((TOTAL_TESTS++))

SONARR_DL_CLIENTS=$(curl -s -H "X-Api-Key: $SONARR_API_KEY" "http://localhost:34245/api/v3/downloadclient" 2>/dev/null)
if echo "$SONARR_DL_CLIENTS" | jq -e '.[0]' >/dev/null 2>&1; then
    # Check if qBittorrent client exists and has correct category
    QBT_CLIENT=$(echo "$SONARR_DL_CLIENTS" | jq -r '.[] | select(.implementation == "QBittorrent")')
    if [ -n "$QBT_CLIENT" ]; then
        CATEGORY=$(echo "$QBT_CLIENT" | jq -r '.fields[] | select(.name == "tvCategory") | .value')
        if [ "$CATEGORY" = "sonarr" ]; then
            echo "✓ PASS"
            ((SUCCESS_COUNT++))
        else
            echo "✗ FAIL (incorrect category: $CATEGORY)"
        fi
    else
        echo "✗ FAIL (no qBittorrent client found)"
    fi
else
    echo "✗ FAIL (no download clients configured)"
fi

# Test 3: Check Radarr download client configuration
echo -n "Testing Radarr download client configuration ... "
((TOTAL_TESTS++))

RADARR_DL_CLIENTS=$(curl -s -H "X-Api-Key: $RADARR_API_KEY" "http://localhost:25860/api/v3/downloadclient" 2>/dev/null)
if echo "$RADARR_DL_CLIENTS" | jq -e '.[0]' >/dev/null 2>&1; then
    # Check if qBittorrent client exists and has correct category
    QBT_CLIENT=$(echo "$RADARR_DL_CLIENTS" | jq -r '.[] | select(.implementation == "QBittorrent")')
    if [ -n "$QBT_CLIENT" ]; then
        CATEGORY=$(echo "$QBT_CLIENT" | jq -r '.fields[] | select(.name == "movieCategory") | .value')
        if [ "$CATEGORY" = "radarr" ]; then
            echo "✓ PASS"
            ((SUCCESS_COUNT++))
        else
            echo "✗ FAIL (incorrect category: $CATEGORY)"
        fi
    else
        echo "✗ FAIL (no qBittorrent client found)"
    fi
else
    echo "✗ FAIL (no download clients configured)"
fi

# Test 4: Check removeCompletedDownloads setting
echo -n "Testing removeCompletedDownloads settings ... "
((TOTAL_TESTS++))

SONARR_REMOVE=$(echo "$SONARR_DL_CLIENTS" | jq -r '.[] | select(.implementation == "QBittorrent") | .fields[] | select(.name == "removeCompletedDownloads") | .value')
RADARR_REMOVE=$(echo "$RADARR_DL_CLIENTS" | jq -r '.[] | select(.implementation == "QBittorrent") | .fields[] | select(.name == "removeCompletedDownloads") | .value')

if [ "$SONARR_REMOVE" = "true" ] && [ "$RADARR_REMOVE" = "true" ]; then
    echo "✓ PASS"
    ((SUCCESS_COUNT++))
else
    echo "✗ FAIL (sonarr=$SONARR_REMOVE, radarr=$RADARR_REMOVE)"
fi

# Test 5: Check download directory permissions
echo -n "Testing download directory permissions ... "
((TOTAL_TESTS++))

# Test if containers can create files in download directory
if docker exec plex-organization-sonarr touch "/downloads/sonarr_test_$(date +%s)" 2>/dev/null && \
   docker exec plex-organization-radarr touch "/downloads/radarr_test_$(date +%s)" 2>/dev/null; then
    echo "✓ PASS"
    ((SUCCESS_COUNT++))
    # Cleanup test files
    docker exec plex-organization-sonarr find /downloads -name "*_test_*" -delete 2>/dev/null || true
    docker exec plex-organization-radarr find /downloads -name "*_test_*" -delete 2>/dev/null || true
else
    echo "✗ FAIL"
fi

echo "=== Download Workflow Results ==="
echo "Successful tests: $SUCCESS_COUNT/$TOTAL_TESTS"

if [ $SUCCESS_COUNT -eq $TOTAL_TESTS ]; then
    echo "✓ ALL TESTS PASSED - Download workflow is properly configured"
    exit 0
else
    echo "✗ SOME TESTS FAILED - Download workflow has configuration issues"
    exit 1
fi