#!/bin/bash
# Cloudflare WARP Provider Module

# Required environment variables (none for WARP - zero config!)
REQUIRED_VARS=()

# Configuration paths
CONFIG_DIR="${PROJECT_ROOT}/config/gluetun/warp"
WGCF_ACCOUNT="${PROJECT_ROOT}/wgcf-account.toml"
WGCF_PROFILE="${PROJECT_ROOT}/wgcf-profile.conf"

provider_check() {
    # Check if WARP config already exists
    if [ -f "${CONFIG_DIR}/wg0.conf" ] || [ -f "${WGCF_PROFILE}" ]; then
        return 0  # Config exists
    fi
    return 1  # Config doesn't exist
}

provider_generate() {
    # Create config directory
    mkdir -p "${CONFIG_DIR}"

    echo "Registering with Cloudflare WARP..."

    # Run wgcf in Docker to register and generate config
    # Mount project root so wgcf-account.toml persists across runs
    docker run --rm \
        -v "${PROJECT_ROOT}:/output" \
        -w /output \
        neilpang/wgcf-docker sh -c "
            wgcf register --accept-tos
            wgcf generate
            chmod 644 wgcf-account.toml wgcf-profile.conf
        " 2>&1

    # Verify config was created
    if [ ! -f "${WGCF_PROFILE}" ]; then
        echo "ERROR: Failed to generate wgcf-profile.conf"
        return 1
    fi

    # Copy to config directory for reference
    cp "${WGCF_PROFILE}" "${CONFIG_DIR}/wg0.conf"

    return 0
}

provider_extract() {
    # Find the wgcf profile (check both locations)
    PROFILE_PATH=""
    if [ -f "${WGCF_PROFILE}" ]; then
        PROFILE_PATH="${WGCF_PROFILE}"
    elif [ -f "${CONFIG_DIR}/wg0.conf" ]; then
        PROFILE_PATH="${CONFIG_DIR}/wg0.conf"
    else
        echo "ERROR: No WARP config found" >&2
        return 1
    fi

    # Extract wireguard parameters
    PRIVATE_KEY=$(grep "PrivateKey" "$PROFILE_PATH" | awk '{print $3}')
    ADDRESSES=$(grep "Address" "$PROFILE_PATH" | head -1 | awk '{print $3}')
    PUBLIC_KEY=$(grep "PublicKey" "$PROFILE_PATH" | awk '{print $3}')
    ENDPOINT=$(grep "Endpoint" "$PROFILE_PATH" | awk '{print $3}')
    ENDPOINT_HOST=$(echo "$ENDPOINT" | cut -d: -f1)
    ENDPOINT_PORT=$(echo "$ENDPOINT" | cut -d: -f2)

    # Resolve hostname to IP if needed (gluetun requires IP, not hostname)
    if echo "$ENDPOINT_HOST" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
        ENDPOINT_IP="$ENDPOINT_HOST"
    else
        # Resolve hostname to IP (use common Cloudflare WARP IP as fallback)
        ENDPOINT_IP=$(getent hosts "$ENDPOINT_HOST" 2>/dev/null | awk '{print $1}' | grep -E '^[0-9]+\.' | head -1)
        if [ -z "$ENDPOINT_IP" ]; then
            ENDPOINT_IP="162.159.192.1"  # Cloudflare WARP fallback IP
        fi
    fi

    # Validate extracted values
    if [ -z "$PRIVATE_KEY" ] || [ -z "$PUBLIC_KEY" ] || [ -z "$ENDPOINT_IP" ]; then
        echo "ERROR: Failed to extract WARP configuration parameters" >&2
        return 1
    fi

    # Output environment variables (both WARP_* and WG_* for active config)
    cat <<EOF
# Cloudflare WARP Configuration (Generated $(date))
WARP_PRIVATE_KEY=${PRIVATE_KEY}
WARP_PUBLIC_KEY=${PUBLIC_KEY}
WARP_ENDPOINT_IP=${ENDPOINT_IP}
WARP_ENDPOINT_PORT=${ENDPOINT_PORT}
WARP_ADDRESSES=${ADDRESSES}

# Active Wireguard Config (copy from WARP)
WG_PRIVATE_KEY=${PRIVATE_KEY}
WG_PUBLIC_KEY=${PUBLIC_KEY}
WG_ENDPOINT_IP=${ENDPOINT_IP}
WG_ENDPOINT_PORT=${ENDPOINT_PORT}
WG_ADDRESSES=${ADDRESSES}
WG_ALLOWED_IPS=0.0.0.0/0
EOF

    return 0
}
