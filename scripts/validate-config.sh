#!/bin/bash
# validate-config.sh - Validate generated configurations and service health
# This script checks generated configurations and service connectivity

echo "=== Configuration Validation System ==="

ERRORS=0

# Function to log validation results
log_result() {
    local status=$1
    local message=$2
    if [ "$status" = "PASS" ]; then
        echo "✓ $message"
    else
        echo "✗ $message"
        ((ERRORS++))
    fi
}

# Validate XML configuration files
validate_xml_config() {
    local service=$1
    local config_file=$2
    
    if [ -f "$config_file" ]; then
        if xmllint --noout "$config_file" 2>/dev/null; then
            log_result "PASS" "$service: XML configuration is valid"
            
            # Check for required API key in XML
            if grep -q "<ApiKey>.\{32\}</ApiKey>" "$config_file" 2>/dev/null; then
                log_result "PASS" "$service: API key present and properly formatted"
            else
                log_result "FAIL" "$service: Missing or invalid API key"
            fi
        else
            log_result "FAIL" "$service: Invalid XML configuration"
        fi
    else
        log_result "FAIL" "$service: Configuration file not found: $config_file"
    fi
}

# Validate JSON configuration files
validate_json_config() {
    local service=$1
    local config_file=$2
    
    if [ -f "$config_file" ]; then
        if jq empty "$config_file" 2>/dev/null; then
            log_result "PASS" "$service: JSON configuration is valid"
        else
            log_result "FAIL" "$service: Invalid JSON configuration"
        fi
    else
        log_result "FAIL" "$service: Configuration file not found: $config_file"
    fi
}

# Check service API endpoints
validate_api_endpoint() {
    local service=$1
    local url=$2
    local expected_status=${3:-200}
    
    if curl -f -s -o /dev/null -w "%{http_code}" "$url" | grep -q "$expected_status"; then
        log_result "PASS" "$service: API endpoint responding ($url)"
    else
        log_result "FAIL" "$service: API endpoint not responding ($url)"
    fi
}

echo "--- Validating Configuration Files ---"

# Validate service configurations
validate_xml_config "Prowlarr" "./config/prowlarr/config.xml"
validate_xml_config "Sonarr" "./config/sonarr/config.xml" 
validate_xml_config "Radarr" "./config/radarr/config.xml"
validate_json_config "Transmission" "./config/transmission/settings.json"

# Validate Plex preferences (XML)
if [ -f "./config/plex/Library/Application Support/Plex Media Server/Preferences.xml" ]; then
    if xmllint --noout "./config/plex/Library/Application Support/Plex Media Server/Preferences.xml" 2>/dev/null; then
        log_result "PASS" "Plex: Preferences.xml is valid"
    else
        log_result "FAIL" "Plex: Invalid Preferences.xml"
    fi
else
    log_result "FAIL" "Plex: Preferences.xml not found"
fi

# Validate qBittorrent config
if [ -f "./config/qbittorrent/qBittorrent/qBittorrent.conf" ]; then
    # Check for required sections
    if grep -q "^\[Preferences\]" "./config/qbittorrent/qBittorrent/qBittorrent.conf"; then
        log_result "PASS" "qBittorrent: Configuration file structure is valid"
    else
        log_result "FAIL" "qBittorrent: Missing required configuration sections"
    fi
else
    log_result "FAIL" "qBittorrent: Configuration file not found"
fi

echo "--- Validating Container Health ---"

# Check Docker container health
check_container_health() {
    local container_name=$1
    local health_status
    
    if docker ps --filter "name=$container_name" --format "{{.Names}}" | grep -q "$container_name"; then
        health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "unknown")
        case "$health_status" in
            "healthy")
                log_result "PASS" "$container_name: Container is healthy"
                ;;
            "starting")
                log_result "WARN" "$container_name: Container is starting..."
                ;;
            "unhealthy")
                log_result "FAIL" "$container_name: Container is unhealthy"
                ;;
            *)
                log_result "WARN" "$container_name: Health status unknown"
                ;;
        esac
    else
        log_result "FAIL" "$container_name: Container not running"
    fi
}

# Check all service containers
for container in vpn flaresolverr qbittorrent plex sonarr radarr prowlarr nginx-proxy web-ui; do
    check_container_health "$container"
done

echo "--- Validating Service APIs ---"

# Wait for services to be ready
sleep 5

# Test API endpoints with generated API keys if available
if [ -f "./config/generated/.secrets" ]; then
    source "./config/generated/.secrets"
    
    # Test service APIs
    validate_api_endpoint "Sonarr" "http://localhost:8989/api/v3/system/status?apikey=$SONARR_API_KEY"
    validate_api_endpoint "Radarr" "http://localhost:7878/api/v3/system/status?apikey=$RADARR_API_KEY"
    validate_api_endpoint "Prowlarr" "http://localhost:9696/api/v1/system/status?apikey=$PROWLARR_API_KEY"
else
    log_result "FAIL" "Generated secrets file not found - cannot test API endpoints"
fi

# Test other service endpoints
validate_api_endpoint "Plex" "http://localhost:32400/web/index.html"
validate_api_endpoint "qBittorrent Web UI" "http://localhost:8080/"
validate_api_endpoint "Web UI" "http://localhost:${WEB_UI_PORT:-8787}/health"

echo "--- Validation Summary ---"

if [ $ERRORS -eq 0 ]; then
    echo "🎉 All validations passed! System is healthy and secure."
    exit 0
else
    echo "❌ $ERRORS validation error(s) found. Please check the system."
    exit 1
fi