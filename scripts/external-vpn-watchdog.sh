#!/bin/sh
# External VPN Watchdog
# Monitors VPN from outside network namespace and implements emergency controls

set -euo pipefail

echo "=== External VPN Watchdog ==="

# Configuration
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="/logs"
LOG_FILE="${LOG_DIR}/vpn-watchdog.log"
ALERT_LOG="${LOG_DIR}/vpn-alerts.log"
CHECK_INTERVAL=30

# Create log directory
mkdir -p "$LOG_DIR"

# Logging functions
log_info() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $1" | tee -a "$LOG_FILE"
}

log_warn() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WARN] $1" | tee -a "$LOG_FILE"
}

log_debug() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [DEBUG] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $1" | tee -a "$LOG_FILE"
}

log_critical() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [CRITICAL] $1" | tee -a "$LOG_FILE" | tee -a "$ALERT_LOG"
}

# Check if Docker is available
if ! command -v docker >/dev/null 2>&1; then
    log_critical "Docker command not available"
    exit 1
fi

# Get container names (with prefix if set)
CONTAINER_PREFIX="${CONTAINER_PREFIX:-}"
VPN_CONTAINER="${CONTAINER_PREFIX}vpn"
QBITTORRENT_CONTAINER="${CONTAINER_PREFIX}qbittorrent"

log_info "Monitoring containers: VPN=$VPN_CONTAINER, qBittorrent=$QBITTORRENT_CONTAINER"

# Check container existence
check_container_exists() {
    local container="$1"
    if docker inspect "$container" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Check container health status
check_container_health() {
    local container="$1"

    if ! check_container_exists "$container"; then
        log_error "Container $container not found"
        return 1
    fi

    local status
    status=$(docker inspect -f '{{.State.Status}}' "$container" 2>/dev/null)

    if [ "$status" != "running" ]; then
        log_error "Container $container is not running (status: $status)"
        return 1
    fi

    # Check health if healthcheck is configured
    if docker inspect -f '{{.State.Health}}' "$container" >/dev/null 2>&1; then
        local health
        health=$(docker inspect -f '{{.State.Health.Status}}' "$container" 2>/dev/null)

        if [ "$health" != "healthy" ]; then
            log_error "Container $container is not healthy (health: $health)"
            return 1
        fi
    fi

    return 0
}

# Check VPN connection status
check_vpn_connection() {
    if ! check_container_health "$VPN_CONTAINER"; then
        return 1
    fi

    # Check if WARP is connected
    if docker exec "$VPN_CONTAINER" warp-cli --accept-tos status 2>/dev/null | grep -q "Connected"; then
        return 0
    else
        return 1
    fi
}

# Check if VPN tunnel interface exists
check_vpn_interface() {
    if ! check_container_health "$VPN_CONTAINER"; then
        return 1
    fi

    # Check if CloudflareWARP interface exists
    if docker exec "$VPN_CONTAINER" ip link show CloudflareWARP >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Check for IP leaks
check_ip_leaks() {
    if ! check_container_health "$VPN_CONTAINER"; then
        return 1
    fi

    # Skip IP leak check when VPN is connected and healthy
    # IP leak check is only relevant when VPN connection fails but container is still running
    # When VPN is properly connected, traffic will go through VPN (expected behavior)
    local vpn_status
    vpn_status=$(docker exec "$VPN_CONTAINER" warp-cli --accept-tos status 2>/dev/null | grep -o "Connected" || echo "NotConnected")
    if [ "$vpn_status" = "Connected" ]; then
        log_debug "VPN is connected - skipping IP leak test"
        return 0
    fi

    # Only test for leaks when VPN is not connected
    local test_result
    test_result=$(docker exec "$VPN_CONTAINER" timeout 5 curl -s ifconfig.me 2>/dev/null || echo "BLOCKED")

    if [ "$test_result" != "BLOCKED" ]; then
        log_critical "IP LEAK DETECTED: Traffic not blocked when VPN disconnected. Detected IP: $test_result"
        return 1
    fi

    return 0
}

# Emergency stop container
emergency_stop_container() {
    local container="$1"
    log_critical "Emergency stopping container: $container"

    if check_container_exists "$container"; then
        docker stop "$container" 2>/dev/null || true
    fi
}

# Emergency restart container
emergency_restart_container() {
    local container="$1"
    log_critical "Emergency restarting container: $container"

    if check_container_exists "$container"; then
        docker restart "$container" 2>/dev/null || true
    fi
}

# Send alert (placeholder for actual alerting mechanism)
send_alert() {
    local message="$1"
    log_critical "ALERT: $message"

    # TODO: Implement actual alerting (email, webhook, etc.)
    # For now, just log to alert file
}

# Main monitoring loop
main() {
    log_info "Starting external VPN watchdog"

    while true; do
        log_info "Running VPN health checks..."

        # Check VPN container health
        if ! check_container_health "$VPN_CONTAINER"; then
            log_error "VPN container health check failed"
            send_alert "VPN container is unhealthy"

            # Stop qBittorrent container to prevent IP leaks
            emergency_stop_container "$QBITTORRENT_CONTAINER"
        elif ! check_vpn_connection; then
            log_error "VPN connection check failed"
            send_alert "VPN connection is down"

            # Stop qBittorrent container to prevent IP leaks
            emergency_stop_container "$QBITTORRENT_CONTAINER"
        elif ! check_vpn_interface; then
            log_error "VPN interface check failed"
            send_alert "VPN tunnel interface missing"

            # Stop qBittorrent container to prevent IP leaks
            emergency_stop_container "$QBITTORRENT_CONTAINER"
        elif ! check_ip_leaks; then
            log_error "IP leak detected"
            send_alert "IP leak detected in VPN container"

            # Stop qBittorrent container to prevent IP leaks
            emergency_stop_container "$QBITTORRENT_CONTAINER"
        else
            log_info "All VPN checks passed - VPN is healthy"

            # Check if qBittorrent should be restarted (if it was stopped due to VPN issues)
            if ! check_container_health "$QBITTORRENT_CONTAINER"; then
                local qbt_status
                qbt_status=$(docker inspect -f '{{.State.Status}}' "$QBITTORRENT_CONTAINER" 2>/dev/null || echo "missing")

                if [ "$qbt_status" = "exited" ]; then
                    log_info "qBittorrent is stopped but VPN is healthy - restarting qBittorrent"
                    emergency_restart_container "$QBITTORRENT_CONTAINER"
                fi
            fi
        fi

        # Wait before next check
        sleep "$CHECK_INTERVAL"
    done
}

# Trap signals for clean shutdown
trap 'log_info "Watchdog shutting down..."; exit 0' SIGTERM SIGINT

# Start monitoring
main "$@"