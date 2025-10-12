#!/bin/bash
# Private Internet Access (PIA) Provider Module

# Required environment variables
REQUIRED_VARS=("PIA_USERNAME" "PIA_PASSWORD")

# Configuration paths
CONFIG_DIR="${PROJECT_ROOT}/config/gluetun/pia"
PIA_CONFIG="${CONFIG_DIR}/wg0.conf"

# Optional: Region (defaults to us_atlanta)
PIA_REGION="${PIA_REGION:-us_atlanta}"

provider_check() {
    # Check if PIA config already exists
    if [ -f "${PIA_CONFIG}" ]; then
        return 0  # Config exists
    fi
    return 1  # Config doesn't exist
}

provider_generate() {
    # Create config directory
    mkdir -p "${CONFIG_DIR}"

    echo "Generating PIA Wireguard configuration for region: ${PIA_REGION}..."

    # Build or use pia-wg-config Docker image
    PIA_IMAGE="pia-wg-config:local"

    # Check if image exists, build if not
    if ! docker image inspect "${PIA_IMAGE}" >/dev/null 2>&1; then
        echo "Building PIA config generator image..."

        # Create temporary directory for build context
        TMP_DIR=$(mktemp -d)
        TMP_DOCKERFILE="${TMP_DIR}/Dockerfile"
        cat > "${TMP_DOCKERFILE}" <<'DOCKERFILE'
FROM golang:alpine AS builder
RUN apk add --no-cache git
RUN go install github.com/kylegrantlucas/pia-wg-config@latest

FROM alpine:latest
RUN apk add --no-cache ca-certificates
COPY --from=builder /go/bin/pia-wg-config /usr/local/bin/
ENTRYPOINT ["/usr/local/bin/pia-wg-config"]
DOCKERFILE

        # Build image using dedicated temp directory
        if ! docker build -t "${PIA_IMAGE}" -f "${TMP_DOCKERFILE}" "${TMP_DIR}" 2>&1; then
            rm -rf "${TMP_DIR}"
            echo "ERROR: Failed to build PIA config generator image"
            return 1
        fi

        rm -rf "${TMP_DIR}"
        echo "✓ PIA config generator image built"
    fi

    # Run pia-wg-config in Docker
    PIA_CONFIG_OUTPUT=$(docker run --rm \
        "${PIA_IMAGE}" \
        -r "${PIA_REGION}" \
        "${PIA_USERNAME}" \
        "${PIA_PASSWORD}" 2>&1)

    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to generate PIA config"
        echo "$PIA_CONFIG_OUTPUT"
        return 1
    fi

    # Save config
    echo "$PIA_CONFIG_OUTPUT" > "${PIA_CONFIG}"

    # Verify config was created
    if [ ! -f "${PIA_CONFIG}" ]; then
        echo "ERROR: Failed to create ${PIA_CONFIG}"
        return 1
    fi

    return 0
}

provider_extract() {
    # Check if config exists
    if [ ! -f "${PIA_CONFIG}" ]; then
        echo "ERROR: PIA config not found at ${PIA_CONFIG}" >&2
        return 1
    fi

    # Extract wireguard parameters
    PRIVATE_KEY=$(grep "PrivateKey" "${PIA_CONFIG}" | awk '{print $3}')
    ADDRESSES=$(grep "Address" "${PIA_CONFIG}" | head -1 | awk '{print $3}')
    # Add /32 CIDR notation if not present (required by gluetun)
    if [[ ! "$ADDRESSES" =~ / ]]; then
        ADDRESSES="${ADDRESSES}/32"
    fi
    PUBLIC_KEY=$(grep "PublicKey" "${PIA_CONFIG}" | awk '{print $3}')
    ENDPOINT=$(grep "Endpoint" "${PIA_CONFIG}" | awk '{print $3}')
    ENDPOINT_IP=$(echo "$ENDPOINT" | cut -d: -f1)
    ENDPOINT_PORT=$(echo "$ENDPOINT" | cut -d: -f2)
    PRESHARED_KEY=$(grep "PresharedKey" "${PIA_CONFIG}" | awk '{print $3}' || echo "")

    # Validate extracted values
    if [ -z "$PRIVATE_KEY" ] || [ -z "$PUBLIC_KEY" ] || [ -z "$ENDPOINT_IP" ]; then
        echo "ERROR: Failed to extract PIA configuration parameters" >&2
        return 1
    fi

    # Output environment variables (both PIA_* and WG_* for active config)
    cat <<EOF
# PIA Wireguard Configuration (Generated $(date))
# Region: ${PIA_REGION}
PIA_PRIVATE_KEY=${PRIVATE_KEY}
PIA_PUBLIC_KEY=${PUBLIC_KEY}
PIA_ENDPOINT_IP=${ENDPOINT_IP}
PIA_ENDPOINT_PORT=${ENDPOINT_PORT}
PIA_ADDRESSES=${ADDRESSES}
EOF

    if [ -n "$PRESHARED_KEY" ]; then
        echo "PIA_PRESHARED_KEY=${PRESHARED_KEY}"
    fi

    cat <<EOF

# Active Wireguard Config (copy from PIA)
WG_PRIVATE_KEY=${PRIVATE_KEY}
WG_PUBLIC_KEY=${PUBLIC_KEY}
WG_ENDPOINT_IP=${ENDPOINT_IP}
WG_ENDPOINT_PORT=${ENDPOINT_PORT}
WG_ADDRESSES=${ADDRESSES}
WG_ALLOWED_IPS=0.0.0.0/0
EOF

    if [ -n "$PRESHARED_KEY" ]; then
        echo "WG_PRESHARED_KEY=${PRESHARED_KEY}"
    fi

    return 0
}
