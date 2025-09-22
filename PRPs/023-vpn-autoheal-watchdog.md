name: "VPN Autoheal Watchdog Implementation"
description: |
  Implement willfarrell/autoheal container to automatically restart VPN when it crashes

---

## Goal

**Feature Goal**: Implement automatic VPN container restart capability using autoheal to recover from Cloudflare WARP crashes that occur every 3 hours due to network buffer limitations

**Deliverable**: Autoheal container service integrated into docker-compose.yml that monitors VPN health status and automatically restarts the VPN container when it becomes unhealthy

**Success Definition**: VPN container automatically restarts within 30 seconds of becoming unhealthy, maintaining IP isolation for qBittorrent at all times

## User Persona

**Target User**: System administrator managing the torrent stack

**Use Case**: VPN crashes with "No buffer space available" errors every 3 hours, requiring manual container restart

**User Journey**:
1. VPN container runs normally for ~3 hours
2. Cloudflare WARP crashes with network buffer error
3. VPN container health check fails (status becomes "unhealthy")
4. Autoheal detects unhealthy status within 5-30 seconds
5. Autoheal restarts VPN container automatically
6. VPN reconnects and resumes normal operation
7. qBittorrent resumes torrenting through VPN

**Pain Points Addressed**:
- Manual intervention required every 3 hours
- Prolonged downtime when crashes occur overnight
- Risk of IP leaks if VPN fails silently

## Why

- Cloudflare WARP has kernel-level network buffer requirements that cannot be satisfied in Docker containers
- Docker's `restart: unless-stopped` policy only restarts containers on process exit, not on unhealthy status
- Current VPN kill switch script keeps running even when WARP daemon crashes, preventing automatic restart
- Manual restarts every 3 hours is unsustainable for 24/7 operation
- Automatic recovery maintains service availability and security

## What

Implement willfarrell/autoheal container to monitor and restart the VPN container when health checks fail.

### Success Criteria

- [ ] Autoheal container added to docker-compose.yml
- [ ] VPN container restarts automatically when unhealthy
- [ ] qBittorrent maintains network isolation through VPN at all times
- [ ] No manual intervention required for VPN crashes
- [ ] Restart occurs within 30 seconds of failure detection
- [ ] Solution works with both WARP and PIA VPN providers

## All Needed Context

### Context Completeness Check

_This PRP contains everything needed to implement autoheal for automatic VPN container restarts without prior knowledge of the codebase._

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://github.com/willfarrell/docker-autoheal#readme
  why: Official autoheal documentation with configuration options
  critical: AUTOHEAL_CONTAINER_LABEL controls which containers to monitor

- url: https://hub.docker.com/r/willfarrell/autoheal
  why: Docker Hub page with latest image tags and usage examples
  critical: Use 'latest' tag for most recent features

- file: docker-compose.yml
  why: Main compose file where autoheal service must be added
  pattern: Service definitions with healthcheck configurations
  gotcha: Must preserve existing network configurations

- file: scripts/external-vpn-watchdog.sh
  why: Current watchdog implementation to understand monitoring patterns
  pattern: Health check logic and container inspection methods
  gotcha: Will be replaced by autoheal, not modified

- file: scripts/vpn/enhanced-vpn-kill-switch.sh
  why: VPN entrypoint script with health monitoring
  pattern: WARP status checking and network isolation rules
  gotcha: Kill switch must remain active even during restarts
```

### Current Codebase Overview

The project uses Docker Compose to orchestrate media management services with VPN protection for torrenting:

```
Key Services:
- vpn: Cloudflare WARP container with kill switch (crashes every 3 hours)
- qbittorrent: Torrent client using network_mode: "container:vpn" for IP isolation
- kill_switch_watchdog: Current external monitor (only stops qbittorrent, doesn't restart VPN)
- nginx-proxy: Bridge for accessing VPN-isolated services
```

### Critical Security Requirement

**NEVER compromise IP isolation**: qBittorrent MUST remain connected through VPN via `network_mode: "container:${CONTAINER_PREFIX}vpn"`. Any solution that changes this network configuration is unacceptable.

### Known Problem Details

```yaml
Problem: Cloudflare WARP crashes with "No buffer space available"
Root Cause: Kernel parameter net.core.netdev_max_backlog cannot be set from container
Frequency: Every 3 hours of continuous operation
Current Behavior: Container becomes unhealthy but doesn't restart
Docker Limitation: restart policies don't trigger on health status changes
```

## Implementation Blueprint

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY docker-compose.yml - Add autoheal service
  - ADD: autoheal service definition after kill_switch_watchdog service
  - IMPLEMENT: willfarrell/autoheal:latest image
  - CONFIGURE: Environment variables for monitoring all containers
  - MOUNT: /var/run/docker.sock for Docker API access
  - NETWORK: Use default network (not vpn_network)
  - PLACEMENT: After kill_switch_watchdog service in compose file

Task 2: UPDATE docker-compose.yml - Enhance VPN healthcheck
  - VERIFY: VPN service has comprehensive health check
  - ENSURE: Health check detects WARP crashes reliably
  - MAINTAIN: Existing healthcheck test command
  - ADJUST: Interval to 30s, timeout to 10s, retries to 3

Task 3: MODIFY docker-compose.yml - Configure autoheal dependencies
  - ADD: depends_on with service_started condition for VPN
  - ENSURE: autoheal starts after VPN container exists
  - MAINTAIN: Existing service dependencies

Task 4: CREATE scripts/validate-autoheal.sh - Validation script
  - IMPLEMENT: Script to verify autoheal is monitoring VPN
  - CHECK: Autoheal container logs for VPN monitoring
  - VERIFY: VPN container has autoheal labels if using label mode
  - TEST: Force VPN unhealthy state and verify restart

Task 5: MODIFY .env.example - Add autoheal configuration
  - ADD: AUTOHEAL_INTERVAL=5 (check every 5 seconds)
  - ADD: AUTOHEAL_START_PERIOD=60 (wait 60s before monitoring)
  - ADD: AUTOHEAL_DEFAULT_STOP_TIMEOUT=10 (graceful stop timeout)
  - DOCUMENT: Purpose of each variable
```

### Implementation Details

```yaml
# Autoheal service configuration for docker-compose.yml
autoheal:
  image: willfarrell/autoheal:latest
  container_name: ${CONTAINER_PREFIX}autoheal
  restart: unless-stopped
  environment:
    - AUTOHEAL_CONTAINER_LABEL=all  # Monitor all containers with healthchecks
    - AUTOHEAL_INTERVAL=${AUTOHEAL_INTERVAL:-5}  # Check every 5 seconds
    - AUTOHEAL_START_PERIOD=${AUTOHEAL_START_PERIOD:-60}  # Wait 60s before monitoring
    - AUTOHEAL_DEFAULT_STOP_TIMEOUT=${AUTOHEAL_DEFAULT_STOP_TIMEOUT:-10}
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock:ro
  depends_on:
    - vpn
  networks:
    - default
```

### Integration Points

```yaml
DOCKER_COMPOSE:
  - location: services section in docker-compose.yml
  - placement: After kill_switch_watchdog service
  - dependencies: Requires vpn service to exist

ENVIRONMENT:
  - file: .env.example
  - variables: AUTOHEAL_INTERVAL, AUTOHEAL_START_PERIOD, AUTOHEAL_DEFAULT_STOP_TIMEOUT

SECURITY:
  - docker.sock: Read-only mount for container management
  - network: Default network only, not vpn_network
  - isolation: Maintains qBittorrent network_mode unchanged
```

## Validation Loop

### Level 1: Syntax Validation

```bash
# Validate docker-compose syntax
docker-compose -f docker-compose.yml config > /dev/null
echo "Docker Compose syntax: OK"

# Check for required services
docker-compose -f docker-compose.yml config | grep -q "autoheal:" && echo "Autoheal service: OK"

# Verify environment variables
grep -q "AUTOHEAL_INTERVAL" .env.example && echo "Environment variables: OK"
```

### Level 2: Service Startup

```bash
# Start the stack with autoheal
docker-compose up -d

# Wait for services to initialize
sleep 30

# Verify autoheal is running
docker ps | grep autoheal && echo "Autoheal container: RUNNING"

# Check autoheal logs for initialization
docker logs ${CONTAINER_PREFIX}autoheal 2>&1 | grep -q "Monitoring containers" && echo "Autoheal monitoring: ACTIVE"
```

### Level 3: VPN Restart Testing

```bash
# Force VPN to unhealthy state (simulate crash)
docker exec ${CONTAINER_PREFIX}vpn pkill warp-svc || true

# Wait for health check to fail
sleep 35

# Check VPN health status
docker inspect ${CONTAINER_PREFIX}vpn --format='{{.State.Health.Status}}' | grep -q "unhealthy" && echo "VPN marked unhealthy: OK"

# Wait for autoheal to restart VPN
sleep 10

# Verify VPN was restarted
docker logs ${CONTAINER_PREFIX}autoheal 2>&1 | tail -20 | grep -q "restart" && echo "Autoheal restarted VPN: OK"

# Verify VPN is healthy again
sleep 30
docker inspect ${CONTAINER_PREFIX}vpn --format='{{.State.Health.Status}}' | grep -q "healthy" && echo "VPN recovered: OK"
```

### Level 4: Security Validation

```bash
# Verify qBittorrent network isolation maintained
docker inspect ${CONTAINER_PREFIX}qbittorrent --format='{{.HostConfig.NetworkMode}}' | grep -q "container:.*vpn" && echo "qBittorrent network isolation: MAINTAINED"

# Test IP leak protection during restart
docker exec ${CONTAINER_PREFIX}vpn sh -c 'iptables -L OUTPUT -n | grep -q DROP' && echo "Kill switch active: OK"

# Verify no direct network access from qBittorrent
docker exec ${CONTAINER_PREFIX}qbittorrent curl -s --max-time 5 ifconfig.me 2>&1 | grep -q "Could not resolve host\|Connection refused\|Network is unreachable" || echo "WARNING: Potential IP leak"
```

### Level 5: Long-term Stability Test

```bash
# Run validation script
./scripts/validate-autoheal.sh

# Monitor for 4 hours (past typical crash time)
echo "Starting 4-hour stability test..."
START_TIME=$(date +%s)
CRASH_COUNT=0

while [ $(($(date +%s) - START_TIME)) -lt 14400 ]; do
    if docker logs ${CONTAINER_PREFIX}autoheal 2>&1 | tail -1 | grep -q "restart"; then
        CRASH_COUNT=$((CRASH_COUNT + 1))
        echo "VPN restart detected. Total restarts: $CRASH_COUNT"
    fi
    sleep 60
done

echo "4-hour test complete. Total VPN restarts: $CRASH_COUNT"
[ $CRASH_COUNT -gt 0 ] && echo "Autoheal successfully handled $CRASH_COUNT VPN crashes"
```

## Final Validation Checklist

### Technical Validation

- [ ] Docker Compose file valid with autoheal service
- [ ] Autoheal container starts and monitors successfully
- [ ] VPN container restarts when unhealthy
- [ ] All health checks functioning correctly
- [ ] No syntax errors in compose file

### Feature Validation

- [ ] VPN automatically restarts within 30 seconds of failure
- [ ] No manual intervention required for VPN crashes
- [ ] Solution handles repeated crashes gracefully
- [ ] Works with both WARP and PIA VPN configurations
- [ ] Restart events logged in autoheal container

### Security Validation

- [ ] qBittorrent network isolation maintained (network_mode unchanged)
- [ ] Kill switch remains active during restarts
- [ ] No IP leaks during VPN restart process
- [ ] Docker socket mounted read-only
- [ ] Autoheal has minimal required permissions

### Operational Validation

- [ ] 4-hour stability test passed
- [ ] Autoheal handles multiple crashes successfully
- [ ] Logs provide clear restart information
- [ ] No restart loops or excessive restarts
- [ ] System remains stable after implementation

## Anti-Patterns to Avoid

- ❌ Don't modify qBittorrent's network_mode configuration
- ❌ Don't disable VPN health checks
- ❌ Don't give autoheal write access to docker.sock
- ❌ Don't use aggressive restart intervals (< 5 seconds)
- ❌ Don't remove existing kill switch protections
- ❌ Don't bypass security for convenience