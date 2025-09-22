#!/bin/bash
# Validation script for autoheal functionality

set -euo pipefail

# Get container names (with prefix if set)
CONTAINER_PREFIX="${CONTAINER_PREFIX:-}"
VPN_CONTAINER="${CONTAINER_PREFIX}vpn"
AUTOHEAL_CONTAINER="${CONTAINER_PREFIX}autoheal"

echo "=== Autoheal Validation Script ==="

# --- Level 1: Syntax Validation ---
echo "[L1] Validating docker-compose syntax..."
if docker-compose -f docker-compose.yml config > /dev/null; then
    echo "  ✅ Docker Compose syntax: OK"
else
    echo "  ❌ Docker Compose syntax: FAILED"
    exit 1
fi

if docker-compose -f docker-compose.yml config | grep -q "autoheal:"; then
    echo "  ✅ Autoheal service: OK"
else
    echo "  ❌ Autoheal service: MISSING"
    exit 1
fi

if grep -q "AUTOHEAL_INTERVAL" .env.example; then
    echo "  ✅ Environment variables: OK"
else
    echo "  ❌ Environment variables: MISSING in .env.example"
    exit 1
fi

# --- Level 2: Service Startup ---
echo "[L2] Validating service startup..."
if ! docker-compose up -d; then
    echo "  ❌ Failed to start docker-compose stack"
    exit 1
fi
echo "  Waiting for services to initialize (30s)..."
sleep 30

if docker ps | grep -q "$AUTOHEAL_CONTAINER"; then
    echo "  ✅ Autoheal container: RUNNING"
else
    echo "  ❌ Autoheal container: NOT RUNNING"
    exit 1
fi

if docker logs "$AUTOHEAL_CONTAINER" 2>&1 | grep -q "Monitoring containers"; then
    echo "  ✅ Autoheal monitoring: ACTIVE"
else
    echo "  ❌ Autoheal monitoring: INACTIVE"
    exit 1
fi

# --- Level 3: VPN Restart Testing ---
echo "[L3] Testing VPN restart..."
echo "  Forcing VPN to unhealthy state (simulating crash)..."
docker exec "$VPN_CONTAINER" pkill warp-svc || true

echo "  Waiting for health check to fail (35s)..."
sleep 35

health_status=$(docker inspect "$VPN_CONTAINER" --format='{{.State.Health.Status}}')
if [[ "$health_status" == "unhealthy" ]]; then
    echo "  ✅ VPN marked unhealthy: OK"
else
    echo "  ❌ VPN not marked unhealthy (status: $health_status)"
    exit 1
fi

echo "  Waiting for autoheal to restart VPN (10s)..."
sleep 10

if docker logs "$AUTOHEAL_CONTAINER" 2>&1 | tail -20 | grep -q "restart"; then
    echo "  ✅ Autoheal restarted VPN: OK"
else
    echo "  ❌ Autoheal did not log a restart"
fi

echo "  Waiting for VPN to recover (30s)..."
sleep 30

health_status=$(docker inspect "$VPN_CONTAINER" --format='{{.State.Health.Status}}')
if [[ "$health_status" == "healthy" ]]; then
    echo "  ✅ VPN recovered: OK"
else
    echo "  ❌ VPN did not recover (status: $health_status)"
    exit 1
fi

# --- Level 4: Security Validation ---
echo "[L4] Validating security..."
network_mode=$(docker inspect "${CONTAINER_PREFIX}qbittorrent" --format='{{.HostConfig.NetworkMode}}')
if [[ "$network_mode" == "container:"*vpn ]]; then
    echo "  ✅ qBittorrent network isolation: MAINTAINED"
else
    echo "  ❌ qBittorrent network isolation: COMPROMISED ($network_mode)"
    exit 1
fi

if docker exec "$VPN_CONTAINER" sh -c 'iptables -L OUTPUT -n | grep -q DROP'; then
    echo "  ✅ Kill switch active: OK"
else
    echo "  ❌ Kill switch inactive"
    exit 1
fi

echo "=== Validation Complete ==="
echo "Autoheal appears to be configured and working correctly."
