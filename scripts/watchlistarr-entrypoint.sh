#!/bin/bash

# Custom entrypoint for Watchlistarr with automatic configuration restoration
# Don't exit on errors during detection phase - we want to retry
set +e

CONFIG_DIR="/app/config"
TEMPLATE_DIR="/templates"

echo "[INIT] Watchlistarr custom entrypoint starting..."

# Install curl and gettext if not available (container requirements)
if ! command -v curl > /dev/null 2>&1 || ! command -v envsubst > /dev/null 2>&1; then
    echo "[INIT] Installing required packages for HTTP requests and environment substitution..."
    if command -v apt-get > /dev/null 2>&1; then
        # Debian/Ubuntu based
        apt-get update -qq && apt-get install -y -qq curl gettext
    elif command -v apk > /dev/null 2>&1; then
        # Alpine based
        apk add --no-cache curl gettext
    elif command -v yum > /dev/null 2>&1; then
        # RHEL/CentOS based
        yum install -y -q curl gettext
    else
        echo "[ERROR] Cannot install required packages - unknown package manager"
        echo "[ERROR] Please provide PLEX_TOKEN manually"
    fi

    if command -v curl > /dev/null 2>&1; then
        echo "[INIT] ✅ curl installed successfully"
    else
        echo "[ERROR] ❌ curl installation failed"
    fi

    if command -v envsubst > /dev/null 2>&1; then
        echo "[INIT] ✅ envsubst installed successfully"
    else
        echo "[ERROR] ❌ envsubst installation failed"
    fi
fi

# Stage 1: Template Restoration
if [ ! -f "$CONFIG_DIR/config.yaml" ] && [ -f "$TEMPLATE_DIR/config.yaml.template" ]; then
    echo "[INIT] Restoring watchlistarr configuration from template..."
    mkdir -p "$CONFIG_DIR"
    mkdir -p "$CONFIG_DIR/logs"

    # Stage 2: Environment Variable Substitution
    envsubst < "$TEMPLATE_DIR/config.yaml.template" > "$CONFIG_DIR/config.yaml"

    # Set proper ownership and permissions
    chown -R 1000:1000 "$CONFIG_DIR"
    chmod 644 "$CONFIG_DIR/config.yaml"

    echo "[INIT] Watchlistarr configuration restored and configured successfully!"
    echo "[INIT] - Plex watchlist sync enabled with 60-second interval"
    echo "[INIT] - TV shows route to Sonarr (http://sonarr:8989)"
    echo "[INIT] - Movies route to Radarr (http://radarr:7878)"
    echo "[INIT] - Delete sync enabled: removes content when removed from watchlist"
    echo "[INIT] - Delete interval: 7 days"
    echo "[INIT] - Friends sync enabled for shared watchlists"
else
    echo "[INIT] Watchlistarr configuration found, no restoration needed"
fi

# Function to generate Plex token from credentials
generate_plex_token() {
    local username="$1"
    local password="$2"

    echo "[INIT] Generating Plex token from username/password..."

    # Generate unique client identifier for this deployment
    local client_id
    client_id="watchlistarr-$(hostname)-$(date +%s)"

    # Make API request to get token
    local response
    response=$(curl -s -X POST "https://plex.tv/users/sign_in.json" \
        -H "X-Plex-Version: 0.3.0" \
        -H "X-Plex-Product: Watchlistarr-Integration" \
        -H "X-Plex-Client-Identifier: $client_id" \
        -H "Content-Type: application/x-www-form-urlencoded; charset=utf-8" \
        -d "user[login]=$username&user[password]=$password" 2>/dev/null)

    if echo "$response" | grep -q '"authToken"'; then
        # Extract token from JSON response
        local token
        token=$(echo "$response" | sed -n 's/.*"authToken":"\([^"]*\)".*/\1/p')
        if [ -n "$token" ]; then
            echo "[INIT] Plex token generated successfully"
            echo "$token"
            return 0
        fi
    fi

    echo "[ERROR] Failed to generate Plex token. Check username/password."
    return 1
}



# Function to extract token from local Plex server
extract_local_plex_token() {
    echo "[INIT] Attempting to extract token from local Plex server..."

    local plex_host="${PLEX_HOST:-docker-host}"
    local plex_port="${PLEX_PORT:-32400}"

    echo "[INIT] Contacting Plex server at $plex_host:$plex_port"
    echo "[DEBUG] PLEX_HOST env var: '${PLEX_HOST}'"
    echo "[DEBUG] Final plex_host: '$plex_host'"

    # Test if Plex server is accessible
    local test_response
    test_response=$(curl -s --connect-timeout 5 "http://$plex_host:$plex_port" 2>&1)
    local curl_exit_code=$?

    echo "[DEBUG] Curl exit code: $curl_exit_code"
    echo "[DEBUG] Response length: ${#test_response}"
    if [ ${#test_response} -lt 200 ]; then
        echo "[DEBUG] Response preview: $test_response"
    else
        echo "[DEBUG] Response preview (first 200 chars): ${test_response:0:200}..."
    fi

    if [ $curl_exit_code -ne 0 ]; then
        echo "[INIT] Local Plex server not accessible at http://$plex_host:$plex_port (exit code: $curl_exit_code)"
        echo "[DEBUG] Curl error: $test_response"
        return 1
    fi

    if [ -z "$test_response" ]; then
        echo "[INIT] Local Plex server returned empty response at http://$plex_host:$plex_port"
        return 1
    fi

    # Method 1: Try to get identity without token (works if local network access is allowed)
    local identity_response
    identity_response=$(curl -s --connect-timeout 10 "http://$plex_host:$plex_port/identity" 2>&1)
    local identity_exit_code=$?

    echo "[DEBUG] Identity curl exit code: $identity_exit_code"
    echo "[DEBUG] Identity response length: ${#identity_response}"
    if [ ${#identity_response} -lt 200 ]; then
        echo "[DEBUG] Identity response: $identity_response"
    else
        echo "[DEBUG] Identity response (first 200 chars): ${identity_response:0:200}..."
    fi

    if echo "$identity_response" | grep -q 'machineIdentifier'; then
        echo "[INIT] ✅ Local Plex server accessible without authentication"

        # For local access, we can make requests without a token
        # Let's just use an empty token since the server allows local access
        echo ""
        return 0
    fi

    # Method 2: Try to find existing token in Plex config files (if accessible)
    echo "[INIT] Trying to find existing Plex authentication token..."

    # Common Plex data directories where tokens might be stored
    local plex_dirs=(
        "/plex-config/Library/Application Support/Plex Media Server"
        "/config/Library/Application Support/Plex Media Server"
        "/var/lib/plexmediaserver/Library/Application Support/Plex Media Server"
        "/usr/lib/plexmediaserver/Resources"
        "/opt/plex/config/Library/Application Support/Plex Media Server"
    )

    for plex_dir in "${plex_dirs[@]}"; do
        if [ -f "$plex_dir/Preferences.xml" ]; then
            echo "[INIT] Found Plex preferences at: $plex_dir"

            # Try to extract PlexOnlineToken from Preferences.xml
            local token
            token=$(grep -o 'PlexOnlineToken="[^"]*"' "$plex_dir/Preferences.xml" 2>/dev/null | cut -d'"' -f2)

            if [ -n "$token" ] && [ ${#token} -gt 10 ]; then
                echo "[INIT] ✅ Found existing Plex token in preferences"
                echo "$token"
                return 0
            fi
        fi
    done

    echo "[INIT] Plex server is accessible but no authentication token found"
    echo "[INIT] This means the Plex server hasn't been signed into yet"
    echo "[INIT] Automated token generation required"
    return 1
}

# Function to test if a token works with the local Plex server
test_plex_token() {
    local token="$1"
    local plex_host="${PLEX_HOST:-docker-host}"
    local plex_port="${PLEX_PORT:-32400}"

    # Test token by making an authenticated request
    local test_response
    if [ -z "$token" ]; then
        # Try without token (local access)
        test_response=$(curl -s --connect-timeout 10 "http://$plex_host:$plex_port/library/sections" 2>/dev/null)
    else
        # Try with token
        test_response=$(curl -s --connect-timeout 10 "http://$plex_host:$plex_port/library/sections?X-Plex-Token=$token" 2>/dev/null)
    fi

    if echo "$test_response" | grep -q 'MediaContainer'; then
        return 0
    else
        return 1
    fi
}


# Handle Plex authentication - support multiple methods
echo "[DEBUG] PLEX_TOKEN value: '${PLEX_TOKEN}'"
if [ -z "$PLEX_TOKEN" ]; then
    # Method 0: Try to extract token from local Plex server (BEST - leverages existing auth)
    echo "[INIT] No PLEX_TOKEN provided, trying automatic detection..."

    # Try multiple Plex server locations using reliable hostnames
    plex_locations=("docker-host" "host.docker.internal" "plex")
    found_token=""
    detected_plex_host=""

    for plex_location in "${plex_locations[@]}"; do
        echo "[INIT] Trying Plex server at: $plex_location"

        # Try token extraction with error handling
        LOCAL_TOKEN=""
        echo "[DEBUG] About to call extract_local_plex_token for $plex_location"

        # Set environment for the function call
        PLEX_HOST="$plex_location"
        export PLEX_HOST

        # Call function and capture the token output
        if LOCAL_TOKEN=$(extract_local_plex_token); then
            extraction_result=0
        else
            extraction_result=1
        fi

        if [ $extraction_result -eq 0 ]; then
            echo "[INIT] Token extraction completed for $plex_location"
        else
            echo "[INIT] Token extraction failed for $plex_location - continuing..."
            continue
        fi

        # Test the token with error handling
        # Check if extraction succeeded (function returned 0) even if token is empty
        if [ $extraction_result -eq 0 ]; then
            # Store the detected host regardless of token status
            detected_plex_host="$plex_location"

            # If we got an empty token, it means local access is allowed
            if [ -z "$LOCAL_TOKEN" ]; then
                echo "[INIT] 🎯 Local Plex access detected at $plex_location"
                export PLEX_HOST="$plex_location"
                export PLEX_TOKEN=""  # Empty token for local access
                found_token="local-access"
                echo "[INIT] Plex connection established for local access"
                break
            elif PLEX_HOST="$plex_location" test_plex_token "$LOCAL_TOKEN" 2>/dev/null; then
                export PLEX_TOKEN="$LOCAL_TOKEN"
                export PLEX_HOST="$plex_location"
                found_token="$LOCAL_TOKEN"
                echo "[INIT] 🎯 Successfully connected to Plex at $plex_location with token"

                # Cache the token and host for future use
                echo "PLEX_TOKEN=$PLEX_TOKEN" > "$CONFIG_DIR/.plex_token" 2>/dev/null || true
                echo "PLEX_HOST=$plex_location" >> "$CONFIG_DIR/.plex_token" 2>/dev/null || true
                chmod 600 "$CONFIG_DIR/.plex_token" 2>/dev/null || true
                echo "[INIT] Plex connection cached for future use"
                break
            else
                echo "[INIT] Token test failed for $plex_location - continuing..."
            fi
        else
            echo "[INIT] Token extraction failed for $plex_location - continuing..."
        fi
    done

    if [ -n "$found_token" ]; then
        echo "[INIT] ✅ Automatic Plex authentication successful"
    elif [ -n "$PLEX_USERNAME" ] && [ -n "$PLEX_PASSWORD" ]; then
        # Method 1: Traditional username/password (fully automated)
        echo "[INIT] Local extraction failed, attempting credential-based generation..."

        GENERATED_TOKEN=$(generate_plex_token "$PLEX_USERNAME" "$PLEX_PASSWORD")
        if [ -n "$GENERATED_TOKEN" ] && test_plex_token "$GENERATED_TOKEN"; then
            export PLEX_TOKEN="$GENERATED_TOKEN"
            echo "[INIT] ✅ Using auto-generated Plex token"

            # Cache the token for future use
            echo "PLEX_TOKEN=$PLEX_TOKEN" > "$CONFIG_DIR/.plex_token"
            chmod 600 "$CONFIG_DIR/.plex_token"
            echo "[INIT] Token cached for future use"
        else
            echo "[ERROR] ❌ Automatic token generation failed"
            echo "[ERROR] This usually means:"
            echo "[ERROR] 1. Wrong username/password, OR"
            echo "[ERROR] 2. Account uses Google/Facebook/Apple sign-in"

        fi
    else
        # Method 3: Check for cached token
        if [ -f "$CONFIG_DIR/.plex_token" ]; then
            echo "[INIT] Loading cached Plex token..."
            # shellcheck source=/dev/null
            source "$CONFIG_DIR/.plex_token"
            if [ -n "$PLEX_TOKEN" ]; then
                export PLEX_TOKEN
                echo "[INIT] ✅ Using cached Plex token"
            fi
        fi

        # Final validation with retry loop
        if [ -z "$PLEX_TOKEN" ]; then
            echo ""
            echo "=============================================="
            echo "⏳ PLEX AUTHENTICATION REQUIRED"
            echo "=============================================="
            if [ -n "$detected_plex_host" ]; then
                echo "✅ Plex server detected and accessible at $detected_plex_host:${PLEX_PORT:-32400}"
            else
                echo "❌ Plex server not accessible at ${PLEX_HOST:-docker-host}:${PLEX_PORT:-32400}"
                echo "   Please start Plex and ensure it's running"
            fi
            echo "❌ No authentication credentials found"
            echo ""
            echo "Watchlistarr needs Plex authentication to sync watchlists."
            echo ""
            echo "🎯 AUTOMATIC AUTHENTICATION OPTIONS:"
            echo ""
            echo "🚀 Option 1 - Traditional Account (instant):"
            echo "   Add to your .env file:"
            echo "   PLEX_USERNAME=your@email.com"
            echo "   PLEX_PASSWORD=your-password"
            echo "   Then restart: docker restart watchlistarr-watchlistarr"
            echo ""
            echo "📝 Option 2 - Manual Token (if other methods fail):"
            echo "   Get permanent token from Plex web app and add:"
            echo "   PLEX_TOKEN=your-permanent-token-here"
            echo ""
            echo "Container will keep checking every 30 seconds..."
            echo "=============================================="

            # Check for environment variables periodically instead of retrying detection
            while [ -z "$PLEX_TOKEN" ] && [ -z "$PLEX_USERNAME" ]; do
                sleep 30
                echo "[INIT] Checking for updated credentials..."

                # Source the .env file if it exists to pick up new variables
                if [ -f "/app/.env" ]; then
                    source /app/.env 2>/dev/null || true
                fi

                # Check if credentials were provided
                if [ -n "$PLEX_USERNAME" ] && [ -n "$PLEX_PASSWORD" ]; then
                    echo "[INIT] Found credentials - attempting token generation..."
                    GENERATED_TOKEN=$(generate_plex_token "$PLEX_USERNAME" "$PLEX_PASSWORD")
                    if [ -n "$GENERATED_TOKEN" ]; then
                        export PLEX_TOKEN="$GENERATED_TOKEN"
                        echo "[INIT] ✅ Successfully generated Plex token"
                        break
                    else
                        echo "[ERROR] Failed to generate token from provided credentials"
                    fi
                elif [ -n "$PLEX_TOKEN" ]; then
                    echo "[INIT] ✅ Found provided Plex token"
                    break
                fi
            done

            echo "[INIT] ✅ Plex authentication successful - continuing..."
        fi
    fi
else
    echo "[INIT] ✅ Using provided PLEX_TOKEN"
fi

if [ -z "$SONARR_API_KEY" ]; then
    echo "[ERROR] SONARR_API_KEY environment variable is required but not set"
    exit 1
fi

if [ -z "$RADARR_API_KEY" ]; then
    echo "[ERROR] RADARR_API_KEY environment variable is required but not set"
    exit 1
fi

echo "[INIT] Environment validation passed - all required API keys present"
echo "[INIT] Authentication complete - starting Watchlistarr service..."

# Re-enable strict error handling for service startup
set -e

# Stage 3: Original Service Startup
# Execute the original watchlistarr entrypoint
exec /app/entrypoint.sh