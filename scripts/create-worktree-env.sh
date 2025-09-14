#!/bin/bash

# Git Worktree Environment Creator
# Usage: ./create-worktree-env.sh <worktree-name>
#
# This script:
# 1. Creates a git worktree at ../[project-name]-[worktree-name]
# 2. Generates a new .env file with randomized ports
# 3. Sets container prefix based on worktree name
# 4. Ensures no port conflicts with existing instances

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME=$(basename "$(pwd)")
PARENT_DIR="../"
ENV_FILE=".env"
PORT_RANGE_START=10000
PORT_RANGE_END=65000
MAX_RETRIES=50

print_usage() {
    echo "Usage: $0 <worktree-name>"
    echo ""
    echo "Creates a new git worktree with isolated environment configuration"
    echo ""
    echo "Arguments:"
    echo "  worktree-name    Name for the new worktree (alphanumeric, hyphens allowed)"
    echo ""
    echo "Examples:"
    echo "  $0 feature-auth       # Creates ../torrents-downloads-feature-auth"
    echo "  $0 hotfix-123         # Creates ../torrents-downloads-hotfix-123"
    echo "  $0 dev                # Creates ../torrents-downloads-dev"
    echo ""
    echo "The script will:"
    echo "  - Create git worktree at ../[project-name]-[worktree-name]"
    echo "  - Generate .env with randomized ports (avoiding conflicts)"
    echo "  - Set CONTAINER_PREFIX to [worktree-name]-"
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

log_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# Validate worktree name
validate_worktree_name() {
    local name="$1"
    
    if [[ -z "$name" ]]; then
        log_error "Worktree name is required"
        return 1
    fi
    
    if [[ ! "$name" =~ ^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$ ]]; then
        log_error "Worktree name must contain only letters, numbers, and hyphens"
        log_error "Cannot start or end with a hyphen"
        return 1
    fi
    
    if [[ ${#name} -gt 20 ]]; then
        log_error "Worktree name must be 20 characters or less"
        return 1
    fi
    
    return 0
}

# Get all ports currently in use by docker containers
get_used_ports() {
    docker ps --format "{{.Ports}}" 2>/dev/null | \
    grep -oE ':[0-9]+->|:[0-9]+/' | \
    grep -oE '[0-9]+' | \
    sort -n | \
    uniq || true
}

# Get ports from existing .env files in sibling directories
get_env_ports() {
    find "$PARENT_DIR" -maxdepth 2 -name ".env" -type f 2>/dev/null | \
    xargs grep -h "PORT=" 2>/dev/null | \
    grep -oE '[0-9]+' | \
    sort -n | \
    uniq || true
}

# Get network subnets from existing .env files in sibling directories
get_env_subnets() {
    find "$PARENT_DIR" -maxdepth 2 -name ".env" -type f 2>/dev/null | \
    xargs grep -h "NETWORK_SUBNET=" 2>/dev/null | \
    grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/[0-9]+' | \
    cut -d'.' -f3 | \
    sort -n | \
    uniq || true
}

# Generate a random port that's not in use
generate_random_port() {
    local used_ports="$1"
    local attempts=0
    
    while [[ $attempts -lt $MAX_RETRIES ]]; do
        local port=$((RANDOM % (PORT_RANGE_END - PORT_RANGE_START + 1) + PORT_RANGE_START))
        
        # Check if port is not in the used ports list
        if ! echo "$used_ports" | grep -q "^${port}$"; then
            echo "$port"
            return 0
        fi
        
        attempts=$((attempts + 1))
    done
    
    log_error "Could not find available port after $MAX_RETRIES attempts"
    return 1
}

# Get all network subnets currently in use
get_used_subnets() {
    docker network ls --format "{{.Name}}" 2>/dev/null | \
    xargs -I {} docker network inspect {} --format "{{range .IPAM.Config}}{{.Subnet}}{{end}}" 2>/dev/null | \
    grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/[0-9]+$' | \
    cut -d'.' -f3 | \
    sort -n | \
    uniq || true
}

# Generate unique network subnets
generate_unique_subnets() {
    local used_subnets="$1"
    local attempts=0
    local base_ip="10"
    local subnets=()
    
    # Generate media network subnet (10.X.0.0/16)
    while [[ $attempts -lt $MAX_RETRIES ]]; do
        local second_octet=$((RANDOM % 200 + 50))  # Range 50-249 to avoid common conflicts
        
        if ! echo "$used_subnets" | grep -q "^${second_octet}$"; then
            subnets+=("MEDIA_NETWORK_SUBNET=${base_ip}.${second_octet}.0.0/16")
            used_subnets="$used_subnets"$'\n'"$second_octet"
            break
        fi
        
        attempts=$((attempts + 1))
    done
    
    if [[ $attempts -eq $MAX_RETRIES ]]; then
        log_error "Could not find available media network subnet"
        return 1
    fi
    
    # Generate VPN network subnet (10.Y.0.0/16) - different from media network
    attempts=0
    while [[ $attempts -lt $MAX_RETRIES ]]; do
        local second_octet=$((RANDOM % 200 + 50))
        
        if ! echo "$used_subnets" | grep -q "^${second_octet}$"; then
            subnets+=("VPN_NETWORK_SUBNET=${base_ip}.${second_octet}.0.0/16")
            subnets+=("VPN_IP_ADDRESS=${base_ip}.${second_octet}.0.2")
            break
        fi
        
        attempts=$((attempts + 1))
    done
    
    if [[ $attempts -eq $MAX_RETRIES ]]; then
        log_error "Could not find available VPN network subnet"
        return 1
    fi
    
    printf '%s\n' "${subnets[@]}"
}

# Generate all required ports
generate_port_configuration() {
    local used_ports="$1"
    local ports=()
    
    # Port names in order
    local port_names=(
        "VPN_BITTORRENT_PORT"
        "FLARESOLVERR_PORT"
        "PLEX_PORT"
        "NGINX_QBITTORRENT_PORT"
        "NGINX_PROWLARR_PORT"
        "NGINX_SONARR_PORT"
        "NGINX_RADARR_PORT"
        "PROWLARR_PORT"
        "WEB_UI_PORT"
        "PIA_WIREGUARD_PORT"
        "PIA_FLARESOLVERR_PORT"
        "PIA_PROWLARR_PORT"
    )
    
    # Generate ports without logging to avoid output pollution
    for port_name in "${port_names[@]}"; do
        local new_port
        new_port=$(generate_random_port "$used_ports")
        if [[ $? -ne 0 ]]; then
            return 1
        fi
        
        ports+=("$port_name=$new_port")
        used_ports="$used_ports"$'\n'"$new_port"
    done
    
    # Output clean port configuration
    printf '%s\n' "${ports[@]}"
}

# Create the git worktree
create_worktree() {
    local worktree_name="$1"
    local worktree_path="$PARENT_DIR$PROJECT_NAME-$worktree_name"
    local branch_name="worktree/$worktree_name"
    
    log_step "Creating git worktree: $worktree_path"
    
    if [[ -d "$worktree_path" ]]; then
        log_error "Directory already exists: $worktree_path"
        return 1
    fi
    
    # Get current branch as base
    local current_branch
    current_branch=$(git branch --show-current)
    
    if [[ -z "$current_branch" ]]; then
        log_error "Not on a git branch. Please checkout a branch first."
        return 1
    fi
    
    # Check if branch already exists
    if git show-ref --verify --quiet "refs/heads/$branch_name"; then
        log_error "Branch '$branch_name' already exists"
        return 1
    fi
    
    # Create worktree with new branch based on current branch
    git worktree add -b "$branch_name" "$worktree_path" "$current_branch" >/dev/null 2>&1 || {
        log_error "Failed to create git worktree"
        return 1
    }
    
    log_success "Created worktree at: $worktree_path"
    log_info "Created new branch: $branch_name"
    
    # Return worktree path via global variable to avoid output issues
    CREATED_WORKTREE_PATH="$worktree_path"
}

# Create new .env file with randomized ports and network subnets
create_env_file() {
    local worktree_path="$1"
    local worktree_name="$2"
    local port_config="$3"
    local network_config="$4"
    
    log_step "Creating .env file with randomized ports and network subnets"
    
    local env_file="$worktree_path/.env"
    
    # Copy original .env as template
    cp "$ENV_FILE" "$env_file" || {
        log_error "Failed to copy .env template"
        return 1
    }
    
    # Update container prefix
    local container_prefix="$worktree_name-"
    if grep -q "^CONTAINER_PREFIX=" "$env_file"; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/^CONTAINER_PREFIX=.*/CONTAINER_PREFIX=$container_prefix/" "$env_file"
        else
            sed -i "s/^CONTAINER_PREFIX=.*/CONTAINER_PREFIX=$container_prefix/" "$env_file"
        fi
    else
        echo "CONTAINER_PREFIX=$container_prefix" >> "$env_file"
    fi
    
    # Update all port configurations
    while IFS= read -r port_line; do
        local port_name=$(echo "$port_line" | cut -d'=' -f1)
        local port_value=$(echo "$port_line" | cut -d'=' -f2)
        
        if grep -q "^$port_name=" "$env_file"; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s/^$port_name=.*/$port_name=$port_value/" "$env_file"
            else
                sed -i "s/^$port_name=.*/$port_name=$port_value/" "$env_file"
            fi
        else
            echo "$port_name=$port_value" >> "$env_file"
        fi
    done <<< "$port_config"
    
    # Handle legacy NETWORK_SUBNET -> MEDIA_NETWORK_SUBNET migration
    if grep -q "^NETWORK_SUBNET=" "$env_file"; then
        log_info "Migrating legacy NETWORK_SUBNET to MEDIA_NETWORK_SUBNET"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/^NETWORK_SUBNET=/MEDIA_NETWORK_SUBNET=/" "$env_file"
        else
            sed -i "s/^NETWORK_SUBNET=/MEDIA_NETWORK_SUBNET=/" "$env_file"
        fi
    fi

    # Update network subnet configurations - these are required for docker-compose
    while IFS= read -r network_line; do
        local network_name=$(echo "$network_line" | cut -d'=' -f1)
        local network_value=$(echo "$network_line" | cut -d'=' -f2)

        if grep -q "^$network_name=" "$env_file"; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s|^$network_name=.*|$network_name=$network_value|" "$env_file"
            else
                sed -i "s|^$network_name=.*|$network_name=$network_value|" "$env_file"
            fi
        else
            echo "$network_name=$network_value" >> "$env_file"
        fi
    done <<< "$network_config"

    # Ensure all required network variables exist - these are mandatory for docker-compose
    local required_network_vars=("MEDIA_NETWORK_SUBNET" "VPN_NETWORK_SUBNET" "VPN_IP_ADDRESS")
    for var_name in "${required_network_vars[@]}"; do
        if ! grep -q "^$var_name=" "$env_file"; then
            log_warning "Required network variable $var_name missing, adding with generated value"
            # Extract the generated value from network_config if available
            local found_value=$(echo "$network_config" | grep "^$var_name=" | head -1 | cut -d'=' -f2)
            if [[ -n "$found_value" ]]; then
                echo "$var_name=$found_value" >> "$env_file"
            else
                log_error "Could not generate required network variable: $var_name"
                return 1
            fi
        fi
    done
    
    log_success "Created .env with container prefix: $container_prefix"
}

# This function has been removed - docker-compose.yml should not be modified.
# The .env file with CONTAINER_PREFIX handles container naming via environment variables.

# Show summary of created environment
show_summary() {
    local worktree_path="$1"
    local worktree_name="$2"
    local port_config="$3"
    local network_config="$4"
    
    # Extract ports for display
    log_info "Generated port assignments:"
    while IFS= read -r port_line; do
        local port_name=$(echo "$port_line" | cut -d'=' -f1)
        local port_value=$(echo "$port_line" | cut -d'=' -f2)
        log_info "  $port_name: $port_value"
    done <<< "$port_config"
    
    # Extract networks for display
    log_info "Generated network subnets:"
    while IFS= read -r network_line; do
        local network_name=$(echo "$network_line" | cut -d'=' -f1)
        local network_value=$(echo "$network_line" | cut -d'=' -f2)
        log_info "  $network_name: $network_value"
    done <<< "$network_config"
    
    echo ""
    echo -e "${GREEN}🎉 Worktree Environment Created Successfully!${NC}"
    echo ""
    echo -e "${CYAN}📁 Worktree Location:${NC} $worktree_path"
    echo -e "${CYAN}🏷️  Container Prefix:${NC} $worktree_name-"
    echo ""
    echo -e "${CYAN}🔌 Port Configuration:${NC}"
    while IFS= read -r port_line; do
        echo "   $port_line"
    done <<< "$port_config"
    echo ""
    echo -e "${CYAN}🌐 Network Configuration:${NC}"
    while IFS= read -r network_line; do
        echo "   $network_line"
    done <<< "$network_config"
    echo ""
    echo -e "${CYAN}🚀 Next Steps:${NC}"
    echo "   1. cd $worktree_path"
    echo "   2. docker compose up -d"
    echo "   3. Access services on the new ports shown above"
    echo ""
    echo -e "${YELLOW}💡 Tip:${NC} Use './scripts/manage-container-prefix.sh' to change prefixes later"
}

# Main function
main() {
    local worktree_name="$1"
    
    log_info "Starting worktree environment creation for: $worktree_name"
    
    # Validate input
    validate_worktree_name "$worktree_name" || exit 1
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir >/dev/null 2>&1; then
        log_error "Not in a git repository"
        exit 1
    fi
    
    # Check if required files exist
    if [[ ! -f "$ENV_FILE" ]]; then
        log_error "$ENV_FILE not found. Please run this script from the project root."
        exit 1
    fi
    
    if [[ ! -f "docker-compose.yml" ]]; then
        log_error "docker-compose.yml not found. Please run this script from the project root."
        exit 1
    fi
    
    # Gather all used ports
    log_info "Checking for port conflicts..."
    local used_ports
    used_ports=$(
        {
            get_used_ports
            get_env_ports
        } | sort -n | uniq
    )
    
    local used_count
    used_count=$(echo "$used_ports" | wc -l)
    log_info "Found $used_count ports already in use"
    
    # Gather all used network subnets
    log_info "Checking for network subnet conflicts..."
    local used_subnets
    used_subnets=$(
        {
            get_used_subnets
            get_env_subnets
        } | sort -n | uniq
    )
    
    local subnet_count
    subnet_count=$(echo "$used_subnets" | wc -l)
    log_info "Found $subnet_count network subnets already in use"
    
    # Generate port configuration
    local port_config
    port_config=$(generate_port_configuration "$used_ports") || exit 1
    
    # Generate network subnet configuration
    local network_config
    network_config=$(generate_unique_subnets "$used_subnets") || exit 1
    
    # Create worktree
    create_worktree "$worktree_name" || exit 1
    local worktree_path="$CREATED_WORKTREE_PATH"
    
    # Create .env file
    create_env_file "$worktree_path" "$worktree_name" "$port_config" "$network_config" || {
        log_error "Failed to create .env file"
        log_warning "Cleaning up worktree..."
        git worktree remove "$worktree_path" --force 2>/dev/null || true
        exit 1
    }
    
    
    # Show summary
    show_summary "$worktree_path" "$worktree_name" "$port_config" "$network_config"
}

# Handle script arguments
if [[ $# -ne 1 ]]; then
    print_usage
    exit 1
fi

main "$1"