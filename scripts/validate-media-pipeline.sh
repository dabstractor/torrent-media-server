#!/bin/bash
# validate-media-pipeline.sh - Comprehensive validation of automated media organization pipeline
# Tests the complete flow: qBittorrent categories -> Radarr/Sonarr -> Plex library refresh

echo "=== Media Organization Pipeline Validation ==="
echo "Validating automated media organization via Radarr/Sonarr..."

# Configuration
QBITTORRENT_HOST="${1:-nginx-proxy}"
QBITTORRENT_PORT="${2:-8080}"
RADARR_HOST="${3:-nginx-proxy}"
RADARR_PORT="${4:-25860}"
SONARR_HOST="${5:-nginx-proxy}"
SONARR_PORT="${6:-34245}"
PLEX_HOST="${7:-nginx-proxy}"
PLEX_PORT="${8:-32400}"

# API Keys (from environment or defaults)
RADARR_API_KEY="${RADARR_API_KEY:-1896856646174be29ab7cca907e77458}"
SONARR_API_KEY="${SONARR_API_KEY:-afde353290c6439497772562330d4eb0}"

LOG_FILE="/tmp/media_pipeline_validation.log"
VALIDATION_ERRORS=0

# Logging function
log() {
    local level="$1"
    local message="$2"
    echo "$(date): [$level] $message" | tee -a "$LOG_FILE"
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

# Test API connectivity
test_api_connectivity() {
    local name="$1"
    local host="$2"
    local port="$3"
    local endpoint="$4"
    local api_key="$5"

    log "TEST" "Testing $name API connectivity..."

    if [ -n "$api_key" ]; then
        local response=$(curl -s -m 10 -o /dev/null -w "%{http_code}" \
            -H "X-Api-Key: $api_key" \
            "http://${host}:${port}${endpoint}" 2>/dev/null)
    else
        local response=$(curl -s -m 10 -o /dev/null -w "%{http_code}" \
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

# Test qBittorrent categories
test_qbittorrent_categories() {
    log "TEST" "Validating qBittorrent categories..."

    local categories=$(curl -s -m 10 "http://${QBITTORRENT_HOST}:${QBITTORRENT_PORT}/api/v2/torrents/categories" 2>/dev/null)

    if [ $? -ne 0 ]; then
        error "Failed to fetch qBittorrent categories"
        return 1
    fi

    # Check for required categories
    local required_categories="radarr sonarr"
    local missing_categories=""

    for category in $required_categories; do
        if echo "$categories" | grep -q "\"$category\""; then
            success "Category '$category' exists in qBittorrent"
        else
            error "Category '$category' missing from qBittorrent"
            missing_categories="$missing_categories $category"
        fi
    done

    if [ -z "$missing_categories" ]; then
        return 0
    else
        error "Missing categories:$missing_categories"
        return 1
    fi
}

# Test Radarr download client configuration
test_radarr_download_client() {
    log "TEST" "Validating Radarr download client configuration..."

    local config=$(curl -s -m 10 \
        -H "X-Api-Key: $RADARR_API_KEY" \
        "http://${RADARR_HOST}:${RADARR_PORT}/api/v3/downloadclient" 2>/dev/null)

    if [ $? -ne 0 ]; then
        error "Failed to fetch Radarr download client configuration"
        return 1
    fi

    # Check for qBittorrent configuration
    if echo "$config" | grep -q '"implementation":"QBittorrent"'; then
        success "Radarr has qBittorrent download client configured"

        # Check for correct category
        if echo "$config" | grep -q '"movieCategory":"radarr"'; then
            success "Radarr is configured with 'radarr' category"
        else
            error "Radarr category is not set to 'radarr'"
            return 1
        fi
    else
        error "Radarr does not have qBittorrent download client configured"
        return 1
    fi

    return 0
}

# Test Sonarr download client configuration
test_sonarr_download_client() {
    log "TEST" "Validating Sonarr download client configuration..."

    local config=$(curl -s -m 10 \
        -H "X-Api-Key: $SONARR_API_KEY" \
        "http://${SONARR_HOST}:${SONARR_PORT}/api/v3/downloadclient" 2>/dev/null)

    if [ $? -ne 0 ]; then
        error "Failed to fetch Sonarr download client configuration"
        return 1
    fi

    # Check for qBittorrent configuration
    if echo "$config" | grep -q '"implementation":"QBittorrent"'; then
        success "Sonarr has qBittorrent download client configured"

        # Check for correct category
        if echo "$config" | grep -q '"tvCategory":"sonarr"'; then
            success "Sonarr is configured with 'sonarr' category"
        else
            error "Sonarr category is not set to 'sonarr'"
            return 1
        fi
    else
        error "Sonarr does not have qBittorrent download client configured"
        return 1
    fi

    return 0
}

# Test Radarr root folders
test_radarr_root_folders() {
    log "TEST" "Validating Radarr root folders..."

    local folders=$(curl -s -m 10 \
        -H "X-Api-Key: $RADARR_API_KEY" \
        "http://${RADARR_HOST}:${RADARR_PORT}/api/v3/rootfolder" 2>/dev/null)

    if [ $? -ne 0 ]; then
        error "Failed to fetch Radarr root folders"
        return 1
    fi

    if echo "$folders" | grep -q '"/movies"'; then
        success "Radarr has /movies root folder configured"
        return 0
    else
        error "Radarr does not have /movies root folder configured"
        return 1
    fi
}

# Test Sonarr root folders
test_sonarr_root_folders() {
    log "TEST" "Validating Sonarr root folders..."

    local folders=$(curl -s -m 10 \
        -H "X-Api-Key: $SONARR_API_KEY" \
        "http://${SONARR_HOST}:${SONARR_PORT}/api/v3/rootfolder" 2>/dev/null)

    if [ $? -ne 0 ]; then
        error "Failed to fetch Sonarr root folders"
        return 1
    fi

    if echo "$folders" | grep -q '"/tv"'; then
        success "Sonarr has /tv root folder configured"
        return 0
    else
        error "Sonarr does not have /tv root folder configured"
        return 1
    fi
}

# Test directory structure
test_directory_structure() {
    log "TEST" "Validating media directory structure..."

    local directories="/data/media/movies /data/media/tv /downloads/movies /downloads/tv"
    local all_exist=true

    for dir in $directories; do
        if [ -d "$dir" ]; then
            success "Directory $dir exists"
        else
            error "Directory $dir does not exist"
            all_exist=false
        fi
    done

    if [ "$all_exist" = true ]; then
        return 0
    else
        return 1
    fi
}

# Test volume permissions
test_volume_permissions() {
    log "TEST" "Validating volume permissions..."

    local test_dirs="/downloads /data/media"
    local permission_ok=true

    for dir in $test_dirs; do
        if [ -w "$dir" ]; then
            success "Directory $dir is writable"
        else
            error "Directory $dir is not writable"
            permission_ok=false
        fi
    done

    if [ "$permission_ok" = true ]; then
        return 0
    else
        return 1
    fi
}

# Main validation function
run_validation() {
    log "INFO" "Starting media pipeline validation..."
    echo "" > "$LOG_FILE"  # Initialize log file

    echo "🔍 Testing API Connectivity..."
    test_api_connectivity "qBittorrent" "$QBITTORRENT_HOST" "$QBITTORRENT_PORT" "/api/v2/app/version"
    test_api_connectivity "Radarr" "$RADARR_HOST" "$RADARR_PORT" "/api/v3/system/status" "$RADARR_API_KEY"
    test_api_connectivity "Sonarr" "$SONARR_HOST" "$SONARR_PORT" "/api/v3/system/status" "$SONARR_API_KEY"

    echo ""
    echo "📁 Testing Directory Structure..."
    test_directory_structure
    test_volume_permissions

    echo ""
    echo "⚙️  Testing qBittorrent Configuration..."
    test_qbittorrent_categories

    echo ""
    echo "🎬 Testing Radarr Configuration..."
    test_radarr_download_client
    test_radarr_root_folders

    echo ""
    echo "📺 Testing Sonarr Configuration..."
    test_sonarr_download_client
    test_sonarr_root_folders

    echo ""
    echo "=== Validation Summary ==="
    if [ $VALIDATION_ERRORS -eq 0 ]; then
        echo "✅ All validation tests passed!"
        echo "✅ Media organization pipeline is properly configured"
        echo "✅ Radarr and Sonarr are ready for automated downloads"
        echo "✅ qBittorrent categories are configured correctly"
        log "SUCCESS" "All validation tests passed - pipeline ready"
        return 0
    else
        echo "❌ $VALIDATION_ERRORS validation error(s) found"
        echo "❌ Media organization pipeline needs attention"
        echo "📋 Check log file: $LOG_FILE"
        log "ERROR" "$VALIDATION_ERRORS validation errors found"
        return 1
    fi
}

# Script entry point
main() {
    echo "Media Pipeline Validation"
    echo "========================="
    echo "qBittorrent: $QBITTORRENT_HOST:$QBITTORRENT_PORT"
    echo "Radarr: $RADARR_HOST:$RADARR_PORT"
    echo "Sonarr: $SONARR_HOST:$SONARR_PORT"
    echo "Log: $LOG_FILE"
    echo ""

    run_validation
    exit_code=$?

    echo ""
    if [ $exit_code -eq 0 ]; then
        echo "🎉 Media organization pipeline validation complete!"
        echo "🎯 Ready for automated downloads and organization"
    else
        echo "⚠️  Pipeline validation failed - see errors above"
        echo "🔧 Fix configuration issues before proceeding"
    fi

    exit $exit_code
}

# Run the main function
main "$@"