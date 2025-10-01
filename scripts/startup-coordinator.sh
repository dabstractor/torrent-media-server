#!/bin/sh
# Startup Coordinator - Ensures VPN stack starts correctly after reboot
# Runs in a Docker container with access to docker.sock and host network

set -e

CONTAINER_PREFIX="${CONTAINER_PREFIX:-}"
VPN_CONTAINER="${CONTAINER_PREFIX}vpn"
TRANSMISSION_CONTAINER="${CONTAINER_PREFIX}transmission"
VPN_PORT="${VPN_BITTORRENT_PORT:-17403}"
CHECK_INTERVAL=10

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# Install required tools (psmisc for fuser)
log "Installing required tools..."
apk add --no-cache psmisc lsof 2>&1 | grep -v "fetch\|OK:" || true
log "✓ Tools installed"

# Wait for Docker daemon to be fully ready
log "Waiting for Docker daemon..."
for i in $(seq 1 30); do
    if docker ps >/dev/null 2>&1; then
        log "Docker daemon ready"
        break
    fi
    sleep 1
done

# Give Docker a moment to attempt starting all containers
log "Waiting for initial container startup attempts..."
sleep 15

while true; do
    log "Checking VPN container status..."

    # Get VPN container state
    VPN_STATE=$(docker inspect --format='{{.State.Status}}' "$VPN_CONTAINER" 2>/dev/null || echo "missing")
    VPN_EXIT_CODE=$(docker inspect --format='{{.State.ExitCode}}' "$VPN_CONTAINER" 2>/dev/null || echo "0")

    log "VPN Status: $VPN_STATE (exit code: $VPN_EXIT_CODE)"

    # Check if VPN failed with port conflict (exit code 128)
    # Can be in "exited" or "created" state when port conflict occurs
    if [ "$VPN_EXIT_CODE" = "128" ] && { [ "$VPN_STATE" = "exited" ] || [ "$VPN_STATE" = "created" ]; }; then
        log "⚠️  VPN failed with exit code 128 - likely port conflict"

        # Check VPN error message
        VPN_ERROR=$(docker inspect --format='{{.State.Error}}' "$VPN_CONTAINER" 2>/dev/null || echo "")

        if echo "$VPN_ERROR" | grep -qi "address already in use"; then
            log "✓ Confirmed: Port $VPN_PORT conflict detected"
            log "Attempting to clear port binding..."

            # Kill processes using the port via nsenter into host network namespace
            # This container runs with host network mode, so we can access host ports
            if command -v fuser >/dev/null 2>&1; then
                fuser -k ${VPN_PORT}/tcp ${VPN_PORT}/udp 2>/dev/null || true
                log "✓ Port cleanup attempted with fuser"
            fi

            # Also try lsof if available
            if command -v lsof >/dev/null 2>&1; then
                lsof -ti:${VPN_PORT} | xargs -r kill -9 2>/dev/null || true
                log "✓ Port cleanup attempted with lsof"
            fi

            # Wait a moment for port to be released
            sleep 2

            log "🔄 Removing VPN container to clear IP allocation..."
            # Remove the container to force Docker to reallocate network resources
            docker rm -f "$VPN_CONTAINER" 2>/dev/null || true

            # Wait for network cleanup
            sleep 3

            log "🔄 Recreating VPN container..."
            # Use docker compose to recreate with proper dependencies
            docker compose up -d --no-deps vpn || log "❌ Failed to recreate VPN"

            # Wait for VPN to become healthy
            log "Waiting for VPN health check..."
            for i in $(seq 1 60); do
                HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$VPN_CONTAINER" 2>/dev/null || echo "none")
                if [ "$HEALTH" = "healthy" ]; then
                    log "✅ VPN is healthy"
                    break
                fi
                sleep 2
            done

            # Restart all VPN-dependent containers that are stuck in created/exited state
            log "Checking VPN-dependent containers..."
            DEPENDENT_CONTAINERS="transmission sonarr radarr prowlarr watchlistarr autoheal autoscan"

            for service in $DEPENDENT_CONTAINERS; do
                CONTAINER="${CONTAINER_PREFIX}${service}"
                STATE=$(docker inspect --format='{{.State.Status}}' "$CONTAINER" 2>/dev/null || echo "missing")

                if [ "$STATE" = "created" ] || [ "$STATE" = "exited" ]; then
                    log "🔄 Starting $service container (state: $STATE)..."
                    docker compose up -d --no-deps "$service" || log "⚠️ Failed to start $service"
                fi
            done

            log "✅ VPN recovery complete"
        fi
    elif [ "$VPN_STATE" = "running" ]; then
        log "✓ VPN is running normally"
    fi

    log "Sleeping for ${CHECK_INTERVAL}s..."
    sleep "$CHECK_INTERVAL"
done
