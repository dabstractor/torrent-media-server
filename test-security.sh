#!/bin/bash
# test-security.sh - Security test suite for qBittorrent authentication bypass configuration
# Tests various attack vectors and validates security controls

set -euo pipefail

# Configuration
QBITTORRENT_URL="${QBITTORRENT_URL:-http://localhost:8080}"
PROWLARR_URL="${PROWLARR_URL:-http://localhost:9696}"
TEST_RESULTS_FILE="security-test-results.txt"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Test result logging
log_test() {
    local test_name="$1"
    local result="$2"
    local details="$3"
    
    ((TESTS_TOTAL++))
    
    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}[PASS]${NC} $test_name"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}[FAIL]${NC} $test_name - $details"
        ((TESTS_FAILED++))
    fi
    
    echo "$(date '+%Y-%m-%d %H:%M:%S') [$result] $test_name - $details" >> "$TEST_RESULTS_FILE"
}

# Test 1: Check for global authentication bypass
test_global_auth_bypass() {
    echo -e "\n${YELLOW}Test 1: Global Authentication Bypass Check${NC}"
    
    # Try to access API without authentication from external IP
    response=$(curl -s -o /dev/null -w "%{http_code}" "$QBITTORRENT_URL/api/v2/app/version" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        log_test "Global Auth Bypass" "FAIL" "API accessible without authentication (HTTP $response)"
    elif [ "$response" = "401" ] || [ "$response" = "403" ]; then
        log_test "Global Auth Bypass" "PASS" "Authentication required (HTTP $response)"
    else
        log_test "Global Auth Bypass" "FAIL" "Unexpected response (HTTP $response)"
    fi
}

# Test 2: Check for default credentials
test_default_credentials() {
    echo -e "\n${YELLOW}Test 2: Default Credentials Check${NC}"
    
    # Try default credentials
    response=$(curl -s -X POST "$QBITTORRENT_URL/api/v2/auth/login" \
        -d "username=admin&password=adminadmin" \
        -w "\n%{http_code}" 2>/dev/null | tail -n1)
    
    if [ "$response" = "200" ]; then
        log_test "Default Credentials" "FAIL" "Default credentials accepted (admin/adminadmin)"
    else
        log_test "Default Credentials" "PASS" "Default credentials rejected"
    fi
}

# Test 3: Check CSRF protection
test_csrf_protection() {
    echo -e "\n${YELLOW}Test 3: CSRF Protection Check${NC}"
    
    # Try to make API call without proper referer
    response=$(curl -s -X POST "$QBITTORRENT_URL/api/v2/app/setPreferences" \
        -H "Referer: http://evil.com" \
        -d 'json={"test":"value"}' \
        -w "\n%{http_code}" 2>/dev/null | tail -n1)
    
    if [ "$response" = "401" ] || [ "$response" = "403" ]; then
        log_test "CSRF Protection" "PASS" "CSRF token/referer validation active"
    else
        log_test "CSRF Protection" "FAIL" "No CSRF protection (HTTP $response)"
    fi
}

# Test 4: Check host header injection
test_host_header_injection() {
    echo -e "\n${YELLOW}Test 4: Host Header Injection Check${NC}"
    
    # Try with malicious host header
    response=$(curl -s -H "Host: evil.com" "$QBITTORRENT_URL/api/v2/app/version" \
        -w "\n%{http_code}" 2>/dev/null | tail -n1)
    
    if [ "$response" = "400" ] || [ "$response" = "403" ] || [ "$response" = "421" ]; then
        log_test "Host Header Validation" "PASS" "Host header validation active"
    elif [ "$response" = "200" ]; then
        log_test "Host Header Validation" "FAIL" "Accepts arbitrary host headers"
    else
        log_test "Host Header Validation" "PASS" "Protected (HTTP $response)"
    fi
}

# Test 5: Check for command injection vulnerabilities
test_command_injection() {
    echo -e "\n${YELLOW}Test 5: Command Injection Check${NC}"
    
    # Try command injection in search (if accessible)
    payload='test"; echo "VULNERABLE" > /tmp/test.txt; echo "'
    response=$(curl -s -X POST "$QBITTORRENT_URL/api/v2/search/start" \
        -d "pattern=$payload&plugins=all&category=all" \
        -w "\n%{http_code}" 2>/dev/null | tail -n1)
    
    if [ "$response" = "401" ] || [ "$response" = "403" ]; then
        log_test "Command Injection" "PASS" "Endpoint protected by authentication"
    else
        # Check if command was executed (would need container access to verify)
        log_test "Command Injection" "WARN" "Endpoint accessible, manual verification needed"
    fi
}

# Test 6: Check for path traversal
test_path_traversal() {
    echo -e "\n${YELLOW}Test 6: Path Traversal Check${NC}"
    
    # Try to access files outside webroot
    payloads=("../../../etc/passwd" "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd" "....//....//....//etc/passwd")
    
    for payload in "${payloads[@]}"; do
        response=$(curl -s -o /dev/null -w "%{http_code}" "$QBITTORRENT_URL/$payload" 2>/dev/null || echo "000")
        
        if [ "$response" = "200" ]; then
            log_test "Path Traversal" "FAIL" "Vulnerable to path traversal with payload: $payload"
            return
        fi
    done
    
    log_test "Path Traversal" "PASS" "Path traversal attempts blocked"
}

# Test 7: Check rate limiting
test_rate_limiting() {
    echo -e "\n${YELLOW}Test 7: Rate Limiting Check${NC}"
    
    # Send rapid requests
    blocked=false
    for i in {1..20}; do
        response=$(curl -s -o /dev/null -w "%{http_code}" "$QBITTORRENT_URL/api/v2/app/version" 2>/dev/null)
        if [ "$response" = "429" ]; then
            blocked=true
            break
        fi
    done
    
    if [ "$blocked" = true ]; then
        log_test "Rate Limiting" "PASS" "Rate limiting active (triggered after $i requests)"
    else
        log_test "Rate Limiting" "FAIL" "No rate limiting detected after 20 rapid requests"
    fi
}

# Test 8: Check security headers
test_security_headers() {
    echo -e "\n${YELLOW}Test 8: Security Headers Check${NC}"
    
    headers=$(curl -s -I "$QBITTORRENT_URL" 2>/dev/null)
    missing_headers=()
    
    # Check for essential security headers
    security_headers=(
        "X-Frame-Options"
        "X-Content-Type-Options"
        "X-XSS-Protection"
        "Content-Security-Policy"
        "Strict-Transport-Security"
    )
    
    for header in "${security_headers[@]}"; do
        if ! echo "$headers" | grep -i "$header:" >/dev/null; then
            missing_headers+=("$header")
        fi
    done
    
    if [ ${#missing_headers[@]} -eq 0 ]; then
        log_test "Security Headers" "PASS" "All security headers present"
    else
        log_test "Security Headers" "FAIL" "Missing headers: ${missing_headers[*]}"
    fi
}

# Test 9: Check for information disclosure
test_information_disclosure() {
    echo -e "\n${YELLOW}Test 9: Information Disclosure Check${NC}"
    
    # Check if server version is exposed
    headers=$(curl -s -I "$QBITTORRENT_URL" 2>/dev/null)
    
    if echo "$headers" | grep -i "Server:" | grep -E "nginx|apache|qBittorrent" >/dev/null; then
        server_info=$(echo "$headers" | grep -i "Server:" | head -n1)
        log_test "Information Disclosure" "FAIL" "Server version exposed: $server_info"
    else
        log_test "Information Disclosure" "PASS" "Server version not exposed"
    fi
}

# Test 10: Check autorun configuration
test_autorun_disabled() {
    echo -e "\n${YELLOW}Test 10: Autorun Configuration Check${NC}"
    
    # Try to get preferences (if accessible)
    response=$(curl -s "$QBITTORRENT_URL/api/v2/app/preferences" 2>/dev/null)
    
    if echo "$response" | grep -q "Unauthorized"; then
        log_test "Autorun Check" "PASS" "Preferences endpoint protected"
    elif echo "$response" | grep -q '"autorun_enabled":true'; then
        log_test "Autorun Check" "FAIL" "Autorun is enabled (RCE risk)"
    elif echo "$response" | grep -q '"autorun_enabled":false'; then
        log_test "Autorun Check" "PASS" "Autorun is disabled"
    else
        log_test "Autorun Check" "WARN" "Unable to verify autorun status"
    fi
}

# Test 11: Check network isolation
test_network_isolation() {
    echo -e "\n${YELLOW}Test 11: Network Isolation Check${NC}"
    
    # Check if qBittorrent is accessible from unauthorized networks
    # This test assumes we're running from an external network
    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$QBITTORRENT_URL" 2>/dev/null || echo "000")
    
    if [ "$response" = "000" ]; then
        log_test "Network Isolation" "PASS" "Service not accessible from external network"
    elif [ "$response" = "403" ]; then
        log_test "Network Isolation" "PASS" "Access denied from external network"
    else
        log_test "Network Isolation" "FAIL" "Service accessible from external network (HTTP $response)"
    fi
}

# Test 12: Check for SSL/TLS configuration
test_ssl_configuration() {
    echo -e "\n${YELLOW}Test 12: SSL/TLS Configuration Check${NC}"
    
    # Check if HTTPS is available
    https_url="${QBITTORRENT_URL/http:/https:}"
    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 -k "$https_url" 2>/dev/null || echo "000")
    
    if [ "$response" != "000" ]; then
        # Check SSL configuration
        ssl_info=$(echo | openssl s_client -connect "${https_url#https://}" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
        if [ -n "$ssl_info" ]; then
            log_test "SSL/TLS Configuration" "PASS" "HTTPS enabled with valid certificate"
        else
            log_test "SSL/TLS Configuration" "WARN" "HTTPS enabled but certificate issues detected"
        fi
    else
        log_test "SSL/TLS Configuration" "WARN" "HTTPS not configured (recommended for production)"
    fi
}

# Test 13: Check for privilege escalation
test_privilege_escalation() {
    echo -e "\n${YELLOW}Test 13: Container Privilege Check${NC}"
    
    # Check if containers are running with excessive privileges
    privileged=$(docker inspect qbittorrent 2>/dev/null | grep -i "Privileged" | grep -c "true" || echo "0")
    
    if [ "$privileged" = "0" ]; then
        log_test "Container Privileges" "PASS" "Container not running in privileged mode"
    else
        log_test "Container Privileges" "FAIL" "Container running in privileged mode (security risk)"
    fi
    
    # Check capabilities
    caps=$(docker inspect qbittorrent 2>/dev/null | grep -A5 "CapAdd" | grep -v "null" || echo "")
    if [ -n "$caps" ]; then
        log_test "Container Capabilities" "WARN" "Container has additional capabilities: $caps"
    else
        log_test "Container Capabilities" "PASS" "No excessive capabilities granted"
    fi
}

# Test 14: Check for exposed sensitive files
test_sensitive_files() {
    echo -e "\n${YELLOW}Test 14: Sensitive Files Exposure Check${NC}"
    
    sensitive_paths=(
        ".env"
        "docker-compose.yml"
        "config/qBittorrent.conf"
        "../../../etc/passwd"
    )
    
    exposed=false
    for path in "${sensitive_paths[@]}"; do
        response=$(curl -s -o /dev/null -w "%{http_code}" "$QBITTORRENT_URL/$path" 2>/dev/null)
        if [ "$response" = "200" ]; then
            log_test "Sensitive Files" "FAIL" "Sensitive file exposed: $path"
            exposed=true
            break
        fi
    done
    
    if [ "$exposed" = false ]; then
        log_test "Sensitive Files" "PASS" "Sensitive files not exposed"
    fi
}

# Test 15: Check authentication bypass whitelist
test_auth_whitelist() {
    echo -e "\n${YELLOW}Test 15: Authentication Whitelist Configuration${NC}"
    
    # Check configuration file for dangerous whitelist
    config_file="./config/qbittorrent/qBittorrent/config/qBittorrent.conf"
    
    if [ -f "$config_file" ]; then
        if grep -q "AuthSubnetWhitelist=0.0.0.0/0" "$config_file"; then
            log_test "Auth Whitelist" "FAIL" "CRITICAL: Global authentication bypass configured (0.0.0.0/0)"
        elif grep -q "AuthSubnetWhitelistEnabled=false" "$config_file"; then
            log_test "Auth Whitelist" "PASS" "Authentication whitelist disabled"
        elif grep -q "AuthSubnetWhitelist=" "$config_file"; then
            whitelist=$(grep "AuthSubnetWhitelist=" "$config_file")
            log_test "Auth Whitelist" "WARN" "Authentication whitelist configured: $whitelist"
        else
            log_test "Auth Whitelist" "PASS" "No authentication bypass configured"
        fi
    else
        log_test "Auth Whitelist" "WARN" "Configuration file not accessible for verification"
    fi
}

# Main test execution
main() {
    echo "========================================="
    echo "qBittorrent Security Test Suite"
    echo "========================================="
    echo "Target: $QBITTORRENT_URL"
    echo "Date: $(date)"
    echo "========================================="
    
    # Clear previous results
    > "$TEST_RESULTS_FILE"
    
    # Run all tests
    test_global_auth_bypass
    test_default_credentials
    test_csrf_protection
    test_host_header_injection
    test_command_injection
    test_path_traversal
    test_rate_limiting
    test_security_headers
    test_information_disclosure
    test_autorun_disabled
    test_network_isolation
    test_ssl_configuration
    test_privilege_escalation
    test_sensitive_files
    test_auth_whitelist
    
    # Summary
    echo "========================================="
    echo -e "${YELLOW}Test Summary${NC}"
    echo "========================================="
    echo -e "Total Tests: $TESTS_TOTAL"
    echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    
    if [ "$TESTS_FAILED" -eq 0 ]; then
        echo -e "\n${GREEN}✓ All security tests passed!${NC}"
        exit 0
    else
        echo -e "\n${RED}✗ Security vulnerabilities detected!${NC}"
        echo "Review $TEST_RESULTS_FILE for details"
        exit 1
    fi
}

# Run tests
main "$@"