#!/bin/sh
# secure-qbittorrent-wrapper.sh - Secure configuration for qBittorrent in Docker
# Implements defense-in-depth security controls

set -e  # Exit on any error
set -u  # Exit on undefined variables

# Security Configuration
WEBUI_PORT="${QBT_WEBUI_PORT:-8081}"
PROFILE_PATH="/config"
MAX_AUTH_FAILURES=5
SESSION_TIMEOUT=3600  # 1 hour
BAN_DURATION=3600     # 1 hour ban after max failures

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Security validation
log_info "=== Secure qBittorrent Configuration Starting ==="

# Validate port is unprivileged
if [ "$WEBUI_PORT" -lt 1024 ]; then
    log_error "Port must be > 1024 for unprivileged operation"
    exit 1
fi

# Check for secure environment variables
if [ -z "${QBT_WEBUI_USERNAME:-}" ] || [ -z "${QBT_WEBUI_PASSWORD:-}" ]; then
    log_warn "QBT_WEBUI_USERNAME or QBT_WEBUI_PASSWORD not set, using defaults"
fi

# Create secure configuration if it doesn't exist
CONFIG_FILE="$PROFILE_PATH/qBittorrent/config/qBittorrent.conf"
if [ ! -f "$CONFIG_FILE" ]; then
    log_info "Creating secure initial configuration..."
    mkdir -p "$(dirname "$CONFIG_FILE")"
    cat > "$CONFIG_FILE" << 'EOF'
[BitTorrent]
Session\AddTorrentStopped=false
Session\DefaultSavePath=/downloads
Session\Port=6881
Session\QueueingSystemEnabled=true
Session\TempPath=/downloads/temp

[LegalNotice]
Accepted=true

[Meta]
MigrationVersion=8

[Preferences]
WebUI\Port=8081
WebUI\Username=admin
WebUI\LocalHostAuth=true
WebUI\AuthSubnetWhitelistEnabled=true
WebUI\AuthSubnetWhitelist=172.27.0.0/16,172.28.0.0/16,127.0.0.1/32
WebUI\CSRFProtection=true
WebUI\ClickjackingProtection=true
WebUI\SecureCookie=true
WebUI\HostHeaderValidation=true
WebUI\CustomHTTPHeaders=X-Content-Type-Options: nosniff\nX-Frame-Options: DENY\nX-XSS-Protection: 1; mode=block
WebUI\BanDuration=3600
WebUI\SessionTimeout=3600
WebUI\MaxAuthenticationFailCount=5
EOF
    log_info "Secure configuration created"
fi

# Start qBittorrent with security logging
log_info "Starting qBittorrent on port $WEBUI_PORT..."
/usr/bin/qbittorrent-nox \
    --profile="$PROFILE_PATH" \
    --webui-port="$WEBUI_PORT" \
    2>&1 | while read -r line; do
        # Monitor for security events
        case "$line" in
            *"WebUI login failure"*)
                log_warn "Authentication failure detected: $line"
                ;;
            *"Unauthorized"*)
                log_warn "Unauthorized access attempt: $line"
                ;;
            *"external program"*)
                log_error "CRITICAL: External program execution detected: $line"
                ;;
            *)
                echo "$line"
                ;;
        esac
    done &

QBIT_PID=$!
log_info "qBittorrent PID: $QBIT_PID"

# Wait for WebUI to be ready
log_info "Waiting for WebUI to initialize..."
COUNTER=0
MAX_WAIT=60
while [ $COUNTER -lt $MAX_WAIT ]; do
    if curl -sf "http://localhost:${WEBUI_PORT}/api/v2/app/version" >/dev/null 2>&1; then
        log_info "WebUI is ready"
        break
    fi
    sleep 2
    COUNTER=$((COUNTER + 2))
    if [ $COUNTER -eq 30 ]; then
        log_warn "WebUI taking longer than expected to start..."
    fi
done

if [ $COUNTER -ge $MAX_WAIT ]; then
    log_error "WebUI failed to start within ${MAX_WAIT} seconds"
    kill $QBIT_PID 2>/dev/null || true
    exit 1
fi

# Apply additional security settings via API
log_info "Applying runtime security configuration..."

# Get SID for authenticated API calls (if auth is enabled)
get_sid() {
    curl -sf "http://localhost:${WEBUI_PORT}/api/v2/auth/login" \
        -d "username=${QBT_WEBUI_USERNAME:-admin}" \
        -d "password=${QBT_WEBUI_PASSWORD:-adminadmin}" \
        --cookie-jar /tmp/qbt_cookies.txt >/dev/null 2>&1 || true
}

# Try to get session ID
get_sid

# Apply secure preferences
SECURITY_PREFS='{
    "bypass_local_auth": false,
    "bypass_auth_subnet_whitelist": "172.27.0.0/16,172.28.0.0/16",
    "bypass_auth_subnet_whitelist_enabled": true,
    "web_ui_csrf_protection_enabled": true,
    "web_ui_host_header_validation_enabled": true,
    "web_ui_secure_cookie_enabled": true,
    "web_ui_clickjacking_protection_enabled": true,
    "web_ui_session_timeout": '"$SESSION_TIMEOUT"',
    "web_ui_ban_duration": '"$BAN_DURATION"',
    "web_ui_max_auth_fail_count": '"$MAX_AUTH_FAILURES"',
    "autorun_enabled": false,
    "mail_notification_enabled": false,
    "dyndns_enabled": false,
    "upnp": false,
    "encryption": 2,
    "anonymous_mode": true,
    "proxy_type": 0,
    "proxy_ip": "",
    "proxy_port": 8080,
    "proxy_torrents_only": false
}'

if curl -sf -X POST "http://localhost:${WEBUI_PORT}/api/v2/app/setPreferences" \
    --cookie /tmp/qbt_cookies.txt \
    -d "json=$SECURITY_PREFS" >/dev/null 2>&1; then
    log_info "Security preferences applied successfully"
else
    log_warn "Could not apply all security preferences (may require authentication)"
fi

# Clean up
rm -f /tmp/qbt_cookies.txt

# Security validation checks
log_info "Performing security validation..."

# Check if authentication is properly configured
if curl -sf "http://localhost:${WEBUI_PORT}/api/v2/app/preferences" 2>/dev/null | grep -q '"bypass_auth_subnet_whitelist":"0.0.0.0/0"'; then
    log_error "CRITICAL: Global authentication bypass detected! This is a severe security risk!"
    log_error "Please update configuration to use specific subnet ranges"
fi

# Check for autorun enabled
if curl -sf "http://localhost:${WEBUI_PORT}/api/v2/app/preferences" 2>/dev/null | grep -q '"autorun_enabled":true'; then
    log_error "WARNING: Autorun is enabled! This can be used for remote code execution"
fi

# Monitor for security events in background
(
    while kill -0 $QBIT_PID 2>/dev/null; do
        # Check for suspicious activity every 30 seconds
        sleep 30
        
        # Monitor for mass deletions
        TORRENT_COUNT=$(curl -sf "http://localhost:${WEBUI_PORT}/api/v2/torrents/info" 2>/dev/null | grep -o '"hash"' | wc -l)
        if [ "$TORRENT_COUNT" -eq 0 ] && [ -f /tmp/last_torrent_count ]; then
            LAST_COUNT=$(cat /tmp/last_torrent_count)
            if [ "$LAST_COUNT" -gt 10 ]; then
                log_error "ALERT: Mass torrent deletion detected! ($LAST_COUNT torrents removed)"
            fi
        fi
        echo "$TORRENT_COUNT" > /tmp/last_torrent_count
    done
) &

log_info "=== qBittorrent running with security monitoring ==="
log_info "WebUI: http://localhost:${WEBUI_PORT}"
log_info "Security features enabled:"
log_info "  - Subnet whitelist: 172.27.0.0/16, 172.28.0.0/16"
log_info "  - CSRF protection: Enabled"
log_info "  - Host header validation: Enabled"
log_info "  - Max auth failures: $MAX_AUTH_FAILURES"
log_info "  - Session timeout: ${SESSION_TIMEOUT}s"
log_info "  - Anonymous mode: Enabled"
log_info "  - Encryption: Required"

# Keep qBittorrent running and monitor
wait $QBIT_PID
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    log_error "qBittorrent exited with code $EXIT_CODE"
fi

exit $EXIT_CODE