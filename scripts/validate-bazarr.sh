#!/bin/bash
# validate-bazarr.sh - Comprehensive validation of Bazarr subtitle automation integration
# Tests: API connectivity, Sonarr/Radarr integration, configuration, and volume mounts

echo "=== Bazarr Validation Script ==="

# Configuration from environment or defaults
BAZARR_HOST="${1:-localhost}"
BAZARR_PORT="${2:-${BAZARR_PORT:-6767}}"
SONARR_HOST="${3:-sonarr}"
SONARR_PORT="${4:-8989}"
RADARR_HOST="${5:-radarr}"
RADARR_PORT="${6:-7878}"

# API Keys from environment
BAZARR_API_KEY="${BAZARR_API_KEY}"
SONARR_API_KEY="${SONARR_API_KEY}"
RADARR_API_KEY="${RADARR_API_KEY}"

LOG_FILE="/tmp/bazarr_validation.log"
VALIDATION_ERRORS=0

# Logging functions
log() {
    local level="$1"
    local message="$2"
    echo "$(date): [$level] $message" | tee -a "$LOG_FILE"
}

error() {
    log "ERROR" "$1"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
}

success() {
    log "SUCCESS" "$1"
}

# Test API connectivity
test_api_connectivity() {
    local name="$1"
    local host="$2"
    local port="$3"
    local endpoint="$4"
    local api_key="$5"

    log "TEST" "Testing $name API connectivity..."

    local response
    if [ -n "$api_key" ]; then
        response=$(curl -s -m 10 -o /dev/null -w "%{http_code}" \
            -H "X-Api-Key: $api_key" \
            "http://${host}:${port}${endpoint}" 2>/dev/null)
    else
        response=$(curl -s -m 10 -o /dev/null -w "%{http_code}" \
            "http://${host}:${port}${endpoint}" 2>/dev/null)
    fi

    if [ "$response" = "200" ]; then
        success "$name API is accessible (HTTP $response)"
        return 0
    else
        error "$name API is not accessible (HTTP $response)"
        return 1
    fi
}

# Test Bazarr configuration file
test_bazarr_config() {
    log "TEST" "Validating Bazarr configuration file..."

    # Check if running in container
    if [ -f "/config/config.yaml" ]; then
        if [ -s "/config/config.yaml" ]; then
            success "config.yaml exists and is not empty"

            # Check for Sonarr configuration
            if grep -q "sonarr" "/config/config.yaml"; then
                success "config.yaml contains Sonarr configuration"
            else
                error "config.yaml missing Sonarr configuration"
            fi

            # Check for Radarr configuration
            if grep -q "radarr" "/config/config.yaml"; then
                success "config.yaml contains Radarr configuration"
            else
                error "config.yaml missing Radarr configuration"
            fi

            return 0
        else
            error "config.yaml exists but is empty"
            return 1
        fi
    else
        # Try Docker exec if not in container
        if docker exec bazarr test -f /config/config.yaml 2>/dev/null; then
            success "config.yaml exists in Bazarr container"

            # Check content
            if docker exec bazarr sh -c '[ -s /config/config.yaml ]' 2>/dev/null; then
                success "config.yaml is not empty"

                # Check for Sonarr and Radarr
                if docker exec bazarr grep -q "sonarr" /config/config.yaml 2>/dev/null; then
                    success "config.yaml contains Sonarr configuration"
                else
                    error "config.yaml missing Sonarr configuration"
                fi

                if docker exec bazarr grep -q "radarr" /config/config.yaml 2>/dev/null; then
                    success "config.yaml contains Radarr configuration"
                else
                    error "config.yaml missing Radarr configuration"
                fi
            else
                error "config.yaml exists but is empty"
                return 1
            fi
            return 0
        else
            error "config.yaml not found in Bazarr container"
            return 1
        fi
    fi
}

# Test Sonarr connection from Bazarr
test_bazarr_sonarr_connection() {
    log "TEST" "Testing Sonarr connection from Bazarr..."

    # Try from Bazarr container
    if docker exec bazarr curl -f -s -m 10 \
        -H "X-Api-Key: $SONARR_API_KEY" \
        "http://${SONARR_HOST}:${SONARR_PORT}/api/v3/system/status" >/dev/null 2>&1; then
        success "Bazarr can reach Sonarr API"
        success "API key is valid"
        return 0
    else
        error "Bazarr cannot reach Sonarr API or API key is invalid"
        return 1
    fi
}

# Test Radarr connection from Bazarr
test_bazarr_radarr_connection() {
    log "TEST" "Testing Radarr connection from Bazarr..."

    # Try from Bazarr container
    if docker exec bazarr curl -f -s -m 10 \
        -H "X-Api-Key: $RADARR_API_KEY" \
        "http://${RADARR_HOST}:${RADARR_PORT}/api/v3/system/status" >/dev/null 2>&1; then
        success "Bazarr can reach Radarr API"
        success "API key is valid"
        return 0
    else
        error "Bazarr cannot reach Radarr API or API key is invalid"
        return 1
    fi
}

# Test volume mounts
test_volume_mounts() {
    log "TEST" "Testing volume mounts..."

    local volumes="/tv /movies"
    local all_accessible=true

    for volume in $volumes; do
        if docker exec bazarr test -d "$volume" 2>/dev/null; then
            success "$volume directory is accessible"

            # Check if it's readable
            if docker exec bazarr ls "$volume" >/dev/null 2>&1; then
                success "$volume directory is readable"
            else
                error "$volume directory exists but is not readable"
                all_accessible=false
            fi
        else
            error "$volume directory is not accessible"
            all_accessible=false
        fi
    done

    if [ "$all_accessible" = true ]; then
        return 0
    else
        return 1
    fi
}

# Test PUID/PGID
test_permissions() {
    log "TEST" "Testing PUID/PGID configuration..."

    local user_info
    user_info=$(docker exec bazarr id 2>/dev/null)

    if echo "$user_info" | grep -q "uid=1000"; then
        success "PUID is 1000"
    else
        error "PUID is not 1000: $user_info"
        return 1
    fi

    if echo "$user_info" | grep -q "gid=1000"; then
        success "PGID is 1000"
    else
        error "PGID is not 1000: $user_info"
        return 1
    fi

    return 0
}

# Main validation function
run_validation() {
    log "INFO" "Starting Bazarr validation..."
    echo "" > "$LOG_FILE"  # Initialize log file

    echo "🔍 Testing API Connectivity..."
    test_api_connectivity "Bazarr" "$BAZARR_HOST" "$BAZARR_PORT" "/"
    test_api_connectivity "Sonarr" "$SONARR_HOST" "$SONARR_PORT" "/api/v3/system/status" "$SONARR_API_KEY"
    test_api_connectivity "Radarr" "$RADARR_HOST" "$RADARR_PORT" "/api/v3/system/status" "$RADARR_API_KEY"

    echo ""
    echo "📁 Testing Configuration..."
    test_bazarr_config

    echo ""
    echo "🔗 Testing Sonarr Connection from Bazarr..."
    test_bazarr_sonarr_connection

    echo ""
    echo "🔗 Testing Radarr Connection from Bazarr..."
    test_bazarr_radarr_connection

    echo ""
    echo "📂 Testing Volume Mounts..."
    test_volume_mounts

    echo ""
    echo "👤 Testing Permissions..."
    test_permissions

    echo ""
    echo "=== Validation Summary ==="
    if [ $VALIDATION_ERRORS -eq 0 ]; then
        echo "✅ All validation tests passed!"
        echo "✅ Bazarr is fully integrated and operational"
        echo "✅ Ready for subtitle automation"
        log "SUCCESS" "All validation tests passed - Bazarr ready"
        return 0
    else
        echo "❌ $VALIDATION_ERRORS validation error(s) found"
        echo "❌ Bazarr integration needs attention"
        echo "📋 Check log file: $LOG_FILE"
        log "ERROR" "$VALIDATION_ERRORS validation errors found"
        return 1
    fi
}

# Script entry point
main() {
    echo "Bazarr Validation"
    echo "================"
    echo "Bazarr: http://${BAZARR_HOST}:${BAZARR_PORT}"
    echo "Sonarr: http://${SONARR_HOST}:${SONARR_PORT}"
    echo "Radarr: http://${RADARR_HOST}:${RADARR_PORT}"
    echo "Log: $LOG_FILE"
    echo ""

    run_validation
    exit_code=$?

    echo ""
    if [ $exit_code -eq 0 ]; then
        echo "🎉 Bazarr validation complete!"
        echo "🎯 Ready for automated subtitle management"
    else
        echo "⚠️  Bazarr validation failed - see errors above"
        echo "🔧 Fix configuration issues before proceeding"
    fi

    exit $exit_code
}

# Run the main function
main "$@"
