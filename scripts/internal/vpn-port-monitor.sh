#!/bin/bash
# VPN Port Forwarding Monitor
# Runs inside VPN container to check and refresh PIA port forwarding when needed

# Only runs for PIA OpenVPN configurations
if [ "${VPN_SERVICE_PROVIDER}" != "private internet access" ] || [ "${VPN_TYPE}" != "openvpn" ]; then
    if [ -n "${VPN_SERVICE_PROVIDER}" ] && [ -n "${VPN_TYPE}" ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') [PORT-MONITOR] Skipping port monitoring - not PIA OpenVPN (provider: ${VPN_SERVICE_PROVIDER}, type: ${VPN_TYPE})" >> "$LOG_FILE"
    fi
    exit 0
fi

FORWARDED_PORT_FILE="/tmp/gluetun/forwarded_port"
LOG_FILE="/tmp/port-monitor.log"
CHECK_INTERVAL=86400  # Check daily
REFRESH_THRESHOLD=7    # Refresh if less than 7 days remaining

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [PORT-MONITOR] $1" >> "$LOG_FILE"
}

check_port_expiry() {
    if [ ! -f "$FORWARDED_PORT_FILE" ]; then
        log "No forwarded port file found"
        return 1
    fi

    # Check logs for expiry info
    local expiry_info=$(grep "expires in" /tmp/gluetun/gluetun.log 2>/dev/null | tail -1)
    if [ -n "$expiry_info" ]; then
        local days=$(echo "$expiry_info" | grep -oP 'expires in \K\d+' || echo "0")
        if [ "$days" -le "$REFRESH_THRESHOLD" ]; then
            log "Port expires in $days days, refresh needed"
            return 0
        else
            log "Port valid for $days days, no refresh needed"
            return 1
        fi
    fi

    # If we can't determine expiry, check file age
    if [ -f "$FORWARDED_PORT_FILE" ]; then
        local file_age=$(($(date +%s) - $(stat -c %Y "$FORWARDED_PORT_FILE")))
        local days_age=$((file_age / 86400))
        if [ "$days_age" -ge 55 ]; then  # Refresh if file is 55+ days old
            log "Port file is $days_age days old, refreshing"
            return 0
        fi
    fi

    return 1
}

refresh_port() {
    log "Starting port refresh..."

    # Restart the VPN service to get new port
    kill -USR1 1  # Send signal to main process to restart

    # Wait for new port
    local retries=0
    local max_retries=30

    while [ $retries -lt $max_retries ]; do
        sleep 2
        ((retries++))

        if [ -f "$FORWARDED_PORT_FILE" ]; then
            local new_port=$(cat "$FORWARDED_PORT_FILE")
            if [ -n "$new_port" ] && [ "$new_port" != "0" ]; then
                log "Successfully refreshed port: $new_port"

                # Update torrent clients with new port
              /scripts/internal/update-torrent-ports.sh

                return 0
            fi
        fi
    done

    log "Failed to refresh port after $max_retries attempts"
    return 1
}

# Main monitoring loop
main() {
    log "Starting PIA port monitor (checks daily)"

    while true; do
        if check_port_expiry; then
            refresh_port
        fi

        sleep "$CHECK_INTERVAL"
    done
}

# Start in background
main &