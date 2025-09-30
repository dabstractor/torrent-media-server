#!/bin/bash
# VPN Network Reset Script
# Minimal recovery - only stops/restarts what's absolutely necessary
# Goal: Keep sonarr, radarr, prowlarr, and other services running if possible

set -e

CONTAINER_PREFIX="${CONTAINER_PREFIX:-}"
VPN_CONTAINER="${CONTAINER_PREFIX}vpn"
TRANSMISSION_CONTAINER="${CONTAINER_PREFIX}transmission"
QBITTORRENT_CONTAINER="${CONTAINER_PREFIX}qbittorrent"
NGINX_CONTAINER="${CONTAINER_PREFIX}nginx-proxy"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

log_info "=== VPN Network Reset ==="
log_info "This will restart ONLY: vpn, transmission/qbittorrent"
log_info "Services that will KEEP RUNNING: sonarr, radarr, prowlarr, jellyfin, plex"
echo ""

# Check which torrent client is active
ACTIVE_CLIENT=""
if docker ps --format '{{.Names}}' | grep -q "^${TRANSMISSION_CONTAINER}$"; then
    ACTIVE_CLIENT="transmission"
elif docker ps --format '{{.Names}}' | grep -q "^${QBITTORRENT_CONTAINER}$"; then
    ACTIVE_CLIENT="qbittorrent"
fi

if [ -n "$ACTIVE_CLIENT" ]; then
    log_info "Active torrent client: $ACTIVE_CLIENT"
else
    log_warn "No torrent client currently running"
fi

# Step 1: Stop torrent client (if running)
if [ "$ACTIVE_CLIENT" = "transmission" ]; then
    log_info "Stopping transmission..."
    docker compose stop transmission || log_warn "Failed to stop transmission gracefully"
elif [ "$ACTIVE_CLIENT" = "qbittorrent" ]; then
    log_info "Stopping qbittorrent..."
    docker compose stop qbittorrent || log_warn "Failed to stop qbittorrent gracefully"
fi

# Step 2: Stop VPN
log_info "Stopping VPN container..."
docker compose stop vpn || log_warn "Failed to stop VPN gracefully"

# Step 3: Clean up port bindings
log_info "Cleaning up port bindings..."
VPN_PORT=$(grep "^VPN_BITTORRENT_PORT=" .env | cut -d= -f2 || echo "17403")
sudo fuser -k ${VPN_PORT}/tcp ${VPN_PORT}/udp 2>/dev/null || log_info "No processes found on port $VPN_PORT"

# Step 4: Wait a moment for cleanup
sleep 2

# Step 5: Start VPN
log_info "Starting VPN container..."
docker compose up -d vpn

# Step 6: Wait for VPN to be healthy
log_info "Waiting for VPN to become healthy..."
for i in $(seq 1 60); do
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$VPN_CONTAINER" 2>/dev/null || echo "none")
    if [ "$HEALTH" = "healthy" ]; then
        log_info "✅ VPN is healthy"
        break
    fi
    echo -n "."
    sleep 2
done
echo ""

# Check if VPN is actually healthy
HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$VPN_CONTAINER" 2>/dev/null || echo "none")
if [ "$HEALTH" != "healthy" ]; then
    log_error "VPN failed to become healthy. Check logs: docker compose logs vpn"
    exit 1
fi

# Step 7: Start torrent client
if [ "$ACTIVE_CLIENT" = "transmission" ]; then
    log_info "Starting transmission..."
    docker compose up -d transmission
    log_info "Waiting for transmission health check..."
    sleep 10
elif [ "$ACTIVE_CLIENT" = "qbittorrent" ]; then
    log_info "Starting qbittorrent..."
    docker compose up -d qbittorrent
    log_info "Waiting for qbittorrent health check..."
    sleep 10
fi

# Step 8: Verify nginx can still reach the torrent client
log_info "Verifying nginx connectivity..."
NGINX_STATUS=$(docker inspect --format='{{.State.Status}}' "$NGINX_CONTAINER" 2>/dev/null || echo "missing")
if [ "$NGINX_STATUS" = "running" ]; then
    log_info "✅ nginx-proxy is running (no restart needed)"
else
    log_warn "nginx-proxy is not running - starting it..."
    docker compose up -d nginx-proxy
fi

echo ""
log_info "=== Reset Complete ==="
log_info "VPN and torrent client have been restarted"
log_info "All other services remained running"
echo ""
log_info "Test torrent client access:"
if [ "$ACTIVE_CLIENT" = "transmission" ]; then
    echo "  http://localhost:${NGINX_TRANSMISSION_PORT:-9091}"
elif [ "$ACTIVE_CLIENT" = "qbittorrent" ]; then
    echo "  http://localhost:${NGINX_QBITTORRENT_PORT:-8080}"
fi
