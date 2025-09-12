#!/bin/bash

# Container Prefix Management Script
# Usage: ./manage-container-prefix.sh [remove|set] [new-prefix]
#
# Examples:
#   ./manage-container-prefix.sh remove              # Remove current prefix
#   ./manage-container-prefix.sh set "new-prefix-"   # Set new prefix
#   ./manage-container-prefix.sh set ""              # Remove prefix (same as remove)

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENV_FILE=".env"
COMPOSE_FILE="docker-compose.yml"
BACKUP_SUFFIX=".backup.$(date +%Y%m%d-%H%M%S)"

# Container services defined in docker-compose.yml
SERVICES=("vpn" "flaresolverr" "qbittorrent" "plex" "sonarr" "radarr" "nginx-proxy" "web-ui" "prowlarr")

print_usage() {
    echo "Usage: $0 [remove|set|reset-networks] [new-prefix]"
    echo ""
    echo "Commands:"
    echo "  remove           Remove the current container prefix"
    echo "  set <prefix>     Set a new container prefix"
    echo "  reset-networks   Reset network subnets to clean generic values (172.x ranges)"
    echo ""
    echo "Examples:"
    echo "  $0 remove                    # Remove current prefix"
    echo "  $0 set \"new-instance-\"       # Set new prefix"
    echo "  $0 set \"\"                   # Remove prefix (same as remove)"
    echo "  $0 reset-networks            # Reset to clean network subnets for commit"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get current prefix from .env file
get_current_prefix() {
    if [[ -f "$ENV_FILE" ]]; then
        grep "^CONTAINER_PREFIX=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2 || echo ""
    else
        echo ""
    fi
}

# Validate that all expected services exist in docker-compose.yml
validate_services() {
    local missing_services=()
    
    for service in "${SERVICES[@]}"; do
        if ! grep -q "^  $service:" "$COMPOSE_FILE"; then
            missing_services+=("$service")
        fi
    done
    
    if [[ ${#missing_services[@]} -gt 0 ]]; then
        log_error "Missing services in $COMPOSE_FILE: ${missing_services[*]}"
        return 1
    fi
    
    return 0
}


# Update container prefix in .env file
update_env_prefix() {
    local new_prefix="$1"
    
    log_info "Updating CONTAINER_PREFIX in $ENV_FILE..."
    
    if grep -q "^CONTAINER_PREFIX=" "$ENV_FILE"; then
        # Update existing line
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/^CONTAINER_PREFIX=.*/CONTAINER_PREFIX=$new_prefix/" "$ENV_FILE"
        else
            # Linux
            sed -i "s/^CONTAINER_PREFIX=.*/CONTAINER_PREFIX=$new_prefix/" "$ENV_FILE"
        fi
    else
        # Add new line after the container names comment or at the beginning
        if grep -q "# Container Names" "$ENV_FILE"; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "/# Container Names/a\\
CONTAINER_PREFIX=$new_prefix" "$ENV_FILE"
            else
                sed -i "/# Container Names/a CONTAINER_PREFIX=$new_prefix" "$ENV_FILE"
            fi
        else
            # Add at the top
            echo -e "# Container Names - Unique for this instance\nCONTAINER_PREFIX=$new_prefix\n$(cat $ENV_FILE)" > "$ENV_FILE"
        fi
    fi
}

# Update container names in docker-compose.yml
update_compose_container_names() {
    local new_prefix="$1"
    local container_name_pattern
    
    log_info "Updating container names in $COMPOSE_FILE..."
    
    if [[ -n "$new_prefix" ]]; then
        container_name_pattern="\${CONTAINER_PREFIX:-$new_prefix}"
    else
        container_name_pattern=""
    fi
    
    # Update each service's container_name
    for service in "${SERVICES[@]}"; do
        if [[ -n "$container_name_pattern" ]]; then
            # Set prefix
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "/^  $service:/,/^  [a-z]/ s/container_name: .*/container_name: $container_name_pattern$service/" "$COMPOSE_FILE"
            else
                sed -i "/^  $service:/,/^  [a-z]/ s/container_name: .*/container_name: $container_name_pattern$service/" "$COMPOSE_FILE"
            fi
        else
            # Remove prefix - use just service name
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "/^  $service:/,/^  [a-z]/ s/container_name: .*/container_name: $service/" "$COMPOSE_FILE"
            else
                sed -i "/^  $service:/,/^  [a-z]/ s/container_name: .*/container_name: $service/" "$COMPOSE_FILE"
            fi
        fi
    done
}

# Check if containers are running and offer to restart
check_and_restart_containers() {
    local current_prefix="$1"
    local running_containers=()
    
    # Find running containers with the current prefix
    if [[ -n "$current_prefix" ]]; then
        readarray -t running_containers < <(docker ps --format "{{.Names}}" --filter "name=$current_prefix" 2>/dev/null || true)
    else
        # Check for containers matching our service names
        for service in "${SERVICES[@]}"; do
            if docker ps --format "{{.Names}}" | grep -q "^$service$" 2>/dev/null; then
                running_containers+=("$service")
            fi
        done
    fi
    
    if [[ ${#running_containers[@]} -gt 0 ]]; then
        log_warning "Found ${#running_containers[@]} running containers that may be affected:"
        printf '%s\n' "${running_containers[@]}" | sed 's/^/  - /'
        
        echo ""
        read -p "Do you want to restart the containers with the new configuration? (y/N): " -n 1 -r
        echo ""
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Stopping current containers..."
            docker compose down || {
                log_warning "Failed to stop containers gracefully"
            }
            
            log_info "Starting containers with new configuration..."
            docker compose up -d || {
                log_error "Failed to start containers"
                return 1
            }
            
            log_success "Containers restarted successfully"
        else
            log_info "Containers not restarted. Run 'docker compose down && docker compose up -d' manually when ready."
        fi
    else
        log_info "No running containers found. Configuration updated successfully."
    fi
}

# Remove current prefix
remove_prefix() {
    local current_prefix
    current_prefix=$(get_current_prefix)
    
    if [[ -z "$current_prefix" ]]; then
        log_warning "No container prefix is currently set"
        return 0
    fi
    
    log_info "Removing current container prefix: '$current_prefix'"
    
    
    # Update .env file
    update_env_prefix ""
    
    # Update docker-compose.yml
    update_compose_container_names ""
    
    log_success "Container prefix removed successfully"
    
    # Check and offer to restart containers
    check_and_restart_containers "$current_prefix"
}

# Set new prefix
set_prefix() {
    local new_prefix="$1"
    local current_prefix
    current_prefix=$(get_current_prefix)
    
    log_info "Setting container prefix to: '$new_prefix'"
    
    if [[ "$new_prefix" == "$current_prefix" ]]; then
        log_warning "New prefix is the same as current prefix. No changes needed."
        return 0
    fi
    
    
    # Update .env file
    update_env_prefix "$new_prefix"
    
    # Update docker-compose.yml
    update_compose_container_names "$new_prefix"
    
    log_success "Container prefix set to '$new_prefix' successfully"
    
    # Check and offer to restart containers
    check_and_restart_containers "$current_prefix"
}

# Reset network subnets to clean generic values
reset_networks() {
    log_info "Resetting network subnets to clean generic values..."
    
    
    # Reset to clean generic network subnets
    local media_subnet="172.27.0.0/16"
    local vpn_subnet="172.29.0.0/16"
    local vpn_ip="172.29.0.2"
    
    # Find current subnet values to replace with generic ones
    local current_media_subnet=$(grep -m1 "\- subnet:" "$COMPOSE_FILE" | sed 's/.*- subnet: //' | sed 's/ .*//')
    local current_vpn_subnet=$(grep "\- subnet:" "$COMPOSE_FILE" | tail -1 | sed 's/.*- subnet: //' | sed 's/ .*//')
    local current_vpn_ip=$(grep "ipv4_address:" "$COMPOSE_FILE" | sed 's/.*ipv4_address: //' | sed 's/ .*//')
    
    # Update docker-compose.yml using simple string replacement
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS sed syntax
        sed -i '' "s/$current_media_subnet/$media_subnet/g" "$COMPOSE_FILE"
        sed -i '' "s/$current_vpn_subnet/$vpn_subnet/g" "$COMPOSE_FILE"
        if [[ -n "$current_vpn_ip" ]]; then
            sed -i '' "s/$current_vpn_ip/$vpn_ip/g" "$COMPOSE_FILE"
        fi
    else
        # Linux sed syntax
        sed -i "s|$current_media_subnet|$media_subnet|g" "$COMPOSE_FILE"
        sed -i "s|$current_vpn_subnet|$vpn_subnet|g" "$COMPOSE_FILE"
        if [[ -n "$current_vpn_ip" ]]; then
            sed -i "s|$current_vpn_ip|$vpn_ip|g" "$COMPOSE_FILE"
        fi
    fi
    
    # Update .env file QBITTORRENT_URL to match reset VPN IP
    local current_qbt_ip=$(grep "QBITTORRENT_URL=" "$ENV_FILE" | sed 's|.*http://||' | sed 's|:8080.*||')
    if [[ -n "$current_qbt_ip" && "$current_qbt_ip" != "$vpn_ip" ]]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|$current_qbt_ip|$vpn_ip|g" "$ENV_FILE"
        else
            sed -i "s|$current_qbt_ip|$vpn_ip|g" "$ENV_FILE"
        fi
    fi
    
    log_success "Network subnets reset successfully:"
    log_info "  Media network: $media_subnet"
    log_info "  VPN network: $vpn_subnet"
    log_info "  VPN IP address: $vpn_ip"
    log_info "  Updated QBITTORRENT_URL to: http://$vpn_ip:8080"
    
    # Check for running containers that might be affected
    local running_containers
    running_containers=$(docker ps --format "{{.Names}}" 2>/dev/null | grep -E "$(IFS='|'; echo "${SERVICES[*]}")" || true)
    
    if [[ -n "$running_containers" ]]; then
        log_warning "Found running containers that may be affected by network changes:"
        while IFS= read -r container; do
            log_warning "  - $container"
        done <<< "$running_containers"
        log_warning "You may need to restart these containers to apply network changes:"
        log_warning "  docker compose down && docker compose up -d"
    fi
}

# Main function
main() {
    local command="$1"
    local new_prefix="$2"
    
    # Check if required files exist
    if [[ ! -f "$ENV_FILE" ]]; then
        log_error "$ENV_FILE not found. Please run this script from the project root."
        exit 1
    fi
    
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        log_error "$COMPOSE_FILE not found. Please run this script from the project root."
        exit 1
    fi
    
    # Validate services exist in compose file
    validate_services || exit 1
    
    case "$command" in
        "remove")
            remove_prefix
            ;;
        "set")
            if [[ -z "$new_prefix" ]]; then
                log_error "New prefix is required for 'set' command"
                print_usage
                exit 1
            fi
            set_prefix "$new_prefix"
            ;;
        "reset-networks")
            reset_networks
            ;;
        *)
            log_error "Invalid command: '$command'"
            print_usage
            exit 1
            ;;
    esac
}

# Handle script arguments
if [[ $# -lt 1 ]]; then
    print_usage
    exit 1
fi

main "$@"