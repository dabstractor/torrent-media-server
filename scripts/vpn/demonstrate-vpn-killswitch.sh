#!/bin/bash

# VPN Kill Switch Demonstration Script
# This script demonstrates the zero packet leak protection system in action

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
CONTAINER_PREFIX="${CONTAINER_PREFIX:-torrents-}"
LOG_DIR="./logs"
DEMO_LOG="$LOG_DIR/demo-$(date +%Y%m%d-%H%M%S).log"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Function to print colored output
print_header() {
    echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}\n"
}

print_section() {
    echo -e "\n${CYAN}── $1 ──${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${PURPLE}ℹ $1${NC}"
}

# Function to check if container is running
is_container_running() {
    local container_name="$1"
    docker ps --format "table {{.Names}}" | grep -q "^${container_name}$" 2>/dev/null
}

# Function to check if container is healthy
is_container_healthy() {
    local container_name="$1"
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "none")
    [[ "$health_status" == "healthy" ]]
}

# Function to get container status
get_container_status() {
    local container_name="$1"
    if is_container_running "$container_name"; then
        if is_container_healthy "$container_name"; then
            echo "healthy"
        else
            echo "unhealthy"
        fi
    else
        echo "stopped"
    fi
}

# Function to monitor system status
show_system_status() {
    print_section "Current System Status"

    local vpn_status=$(get_container_status "${CONTAINER_PREFIX}vpn")
    local qbit_status=$(get_container_status "${CONTAINER_PREFIX}qbittorrent")
    local watchdog_status=$(get_container_status "${CONTAINER_PREFIX}kill_switch_watchdog")

    printf "%-20s: " "VPN Container"
    case "$vpn_status" in
        "healthy") echo -e "${GREEN}Healthy${NC}" ;;
        "unhealthy") echo -e "${YELLOW}Unhealthy${NC}" ;;
        "stopped") echo -e "${RED}Stopped${NC}" ;;
    esac

    printf "%-20s: " "qBittorrent"
    case "$qbit_status" in
        "healthy") echo -e "${GREEN}Healthy${NC}" ;;
        "unhealthy") echo -e "${YELLOW}Unhealthy${NC}" ;;
        "stopped") echo -e "${RED}Stopped${NC}" ;;
    esac

    printf "%-20s: " "Kill Switch Watchdog"
    case "$watchdog_status" in
        "healthy") echo -e "${GREEN}Healthy${NC}" ;;
        "unhealthy") echo -e "${YELLOW}Unhealthy${NC}" ;;
        "stopped") echo -e "${RED}Stopped${NC}" ;;
    esac

    # Show VPN connection details if container is running
    if [[ "$vpn_status" != "stopped" ]]; then
        print_info "Checking VPN connection details..."
        if docker exec "${CONTAINER_PREFIX}vpn" warp-cli --accept-tos status 2>/dev/null | grep -q "Connected"; then
            local vpn_ip=$(docker exec "${CONTAINER_PREFIX}vpn" curl -s --max-time 5 http://ipinfo.io/ip 2>/dev/null || echo "Unknown")
            print_success "VPN is connected - External IP: $vpn_ip"
        else
            print_warning "VPN daemon is not connected"
        fi
    fi

    # Show network isolation status
    if [[ "$qbit_status" != "stopped" ]]; then
        print_info "Verifying network isolation..."
        local qbit_ip=$(docker exec "${CONTAINER_PREFIX}qbittorrent" curl -s --max-time 5 http://ipinfo.io/ip 2>/dev/null || echo "BLOCKED")
        if [[ "$qbit_ip" == "BLOCKED" ]]; then
            print_success "qBittorrent network access is properly blocked"
        else
            print_warning "qBittorrent can reach external network: $qbit_ip"
        fi
    fi
}

# Function to simulate VPN failure
simulate_vpn_failure() {
    print_section "Simulating VPN Failure"

    print_info "Stopping VPN container to simulate connection failure..."
    docker stop "${CONTAINER_PREFIX}vpn" >/dev/null 2>&1 || true

    print_warning "VPN container stopped - monitoring automatic protection..."

    # Monitor for qBittorrent shutdown
    local timeout=30
    local elapsed=0
    while [[ $elapsed -lt $timeout ]]; do
        if ! is_container_running "${CONTAINER_PREFIX}qbittorrent"; then
            print_success "qBittorrent automatically stopped after $elapsed seconds"
            return 0
        fi
        sleep 1
        ((elapsed++))
        printf "\rWaiting for qBittorrent shutdown... %d/%d seconds" $elapsed $timeout
    done

    echo ""
    if is_container_running "${CONTAINER_PREFIX}qbittorrent"; then
        print_error "qBittorrent did not stop automatically within $timeout seconds"
        return 1
    fi
}

# Function to test packet leak protection
test_packet_leak_protection() {
    print_section "Testing Packet Leak Protection"

    print_info "Attempting to access external network from qBittorrent container..."

    if is_container_running "${CONTAINER_PREFIX}qbittorrent"; then
        # Try to make external network requests
        if docker exec "${CONTAINER_PREFIX}qbittorrent" timeout 10 curl -s http://ipinfo.io/ip >/dev/null 2>&1; then
            print_error "SECURITY BREACH: qBittorrent can access external network!"
            return 1
        else
            print_success "Network access properly blocked - no packet leaks detected"
        fi
    else
        print_success "qBittorrent container is stopped - zero packet leak guaranteed"
    fi
}

# Function to restore system
restore_system() {
    print_section "Restoring System"

    print_info "Starting VPN container..."
    docker start "${CONTAINER_PREFIX}vpn" >/dev/null 2>&1 || true

    # Wait for VPN to become healthy
    print_info "Waiting for VPN to establish connection..."
    local timeout=120
    local elapsed=0
    while [[ $elapsed -lt $timeout ]]; do
        if is_container_healthy "${CONTAINER_PREFIX}vpn"; then
            print_success "VPN is healthy after $elapsed seconds"
            break
        fi
        sleep 2
        ((elapsed+=2))
        printf "\rWaiting for VPN connection... %d/%d seconds" $elapsed $timeout
    done

    echo ""
    if ! is_container_healthy "${CONTAINER_PREFIX}vpn"; then
        print_error "VPN failed to become healthy within $timeout seconds"
        return 1
    fi

    # Start qBittorrent if it's not running
    if ! is_container_running "${CONTAINER_PREFIX}qbittorrent"; then
        print_info "Starting qBittorrent container..."
        docker start "${CONTAINER_PREFIX}qbittorrent" >/dev/null 2>&1 || true

        # Wait for qBittorrent to become healthy
        timeout=60
        elapsed=0
        while [[ $elapsed -lt $timeout ]]; do
            if is_container_healthy "${CONTAINER_PREFIX}qbittorrent"; then
                print_success "qBittorrent is healthy after $elapsed seconds"
                break
            fi
            sleep 2
            ((elapsed+=2))
            printf "\rWaiting for qBittorrent... %d/%d seconds" $elapsed $timeout
        done

        echo ""
        if ! is_container_healthy "${CONTAINER_PREFIX}qbittorrent"; then
            print_warning "qBittorrent failed to become healthy within $timeout seconds"
        fi
    fi
}

# Function to show logs
show_protection_logs() {
    print_section "Protection System Logs"

    print_info "Recent VPN kill switch logs:"
    docker logs --tail 10 "${CONTAINER_PREFIX}vpn" 2>/dev/null | grep -E "(KILL_SWITCH|iptables|WARP)" || echo "No recent kill switch logs"

    echo ""
    print_info "Recent watchdog logs:"
    docker logs --tail 10 "${CONTAINER_PREFIX}kill_switch_watchdog" 2>/dev/null || echo "Watchdog container not running"

    echo ""
    print_info "Recent qBittorrent wrapper logs:"
    docker logs --tail 10 "${CONTAINER_PREFIX}qbittorrent" 2>/dev/null | grep -E "(monitor|wrapper|VPN)" || echo "No recent wrapper logs"
}

# Function to run continuous monitoring
run_continuous_monitoring() {
    print_section "Continuous Monitoring Mode"
    print_info "Press Ctrl+C to exit monitoring mode"

    while true; do
        clear
        print_header "VPN Kill Switch - Live Monitoring"
        show_system_status
        echo ""
        printf "Last updated: $(date)"
        sleep 5
    done
}

# Main demonstration flow
main() {
    # Log all output
    exec > >(tee -a "$DEMO_LOG")
    exec 2>&1

    print_header "VPN Kill Switch Demonstration"
    print_info "Demonstration log: $DEMO_LOG"

    # Check if containers exist
    if ! docker ps -a --format "{{.Names}}" | grep -q "${CONTAINER_PREFIX}vpn"; then
        print_error "VPN container not found. Please run 'docker compose up -d' first."
        exit 1
    fi

    # Show initial status
    show_system_status

    # Menu for demonstration options
    while true; do
        echo ""
        print_section "Demonstration Options"
        echo "1) Show current system status"
        echo "2) Simulate VPN failure (demonstrates automatic protection)"
        echo "3) Test packet leak protection"
        echo "4) Restore system to normal operation"
        echo "5) Show protection system logs"
        echo "6) Run continuous monitoring"
        echo "7) Run complete demonstration cycle"
        echo "0) Exit"
        echo ""
        read -p "Select option [0-7]: " choice

        case $choice in
            1) show_system_status ;;
            2) simulate_vpn_failure ;;
            3) test_packet_leak_protection ;;
            4) restore_system ;;
            5) show_protection_logs ;;
            6) run_continuous_monitoring ;;
            7)
                print_header "Complete Demonstration Cycle"
                show_system_status
                sleep 3
                simulate_vpn_failure
                sleep 2
                test_packet_leak_protection
                sleep 2
                restore_system
                sleep 2
                show_system_status
                print_success "Complete demonstration cycle finished!"
                ;;
            0)
                print_info "Exiting demonstration"
                exit 0
                ;;
            *) print_error "Invalid option. Please select 0-7." ;;
        esac
    done
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}Demonstration interrupted${NC}"; exit 0' INT

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi