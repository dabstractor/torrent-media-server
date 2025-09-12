#!/bin/sh
# qbittorrent-auth-bypass.sh - Automated authentication bypass configuration
# Runs inside qBittorrent container to configure bypass using temporary password

echo "$(date): [AUTH-BYPASS] Starting authentication bypass configuration..."

# Configuration
WEBUI_PORT="${1:-8081}"
LOG_FILE="${2:-/tmp/qbt_startup.log}"
BYPASS_LOG="/tmp/auth_bypass.log"

# Function to monitor log file for temporary password
monitor_for_password() {
    local log_file="$1"
    local timeout=30
    local counter=0
    
    echo "$(date): [AUTH-BYPASS] Monitoring $log_file for temporary password..." >> "$BYPASS_LOG"
    
    while [ $counter -lt $timeout ]; do
        if [ -f "$log_file" ]; then
            TEMP_PASS=$(grep "temporary password is provided" "$log_file" | tail -1 | sed 's/.*session: //' | tr -d '\r\n ')
            if [ -n "$TEMP_PASS" ]; then
                echo "$(date): [AUTH-BYPASS] Password found: ${TEMP_PASS:0:3}***" >> "$BYPASS_LOG"
                echo "$TEMP_PASS"
                return 0
            fi
        fi
        sleep 1
        counter=$((counter + 1))
    done
    
    echo "$(date): [AUTH-BYPASS] Timeout waiting for password" >> "$BYPASS_LOG"
    return 1
}

# Function to wait for API to be responsive
wait_for_api() {
    local port="$1"
    local timeout=60
    local counter=0
    
    echo "$(date): [AUTH-BYPASS] Waiting for API on port $port..." >> "$BYPASS_LOG"
    
    while [ $counter -lt $timeout ]; do
        # Check if API endpoint responds with any HTTP code
        response_code=$(curl -s -m 5 -o /dev/null -w "%{http_code}" "http://localhost:${port}/api/v2/app/version" 2>/dev/null)
        if echo "$response_code" | grep -E "^[0-9]{3}$" >/dev/null; then
            echo "$(date): [AUTH-BYPASS] API responding with code: $response_code" >> "$BYPASS_LOG"
            return 0
        fi
        sleep 2
        counter=$((counter + 2))
    done
    
    echo "$(date): [AUTH-BYPASS] API timeout" >> "$BYPASS_LOG"
    return 1
}

# Function to authenticate and configure bypass
configure_bypass() {
    local port="$1" 
    local password="$2"
    
    echo "$(date): [AUTH-BYPASS] Attempting authentication..." >> "$BYPASS_LOG"
    
    # Login and get cookie
    local login_result=$(curl -s -m 10 -c /tmp/qbt_session \
        -d "username=admin&password=${password}" \
        "http://localhost:${port}/api/v2/auth/login" 2>/dev/null)
    
    echo "$(date): [AUTH-BYPASS] Login result: $login_result" >> "$BYPASS_LOG"
    
    if [ "$login_result" = "Ok." ]; then
        echo "$(date): [AUTH-BYPASS] Login successful, configuring bypass..." >> "$BYPASS_LOG"
        
        # Configure global bypass settings
        bypass_result=$(curl -s -m 10 -b /tmp/qbt_session -X POST \
            "http://localhost:${port}/api/v2/app/setPreferences" \
            -d 'json={"bypass_local_auth":true,"bypass_auth_subnet_whitelist":"0.0.0.0/0,::/0","bypass_auth_subnet_whitelist_enabled":true,"web_ui_host_header_validation":false}' 2>/dev/null)
        
        echo "$(date): [AUTH-BYPASS] Bypass configuration result: $bypass_result" >> "$BYPASS_LOG"
        
        # Brief wait for settings to apply
        sleep 2
        
        # Verify bypass works
        version_check=$(curl -s -m 5 "http://localhost:${port}/api/v2/app/version" 2>/dev/null)
        if echo "$version_check" | grep -q "^v"; then
            echo "$(date): [AUTH-BYPASS] SUCCESS - Bypass verified working" >> "$BYPASS_LOG"
            echo "✓ Authentication bypass configured and working!"
            rm -f /tmp/qbt_session
            return 0
        else
            echo "$(date): [AUTH-BYPASS] Bypass verification failed: $version_check" >> "$BYPASS_LOG"
        fi
    else
        echo "$(date): [AUTH-BYPASS] Login failed" >> "$BYPASS_LOG"
    fi
    
    rm -f /tmp/qbt_session
    return 1
}

# Main execution flow
main() {
    # Initialize log
    echo "$(date): [AUTH-BYPASS] Starting with port=$WEBUI_PORT, log=$LOG_FILE" > "$BYPASS_LOG"
    
    # Step 1: Wait for API to be ready
    if ! wait_for_api "$WEBUI_PORT"; then
        echo "⚠ API never became ready, skipping bypass configuration"
        echo "$(date): [AUTH-BYPASS] FAILED - API not ready" >> "$BYPASS_LOG"
        return 1
    fi
    
    # Step 2: Check if bypass already works (might be pre-configured)
    if curl -s -m 5 "http://localhost:${WEBUI_PORT}/api/v2/app/version" | grep -q "^v"; then
        echo "✓ Authentication bypass already working!"
        echo "$(date): [AUTH-BYPASS] SUCCESS - Already bypassed" >> "$BYPASS_LOG"
        return 0
    fi
    
    # Step 3: Monitor for temporary password
    TEMP_PASSWORD=$(monitor_for_password "$LOG_FILE")
    if [ -z "$TEMP_PASSWORD" ]; then
        echo "⚠ No temporary password found, bypass configuration failed"
        echo "$(date): [AUTH-BYPASS] FAILED - No password" >> "$BYPASS_LOG"
        return 1
    fi
    
    # Step 4: Configure bypass using temporary password
    if configure_bypass "$WEBUI_PORT" "$TEMP_PASSWORD"; then
        echo "$(date): [AUTH-BYPASS] Process completed successfully" >> "$BYPASS_LOG"
        return 0
    else
        echo "⚠ Failed to configure authentication bypass"
        echo "$(date): [AUTH-BYPASS] FAILED - Configuration error" >> "$BYPASS_LOG"
        return 1
    fi
}

# Run main function
main "$@"
exit_code=$?

# Final status
if [ $exit_code -eq 0 ]; then
    echo "=== Authentication bypass configuration complete ==="
else
    echo "=== Authentication bypass configuration failed ==="
    echo "Check $BYPASS_LOG for details"
fi

exit $exit_code