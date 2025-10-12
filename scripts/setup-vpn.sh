#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROVIDERS_DIR="${SCRIPT_DIR}/vpn-providers"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=== VPN Setup Script ==="
echo ""

# Load .env file
if [ ! -f "${PROJECT_ROOT}/.env" ]; then
    echo -e "${RED}ERROR: .env file not found${NC}"
    echo "Please copy .env.example to .env and configure your VPN provider"
    exit 1
fi

# Source .env to get VPN_PROVIDER
set -a
source "${PROJECT_ROOT}/.env"
set +a

# Validate VPN_PROVIDER is set
if [ -z "${VPN_PROVIDER}" ]; then
    echo -e "${RED}ERROR: VPN_PROVIDER not set in .env${NC}"
    echo "Please set VPN_PROVIDER to one of: warp, pia, custom"
    exit 1
fi

echo -e "Provider: ${GREEN}${VPN_PROVIDER}${NC}"
echo ""

# Handle 'custom' provider (user-managed config)
if [ "${VPN_PROVIDER}" = "custom" ]; then
    echo -e "${YELLOW}Provider 'custom' selected - skipping auto-setup${NC}"
    echo "Please ensure you have manually configured these variables in .env:"
    echo "  - WG_PRIVATE_KEY"
    echo "  - WG_PUBLIC_KEY"
    echo "  - WG_ENDPOINT_IP"
    echo "  - WG_ENDPOINT_PORT"
    echo "  - WG_ADDRESSES"
    exit 0
fi

# Load provider module
PROVIDER_MODULE="${PROVIDERS_DIR}/${VPN_PROVIDER}.sh"

if [ ! -f "${PROVIDER_MODULE}" ]; then
    echo -e "${RED}ERROR: Provider '${VPN_PROVIDER}' not supported${NC}"
    echo "Available providers:"
    for module in "${PROVIDERS_DIR}"/*.sh; do
        basename "$module" .sh | sed 's/^/  - /'
    done
    exit 1
fi

# Source provider module
source "${PROVIDER_MODULE}"

# Check if config already exists
if provider_check; then
    echo -e "${GREEN}✓ Configuration already exists${NC}"
    echo ""

    # Extract current config
    ENV_UPDATES=$(provider_extract)

    # Update .env file automatically
    echo "Updating .env file with existing configuration..."
    ENV_FILE="${PROJECT_ROOT}/.env"

    # Parse and update each variable (read the entire line to preserve = in values)
    while IFS= read -r line; do
        # Skip empty lines and comments
        [[ -z "$line" || "$line" =~ ^# ]] && continue

        # Split on first = only
        key="${line%%=*}"
        value="${line#*=}"

        # Update or append the variable
        if grep -q "^${key}=" "$ENV_FILE"; then
            # Variable exists - update it (escape special chars in value)
            # Use awk to avoid sed delimiter issues with special characters
            awk -v key="$key" -v value="$value" 'BEGIN{FS=OFS="="} $1==key {$2=value; NF=2; found=1} {print} END{if(!found) print key OFS value}' "$ENV_FILE" > "$ENV_FILE.tmp"
            mv "$ENV_FILE.tmp" "$ENV_FILE"
        else
            # Variable doesn't exist - append it
            echo "${key}=${value}" >> "$ENV_FILE"
        fi
    done < <(echo "$ENV_UPDATES" | grep -E "^(WARP_|PIA_|WG_)")

    echo -e "${GREEN}✓ .env file updated automatically${NC}"
    echo ""

    echo -e "${YELLOW}Updated variables:${NC}"
    echo "$ENV_UPDATES" | grep -E "^(WARP_|PIA_|WG_)" | sed 's/^/  /'
    echo ""
    echo -e "${GREEN}✓ VPN setup complete - ready to run: docker compose up -d${NC}"
    exit 0
fi

# Validate required credentials
echo "Checking required credentials..."
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${RED}ERROR: Missing required environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "Please add these to your .env file"
    exit 1
fi

echo -e "${GREEN}✓ All required credentials present${NC}"
echo ""

# Generate configuration
echo "Generating ${VPN_PROVIDER} configuration..."
if ! provider_generate; then
    echo -e "${RED}ERROR: Failed to generate configuration${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Configuration generated successfully${NC}"
echo ""

# Extract environment variables
echo "Extracting configuration variables..."
ENV_UPDATES=$(provider_extract)

if [ -z "$ENV_UPDATES" ]; then
    echo -e "${RED}ERROR: Failed to extract configuration${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Configuration extracted${NC}"
echo ""

# Update .env file automatically
echo "Updating .env file..."
ENV_FILE="${PROJECT_ROOT}/.env"

# Parse and update each variable (read the entire line to preserve = in values)
while IFS= read -r line; do
    # Skip empty lines and comments
    [[ -z "$line" || "$line" =~ ^# ]] && continue

    # Split on first = only
    key="${line%%=*}"
    value="${line#*=}"

    # Update or append the variable
    if grep -q "^${key}=" "$ENV_FILE"; then
        # Variable exists - update it (escape special chars in value)
        # Use awk to avoid sed delimiter issues with special characters
        awk -v key="$key" -v value="$value" 'BEGIN{FS=OFS="="} $1==key {$2=value; NF=2; found=1} {print} END{if(!found) print key OFS value}' "$ENV_FILE" > "$ENV_FILE.tmp"
        mv "$ENV_FILE.tmp" "$ENV_FILE"
    else
        # Variable doesn't exist - append it
        echo "${key}=${value}" >> "$ENV_FILE"
    fi
done < <(echo "$ENV_UPDATES" | grep -E "^(WARP_|PIA_|WG_)")

echo -e "${GREEN}✓ .env file updated automatically${NC}"
echo ""

# Display what was updated
echo -e "${YELLOW}Updated variables:${NC}"
echo "$ENV_UPDATES" | grep -E "^(WARP_|PIA_|WG_)" | sed 's/^/  /'
echo ""
echo -e "${GREEN}✓ VPN setup complete - ready to run: docker compose up -d${NC}"
