#!/bin/bash
# security-monitor.sh - Comprehensive security monitoring for qBittorrent stack
# Implements real-time threat detection and alerting

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="${PROJECT_ROOT}/logs/security"
ALERT_LOG="${LOG_DIR}/alerts.log"
INCIDENT_LOG="${LOG_DIR}/incidents.log"
STATE_FILE="${LOG_DIR}/monitor.state"

# Alert thresholds
MAX_AUTH_FAILURES=5
MAX_API_CALLS_PER_MINUTE=100
MAX_TORRENT_DELETIONS=10
SUSPICIOUS_PATTERNS=(
    "autorun_program"
    "external program"
    "rm -rf"
    "wget.*sh"
    "curl.*sh"
    "bash.*-c"
    "/etc/passwd"
    "/etc/shadow"
    "cryptominer"
    "xmrig"
)

# Colors for console output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Create log directory
mkdir -p "$LOG_DIR"

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$ALERT_LOG"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$ALERT_LOG"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$ALERT_LOG"
}

log_critical() {
    echo -e "${RED}[CRITICAL]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$INCIDENT_LOG"
    send_alert "CRITICAL" "$1"
}

# Alert sending function (implement your preferred alerting method)
send_alert() {
    local severity="$1"
    local message="$2"
    
    # Log to incident file
    echo "$(date '+%Y-%m-%d %H:%M:%S') [$severity] $message" >> "$INCIDENT_LOG"
    
    # Send to syslog
    logger -t "qbittorrent-security" -p "user.${severity,,}" "$message"
    
    # Send email alert (if configured)
    if [ -n "${ALERT_EMAIL:-}" ]; then
        echo "$message" | mail -s "[$severity] qBittorrent Security Alert" "$ALERT_EMAIL" 2>/dev/null || true
    fi
    
    # Send to webhook (if configured)
    if [ -n "${ALERT_WEBHOOK:-}" ]; then
        curl -X POST "$ALERT_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"severity\":\"$severity\",\"message\":\"$message\",\"timestamp\":\"$(date -Iseconds)\"}" \
            2>/dev/null || true
    fi
}

# Check container health
check_container_health() {
    local container="$1"
    
    if ! docker inspect "$container" >/dev/null 2>&1; then
        log_error "Container $container not found"
        return 1
    fi
    
    local status=$(docker inspect -f '{{.State.Status}}' "$container")
    if [ "$status" != "running" ]; then
        log_warn "Container $container is not running (status: $status)"
        return 1
    fi
    
    # Check for restart loops
    local restart_count=$(docker inspect -f '{{.RestartCount}}' "$container")
    if [ "$restart_count" -gt 5 ]; then
        log_critical "Container $container has restarted $restart_count times - possible crash loop"
    fi
    
    return 0
}

# Monitor authentication attempts
monitor_auth_attempts() {
    local container="qbittorrent"
    local auth_failures=0
    
    # Check recent logs for authentication failures
    docker logs "$container" --since 1m 2>&1 | while read -r line; do
        if echo "$line" | grep -E "WebUI login failure|Unauthorized|401" >/dev/null; then
            ((auth_failures++))
            log_warn "Authentication failure detected: $line"
            
            if [ "$auth_failures" -ge "$MAX_AUTH_FAILURES" ]; then
                log_critical "Multiple authentication failures detected ($auth_failures in 1 minute)"
                
                # Extract IP if possible
                if [[ "$line" =~ ([0-9]{1,3}\.){3}[0-9]{1,3} ]]; then
                    local ip="${BASH_REMATCH[0]}"
                    log_critical "Possible brute force attack from IP: $ip"
                    
                    # Block IP using iptables (optional)
                    # iptables -A INPUT -s "$ip" -j DROP
                fi
            fi
        fi
    done
}

# Monitor for suspicious API calls
monitor_api_activity() {
    local nginx_container="nginx-proxy"
    
    if ! check_container_health "$nginx_container"; then
        return
    fi
    
    # Count API calls in the last minute
    local api_calls=$(docker logs "$nginx_container" --since 1m 2>&1 | grep -c "/api/" || true)
    
    if [ "$api_calls" -gt "$MAX_API_CALLS_PER_MINUTE" ]; then
        log_critical "Excessive API calls detected: $api_calls calls in 1 minute"
    fi
    
    # Check for suspicious API endpoints
    docker logs "$nginx_container" --since 5m 2>&1 | while read -r line; do
        # Check for dangerous endpoints
        if echo "$line" | grep -E "setPreferences.*autorun|torrents/delete.*all|app/shutdown" >/dev/null; then
            log_critical "Suspicious API call detected: $line"
        fi
        
        # Check for command injection attempts
        if echo "$line" | grep -E "[\$\`]|%24|%60|\.\.\/|%2e%2e" >/dev/null; then
            log_critical "Possible command injection attempt: $line"
        fi
    done
}

# Monitor for configuration changes
monitor_config_changes() {
    local config_file="${PROJECT_ROOT}/config/qbittorrent/qBittorrent/config/qBittorrent.conf"
    
    if [ ! -f "$config_file" ]; then
        log_error "Configuration file not found: $config_file"
        return
    fi
    
    # Calculate current hash
    local current_hash=$(sha256sum "$config_file" | awk '{print $1}')
    
    # Compare with stored hash
    if [ -f "$STATE_FILE" ]; then
        local stored_hash=$(grep "config_hash=" "$STATE_FILE" | cut -d= -f2)
        
        if [ "$current_hash" != "$stored_hash" ]; then
            log_critical "Configuration file has been modified!"
            
            # Check for dangerous changes
            if grep -E "0\.0\.0\.0/0|autorun_enabled.*true" "$config_file" >/dev/null; then
                log_critical "DANGEROUS configuration detected in qBittorrent.conf"
            fi
        fi
    fi
    
    # Update stored hash
    echo "config_hash=$current_hash" > "$STATE_FILE"
}

# Monitor for mass torrent operations
monitor_torrent_activity() {
    local container="qbittorrent"
    
    # Get current torrent count via API
    local torrent_count=$(docker exec "$container" \
        curl -sf "http://localhost:8081/api/v2/torrents/info" 2>/dev/null | \
        grep -o '"hash"' | wc -l || echo "0")
    
    if [ -f "$STATE_FILE" ]; then
        local prev_count=$(grep "torrent_count=" "$STATE_FILE" | cut -d= -f2 || echo "0")
        
        # Check for mass deletion
        if [ "$prev_count" -gt "$MAX_TORRENT_DELETIONS" ] && [ "$torrent_count" -eq 0 ]; then
            log_critical "Mass torrent deletion detected! $prev_count torrents removed"
        fi
        
        # Check for rapid addition (possible malware distribution)
        local diff=$((torrent_count - prev_count))
        if [ "$diff" -gt 50 ]; then
            log_critical "Rapid torrent addition detected: $diff torrents added"
        fi
    fi
    
    # Update state
    echo "torrent_count=$torrent_count" >> "$STATE_FILE"
}

# Monitor for suspicious processes in containers
monitor_container_processes() {
    local containers=("qbittorrent" "vpn" "nginx-proxy")
    
    for container in "${containers[@]}"; do
        if ! check_container_health "$container"; then
            continue
        fi
        
        # Check for suspicious processes
        docker exec "$container" ps aux 2>/dev/null | while read -r line; do
            for pattern in "${SUSPICIOUS_PATTERNS[@]}"; do
                if echo "$line" | grep -i "$pattern" >/dev/null; then
                    log_critical "Suspicious process detected in $container: $line"
                fi
            done
            
            # Check for cryptocurrency miners
            if echo "$line" | grep -E "xmrig|cgminer|bfgminer|ethminer" >/dev/null; then
                log_critical "CRYPTOCURRENCY MINER detected in $container: $line"
                
                # Immediate container stop
                docker stop "$container" || true
                log_critical "Container $container stopped due to cryptocurrency miner detection"
            fi
        done
    done
}

# Monitor network connections
monitor_network_connections() {
    local container="qbittorrent"
    
    # Check for connections to suspicious ports
    docker exec "$container" netstat -tunp 2>/dev/null | while read -r line; do
        # Check for common malware ports
        if echo "$line" | grep -E ":4444|:5555|:6666|:6667|:31337" >/dev/null; then
            log_critical "Suspicious network connection detected: $line"
        fi
        
        # Check for excessive connections
        local conn_count=$(docker exec "$container" netstat -an 2>/dev/null | grep ESTABLISHED | wc -l)
        if [ "$conn_count" -gt 1000 ]; then
            log_warn "Excessive connections detected: $conn_count established connections"
        fi
    done
}

# Check for CVE vulnerabilities
check_vulnerabilities() {
    local container="qbittorrent"
    
    # Get qBittorrent version
    local version=$(docker exec "$container" \
        curl -sf "http://localhost:8081/api/v2/app/version" 2>/dev/null || echo "unknown")
    
    log_info "qBittorrent version: $version"
    
    # Check for known vulnerable versions
    case "$version" in
        *"4.5.5"*|*"4.5.4"*|*"4.5.3"*|*"4.5.2"*|*"4.5.1"*|*"4.5.0"*)
            log_critical "VULNERABLE VERSION: qBittorrent $version is affected by CVE-2023-30801 (default credentials RCE)"
            ;;
        *"4."*|*"3."*)
            log_warn "Older qBittorrent version detected. Consider upgrading for security fixes."
            ;;
    esac
}

# Main monitoring loop
main() {
    log_info "Starting qBittorrent Security Monitor"
    log_info "Project root: $PROJECT_ROOT"
    log_info "Log directory: $LOG_DIR"
    
    # Initial checks
    check_vulnerabilities
    monitor_config_changes
    
    # Continuous monitoring
    while true; do
        log_info "Running security checks..."
        
        # Run all monitoring functions
        monitor_auth_attempts
        monitor_api_activity
        monitor_config_changes
        monitor_torrent_activity
        monitor_container_processes
        monitor_network_connections
        
        # Check container health
        for container in qbittorrent vpn nginx-proxy prowlarr; do
            check_container_health "$container"
        done
        
        # Sleep before next check
        sleep 30
    done
}

# Trap signals for clean shutdown
trap 'log_info "Security monitor shutting down..."; exit 0' SIGTERM SIGINT

# Start monitoring
main "$@"