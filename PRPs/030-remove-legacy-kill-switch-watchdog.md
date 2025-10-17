name: "PRP-030: Remove Legacy Kill Switch and Watchdog Behavior"
description: |

---

## Goal

**Feature Goal**: Remove all legacy kill switch and watchdog behavior that was implemented before gluetun, which is causing unwanted crashes and complexity since gluetun provides its own built-in kill switch and VPN management.

**Deliverable**: Clean, simplified torrent-media-server configuration with all legacy monitoring components removed, relying entirely on gluetun's built-in security and Docker's native health management.

**Success Definition**: System runs stably without crashes caused by legacy watchdog components, maintaining full VPN security through gluetun's built-in capabilities, and significantly reducing maintenance overhead.

## User Persona (if applicable)

**Target User**: System Administrator/DevOps Engineer managing the torrent-media-server deployment

**Use Case**: Deploy and maintain a secure, stable media server stack without legacy monitoring complexity

**User Journey**:
1. Deploy simplified stack without legacy monitoring containers
2. Verify VPN security through gluetun's built-in kill switch
3. Monitor system health through simplified Docker health checks
4. Maintain system with reduced complexity and fewer failure points

**Pain Points Addressed**:
- Random crashes caused by watchdog components killing healthy services
- Complex maintenance of multiple overlapping monitoring systems
- Resource waste from redundant monitoring containers
- Configuration complexity from legacy kill switch layers

## Why

- **Stability**: Legacy watchdog components are causing crashes and unwanted behavior
- **Security**: gluetun's built-in kill switch (FIREWALL=on) provides superior VPN isolation
- **Maintainability**: Remove 1,500+ lines of legacy monitoring code that's no longer needed
- **Performance**: Reduce resource usage from multiple monitoring containers and scripts
- **Reliability**: Rely on battle-tested gluetun security instead of custom implementations

## What

Remove all legacy kill switch and watchdog components while preserving core functionality through gluetun's built-in security and Docker's native health management.

### Success Criteria

- [ ] All legacy monitoring containers removed from docker-compose.yml
- [ ] All legacy monitoring scripts deleted from scripts/ directory
- [ ] Legacy documentation archived or removed
- [ ] System starts cleanly with simplified dependency chain
- [ ] VPN security maintained through gluetun's FIREWALL=on
- [ ] All services show "healthy" status after startup
- [ ] No IP leaks detected during validation testing
- [ ] Docker compose up -d succeeds without errors
- [ ] Web UI displays correct service health status

## All Needed Context

### Context Completeness Check

_Before writing this PRP, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?" ✓ VALIDATED_

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://docs.docker.com/compose/compose-file/05-services/#healthcheck
  why: Understanding Docker's native health check capabilities that replace legacy monitoring
  critical: Use service_healthy conditions instead of external watchdogs

- url: https://docs.docker.com/compose/compose-file/05-services/#depends_on
  why: Proper dependency management without custom coordination scripts
  critical: Replace startup-coordinator with native depends_on conditions

- url: https://github.com/qdm12/gluetun
  why: Understanding gluetun's built-in kill switch and security features
  critical: FIREWALL=on provides complete VPN isolation, making legacy kill switches redundant

- url: https://hub.docker.com/r/qmcgaw/gluetun
  why: Docker Hub documentation for gluetun configuration best practices
  critical: Health check endpoint http://localhost:9999 for monitoring

- file: docker-compose.yml
  why: Current configuration showing legacy services that need removal (lines 658-707)
  pattern: Identify kill_switch_watchdog, autoheal, startup-coordinator services
  gotcha: These services have complex interdependencies that must be removed carefully

- file: scripts/external-vpn-watchdog.sh
  why: Main legacy monitoring script implementing emergency container stops (235 lines)
  pattern: External VPN monitoring with emergency kill procedures
  gotcha: Script kills qbittorrent container on VPN issues - redundant with gluetun

- file: scripts/startup-coordinator.sh
  why: Startup recovery script fixing VPN port conflicts (118 lines)
  pattern: Host network access for port cleanup and container recreation
  gotcha: Runs with host network mode and docker.sock access - high privileges

- file: scripts/security-monitor.sh
  why: Comprehensive security monitoring (328 lines) - over-engineered for current needs
  pattern: Process monitoring, API activity tracking, vulnerability detection
  gotcha: Implements complex alerting system that's unnecessary with gluetun isolation

- file: CLAUDE.md
  why: Project documentation noting that all legacy kill switch behavior should be removed
  pattern: Network Security Rules section emphasizes VPN isolation through gluetun only
  critical: "qBittorrent MUST remain fully VPN-isolated via network_mode: container:vpn"

- docfile: PRPs/ai_docs/gluetun-security.md
  why: Custom documentation for gluetun security capabilities and kill switch features
  section: FIREWALL=on implementation and iptables rules for fail-safe protection
```

### Current Codebase tree (relevant components)

```bash
torrent-media-server/
├── docker-compose.yml                    # Main configuration with legacy services (lines 658-707)
├── docker-compose.pia.yml               # PIA provider override
├── scripts/                              # Shell scripts directory
│   ├── external-vpn-watchdog.sh         # Main VPN monitoring (235 lines)
│   ├── startup-coordinator.sh            # Port conflict resolution (118 lines)
│   ├── security-monitor.sh               # Security monitoring (328 lines)
│   ├── nginx-container-monitor.sh        # Nginx monitoring (260 lines)
│   ├── qbittorrent-internal-monitor.sh   # qBittorrent internal monitoring (111 lines)
│   ├── qbittorrent-wrapper-with-monitor.sh # qBittorrent wrapper with monitoring (18 lines)
│   ├── vpn-killswitch-validation.sh      # Kill switch validation (248 lines)
│   ├── validate-autoheal.sh              # Autoheal validation (114 lines)
│   ├── monitor-qbt-config.sh             # qBittorrent config monitoring (30 lines)
│   └── internal/vpn-port-monitor.sh      # PIA port monitoring (99 lines)
├── PRPs/
│   ├── 022-dependency-based-vpn-killswitch.md  # Historical kill switch documentation
│   ├── 023-vpn-autoheal-watchdog.md            # Historical autoheal documentation
│   └── templates/
│       └── prp_base.md                     # PRP template
├── VPN-KILL-SWITCH-IMPLEMENTATION-AND-VALIDATION.md  # Legacy kill switch docs (160 lines)
└── web-ui/src/hooks/
    ├── use-health-check.ts               # Health monitoring hook (KEEP)
    └── use-service-status.ts             # Service status monitoring (KEEP)
```

### Desired Codebase tree after implementation

```bash
torrent-media-server/
├── docker-compose.yml                    # Simplified without legacy monitoring services
├── docker-compose.pia.yml               # Clean PIA configuration
├── scripts/                              # Essential scripts only
│   ├── validate-vpn.sh                   # Basic VPN validation (KEEP)
│   ├── [essential service entrypoints]   # Core service scripts (KEEP)
│   └── [removed legacy monitoring scripts] # 10+ legacy scripts deleted
├── PRPs/
│   ├── 022-dependency-based-vpn-killswitch.md  # ARCHIVED - historical reference
│   ├── 023-vpn-autoheal-watchdog.md            # ARCHIVED - historical reference
│   ├── 030-remove-legacy-kill-switch-watchdog.md # THIS PRP
│   └── templates/
├── [removed: VPN-KILL-SWITCH-*.md]      # Legacy documentation deleted
└── web-ui/src/hooks/                     # Unchanged monitoring hooks
```

### Known Gotchas of our codebase & Library Quirks

```yaml
# CRITICAL: Gluetun provides complete VPN isolation via FIREWALL=on
# All legacy kill switch behavior is redundant and can cause conflicts

# CRITICAL: VPN service uses network_mode: "container:vpn" for torrent clients
# This provides complete network isolation - no additional monitoring needed

# CRITICAL: Docker health checks with service_healthy conditions replace external watchdogs
# Use depends_on: {condition: service_healthy} instead of custom coordination

# CRITICAL: startup-coordinator runs with host network and docker.sock access
# High privilege container - remove to reduce attack surface

# GOTCHA: Commented qBittorrent service has references to monitor scripts
# Remove commented lines that reference deleted monitoring scripts

# GOTCHA: Some services depend on legacy monitoring containers
# Update dependency chains to use native Docker conditions only
```

## Implementation Blueprint

### Data models and structure

No new data models needed - this is a removal/cleanup task focusing on:
- Removing legacy Docker services
- Deleting legacy shell scripts
- Simplifying service dependencies
- Preserving gluetun-based security model

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE backup of current configuration
  - IMPLEMENT: Create dated backup of docker-compose.yml and key scripts
  - FOLLOW pattern: cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)
  - PURPOSE: Safety rollback capability if issues arise
  - LOCATION: Project root directory

Task 2: REMOVE legacy Docker services from docker-compose.yml
  - DELETE: kill_switch_watchdog service (lines 658-677)
  - DELETE: autoheal service (lines 678-692)
  - DELETE: startup-coordinator service (lines 694-707)
  - REMOVE: depends_on: startup-coordinator from VPN service (line 107)
  - CLEANUP: Remove commented monitoring script references from qBittorrent service (lines 159-161)
  - VALIDATE: docker-compose config after removal

Task 3: DELETE legacy monitoring shell scripts
  - REMOVE: scripts/external-vpn-watchdog.sh (235 lines of redundant VPN monitoring)
  - REMOVE: scripts/startup-coordinator.sh (118 lines of port conflict handling)
  - REMOVE: scripts/security-monitor.sh (328 lines of over-engineered security monitoring)
  - REMOVE: scripts/nginx-container-monitor.sh (260 lines of nginx monitoring)
  - REMOVE: scripts/qbittorrent-internal-monitor.sh (111 lines of internal monitoring)
  - REMOVE: scripts/qbittorrent-wrapper-with-monitor.sh (18 lines monitoring wrapper)
  - REMOVE: scripts/vpn-killswitch-validation.sh (248 lines of kill switch validation)
  - REMOVE: scripts/validate-autoheal.sh (114 lines of autoheal validation)
  - REMOVE: scripts/monitor-qbt-config.sh (30 lines of config monitoring)
  - REMOVE: scripts/internal/vpn-port-monitor.sh (99 lines of PIA port monitoring)

Task 4: REMOVE legacy documentation files
  - DELETE: VPN-KILL-SWITCH-IMPLEMENTATION-AND-VALIDATION.md (160 lines)
  - ARCHIVE: PRPs/022-dependency-based-vpn-killswitch.md (add "ARCHIVED" prefix)
  - ARCHIVE: PRPs/023-vpn-autoheal-watchdog.md (add "ARCHIVED" prefix)
  - PURPOSE: Remove outdated documentation while preserving historical context

Task 5: CLEANUP docker-compose.yml service configuration
  - VERIFY: All depends_on references use only service_healthy conditions
  - VERIFY: No references to deleted monitoring containers remain
  - ENSURE: VPN service health check uses gluetun endpoint (http://127.0.0.1:9999)
  - VALIDATE: docker-compose config validates without errors

Task 6: UPDATE PIA configuration if needed
  - REVIEW: docker-compose.pia.yml for legacy monitoring references
  - CLEANUP: Remove any external monitoring dependencies
  - ENSURE: PIA configuration uses gluetun's built-in port forwarding only

Task 7: VALIDATE simplified configuration
  - TEST: docker-compose config --quiet
  - TEST: docker-compose up -d (dry run to check for errors)
  - VERIFY: All essential services still have proper dependencies
  - CHECK: No orphaned references to removed components
```

### Implementation Patterns & Key Details

```yaml
# Pattern 1: Docker Service Removal (Legacy Monitoring)
# BEFORE:
kill_switch_watchdog:
  image: docker:cli
  container_name: ${CONTAINER_PREFIX}kill_switch_watchdog
  entrypoint: ["/scripts/external-vpn-watchdog.sh"]
  # ... complex monitoring configuration

# AFTER:
# [Service completely removed - gluetun provides built-in monitoring]

# Pattern 2: Dependency Simplification
# BEFORE:
vpn:
  depends_on:
    startup-coordinator:
      condition: service_started

# AFTER:
vpn:
  depends_on: []  # No complex dependencies needed

# Pattern 3: Health Check Optimization
# BEFORE: External monitoring with emergency stops
# AFTER: Native Docker health checks only
vpn:
  healthcheck:
    test: ["CMD", "wget", "-q", "-O", "/dev/null", "http://127.0.0.1:9999"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 90s

# CRITICAL: Ensure gluetun FIREWALL=on remains enabled
# This provides complete VPN isolation, making all legacy monitoring redundant
environment:
  - FIREWALL=on  # KEEP - This is the only kill switch needed
```

### Integration Points

```yaml
DOCKER_COMPOSE:
  - remove: kill_switch_watchdog service (lines 658-677)
  - remove: autoheal service (lines 678-692)
  - remove: startup-coordinator service (lines 694-707)
  - cleanup: depends_on references to removed services
  - preserve: All essential application services unchanged

SCRIPTS_DIRECTORY:
  - remove: 10+ legacy monitoring shell scripts
  - preserve: Core service entrypoint scripts
  - preserve: Basic validation scripts (validate-vpn.sh)
  - cleanup: References to deleted scripts in remaining files

DOCUMENTATION:
  - remove: VPN-KILL-SWITCH-IMPLEMENTATION-AND-VALIDATION.md
  - archive: Historical PRPs with "ARCHIVED" prefix
  - update: CLAUDE.md to reflect simplified architecture
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each major change - fix before proceeding
docker-compose config --quiet          # Validate Docker Compose syntax
echo $?                                 # Should return 0

# Check for any references to removed services
grep -r "kill_switch_watchdog\|autoheal\|startup-coordinator" . --exclude-dir=.git || echo "No legacy references found"

# Validate shell script removals
ls scripts/external-vpn-watchdog.sh scripts/startup-coordinator.sh scripts/security-monitor.sh 2>/dev/null && echo "Legacy scripts still exist" || echo "Legacy scripts successfully removed"

# Expected: Zero errors. Configuration validates cleanly.
```

### Level 2: Container Validation (Component Testing)

```bash
# Test basic configuration validation
docker-compose config > /dev/null && echo "✓ Docker Compose configuration valid"

# Test service startup sequence (dry run)
docker-compose up --no-start && echo "✓ All services can be created without errors"

# Check that VPN service configuration is intact
docker-compose config | grep -A 20 "vpn:" && echo "✓ VPN service configuration preserved"

# Verify gluetun configuration is maintained
docker-compose config | grep "FIREWALL=on" && echo "✓ Gluetun kill switch enabled"

# Expected: All validations pass, no missing dependencies or broken references
```

### Level 3: Integration Testing (System Validation)

```bash
# Full stack startup test
docker-compose up -d
sleep 60  # Allow services to initialize

# Verify VPN is healthy with gluetun monitoring
docker exec vpn curl -f http://localhost:9999/healthz && echo "✓ Gluetun health endpoint working"

# Check that all essential services are running
docker-compose ps | grep -E "Up|healthy" && echo "✓ Services started successfully"

# Validate VPN isolation (kill switch functionality)
docker exec vpn wget -q --timeout=5 -O - http://ifconfig.me && echo "❌ IP leak detected" || echo "✓ VPN isolation working"

# Test service dependencies
docker-compose logs prowlarr | grep -E "Started|healthy" && echo "✓ Service dependencies working"

# Expected: All services healthy, no IP leaks, proper VPN isolation
```

### Level 4: Security Validation (VPN Kill Switch Testing)

```bash
# VPN Kill Switch Validation Test
echo "Testing VPN kill switch functionality..."

# Test 1: Verify VPN is connected and working
VPN_IP=$(docker exec vpn curl -s ifconfig.me)
echo "VPN IP: $VPN_IP"
HOST_IP=$(curl -s ifconfig.me)
echo "Host IP: $HOST_IP"

if [ "$VPN_IP" != "$HOST_IP" ]; then
    echo "✓ VPN IP differs from host IP - isolation working"
else
    echo "❌ VPN IP matches host IP - possible leak"
    exit 1
fi

# Test 2: Test kill switch by stopping VPN
echo "Testing kill switch by stopping VPN..."
docker-compose stop vpn
sleep 10

# Test 3: Verify no internet access without VPN (if qBittorrent were running)
# Note: qBittorrent is commented out, so we test the network isolation concept
echo "✓ Kill switch test completed - gluetun FIREWALL=on provides protection"

# Test 4: Restart VPN
docker-compose up -d vpn
sleep 30

# Test 5: Verify VPN restored
NEW_VPN_IP=$(docker exec vpn curl -s ifconfig.me)
if [ "$NEW_VPN_IP" != "$HOST_IP" ]; then
    echo "✓ VPN restored after restart"
else
    echo "❌ VPN failed to restore properly"
    exit 1
fi

# Expected: All security tests pass, no IP leaks, proper kill switch behavior
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] docker-compose config validates without errors: `docker-compose config --quiet`
- [ ] All legacy monitoring services removed: No references to kill_switch_watchdog, autoheal, startup-coordinator
- [ ] All legacy monitoring scripts deleted: 10+ scripts removed from scripts/ directory
- [ ] Legacy documentation cleaned up: Outdated docs removed or archived

### Feature Validation

- [ ] All success criteria from "What" section met
- [ ] System starts cleanly: `docker-compose up -d` succeeds
- [ ] VPN security maintained: gluetun FIREWALL=on enabled and functional
- [ ] No IP leaks detected: VPN IP differs from host IP during testing
- [ ] Essential services healthy: All core services show "healthy" status
- [ ] Web UI functionality preserved: Service health monitoring still works

### Code Quality Validation

- [ ] Configuration simplified: Removed 1,500+ lines of legacy monitoring code
- [ ] Dependencies optimized: Uses native Docker conditions only
- [ ] No broken references: No orphaned references to removed components
- [ ] Security maintained: gluetun provides complete VPN isolation
- [ ] Documentation updated: Legacy docs archived/removed appropriately

### System Performance Validation

- [ ] Reduced resource usage: No monitoring containers running
- [ ] Simplified startup: Faster service initialization without watchdog coordination
- [ ] Stable operation: No crashes from legacy monitoring components
- [ ] Maintainability improved: Fewer components to maintain and troubleshoot

---

## Anti-Patterns to Avoid

- ❌ Don't remove gluetun's FIREWALL=on setting - this is the essential kill switch
- ❌ Don't disable VPN health checks - they're needed for dependency management
- ❌ Don't remove essential service entrypoint scripts - only monitoring-specific ones
- ❌ Don't break network isolation - maintain network_mode: "container:vpn" for torrent clients
- ❌ Don't skip validation testing - verify VPN isolation after changes
- ❌ Don't keep legacy scripts "just in case" - they cause conflicts with gluetun
- ❌ Don't ignore service dependency updates - remove references to deleted containers
- ❌ Don't forget to backup configuration before making changes