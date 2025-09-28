#!/bin/sh
# Nginx Container Monitor - Watches for VPN container changes and reloads nginx

# Monitor interval in seconds
MONITOR_INTERVAL=10

# VPN container name
VPN_CONTAINER="${CONTAINER_PREFIX}vpn"

# Log file for monitoring
LOG_FILE="/var/log/nginx/container-monitor.log"

# Function to log with timestamp
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [MONITOR] $1" | tee -a "$LOG_FILE"
}

# Function to get VPN container IP
get_vpn_ip() {
    # Try to get the container IP through Docker's embedded DNS
    nslookup vpn 2>/dev/null | grep "Address:" | tail -n1 | awk '{print $2}' || echo "unknown"
}

# Function to check if nginx is responsive
check_nginx_health() {
    nginx -t >/dev/null 2>&1 && curl -f -s "http://localhost:8080/nginx-health" >/dev/null 2>&1
}

# Function to reload nginx safely
reload_nginx() {
    log "Reloading nginx configuration..."
    if nginx -t >/dev/null 2>&1; then
        nginx -s reload && log "Nginx reloaded successfully"
    else
        log "ERROR: Nginx configuration test failed, not reloading"
        nginx -t 2>&1 | tee -a "$LOG_FILE"
    fi
}

# Initialize monitoring
log "Starting nginx container monitor..."
log "Monitoring VPN container: $VPN_CONTAINER"
log "Monitor interval: ${MONITOR_INTERVAL}s"

# Get initial VPN IP
current_vpn_ip=$(get_vpn_ip)
log "Initial VPN container IP: $current_vpn_ip"

# Main monitoring loop
while true; do
    sleep "$MONITOR_INTERVAL"

    # Check new VPN IP
    new_vpn_ip=$(get_vpn_ip)

    # Check if IP changed
    if [ "$new_vpn_ip" != "$current_vpn_ip" ]; then
        log "VPN container IP changed: $current_vpn_ip -> $new_vpn_ip"
        current_vpn_ip="$new_vpn_ip"

        # Small delay to let container fully initialize
        sleep 5

        # Reload nginx to pick up new IP
        reload_nginx
    fi

    # Periodic health check
    if ! check_nginx_health; then
        log "WARNING: Nginx health check failed, attempting reload..."
        reload_nginx
    fi
done