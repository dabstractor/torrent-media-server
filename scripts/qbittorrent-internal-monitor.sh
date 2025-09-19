#!/bin/bash
# qBittorrent Internal Monitor
# Runs inside qBittorrent container to monitor VPN connectivity and implement process-level kill switch

set -euo pipefail

echo "=== qBittorrent Internal Monitor ==="

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/config/logs/qbittorrent-monitor.log"
CHECK_INTERVAL=30

# Logging functions
log_info() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $1" | tee -a "$LOG_FILE"
}

log_warn() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WARN] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $1" | tee -a "$LOG_FILE"
}

log_critical() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [CRITICAL] $1" | tee -a "$LOG_FILE"
}

# Check if we can reach the VPN container
check_vpn_connectivity() {
    # Try to reach the VPN container through the shared network namespace
    if ping -c 1 -W 5 vpn >/dev/null 2>&1; then
        log_info "VPN container is reachable"
        return 0
    else
        log_error "VPN container is not reachable"
        return 1
    fi
}

# Check if the VPN tunnel is active
check_vpn_tunnel() {
    # Check if we can reach Cloudflare's DNS through the VPN
    if timeout 5 curl -s --max-time 5 -o /dev/null -w "%{http_code}" https://1.1.1.1 2>/dev/null | grep -q "200\|301\|302"; then
        log_info "VPN tunnel is active"
        return 0
    else
        log_error "VPN tunnel is not active"
        return 1
    fi
}

# Emergency shutdown procedure
emergency_shutdown() {
    log_critical "Emergency shutdown initiated due to VPN failure"

    # Stop qBittorrent process
    if pgrep qbittorrent-nox >/dev/null; then
        log_critical "Stopping qBittorrent process"
        pkill -TERM qbittorrent-nox
        sleep 5

        # Force kill if still running
        if pgrep qbittorrent-nox >/dev/null; then
            log_critical "Force killing qBittorrent process"
            pkill -KILL qbittorrent-nox
        fi
    fi

    # Exit with error code to trigger container restart
    log_critical "Exiting monitor - container should restart"
    exit 1
}

# Main monitoring loop
main() {
    log_info "Starting qBittorrent internal monitor"

    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"

    while true; do
        log_info "Running VPN connectivity checks..."

        # Check VPN container connectivity
        if ! check_vpn_connectivity; then
            log_error "VPN container connectivity check failed"
            emergency_shutdown
        fi

        # Check VPN tunnel
        if ! check_vpn_tunnel; then
            log_error "VPN tunnel check failed"
            emergency_shutdown
        fi

        log_info "All checks passed - VPN is healthy"

        # Wait before next check
        sleep "$CHECK_INTERVAL"
    done
}

# Trap signals for clean shutdown
trap 'log_info "Monitor shutting down..."; exit 0' SIGTERM SIGINT

# Start monitoring
main "$@"