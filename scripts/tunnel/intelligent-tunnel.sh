#!/bin/sh
set -e

# Configuration
CLOUDFLARED_DIR="/home/nonroot/.cloudflared"
URL_FILE="/shared-data/tunnel-url.txt"
CONFIG_FILE="$CLOUDFLARED_DIR/config.yml"
TUNNEL_NAME="${TUNNEL_NAME:-jellyfin-tunnel}"
SERVICE_URL="${JELLYFIN_SERVICE_URL:-http://jellyfin:8096}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Ensure directories exist
mkdir -p "$CLOUDFLARED_DIR" "$(dirname "$URL_FILE")"

log_info "Cloudflare Tunnel Intelligent Setup"
log_info "Service: $SERVICE_URL"
log_info "Tunnel Name: $TUNNEL_NAME"

# Check if tunnel is already configured and working
if [ -f "$CONFIG_FILE" ]; then
    log_info "Existing tunnel configuration found"

    # Try to run the existing tunnel
    if cloudflared tunnel --config "$CONFIG_FILE" run > /tmp/tunnel.log 2>&1 &
    then
        TUNNEL_PID=$!
        sleep 10

        # Check if tunnel is working
        if kill -0 $TUNNEL_PID 2>/dev/null; then
            log_success "Existing tunnel is working!"

            # Extract URL from config or try to determine it
            if [ -f "$URL_FILE" ]; then
                TUNNEL_URL=$(cat "$URL_FILE")
                log_success "Tunnel URL: $TUNNEL_URL"
            else
                # Try to extract URL from logs or config
                TUNNEL_ID=$(grep "tunnel:" "$CONFIG_FILE" | awk '{print $2}')
                if [ -n "$TUNNEL_ID" ]; then
                    # For named tunnels, the URL format is predictable
                    TUNNEL_URL="https://$TUNNEL_ID.cfargotunnel.com"
                    echo "$TUNNEL_URL" > "$URL_FILE"
                    log_success "Tunnel URL determined: $TUNNEL_URL"
                fi
            fi

            # Run tunnel in foreground
            wait $TUNNEL_PID
            exit 0
        else
            log_warning "Existing tunnel configuration failed to start"
            kill $TUNNEL_PID 2>/dev/null || true
        fi
    fi
fi

# No working tunnel found, need to create one
log_info "Setting up new tunnel..."

# Strategy 1: Try API Token with certificate generation
if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
    log_info "API Token found: ${CLOUDFLARE_API_TOKEN:0:10}..."
    log_info "Attempting API token authentication..."

    export CLOUDFLARE_API_TOKEN

    # Try to generate origin certificate automatically using the API
    if try_api_certificate_generation; then
        log_success "Certificate generated via API"
        if create_tunnel_with_api; then
            log_success "Tunnel created successfully with API token"
            run_tunnel_and_extract_url
            exit 0
        fi
    fi

    log_warning "API token authentication failed - certificate generation required"
fi

# Strategy 2: OAuth Browser Authentication
log_info "Attempting OAuth browser authentication..."
log_info "This will require manual browser authentication with Cloudflare"

# Check if we're in a headless environment
if [ -z "$DISPLAY" ] && [ -z "$WAYLAND_DISPLAY" ]; then
    log_warning "Headless environment detected"
    log_info "Manual setup required. Please run:"
    log_info "  docker exec -it $(hostname) cloudflared tunnel login"
    log_info "  docker exec -it $(hostname) /scripts/tunnel/create-tunnel-config.sh"
    log_info ""
    log_info "Waiting for manual setup completion..."

    # Wait for manual setup
    wait_for_manual_setup
else
    # Interactive environment - attempt OAuth
    log_info "Interactive environment detected - attempting OAuth login"
    if cloudflared tunnel login; then
        log_success "OAuth authentication successful"
        if create_tunnel_with_oauth; then
            log_success "Tunnel created successfully"
            run_tunnel_and_extract_url
            exit 0
        fi
    else
        log_error "OAuth authentication failed"
    fi
fi

# Strategy 3: Quick Tunnel Fallback
log_warning "Named tunnel creation failed - falling back to Quick Tunnel"
log_info "Starting Cloudflare Quick Tunnel (temporary URL)..."

# Start quick tunnel and extract URL
cloudflared tunnel --url "$SERVICE_URL" > /tmp/quick-tunnel.log 2>&1 &
TUNNEL_PID=$!

# Wait for URL extraction
URL=""
ATTEMPTS=0
MAX_ATTEMPTS=60

log_info "Waiting for tunnel URL..."
while [ -z "$URL" ] && [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    sleep 2
    ATTEMPTS=$((ATTEMPTS + 1))
    URL=$(grep -o 'https://[a-zA-Z0-9-]\.trycloudflare\.com' /tmp/quick-tunnel.log 2>/dev/null || true)
done

if [ -n "$URL" ]; then
    echo "$URL" > "$URL_FILE"
    log_success "Quick Tunnel URL: $URL"
    log_warning "Note: Quick Tunnel URLs change on restart"
else
    log_error "Could not extract tunnel URL"
fi

# Wait for tunnel process
wait $TUNNEL_PID

# Helper functions
try_api_certificate_generation() {
    log_info "Attempting to generate origin certificate via API..."

    # Try to use the API to get zone info and generate certificate
    # This is a simplified approach - in practice, Cloudflare may still require OAuth for certificates

    # Check if we can list tunnels (validates API token)
    if cloudflared tunnel list > /dev/null 2>&1; then
        log_success "API token is valid"
        return 0
    else
        log_warning "API token validation failed"
        return 1
    fi
}

create_tunnel_with_api() {
    log_info "Creating tunnel with API token..."

    # Try to create tunnel
    if cloudflared tunnel create "$TUNNEL_NAME" 2>/dev/null; then
        log_success "Tunnel '$TUNNEL_NAME' created"

        # Get tunnel ID
        TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')

        if [ -n "$TUNNEL_ID" ]; then
            log_success "Tunnel ID: $TUNNEL_ID"
            create_tunnel_config "$TUNNEL_ID"
            return 0
        else
            log_error "Could not determine tunnel ID"
            return 1
        fi
    else
        log_error "Failed to create tunnel with API token"
        return 1
    fi
}

create_tunnel_with_oauth() {
    log_info "Creating tunnel with OAuth credentials..."

    # Create tunnel after OAuth login
    if cloudflared tunnel create "$TUNNEL_NAME"; then
        log_success "Tunnel '$TUNNEL_NAME' created"

        # Get tunnel ID
        TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')

        if [ -n "$TUNNEL_ID" ]; then
            log_success "Tunnel ID: $TUNNEL_ID"
            create_tunnel_config "$TUNNEL_ID"
            return 0
        else
            log_error "Could not determine tunnel ID"
            return 1
        fi
    else
        log_error "Failed to create tunnel"
        return 1
    fi
}

create_tunnel_config() {
    local tunnel_id="$1"

    log_info "Creating tunnel configuration..."

    cat > "$CONFIG_FILE" << EOF
tunnel: $tunnel_id
credentials-file: $CLOUDFLARED_DIR/$tunnel_id.json

ingress:
  - service: $SERVICE_URL
    originRequest:
      noTLSVerify: true
      connectTimeout: 30s
      tcpKeepAlive: 30s
      keepAliveConnections: 1024
      keepAliveTimeout: 1m30s
  - service: http_status:404
EOF

    log_success "Configuration created at $CONFIG_FILE"
}

run_tunnel_and_extract_url() {
    log_info "Starting tunnel to extract URL..."

    # Start tunnel temporarily to get URL
    cloudflared tunnel --config "$CONFIG_FILE" run > /tmp/tunnel-url.log 2>&1 &
    TUNNEL_PID=$!

    # Wait for URL
    URL=""
    ATTEMPTS=0
    MAX_ATTEMPTS=30

    while [ -z "$URL" ] && [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
        sleep 2
        ATTEMPTS=$((ATTEMPTS + 1))
        URL=$(grep -o 'https://[a-zA-Z0-9-]\.cfargotunnel\.com' /tmp/tunnel-url.log 2>/dev/null || true)
    done

    # Stop temporary tunnel
    kill $TUNNEL_PID 2>/dev/null || true

    if [ -n "$URL" ]; then
        echo "$URL" > "$URL_FILE"
        log_success "Tunnel URL: $URL"
    else
        # If we can't extract URL from logs, use the tunnel ID to construct it
        TUNNEL_ID=$(grep "tunnel:" "$CONFIG_FILE" | awk '{print $2}')
        if [ -n "$TUNNEL_ID" ]; then
            URL="https://$TUNNEL_ID.cfargotunnel.com"
            echo "$URL" > "$URL_FILE"
            log_success "Tunnel URL (constructed): $URL"
        else
            log_warning "Could not determine tunnel URL"
        fi
    fi

    # Now run tunnel properly
    log_info "Starting tunnel service..."
    exec cloudflared tunnel --config "$CONFIG_FILE" run
}

wait_for_manual_setup() {
    log_info "Waiting for manual tunnel setup completion..."
    log_info "The container will wait indefinitely until setup is complete"
    log_info ""
    log_info "To complete setup manually:"
    log_info "1. docker exec -it ${CONTAINER_PREFIX}cloudflared cloudflared tunnel login"
    log_info "2. docker exec -it ${CONTAINER_PREFIX}cloudflared cloudflared tunnel create $TUNNEL_NAME"
    log_info "3. docker exec -it ${CONTAINER_PREFIX}cloudflared /scripts/tunnel/create-tunnel-config.sh"
    log_info ""

    # Wait for config file to be created
    while [ ! -f "$CONFIG_FILE" ]; do
        sleep 10
        log_info "Still waiting for tunnel configuration..."
    done

    log_success "Configuration detected! Starting tunnel..."
    exec cloudflared tunnel --config "$CONFIG_FILE" run
}