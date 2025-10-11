#!/bin/bash
# validate-cleanuparr.sh - Comprehensive validation of Cleanuparr integration
# Tests the complete integration: health checks, service connectivity, module status

set +e  # Don't exit on errors - we want to count them

echo "=== Cleanuparr Integration Validation ==="
echo "Validating Cleanuparr automated cleanup and queue management..."

# Configuration
CLEANUPARR_HOST="${1:-localhost}"
CLEANUPARR_PORT="${2:-11011}"

# Environment variables (from .env or defaults)
TORRENT_CLIENT="${TORRENT_CLIENT:-qbittorrent}"

LOG_FILE="/tmp/cleanuparr_validation.log"
VALIDATION_ERRORS=0

# Logging function
log() {
    local level="$1"
    local message="$2"
    echo "$(date '+%Y-%m-%d %H:%M:%S'): [$level] $message" | tee -a "$LOG_FILE"
}

# Error handling
error() {
    log "ERROR" "$1"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
}

# Success logging
success() {
    log "SUCCESS" "$1"
}

# Test API connectivity with timeout
test_api_connectivity() {
    local name="$1"
    local url="$2"
    local api_key="$3"

    log "TEST" "Testing $name connectivity..."

    local response
    if [ -n "$api_key" ]; then
        response=$(curl -s -m 10 -o /dev/null -w "%{http_code}" \
            -H "X-Api-Key: $api_key" \
            "$url" 2>/dev/null)
    else
        response=$(curl -s -m 10 -o /dev/null -w "%{http_code}" \
            "$url" 2>/dev/null)
    fi

    if [ "$response" = "200" ]; then
        success "$name is accessible (HTTP $response)"
        return 0
    else
        error "$name is not accessible (HTTP $response)"
        return 1
    fi
}

# Test Cleanuparr health endpoint
test_cleanuparr_health() {
    log "TEST" "Testing Cleanuparr health endpoint..."

    local response
    response=$(curl -s -m 10 "http://${CLEANUPARR_HOST}:${CLEANUPARR_PORT}/health" 2>/dev/null)
    local exit_code=$?

    if [ $exit_code -eq 0 ] && [ -n "$response" ]; then
        success "Cleanuparr health check passed"
        log "INFO" "Health response: $response"
        return 0
    else
        error "Cleanuparr health check failed (curl exit code: $exit_code)"
        return 1
    fi
}

# Test Cleanuparr readiness endpoint
test_cleanuparr_ready() {
    log "TEST" "Testing Cleanuparr readiness endpoint..."

    local http_code
    http_code=$(curl -s -m 10 -o /dev/null -w "%{http_code}" \
        "http://${CLEANUPARR_HOST}:${CLEANUPARR_PORT}/health/ready" 2>/dev/null)

    if [ "$http_code" = "200" ]; then
        success "Cleanuparr is ready to serve traffic (HTTP $http_code)"
        return 0
    else
        error "Cleanuparr is not ready (HTTP $http_code)"
        return 1
    fi
}

# Test Cleanuparr web UI accessibility
test_cleanuparr_web_ui() {
    log "TEST" "Testing Cleanuparr web UI accessibility..."

    local http_code
    http_code=$(curl -s -m 10 -o /dev/null -w "%{http_code}" \
        "http://${CLEANUPARR_HOST}:${CLEANUPARR_PORT}/" 2>/dev/null)

    if [ "$http_code" = "200" ] || [ "$http_code" = "302" ]; then
        success "Cleanuparr web UI is accessible (HTTP $http_code)"
        return 0
    else
        error "Cleanuparr web UI is not accessible (HTTP $http_code)"
        return 1
    fi
}

# Test connectivity from Cleanuparr container to torrent client
test_torrent_client_connectivity() {
    log "TEST" "Testing Cleanuparr → Torrent Client connectivity..."

    # Determine port based on torrent client
    local torrent_port
    if [ "$TORRENT_CLIENT" = "transmission" ]; then
        torrent_port="9091"
        local endpoint="/transmission/rpc"
    else
        torrent_port="8080"
        local endpoint="/api/v2/app/version"
    fi

    log "INFO" "Testing connection to $TORRENT_CLIENT at http://vpn:$torrent_port"

    # Test from within cleanuparr container
    local response
    response=$(docker compose exec -T cleanuparr curl -s -m 5 -o /dev/null -w "%{http_code}" \
        "http://vpn:$torrent_port$endpoint" 2>/dev/null)

    if [ "$response" = "200" ] || [ "$response" = "401" ] || [ "$response" = "409" ]; then
        success "Cleanuparr can reach torrent client via VPN container (HTTP $response)"
        return 0
    else
        error "Cleanuparr cannot reach torrent client (HTTP $response)"
        return 1
    fi
}

# Test connectivity from Cleanuparr container to *arr apps
test_arr_app_connectivity() {
    local app_name="$1"
    local app_host="$2"
    local app_port="$3"
    local app_api_key="$4"

    log "TEST" "Testing Cleanuparr → $app_name connectivity..."

    local response
    response=$(docker compose exec -T cleanuparr curl -s -m 5 -o /dev/null -w "%{http_code}" \
        -H "X-Api-Key: $app_api_key" \
        "http://$app_host:$app_port/api/v3/system/status" 2>/dev/null)

    if [ "$response" = "200" ]; then
        success "Cleanuparr can reach $app_name at http://$app_host:$app_port"
        return 0
    else
        error "Cleanuparr cannot reach $app_name (HTTP $response)"
        return 1
    fi
}

# Verify configuration file was generated
test_config_generation() {
    log "TEST" "Verifying Cleanuparr configuration generation..."

    if docker compose exec -T cleanuparr test -f /config/config.json; then
        success "Configuration file exists"

        # Validate JSON syntax
        if docker compose exec -T cleanuparr sh -c 'command -v jq > /dev/null && jq empty /config/config.json' 2>/dev/null; then
            success "Configuration file is valid JSON"
        else
            log "WARNING" "jq not available in container or JSON invalid"
        fi

        # Check for required keys
        local config_content
        config_content=$(docker compose exec -T cleanuparr cat /config/config.json 2>/dev/null)

        if echo "$config_content" | grep -q "downloadClients"; then
            success "Configuration contains downloadClients section"
        else
            error "Configuration missing downloadClients section"
        fi

        if echo "$config_content" | grep -q "applications"; then
            success "Configuration contains applications section"
        else
            error "Configuration missing applications section"
        fi

        if echo "$config_content" | grep -q "malwareBlocker"; then
            success "Configuration contains malwareBlocker section"
        else
            error "Configuration missing malwareBlocker section"
        fi

        return 0
    else
        error "Configuration file does not exist"
        return 1
    fi
}

# Verify VPN isolation is not broken
test_vpn_isolation() {
    log "TEST" "Verifying VPN isolation not broken by Cleanuparr..."

    # Run the VPN validation script
    if [ -f "./scripts/validate-vpn.sh" ]; then
        if ./scripts/validate-vpn.sh > /dev/null 2>&1; then
            success "VPN isolation is preserved - torrent clients still use VPN IP"
            return 0
        else
            error "VPN isolation may be compromised - validate-vpn.sh failed"
            return 1
        fi
    else
        log "WARNING" "VPN validation script not found - skipping VPN isolation test"
        return 0
    fi
}

# Check container health status
test_container_health() {
    log "TEST" "Checking Cleanuparr container health status..."

    local health_status
    health_status=$(docker inspect --format='{{.State.Health.Status}}' \
        "${CONTAINER_PREFIX}cleanuparr" 2>/dev/null)

    if [ "$health_status" = "healthy" ]; then
        success "Cleanuparr container is healthy"
        return 0
    elif [ "$health_status" = "starting" ]; then
        log "WARNING" "Cleanuparr container is still starting (give it more time)"
        return 1
    else
        error "Cleanuparr container is not healthy (status: $health_status)"
        return 1
    fi
}

# Check logs for errors
test_logs_for_errors() {
    log "TEST" "Checking Cleanuparr logs for critical errors..."

    local error_count
    error_count=$(docker compose logs --tail=100 cleanuparr 2>/dev/null | \
        grep -iE "ERROR|CRITICAL|FATAL|Exception" | wc -l)

    if [ "$error_count" -eq 0 ]; then
        success "No critical errors found in recent logs"
        return 0
    else
        log "WARNING" "Found $error_count potential error messages in logs"
        log "INFO" "Review logs with: docker compose logs cleanuparr"
        return 0  # Don't fail validation for warnings
    fi
}

# Main validation function
run_validation() {
    log "INFO" "Starting Cleanuparr validation..."
    echo "" > "$LOG_FILE"  # Initialize log file

    echo ""
    echo "🏥 Testing Cleanuparr Health..."
    test_cleanuparr_health
    test_cleanuparr_ready
    test_cleanuparr_web_ui
    test_container_health

    echo ""
    echo "⚙️  Testing Configuration..."
    test_config_generation

    echo ""
    echo "🔌 Testing Network Connectivity..."
    test_torrent_client_connectivity
    if [ -n "$SONARR_API_KEY" ]; then
        test_arr_app_connectivity "Sonarr" "sonarr" "8989" "$SONARR_API_KEY"
    else
        log "WARNING" "SONARR_API_KEY not set - skipping Sonarr connectivity test"
    fi
    if [ -n "$RADARR_API_KEY" ]; then
        test_arr_app_connectivity "Radarr" "radarr" "7878" "$RADARR_API_KEY"
    else
        log "WARNING" "RADARR_API_KEY not set - skipping Radarr connectivity test"
    fi

    echo ""
    echo "🔒 Testing VPN Isolation..."
    test_vpn_isolation

    echo ""
    echo "📋 Checking Logs..."
    test_logs_for_errors

    echo ""
    echo "=== Validation Summary ==="
    if [ $VALIDATION_ERRORS -eq 0 ]; then
        echo "✅ All validation tests passed!"
        echo "✅ Cleanuparr is properly integrated and operational"
        echo "✅ Web UI: http://localhost:${CLEANUPARR_PORT}"
        echo "✅ Download cleanup and queue management active"
        echo ""
        echo "⚠️  IMPORTANT: Dry Run Mode is enabled by default"
        echo "    Cleanuparr will log actions but NOT delete anything"
        echo "    Disable Dry Run Mode in the web UI after verifying operation"
        log "SUCCESS" "All validation tests passed - Cleanuparr ready"
        return 0
    else
        echo "❌ $VALIDATION_ERRORS validation error(s) found"
        echo "❌ Cleanuparr integration needs attention"
        echo "📋 Check log file: $LOG_FILE"
        echo "📋 Check container logs: docker compose logs cleanuparr"
        log "ERROR" "$VALIDATION_ERRORS validation errors found"
        return 1
    fi
}

# Script entry point
main() {
    echo "Cleanuparr Integration Validation"
    echo "================================="
    echo "Cleanuparr: $CLEANUPARR_HOST:$CLEANUPARR_PORT"
    echo "Torrent Client: $TORRENT_CLIENT"
    echo "Log: $LOG_FILE"
    echo ""

    # Wait for container to be fully ready
    echo "⏳ Waiting for Cleanuparr to be ready..."
    local max_wait=60
    local waited=0
    while [ $waited -lt $max_wait ]; do
        if curl -s -m 2 "http://${CLEANUPARR_HOST}:${CLEANUPARR_PORT}/health" > /dev/null 2>&1; then
            echo "✅ Cleanuparr is responding"
            break
        fi
        sleep 2
        waited=$((waited + 2))
        echo -n "."
    done
    echo ""

    if [ $waited -ge $max_wait ]; then
        echo "⚠️  Cleanuparr did not respond within ${max_wait}s - proceeding anyway"
    fi

    run_validation
    exit_code=$?

    echo ""
    if [ $exit_code -eq 0 ]; then
        echo "🎉 Cleanuparr integration validation complete!"
        echo "🎯 Ready for automated download cleanup and queue management"
    else
        echo "⚠️  Validation failed - see errors above"
        echo "🔧 Fix configuration issues before proceeding"
    fi

    exit $exit_code
}

# Run the main function
main "$@"
