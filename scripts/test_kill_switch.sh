#!/bin/bash

# test_kill_switch.sh
# Test VPN kill switch functionality

set -e

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

echo "==============================="
echo "VPN Kill Switch Testing Script"
echo "==============================="

# Ensure containers are running
echo "Checking container status..."
if ! docker ps | grep -q gluetun; then
    echo -e "${RED}Error: Gluetun container is not running${NC}"
    exit 1
fi

if ! docker ps | grep -q qbittorrent; then
    echo -e "${RED}Error: qBittorrent container is not running${NC}"
    exit 1
fi

echo ""
echo "Test 1: Normal VPN Operation"
echo "============================="

# Test normal operation first
run_test "Gluetun VPN connectivity" "timeout 10s docker exec gluetun wget -qO- ifconfig.me > /dev/null 2>&1" "pass"
run_test "qBittorrent through VPN" "timeout 10s docker exec qbittorrent wget -qO- ifconfig.me > /dev/null 2>&1" "pass"

# Get baseline VPN IP
echo "Getting VPN IP address..."
VPN_IP=$(timeout 10s docker exec gluetun wget -qO- ifconfig.me 2>/dev/null || echo "UNKNOWN")
echo "VPN IP: $VPN_IP"

echo ""
echo "Test 2: Kill Switch Activation"
echo "==============================="

echo "Simulating VPN failure by stopping VPN connection..."
echo "WARNING: This will temporarily break VPN connectivity"

# Method 1: Kill VPN process inside container
echo "Attempting to disrupt VPN connection..."
docker exec gluetun pkill -f "wireguard\|openvpn\|gluetun" > /dev/null 2>&1 || true

# Wait a moment for kill switch to activate
echo "Waiting 10 seconds for kill switch to activate..."
sleep 10

# Test that traffic is blocked
run_test "Traffic blocked when VPN down" "! timeout 5s docker exec qbittorrent wget -qO- ifconfig.me > /dev/null 2>&1" "pass"
run_test "DNS queries blocked when VPN down" "! timeout 5s docker exec qbittorrent nslookup google.com > /dev/null 2>&1" "pass"

echo ""
echo "Test 3: VPN Recovery"
echo "==================="

echo "Restarting Gluetun to restore VPN..."
docker restart gluetun

echo "Waiting 30 seconds for VPN to recover..."
sleep 30

# Wait for health check
echo "Waiting for Gluetun to become healthy..."
timeout 90s bash -c 'while [ "$(docker inspect --format="{{.State.Health.Status}}" gluetun 2>/dev/null)" != "healthy" ]; do sleep 2; done' || {
    echo -e "${RED}Gluetun did not recover within 90 seconds${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
}

# Test recovery
run_test "VPN connectivity restored" "timeout 15s docker exec gluetun wget -qO- ifconfig.me > /dev/null 2>&1" "pass"
run_test "qBittorrent connectivity restored" "timeout 15s docker exec qbittorrent wget -qO- ifconfig.me > /dev/null 2>&1" "pass"

# Verify same IP
RECOVERED_IP=$(timeout 10s docker exec qbittorrent wget -qO- ifconfig.me 2>/dev/null || echo "UNKNOWN")
if [ "$VPN_IP" = "$RECOVERED_IP" ] && [ "$VPN_IP" != "UNKNOWN" ]; then
    echo -e "${GREEN}✓ PASS: VPN IP recovered correctly ($RECOVERED_IP)${NC}"
else
    echo -e "${RED}✗ FAIL: VPN IP different after recovery (Before: $VPN_IP, After: $RECOVERED_IP)${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo ""
echo "Summary"
echo "======="
echo "Total tests: $TOTAL_TESTS"
echo "Failed tests: $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}All kill switch tests passed!${NC}"
    echo "The VPN kill switch is working correctly."
    exit 0
else
    echo -e "${RED}$FAILED_TESTS kill switch tests failed.${NC}"
    echo "The kill switch may not be working correctly."
    exit 1
fi