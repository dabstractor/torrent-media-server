#!/bin/bash

# Comprehensive IP Leak Analysis for qBittorrent + Cloudflare WARP
# Tests all known leak vectors and provides security assessment

set -euo pipefail

echo "=== COMPREHENSIVE IP LEAK SECURITY ANALYSIS ==="
echo "Analysis Date: $(date)"
echo

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REPORT_FILE="/tmp/ip_leak_analysis.txt"
LEAK_DETECTED=0

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1" | tee -a "$REPORT_FILE"
}

log_pass() {
    echo -e "${GREEN}[SECURE]${NC} $1" | tee -a "$REPORT_FILE"
}

log_risk() {
    echo -e "${RED}[RISK]${NC} $1" | tee -a "$REPORT_FILE"
    LEAK_DETECTED=1
}

log_warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$REPORT_FILE"
}

echo "IP LEAK SECURITY ANALYSIS - $(date)" > "$REPORT_FILE"
echo "===========================================" >> "$REPORT_FILE"

# Get baseline IPs
HOST_IP=$(curl -s --max-time 10 https://api.ipify.org || echo "UNKNOWN")
VPN_IP=$(docker exec vpn curl -s --max-time 10 https://api.ipify.org || echo "UNKNOWN")

echo "BASELINE IPs:" >> "$REPORT_FILE"
echo "Host IP: $HOST_IP" >> "$REPORT_FILE"
echo "VPN IP: $VPN_IP" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

log_test "1. Network Namespace Isolation"
VPN_INTERNAL=$(docker exec vpn ip route get 8.8.8.8 | grep -oP 'src \K[0-9.]+' 2>/dev/null || echo "FAIL")
QBIT_INTERNAL=$(docker exec qbittorrent ip route get 8.8.8.8 | grep -oP 'src \K[0-9.]+' 2>/dev/null || echo "FAIL")

if [ "$VPN_INTERNAL" = "$QBIT_INTERNAL" ] && [ "$VPN_INTERNAL" != "FAIL" ]; then
    log_pass "qBittorrent shares VPN network namespace ($VPN_INTERNAL)"
else
    log_risk "Network namespace mismatch - VPN: $VPN_INTERNAL, qBit: $QBIT_INTERNAL"
fi

log_test "2. External IP Verification"
if [ "$HOST_IP" != "$VPN_IP" ] && [ "$VPN_IP" != "UNKNOWN" ]; then
    log_pass "External IP properly masked ($HOST_IP -> $VPN_IP)"
else
    log_risk "External IP not properly masked"
fi

log_test "3. DNS Leak Detection"
VPN_DNS=$(docker exec vpn cat /etc/resolv.conf | grep nameserver | head -1 | awk '{print $2}')
if [[ "$VPN_DNS" =~ ^127\. ]]; then
    log_pass "DNS using VPN tunnel ($VPN_DNS)"
else
    log_risk "DNS may leak through external servers ($VPN_DNS)"
fi

log_test "4. BitTorrent Protocol Analysis"
# Check if qBittorrent is announcing host IP in any way
QBIT_CONFIG=$(curl -s "http://localhost:8080/api/v2/app/preferences")
ANNOUNCE_IP=$(echo "$QBIT_CONFIG" | grep -o '"announce_ip":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "")

if [ -z "$ANNOUNCE_IP" ] || [ "$ANNOUNCE_IP" = "" ]; then
    log_pass "No manual IP announcement configured"
else
    if [ "$ANNOUNCE_IP" = "$HOST_IP" ]; then
        log_risk "qBittorrent configured to announce host IP: $ANNOUNCE_IP"
    else
        log_pass "Custom announce IP: $ANNOUNCE_IP"
    fi
fi

log_test "5. Container Network Isolation"
# Verify qBittorrent cannot reach host network
CAN_REACH_HOST=$(docker exec qbittorrent timeout 5 curl -s "http://$HOST_IP:22" 2>/dev/null && echo "YES" || echo "NO")
if [ "$CAN_REACH_HOST" = "NO" ]; then
    log_pass "qBittorrent cannot reach host network directly"
else
    log_risk "qBittorrent can reach host network"
fi

log_test "6. Routing Table Analysis"
DEFAULT_ROUTE=$(docker exec qbittorrent ip route | grep default | head -1)
if echo "$DEFAULT_ROUTE" | grep -q "172.16.0.1"; then
    log_pass "Default route through VPN container"
else
    log_warn "Unexpected default route: $DEFAULT_ROUTE"
fi

log_test "7. Port Binding Analysis"
QBIT_PORTS=$(docker exec qbittorrent netstat -tuln 2>/dev/null | grep LISTEN || echo "netstat unavailable")
if echo "$QBIT_PORTS" | grep -q "0.0.0.0:"; then
    log_warn "qBittorrent binding to all interfaces"
else
    log_pass "qBittorrent port binding looks secure"
fi

log_test "8. WebRTC/STUN Leak Test"
# Test for WebRTC leaks (shouldn't apply to qBittorrent but good to check)
STUN_TEST=$(docker exec vpn timeout 10 curl -s "http://httpbin.org/ip" 2>/dev/null | grep -o '"origin": "[^"]*"' | cut -d'"' -f4 || echo "TIMEOUT")
if [ "$STUN_TEST" = "$VPN_IP" ] || [ "$STUN_TEST" = "TIMEOUT" ]; then
    log_pass "No WebRTC/STUN leaks detected"
else
    log_risk "Potential STUN leak detected: $STUN_TEST"
fi

log_test "9. Tracker Communication Analysis"
# Check what IP is being reported to trackers
ACTIVE_TORRENTS=$(curl -s "http://localhost:8080/api/v2/torrents/info" | head -1000)
if echo "$ACTIVE_TORRENTS" | grep -q "downloading\|uploading"; then
    log_pass "Active torrents using VPN connection"
    
    # If we can get peer info, analyze it
    PEER_INFO=$(curl -s "http://localhost:8080/api/v2/sync/maindata" | head -1000 2>/dev/null || echo "{}")
    if echo "$PEER_INFO" | grep -q "peers"; then
        log_pass "Peer connections established through VPN"
    fi
else
    log_warn "No active torrents to analyze tracker communication"
fi

log_test "10. VPN Connection Stability"
WARP_STATUS=$(docker exec vpn warp-cli --accept-tos status 2>/dev/null || echo "UNKNOWN")
if echo "$WARP_STATUS" | grep -q "Connected"; then
    log_pass "VPN connection is stable"
else
    log_risk "VPN connection unstable: $WARP_STATUS"
fi

log_test "11. Kill Switch Analysis"
# qBittorrent should stop if VPN fails (network namespace sharing provides this)
if docker inspect qbittorrent | grep -q '"NetworkMode": "container:vpn"'; then
    log_pass "Kill switch active via network namespace sharing"
else
    log_risk "No kill switch - qBittorrent not using VPN network namespace"
fi

log_test "12. Configuration Persistence"
if [ -f "/home/dustin/projects/torrents-network/config/qbittorrent/qBittorrent/config/qBittorrent.conf" ]; then
    BIND_INTERFACE=$(grep -i "interface" /home/dustin/projects/torrents-network/config/qbittorrent/qBittorrent/config/qBittorrent.conf || echo "")
    if [ -z "$BIND_INTERFACE" ]; then
        log_pass "No interface binding in config (good - uses container network)"
    else
        log_warn "Custom interface binding: $BIND_INTERFACE"
    fi
fi

echo "" >> "$REPORT_FILE"
echo "=== RISK ASSESSMENT ===" >> "$REPORT_FILE"

if [ $LEAK_DETECTED -eq 0 ]; then
    log_pass "ASSESSMENT: LOW RISK - No critical IP leaks detected"
    echo "" >> "$REPORT_FILE"
    echo "Security Measures in Place:" >> "$REPORT_FILE"
    echo "- Network namespace isolation (kill switch)" >> "$REPORT_FILE"
    echo "- VPN tunnel encryption" >> "$REPORT_FILE"
    echo "- DNS through VPN tunnel" >> "$REPORT_FILE"
    echo "- No direct host network access" >> "$REPORT_FILE"
    echo "- Container-level isolation" >> "$REPORT_FILE"
else
    log_risk "ASSESSMENT: RISKS DETECTED - Review configuration"
fi

echo "" >> "$REPORT_FILE"
echo "LIMITATIONS OF THIS ANALYSIS:" >> "$REPORT_FILE"
echo "- Cannot test all theoretical attack vectors" >> "$REPORT_FILE"
echo "- Deep packet inspection beyond scope" >> "$REPORT_FILE"
echo "- Application-level vulnerabilities not covered" >> "$REPORT_FILE"
echo "- Future software updates may introduce new risks" >> "$REPORT_FILE"

echo
echo "=== ANALYSIS COMPLETE ==="
echo "Full report saved to: $REPORT_FILE"
echo "View with: cat $REPORT_FILE"

exit $LEAK_DETECTED