# VPN Kill Switch Implementation and Validation Gates

## Overview

This document defines the specific implementation tasks and validation gates for the VPN kill switch feature. The solution implements a multi-layer defense-in-depth approach that ensures qBittorrent cannot possibly access the internet when VPN is unhealthy, with zero packet leak window.

## Multi-Layer Kill Switch Architecture

### Layer 1: Fail-Secure iptables Rules (Primary Defense)
- Default DROP policy on all chains (INPUT, OUTPUT, FORWARD)
- Explicit blocking of Docker bridge interfaces to prevent leaks
- Allow traffic only through VPN tunnel interface
- Applied immediately at container startup (fail-secure)

### Layer 2: Container-Level Monitoring (Secondary Defense)
- Internal network monitor running inside qBittorrent container
- Continuous VPN health verification
- Traffic control (tc) based emergency blocking
- Process-level kill switch as last resort

### Layer 3: External Oversight (Tertiary Defense)
- Independent watchdog container monitoring from outside network namespace
- IP leak detection from external perspective
- Emergency container stop/restart capabilities
- Alert system integration

### Layer 4: Dependency Management (Foundational Defense)
- Proper Docker dependency chains ensuring qBittorrent cannot start without healthy VPN
- Health check verification at multiple levels
- Automatic restart policies with backoff

## Implementation Tasks

### 1. Enhanced iptables Rules for Fail-Secure Protection
**File:** `scripts/cloudflare/enhanced-vpn-kill-switch.sh`

Key features:
- Applies DROP policies immediately at startup
- Blocks Docker bridge interfaces explicitly
- Allows only VPN tunnel traffic
- Continuous health monitoring with automatic remediation

### 2. Internal Network Monitor for qBittorrent Container
**File:** `scripts/qbittorrent-internal-monitor.sh`

Key features:
- Runs inside qBittorrent container
- Uses traffic control (tc) for emergency blocking
- Monitors VPN connectivity and qBittorrent health
- Implements process-level kill switch

### 3. External Watchdog Container for Oversight
**File:** `scripts/external-vpn-watchdog.sh`

Key features:
- Independent monitoring from outside network namespace
- IP leak detection from external perspective
- Emergency container stop/restart capabilities
- Alert system integration

### 4. Docker Compose Configuration
**File:** `docker-compose.vpn-killswitch.yml`

Key features:
- Enhanced security configurations for all containers
- Proper dependency management
- Multi-layer health checks
- Security hardening (read-only filesystems, capability dropping)

## Validation Gates

### Gate 1: Basic Connectivity and Container Health
**Validation Script:** `scripts/vpn-killswitch-validation.sh` (Test 1)
**Requirements:**
- VPN and qBittorrent containers must exist
- Both containers must be running
- VPN container must be healthy
- All containers must show "Healthy" status

### Gate 2: Network Isolation Verification
**Validation Script:** `scripts/vpn-killswitch-validation.sh` (Test 2)
**Requirements:**
- qBittorrent must use `network_mode: "container:vpn"`
- qBittorrent must have no direct network access
- Network namespace sharing must be properly configured

### Gate 3: IP Leak Prevention
**Validation Script:** `scripts/vpn-killswitch-validation.sh` (Test 3)
**Requirements:**
- VPN IP must differ from real IP
- qBittorrent IP must match VPN IP
- No IP leaks detected during normal operation

### Gate 4: Kill Switch Process Verification
**Validation Script:** `scripts/vpn-killswitch-validation.sh` (Test 4)
**Requirements:**
- Enhanced VPN kill switch process must be running
- qBittorrent internal monitor process must be running
- External watchdog process must be running

### Gate 5: iptables Rules Validation
**Validation Script:** `scripts/vpn-killswitch-validation.sh` (Test 5)
**Requirements:**
- All iptables policies must be DROP
- VPN interface rules must be present
- Docker bridge blocking rules must be active

### Gate 6: Emergency Scenario Testing
**Validation Script:** `scripts/vpn-killswitch-validation.sh` (Test 6)
**Requirements:**
- Traffic must be blocked when VPN crashes
- Kill switch must activate immediately
- Containers must recover properly after VPN restart

### Gate 7: Fail-Secure Behavior
**Validation Script:** `scripts/vpn-killswitch-validation.sh` (Test 7)
**Requirements:**
- qBittorrent must refuse to start without VPN
- Dependencies must be properly enforced
- Automatic recovery after VPN restoration

## Deployment Instructions

1. **Apply the enhanced kill switch configuration:**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.vpn-killswitch.yml up -d
   ```

2. **Verify all containers are healthy:**
   ```bash
   docker-compose ps
   ```

3. **Run validation suite:**
   ```bash
   chmod +x scripts/vpn-killswitch-validation.sh
   ./scripts/vpn-killswitch-validation.sh --full
   ```

## Security Considerations

1. **Defense in Depth:** Multiple independent protection layers
2. **Fail-Secure Design:** Default to blocking traffic when in doubt
3. **Zero Packet Leak Window:** Immediate protection on VPN failure
4. **Proper Dependency Management:** qBittorrent cannot start without VPN
5. **Continuous Monitoring:** Ongoing health verification

## Performance Impact

- **CPU Usage:** ~1-2% increase for monitoring processes
- **Memory Usage:** ~10-20MB for monitoring scripts
- **Network Latency:** ~1-5ms increase for iptables processing
- **Startup Time:** ~10-30s increase for rule establishment

## Maintenance

- Regular validation using the test suite
- Monitoring logs for kill switch activations
- Updating Cloudflare IP ranges when needed
- Reviewing and updating security configurations