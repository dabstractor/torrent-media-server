#!/bin/bash

# validate_network_isolation.sh
# Comprehensive validation script for secure container network architecture

set -e

echo "=================================="
echo "Network Isolation Validation Test"
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED_TESTS=0
TOTAL_TESTS=0

run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"  # "pass" or "fail"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${YELLOW}Running: $test_name${NC}"
    
    if eval "$test_command"; then
        if [ "$expected_result" = "pass" ]; then
            echo -e "${GREEN}✓ PASS: $test_name${NC}"
        else
            echo -e "${RED}✗ FAIL: $test_name (expected failure but passed)${NC}"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    else
        if [ "$expected_result" = "fail" ]; then
            echo -e "${GREEN}✓ PASS: $test_name (correctly failed)${NC}"
        else
            echo -e "${RED}✗ FAIL: $test_name${NC}"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    fi
    echo ""
}

echo "Level 1: Configuration Validation"
echo "================================="

# Test 1: Validate Docker Compose syntax
run_test "Docker Compose syntax validation" "docker-compose config --quiet" "pass"

# Test 2: Check network configuration
run_test "VPN network exists" "docker network inspect vpn_network > /dev/null 2>&1" "pass"
run_test "Media network exists" "docker network inspect media_network > /dev/null 2>&1" "pass"

# Test 3: Verify no namespace sharing
run_test "No namespace sharing detected" "! grep -q 'network_mode: service' docker-compose.yml" "pass"

echo "Level 2: Network Isolation Testing"
echo "=================================="

# Wait for containers to be healthy
echo "Waiting for Gluetun to be healthy..."
timeout 120s bash -c 'while [ "$(docker inspect --format="{{.State.Health.Status}}" gluetun 2>/dev/null)" != "healthy" ]; do sleep 2; done' || {
    echo -e "${RED}Gluetun did not become healthy within 120 seconds${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
}

# Test 4: Verify VPN container isolation
run_test "Gluetun cannot reach host network" "! timeout 5s docker exec gluetun ping -c 1 host.docker.internal > /dev/null 2>&1" "pass"

# Test 5: Test service IP consistency
VPN_IP=$(timeout 10s docker exec gluetun wget -qO- ifconfig.me 2>/dev/null || echo "")
QB_IP=$(timeout 10s docker exec qbittorrent wget -qO- ifconfig.me 2>/dev/null || echo "")

if [ -n "$VPN_IP" ] && [ -n "$QB_IP" ] && [ "$VPN_IP" = "$QB_IP" ]; then
    echo -e "${GREEN}✓ PASS: IP addresses match (VPN: $VPN_IP, qBittorrent: $QB_IP)${NC}"
else
    echo -e "${RED}✗ FAIL: IP addresses don't match (VPN: $VPN_IP, qBittorrent: $QB_IP)${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo ""
echo "Level 3: Service Communication Testing"
echo "======================================"

# Test 6: Web-UI health
run_test "Web-UI health check" "timeout 10s curl -f http://localhost:8787/health > /dev/null 2>&1" "pass"

# Test 7: Inter-service communication
run_test "Prowlarr to qBittorrent communication" "timeout 10s docker exec prowlarr wget -qO- http://qbittorrent:8080 > /dev/null 2>&1" "pass"

echo "Summary"
echo "======="
echo "Total tests: $TOTAL_TESTS"
echo "Failed tests: $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}All tests passed! Network isolation is working correctly.${NC}"
    exit 0
else
    echo -e "${RED}$FAILED_TESTS tests failed. Network isolation may not be working correctly.${NC}"
    exit 1
fi