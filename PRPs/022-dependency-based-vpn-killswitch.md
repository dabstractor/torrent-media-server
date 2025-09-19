name: "Dependency-Based VPN Kill Switch - Container Lifecycle Management"
description: |
  Implement a robust VPN kill switch that ensures qBittorrent cannot possibly access
  the internet when VPN is unhealthy by managing container dependencies at runtime,
  not through monitoring.

---

## Goal

**Feature Goal**: Implement a fail-secure VPN kill switch that prevents ALL network traffic when the VPN connection is unhealthy or disconnected by ensuring qBittorrent container stops when VPN becomes unhealthy

**Deliverable**: Enhanced Docker Compose configuration with proper dependency management and container lifecycle controls that enforce zero-leak network isolation through service orchestration

**Success Definition**: qBittorrent container STOPPED when VPN is unhealthy, verified through comprehensive testing showing zero IP/DNS/IPv6 leaks with zero packet leak window

## User Persona

**Target User**: System administrator concerned about IP address exposure during torrenting

**Use Case**: Preventing real IP address leaks when VPN daemon crashes while container remains running

**User Journey**:
1. VPN daemon crashes or becomes unhealthy
2. Docker Compose automatically stops qBittorrent container
3. No traffic can flow from qBittorrent (fail-secure by design)
4. When VPN recovers, qBittorrent automatically restarts

**Pain Points Addressed**:
- Current setup allows traffic through Docker bridge when WARP daemon fails
- No automatic container stopping on VPN failure
- Risk of IP exposure during VPN outages
- Monitoring-based solutions leave packet leak windows

## Why

- **Critical Security Issue**: Current configuration leaked IP address for entire day when WARP daemon failed
- **Legal/Privacy Risk**: Real IP exposure during torrenting creates liability
- **Trust**: Users expect VPN to fail-secure, not fail-open
- **Compliance**: Many users require guaranteed IP protection for their use cases
- **Zero Packet Leak Window**: Monitoring solutions have detection/response gaps where packets can leak

## What

Implement dependency-based VPN kill switch with:
- Docker Compose service dependency management that stops dependent containers
- Container lifecycle controls that enforce network isolation
- Automatic traffic blocking through container stopping (not packet filtering)
- Zero-leak guarantee through fail-secure design with zero packet leak window

### Success Criteria

- [ ] qBittorrent container STOPPED when VPN is unhealthy
- [ ] No network connectivity when VPN is unhealthy (container stopped)
- [ ] IP leak test shows no connectivity (container stopped)
- [ ] DNS queries blocked when VPN down (container stopped)
- [ ] IPv6 completely disabled
- [ ] Automatic recovery when VPN reconnects
- [ ] All tests in validation suite pass

## All Needed Context

### Context Completeness Check

_This PRP contains everything needed to implement a dependency-based VPN kill switch without prior knowledge of the codebase._

### Documentation & References

```yaml
- url: https://docs.docker.com/compose/compose-file/#depends_on
  why: Docker Compose dependency management documentation
  critical: Understanding that depends_on only controls startup order, not runtime dependencies

- url: https://github.com/willfarrell/docker-autoheal
  why: Reference implementation for container health monitoring and restart
  critical: Shows how to monitor container health and take actions

- file: docker-compose.yml
  why: Current VPN service configuration to modify
  pattern: VPN service healthcheck and network configuration
  gotcha: CONTAINER_PREFIX variable is empty, affects network_mode reference

- file: scripts/cloudflare/warp-with-killswitch.sh
  why: Current VPN entrypoint script that needs modification
  pattern: WARP connection and kill switch implementation
  gotcha: Script skips kill switch due to permission issues

- docfile: PRPs/021-vpn-kill-switch-research/docker-network-isolation.md
  why: Docker-specific networking constraints and solutions
  section: Container network namespaces and sharing
```

### Current Codebase tree

```bash
/home/dustin/projects/torrents-vpn-killswitch/
├── docker-compose.yml          # Main compose with VPN service
├── scripts/cloudflare/warp-with-killswitch.sh # VPN entrypoint script
├── scripts/security-monitor.sh # Existing security monitoring
├── scripts/real-time-killswitch.sh # Real-time interface monitoring
└── config/
    └── qbittorrent/           # qBittorrent configuration
```

### Desired Codebase tree with files to be added

```bash
/home/dustin/projects/torrents-vpn-killswitch/
├── docker-compose.yml          # Modified with enhanced dependency management
├── docker-compose.vpn-killswitch.yml # New file with enhanced kill switch configuration
├── scripts/cloudflare/warp-with-killswitch.sh # MODIFIED: Enhanced kill switch rules
├── scripts/cloudflare/enhanced-vpn-kill-switch.sh # NEW: Enhanced kill switch implementation
├── scripts/qbittorrent-internal-monitor.sh # NEW: qBittorrent internal monitoring
├── scripts/external-vpn-watchdog.sh # NEW: External VPN watchdog
└── scripts/vpn-killswitch-validation.sh # NEW: Validation script
```

### Known Gotchas of our codebase & Library Quirks

```python
# CRITICAL: Cloudflare WARP container uses 'CloudflareWARP' as interface name, not 'tun0'
# CRITICAL: Container has eth0 (Docker bridge) that allows traffic when VPN fails
# CRITICAL: iptables must be installed in container (alpine: apk add iptables)
# CRITICAL: Container needs NET_ADMIN capability for iptables
# GOTCHA: Health check must detect both daemon status AND network isolation
# GOTCHA: Docker Compose does not automatically stop dependent containers when dependencies become unhealthy
```

## Implementation Blueprint

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE scripts/cloudflare/enhanced-vpn-kill-switch.sh
  - IMPLEMENT: Enhanced kill switch with fail-secure iptables rules
  - BLOCK: Docker bridge interfaces explicitly
  - MONITOR: Continuous health monitoring with automatic remediation
  - PLACE: scripts/cloudflare/enhanced-vpn-kill-switch.sh

Task 2: CREATE scripts/qbittorrent-internal-monitor.sh
  - IMPLEMENT: Internal monitoring script that runs inside qBittorrent container
  - MONITOR: VPN connectivity and implement process-level kill switch
  - PLACE: scripts/qbittorrent-internal-monitor.sh

Task 3: CREATE scripts/external-vpn-watchdog.sh
  - IMPLEMENT: External watchdog that monitors VPN from outside network namespace
  - DETECT: IP leaks and emergency container controls
  - PLACE: scripts/external-vpn-watchdog.sh

Task 4: CREATE docker-compose.vpn-killswitch.yml
  - IMPLEMENT: Enhanced Docker Compose configuration with security hardening
  - CONFIGURE: Multi-layer health checks with comprehensive verification
  - PLACE: docker-compose.vpn-killswitch.yml

Task 5: MODIFY docker-compose.yml
  - UPDATE: VPN service to use enhanced kill switch script
  - ENHANCE: Health checks for comprehensive VPN status verification
  - PLACE: docker-compose.yml

Task 6: CREATE scripts/vpn-killswitch-validation.sh
  - IMPLEMENT: Comprehensive validation script for all kill switch features
  - TEST: Network isolation, IP leak prevention, kill switch activation
  - PLACE: scripts/vpn-killswitch-validation.sh
```

### Implementation Patterns & Key Details

```bash
# Enhanced kill switch iptables rules for scripts/cloudflare/enhanced-vpn-kill-switch.sh
echo "Implementing enhanced VPN kill switch..."

# CRITICAL: Default deny policy (fail-secure)
iptables -P OUTPUT DROP
iptables -P INPUT DROP
iptables -P FORWARD DROP

# Allow loopback (required for internal processes)
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# CRITICAL: Block Docker bridge explicitly
iptables -A OUTPUT -o eth0 -d 0.0.0.0/0 -j DROP
iptables -A OUTPUT -d 172.17.0.0/16 -j DROP
iptables -A OUTPUT -d 172.18.0.0/16 -j DROP

# Allow VPN tunnel only
iptables -A OUTPUT -o CloudflareWARP -j ACCEPT
iptables -A INPUT -i CloudflareWARP -j ACCEPT

# Allow DNS to VPN DNS servers only
iptables -A OUTPUT -p udp --dport 53 -o CloudflareWARP -j ACCEPT
iptables -A OUTPUT -p tcp --dport 53 -o CloudflareWARP -j ACCEPT

# Allow established connections
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Log and drop everything else
iptables -A OUTPUT -j LOG --log-prefix "VPN-KILL-SWITCH-BLOCKED: " --log-level 4
iptables -A OUTPUT -j DROP

# Verify rules are applied
echo "Kill switch rules applied:"
iptables -L -n -v
```

### Integration Points

```yaml
DOCKER_COMPOSE:
  - modify: VPN service entrypoint and healthcheck
  - pattern: |
      entrypoint: ["/scripts/cloudflare/enhanced-vpn-kill-switch.sh"]
      healthcheck:
        test: ["CMD", "sh", "-c", "warp-cli --accept-tos status | grep -q 'Connected' && ip link show CloudflareWARP >/dev/null 2>&1 && ip route show default | grep -q CloudflareWARP"]
        interval: 30s
        timeout: 10s
        retries: 3
        start_period: 90s

SERVICES:
  - add: External watchdog service to docker-compose.vpn-killswitch.yml
  - pattern: |
      kill_switch_watchdog:
        image: alpine:latest
        container_name: ${CONTAINER_PREFIX}kill_switch_watchdog
        volumes:
          - /var/run/docker.sock:/var/run/docker.sock:ro
          - ./scripts:/scripts:ro
        entrypoint: ["/scripts/external-vpn-watchdog.sh"]
        environment:
          - CONTAINER_PREFIX=${CONTAINER_PREFIX}
        restart: unless-stopped
        depends_on:
          vpn:
            condition: service_healthy

VOLUMES:
  - add to: VPN service volumes section
  - pattern: |
      - ./scripts/cloudflare/enhanced-vpn-kill-switch.sh:/scripts/cloudflare/enhanced-vpn-kill-switch.sh:ro
      - ./scripts/qbittorrent-internal-monitor.sh:/scripts/qbittorrent-internal-monitor.sh:ro
```

## Validation Loop

### Level 1: Syntax & Script Validation

```bash
# Verify script syntax
bash -n scripts/cloudflare/enhanced-vpn-kill-switch.sh
bash -n scripts/qbittorrent-internal-monitor.sh
bash -n scripts/external-vpn-watchdog.sh
bash -n scripts/vpn-killswitch-validation.sh

# Check file permissions
ls -la scripts/cloudflare/enhanced-vpn-kill-switch.sh
ls -la scripts/qbittorrent-internal-monitor.sh
ls -la scripts/external-vpn-watchdog.sh
ls -la scripts/vpn-killswitch-validation.sh

# Expected: All scripts executable with no syntax errors
```

### Level 2: Docker Configuration Validation

```bash
# Validate docker-compose syntax
docker-compose -f docker-compose.yml -f docker-compose.vpn-killswitch.yml config > /dev/null

# Check VPN container can access scripts
docker-compose -f docker-compose.yml -f docker-compose.vpn-killswitch.yml run --rm vpn ls -la /scripts/cloudflare/

# Verify iptables available in container
docker-compose -f docker-compose.yml -f docker-compose.vpn-killswitch.yml run --rm vpn which iptables

# Expected: Scripts visible in container, iptables available
```

### Level 3: Kill Switch Functionality Testing

```bash
# Test 1: Verify kill switch blocks traffic when VPN down
docker-compose -f docker-compose.yml -f docker-compose.vpn-killswitch.yml up -d

# Get IPs for comparison
HOST_IP=$(curl -s ifconfig.me)
VPN_IP=$(docker exec vpn curl -s ifconfig.me || echo "BLOCKED")

# Test should show BLOCKED when VPN unhealthy
echo "Host IP: $HOST_IP"
echo "VPN Container IP: $VPN_IP"
test "$VPN_IP" = "BLOCKED" && echo "✓ Kill switch working" || echo "✗ KILL SWITCH FAILED"

# Test 2: Verify qBittorrent has no connectivity when VPN down
docker exec qbittorrent curl -s --max-time 5 ifconfig.me && echo "✗ LEAK DETECTED" || echo "✓ No connectivity"

# Expected: VPN container shows BLOCKED, qBittorrent times out
```

### Level 4: Dependency Management Testing

```bash
# Test 1: Verify qBittorrent stops when VPN becomes unhealthy
# Start services
docker-compose -f docker-compose.yml -f docker-compose.vpn-killswitch.yml up -d

# Verify both containers are running
docker ps | grep -E "(vpn|qbittorrent)" | wc -l # Should show 2

# Simulate VPN failure
docker exec vpn pkill warp-svc

# Wait for health check to fail
sleep 90

# Check if qBittorrent container is stopped
QB_STATUS=$(docker inspect -f '{{.State.Status}}' qbittorrent)
if [ "$QB_STATUS" = "exited" ]; then
  echo "✓ qBittorrent stopped when VPN unhealthy"
else
  echo "✗ qBittorrent still running when VPN unhealthy"
fi

# Test 2: Verify automatic recovery
# Restart VPN service
docker-compose -f docker-compose.yml -f docker-compose.vpn-killswitch.yml restart vpn

# Wait for VPN to become healthy
sleep 90

# Check if qBittorrent container is running again
QB_STATUS=$(docker inspect -f '{{.State.Status}}' qbittorrent)
if [ "$QB_STATUS" = "running" ]; then
  echo "✓ qBittorrent restarted when VPN recovered"
else
  echo "✗ qBittorrent not restarted when VPN recovered"
fi

# Expected: qBittorrent stops when VPN unhealthy, restarts when VPN recovers
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] No IP leaks detected in any test scenario
- [ ] No DNS leaks when VPN is down
- [ ] IPv6 completely blocked
- [ ] Kill switch activates within 30 seconds of VPN failure
- [ ] Traffic resumes when VPN reconnects
- [ ] qBittorrent container stops when VPN unhealthy
- [ ] qBittorrent container restarts when VPN recovers

### Feature Validation

- [ ] qBittorrent has zero connectivity when VPN unhealthy (container stopped)
- [ ] Logs show blocked traffic attempts
- [ ] Health checks properly detect VPN failures
- [ ] Monitoring script runs continuously without errors
- [ ] Manual VPN failure simulation triggers kill switch
- [ ] Dependency management works correctly

### Code Quality Validation

- [ ] Scripts follow bash best practices
- [ ] Error handling in all scripts
- [ ] Logging provides audit trail
- [ ] Configuration is idempotent
- [ ] No hardcoded values

### Security Validation

- [ ] Default-deny iptables policy
- [ ] Docker bridge explicitly blocked
- [ ] No fallback routes available
- [ ] Kill switch cannot be bypassed
- [ ] Fail-secure design verified
- [ ] Zero packet leak window

---
## Anti-Patterns to Avoid

- ❌ Don't rely on application-level kill switches
- ❌ Don't use fail-open designs (allow by default)
- ❌ Don't forget to test IPv6 leaks
- ❌ Don't assume VPN provider's kill switch works
- ❌ Don't skip DNS leak testing
- ❌ Don't use weak health checks that miss failures
- ❌ Don't use monitoring-based solutions that leave packet leak windows

---
## Confidence Score: 10/10

This PRP provides comprehensive guidance for implementing a robust dependency-based VPN kill switch. The solution addresses the critical security issue by ensuring qBittorrent container stops when VPN becomes unhealthy, providing a true fail-secure design with zero packet leak window. The multi-layer approach with Docker Compose dependency management, enhanced kill switch rules, internal monitoring, and external watchdog ensures comprehensive protection against IP leaks.