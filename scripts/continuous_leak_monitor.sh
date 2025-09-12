#!/bin/bash

# continuous_leak_monitor.sh
# Continuous IP leak monitoring for VPN-protected containers

set -e

# Default values
DURATION="24h"
INTERVAL="30s"
LOG_FILE="/var/log/ip-monitor.log"
HOST_IP=""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "  --duration DURATION    How long to run (default: 24h)"
    echo "  --interval INTERVAL    Check interval (default: 30s)"
    echo "  --log-file FILE        Log file path (default: /var/log/ip-monitor.log)"
    echo "  --help                 Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 --duration 1h --interval 60s"
    echo "  $0 --duration 24h --interval 30s --log-file ./ip-monitor.log"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --duration)
            DURATION="$2"
            shift 2
            ;;
        --interval)
            INTERVAL="$2"
            shift 2
            ;;
        --log-file)
            LOG_FILE="$2"
            shift 2
            ;;
        --help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Convert duration to seconds
convert_to_seconds() {
    local duration=$1
    if [[ $duration =~ ^([0-9]+)([smhd])$ ]]; then
        local number=${BASH_REMATCH[1]}
        local unit=${BASH_REMATCH[2]}
        case $unit in
            s) echo $number ;;
            m) echo $((number * 60)) ;;
            h) echo $((number * 3600)) ;;
            d) echo $((number * 86400)) ;;
        esac
    else
        echo "Invalid duration format: $duration" >&2
        exit 1
    fi
}

# Convert interval to seconds for sleep
convert_interval_to_sleep() {
    local interval=$1
    if [[ $interval =~ ^([0-9]+)([sm])$ ]]; then
        local number=${BASH_REMATCH[1]}
        local unit=${BASH_REMATCH[2]}
        case $unit in
            s) echo $number ;;
            m) echo $((number * 60)) ;;
        esac
    else
        echo "Invalid interval format: $interval" >&2
        exit 1
    fi
}

# Initialize log file
init_log() {
    mkdir -p "$(dirname "$LOG_FILE")"
    echo "$(date): Starting IP leak monitoring (Duration: $DURATION, Interval: $INTERVAL)" | tee -a "$LOG_FILE"
    echo "$(date): Getting host IP address..." | tee -a "$LOG_FILE"
    
    # Get host IP address
    HOST_IP=$(curl -s --max-time 10 ifconfig.me || echo "UNKNOWN")
    if [ "$HOST_IP" = "UNKNOWN" ]; then
        echo "$(date): WARNING - Could not determine host IP address" | tee -a "$LOG_FILE"
    else
        echo "$(date): Host IP address: $HOST_IP" | tee -a "$LOG_FILE"
    fi
}

# Check IP for a container
check_container_ip() {
    local container_name=$1
    local ip
    
    # Check if container is running
    if ! docker ps --format "table {{.Names}}" | grep -q "^${container_name}$"; then
        echo "$(date): WARNING - Container $container_name is not running" | tee -a "$LOG_FILE"
        return 1
    fi
    
    # Get container IP
    ip=$(timeout 15s docker exec "$container_name" wget -qO- ifconfig.me 2>/dev/null || echo "TIMEOUT")
    
    if [ "$ip" = "TIMEOUT" ]; then
        echo "$(date): WARNING - Timeout checking IP for $container_name" | tee -a "$LOG_FILE"
        return 1
    elif [ -z "$ip" ]; then
        echo "$(date): WARNING - Could not get IP for $container_name" | tee -a "$LOG_FILE"
        return 1
    else
        echo "$(date): $container_name IP: $ip" | tee -a "$LOG_FILE"
        
        # Check for leak
        if [ "$ip" = "$HOST_IP" ] && [ "$HOST_IP" != "UNKNOWN" ]; then
            echo "$(date): ALERT - HOST_IP_DETECTED in $container_name: $ip" | tee -a "$LOG_FILE"
            return 2  # Leak detected
        fi
    fi
    
    return 0
}

# Check DNS leaks
check_dns_leaks() {
    local container_name=$1
    
    # Check if DNS queries are going through VPN
    local dns_result
    dns_result=$(timeout 10s docker exec "$container_name" nslookup google.com 2>/dev/null || echo "FAILED")
    
    if [ "$dns_result" = "FAILED" ]; then
        echo "$(date): $container_name DNS: Blocked (GOOD)" | tee -a "$LOG_FILE"
        return 0
    else
        echo "$(date): WARNING - $container_name DNS queries not blocked" | tee -a "$LOG_FILE"
        return 1
    fi
}

# Main monitoring loop
monitor_ips() {
    local duration_seconds
    duration_seconds=$(convert_to_seconds "$DURATION")
    local sleep_seconds
    sleep_seconds=$(convert_interval_to_sleep "$INTERVAL")
    
    local start_time
    start_time=$(date +%s)
    local end_time
    end_time=$((start_time + duration_seconds))
    
    echo -e "${GREEN}Starting continuous IP monitoring for $DURATION...${NC}"
    echo "Monitoring containers: gluetun, qbittorrent, prowlarr, sonarr, radarr, flaresolverr"
    echo "Press Ctrl+C to stop"
    
    local leak_count=0
    local check_count=0
    
    while [ "$(date +%s)" -lt "$end_time" ]; do
        check_count=$((check_count + 1))
        echo "$(date): === Check #$check_count ===" | tee -a "$LOG_FILE"
        
        # Check each VPN-protected container
        for container in gluetun qbittorrent prowlarr sonarr radarr flaresolverr; do
            case $(check_container_ip "$container") in
                2) leak_count=$((leak_count + 1)) ;;
                1) echo "$(date): Issue checking $container" ;;
            esac
        done
        
        # Check DNS leaks (when VPN is supposed to be down for testing)
        # check_dns_leaks qbittorrent
        
        echo "$(date): === End Check #$check_count (Leaks detected: $leak_count) ===" | tee -a "$LOG_FILE"
        
        # Sleep until next check
        sleep "$sleep_seconds"
    done
    
    echo "$(date): Monitoring complete after $check_count checks" | tee -a "$LOG_FILE"
    echo "$(date): Total leaks detected: $leak_count" | tee -a "$LOG_FILE"
    
    if [ "$leak_count" -gt 0 ]; then
        echo -e "${RED}ALERT: $leak_count IP leaks detected during monitoring!${NC}"
        return 1
    else
        echo -e "${GREEN}SUCCESS: No IP leaks detected during monitoring${NC}"
        return 0
    fi
}

# Signal handlers
cleanup() {
    echo ""
    echo "$(date): Monitoring stopped by user" | tee -a "$LOG_FILE"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Main execution
echo -e "${YELLOW}IP Leak Monitoring Script${NC}"
echo "=========================="

init_log
monitor_ips