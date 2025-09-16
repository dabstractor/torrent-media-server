#!/bin/bash
# validate-api-connectivity.sh - Test all service APIs are working

set -euo pipefail

echo "=== API Connectivity Validation ==="

SUCCESS_COUNT=0
TOTAL_TESTS=0

# Test qBittorrent API
echo -n "Testing qBittorrent API ... "
((TOTAL_TESTS++))
if docker exec plex-organization-qbittorrent curl -s "http://localhost:8081/api/v2/app/version" 2>/dev/null | grep -q "^v"; then
    echo "✓ PASS"
    ((SUCCESS_COUNT++))
else
    echo "✗ FAIL"
fi

# Test Sonarr API
echo -n "Testing Sonarr API ... "
((TOTAL_TESTS++))
if docker exec plex-organization-sonarr curl -s -H "X-Api-Key: $SONARR_API_KEY" "http://localhost:8989/api/v3/system/status" 2>/dev/null | jq -r '.version' >/dev/null 2>&1; then
    echo "✓ PASS"
    ((SUCCESS_COUNT++))
else
    echo "✗ FAIL"
fi

# Test Radarr API
echo -n "Testing Radarr API ... "
((TOTAL_TESTS++))
if docker exec plex-organization-radarr curl -s -H "X-Api-Key: $RADARR_API_KEY" "http://localhost:7878/api/v3/system/status" 2>/dev/null | jq -r '.version' >/dev/null 2>&1; then
    echo "✓ PASS"
    ((SUCCESS_COUNT++))
else
    echo "✗ FAIL"
fi

# Test qBittorrent categories API
echo -n "Testing qBittorrent categories API ... "
((TOTAL_TESTS++))
if docker exec plex-organization-qbittorrent curl -s "http://localhost:8081/api/v2/torrents/categories" 2>/dev/null | jq . >/dev/null 2>&1; then
    echo "✓ PASS"
    ((SUCCESS_COUNT++))
else
    echo "✗ FAIL"
fi

# Test Sonarr download clients API
echo -n "Testing Sonarr download clients API ... "
((TOTAL_TESTS++))
if docker exec plex-organization-sonarr curl -s -H "X-Api-Key: $SONARR_API_KEY" "http://localhost:8989/api/v3/downloadclient" 2>/dev/null | jq . >/dev/null 2>&1; then
    echo "✓ PASS"
    ((SUCCESS_COUNT++))
else
    echo "✗ FAIL"
fi

# Test Radarr download clients API
echo -n "Testing Radarr download clients API ... "
((TOTAL_TESTS++))
if docker exec plex-organization-radarr curl -s -H "X-Api-Key: $RADARR_API_KEY" "http://localhost:7878/api/v3/downloadclient" 2>/dev/null | jq . >/dev/null 2>&1; then
    echo "✓ PASS"
    ((SUCCESS_COUNT++))
else
    echo "✗ FAIL"
fi

echo "=== API Connectivity Results ==="
echo "Successful tests: $SUCCESS_COUNT/$TOTAL_TESTS"

if [ $SUCCESS_COUNT -eq $TOTAL_TESTS ]; then
    echo "✓ ALL TESTS PASSED - API connectivity is working"
    exit 0
else
    echo "✗ SOME TESTS FAILED - API connectivity has issues"
    exit 1
fi