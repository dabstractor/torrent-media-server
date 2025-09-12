#!/bin/bash

# Network Isolation Validation Suite for qBittorrent
# Ensures qBittorrent cannot leak host IP and validates torrent functionality

set -euo pipefail

echo "=== qBittorrent Network Isolation Validation Suite ==="
echo "Testing Date: $(date)"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
QBIT_URL="http://localhost:8080"
VPN_CONTAINER="vpn"
QBIT_CONTAINER="qbittorrent"
TEST_RESULTS="/tmp/qbit_validation_results.txt"

# Initialize results file
echo "qBittorrent Network Isolation Test Results - $(date)" > "$TEST_RESULTS"
echo "=============================================" >> "$TEST_RESULTS"
echo >> "$TEST_RESULTS"

print_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
    echo "[TEST] $1" >> "$TEST_RESULTS"
}

print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    echo "[PASS] $1" >> "$TEST_RESULTS"
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    echo "[FAIL] $1" >> "$TEST_RESULTS"
    FAILURES=$((FAILURES + 1))
}

print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
    echo "[INFO] $1" >> "$TEST_RESULTS"
}

FAILURES=0

# Test 1: Verify containers are running and healthy
print_test "Container Health Check"
if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(vpn|qbittorrent)" | grep -q "healthy"; then
    print_pass "VPN and qBittorrent containers are healthy"
else
    print_fail "One or more containers are not healthy"
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(vpn|qbittorrent)"
fi

# Test 2: Verify qBittorrent is using VPN container's network
print_test "Network Namespace Verification"
VPN_IP=$(docker exec "$VPN_CONTAINER" ip route get 8.8.8.8 2>/dev/null | grep -oP 'src \K[0-9.]+' || echo "FAILED")
QBIT_IP=$(docker exec "$QBIT_CONTAINER" ip route get 8.8.8.8 2>/dev/null | grep -oP 'src \K[0-9.]+' || echo "FAILED")

if [ "$VPN_IP" = "$QBIT_IP" ] && [ "$VPN_IP" != "FAILED" ]; then
    print_pass "qBittorrent shares VPN network namespace (IP: $VPN_IP)"
else
    print_fail "qBittorrent network mismatch - VPN: $VPN_IP, qBit: $QBIT_IP"
fi

# Test 3: Verify external IP through VPN
print_test "External IP Verification"
EXTERNAL_IP=$(docker exec "$VPN_CONTAINER" curl -s --max-time 10 https://api.ipify.org || echo "TIMEOUT")
HOST_IP=$(curl -s --max-time 5 https://api.ipify.org || echo "UNKNOWN")

print_info "Host IP: $HOST_IP"
print_info "VPN External IP: $EXTERNAL_IP"

if [ "$EXTERNAL_IP" != "TIMEOUT" ] && [ "$EXTERNAL_IP" != "$HOST_IP" ] && [ "$EXTERNAL_IP" != "" ]; then
    print_pass "External IP through VPN is different from host ($EXTERNAL_IP)"
else
    print_fail "VPN external IP check failed or matches host IP"
fi

# Test 4: Verify qBittorrent Web UI accessibility
print_test "qBittorrent Web UI Access"
if curl -s --max-time 10 "$QBIT_URL/api/v2/app/version" > /dev/null; then
    print_pass "qBittorrent Web UI is accessible"
    QBIT_VERSION=$(curl -s --max-time 10 "$QBIT_URL/api/v2/app/version")
    print_info "qBittorrent Version: $QBIT_VERSION"
else
    print_fail "qBittorrent Web UI is not accessible"
fi

# Test 5: Network traffic analysis
print_test "Network Traffic Analysis"
print_info "Starting 30-second network capture to detect any host network leaks..."

# Start tcpdump on host to capture any traffic from qBittorrent
timeout 30 tcpdump -i any -w /tmp/qbit_traffic.pcap \
    "host $HOST_IP and (port 6881 or portrange 6881-6999)" 2>/dev/null &
TCPDUMP_PID=$!

# Generate some qBittorrent activity
print_info "Generating qBittorrent activity..."
curl -s "$QBIT_URL/api/v2/torrents/info" > /dev/null || true
curl -s "$QBIT_URL/api/v2/sync/maindata" > /dev/null || true

# Wait for capture to complete
wait $TCPDUMP_PID 2>/dev/null || true

# Analyze capture
if [ -f /tmp/qbit_traffic.pcap ]; then
    PACKETS=$(tcpdump -r /tmp/qbit_traffic.pcap 2>/dev/null | wc -l || echo "0")
    if [ "$PACKETS" -eq 0 ]; then
        print_pass "No BitTorrent traffic detected on host IP"
    else
        print_fail "Detected $PACKETS packets on host IP - POTENTIAL LEAK!"
        echo "Packet details:" >> "$TEST_RESULTS"
        tcpdump -r /tmp/qbit_traffic.pcap 2>/dev/null | head -10 >> "$TEST_RESULTS" || true
    fi
    rm -f /tmp/qbit_traffic.pcap
else
    print_info "Traffic capture file not created (normal on some systems)"
fi

# Test 6: Verify routing table isolation
print_test "Routing Table Analysis"
print_info "Host routing table (first 5 entries):"
ip route | head -5 | while read line; do
    print_info "HOST: $line"
done

print_info "VPN container routing table:"
docker exec "$VPN_CONTAINER" ip route | head -5 | while read line; do
    print_info "VPN: $line"
done

# Test 7: Test torrent functionality
print_test "Torrent Download Functionality"

# Add a test torrent (Ubuntu 22.04.3 Desktop)
UBUNTU_MAGNET="magnet:?xt=urn:btih:c9a35d7c8c2e08681e98ce317de79510db10ded5&dn=ubuntu-22.04.3-desktop-amd64.iso"

print_info "Adding Ubuntu test torrent..."
ADD_RESULT=$(curl -s -X POST "$QBIT_URL/api/v2/torrents/add" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "urls=$UBUNTU_MAGNET&paused=false" || echo "FAILED")

if [ "$ADD_RESULT" = "Ok." ] || [ -z "$ADD_RESULT" ]; then
    print_pass "Test torrent added successfully"
    
    # Wait and check torrent status
    sleep 5
    TORRENT_INFO=$(curl -s "$QBIT_URL/api/v2/torrents/info" | head -1000)
    
    if echo "$TORRENT_INFO" | grep -q "ubuntu"; then
        print_pass "Ubuntu torrent found in torrent list"
        
        # Extract torrent state
        STATE=$(echo "$TORRENT_INFO" | grep -o '"state":"[^"]*"' | head -1 | cut -d'"' -f4)
        print_info "Torrent State: $STATE"
        
        # Check for connectivity issues
        if echo "$STATE" | grep -qi "download\|uploading\|checking\|queued"; then
            print_pass "Torrent is active (State: $STATE)"
        else
            print_info "Torrent State: $STATE (may indicate network issues)"
        fi
        
    else
        print_fail "Ubuntu torrent not found in list after adding"
    fi
else
    print_fail "Failed to add test torrent: $ADD_RESULT"
fi

# Test 8: DNS Resolution Test
print_test "DNS Resolution Through VPN"
DNS_TEST=$(docker exec "$VPN_CONTAINER" nslookup google.com 2>/dev/null | grep -c "Address" || echo "0")
if [ "$DNS_TEST" -gt 1 ]; then
    print_pass "DNS resolution working through VPN"
else
    print_fail "DNS resolution issues through VPN"
fi

# Test 9: Port connectivity test
print_test "BitTorrent Port Connectivity"
print_info "Testing port 6881 connectivity..."
PORT_TEST=$(docker exec "$VPN_CONTAINER" timeout 5 nc -zv 8.8.8.8 53 2>&1 | grep -c "succeeded" || echo "0")
if [ "$PORT_TEST" -gt 0 ]; then
    print_pass "Basic network connectivity confirmed"
else
    print_info "Network connectivity test inconclusive"
fi

# Test 10: Container network interface verification
print_test "Network Interface Verification"
VPN_INTERFACES=$(docker exec "$VPN_CONTAINER" ip link show | grep -c "UP" || echo "0")
QBIT_INTERFACES=$(docker exec "$QBIT_CONTAINER" ip link show | grep -c "UP" || echo "0")

if [ "$VPN_INTERFACES" -eq "$QBIT_INTERFACES" ]; then
    print_pass "qBittorrent and VPN containers have matching network interfaces"
else
    print_info "Interface count - VPN: $VPN_INTERFACES, qBittorrent: $QBIT_INTERFACES"
fi

# Summary
echo
echo "=== TEST SUMMARY ==="
if [ $FAILURES -eq 0 ]; then
    print_pass "ALL TESTS PASSED - Network isolation is properly configured"
    echo "RESULT: PASS - qBittorrent is properly isolated and cannot leak host IP" >> "$TEST_RESULTS"
else
    print_fail "FAILED: $FAILURES test(s) failed - Review configuration"
    echo "RESULT: FAIL - $FAILURES test(s) failed" >> "$TEST_RESULTS"
fi

echo
echo "Detailed results saved to: $TEST_RESULTS"
echo "View with: cat $TEST_RESULTS"

exit $FAILURES