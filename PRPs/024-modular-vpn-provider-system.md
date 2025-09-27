name: "Modular VPN Provider System with Smart Environment Detection"
description: |
  Implement Option 3 architecture for VPN provider selection using VPN_PROVIDER environment variable
  with smart entrypoint detection and provider-specific script delegation.

---

## Goal

**Feature Goal**: Transform the hardcoded WARP-specific VPN implementation into a modular, provider-agnostic system that supports multiple VPN providers through environment variable selection.

**Deliverable**: Smart VPN entrypoint system with provider-specific scripts that maintains full network isolation and kill-switch protection across all providers.

**Success Definition**: Single `docker-compose.yml` file that can switch between WARP, PIA, and future VPN providers via `VPN_PROVIDER` environment variable without requiring compose file overrides.

## User Persona

**Target User**: DevOps engineers and self-hosting enthusiasts

**Use Case**: Switching between VPN providers based on availability, performance, or preference without modifying docker-compose files

**User Journey**:
1. User sets `VPN_PROVIDER=pia` in `.env` file
2. User runs `docker compose up -d`
3. System automatically configures PIA-specific settings and scripts
4. VPN starts with appropriate provider and kill-switch protection

**Pain Points Addressed**:
- Current WARP-specific hardcoding breaks PIA compatibility
- Provider switching requires complex compose file overrides
- Kill-switch script is WARP-specific and fails with other providers

## Why

- Enable seamless VPN provider switching without infrastructure changes
- Support multiple VPN providers for redundancy and choice
- Maintain strict network isolation regardless of provider
- Future-proof architecture for adding new providers

## What

### Current Problems
- `enhanced-vpn-kill-switch.sh` calls WARP-specific commands (warp-cli)
- Line 123 calls `/entrypoint.sh` which doesn't exist in PIA container
- docker-compose.yml hardcodes WARP image and entrypoint
- PIA override can't cleanly remove WARP-specific configurations

### Required Behavior
- Single docker-compose.yml with VPN_PROVIDER selection
- Provider-specific scripts in `/scripts/vpn/{provider}/`
- Universal entrypoint that delegates to correct provider
- Consistent kill-switch protection across all providers
- Graceful fallback for unknown providers

### Success Criteria

- [ ] VPN starts successfully with `VPN_PROVIDER=warp`
- [ ] VPN starts successfully with `VPN_PROVIDER=pia`
- [ ] Kill-switch protection works for all providers
- [ ] Health checks pass for all providers
- [ ] qBittorrent maintains VPN isolation with all providers

## All Needed Context

### Context Completeness Check

_"If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_ - YES, all provider-specific details, network configurations, and security requirements are documented below.

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- file: docker-compose.yml
  why: Current VPN service configuration with WARP-specific settings
  pattern: Lines 47-91 show VPN service definition
  gotcha: Hardcoded entrypoint at line 84, WARP-specific healthcheck at line 86

- file: docker-compose.pia.yml
  why: PIA override configuration showing provider differences
  pattern: Lines 24-70 show PIA-specific configuration
  gotcha: Can't remove parent volumes/entrypoint, only override

- file: scripts/vpn/enhanced-vpn-kill-switch.sh
  why: Current WARP-specific kill-switch implementation
  pattern: Shows iptables rules and WARP-specific commands
  gotcha: Line 123 calls non-existent /entrypoint.sh, uses warp-cli throughout

- file: .env.example
  why: Environment variable patterns and naming conventions
  pattern: VPN_ prefix for generic, PIA_ for provider-specific
  gotcha: Some variables marked "generated at runtime"

- file: CLAUDE.md
  why: Critical security requirements for VPN isolation
  pattern: "qBittorrent MUST remain fully VPN-isolated via network_mode"
  gotcha: Network configuration changes risk exposing real IP

- url: https://github.com/qdm12/gluetun
  why: Reference implementation of multi-provider VPN system
  critical: Shows provider detection patterns and configuration structure

- url: https://github.com/thrnz/docker-wireguard-pia
  why: PIA container documentation for environment variables
  critical: Shows required PIA environment variables and configuration
```

### Current Codebase Structure

```bash
torrents/
├── docker-compose.yml           # Main compose with WARP hardcoded
├── docker-compose.pia.yml       # PIA override (incomplete)
├── .env.example                 # Environment variables template
├── scripts/
│   └── vpn/
│       └── enhanced-vpn-kill-switch.sh  # WARP-specific kill switch
├── setup-vpn-routing.sh        # VPN routing configuration
└── config/
    └── vpn/                     # VPN config storage
```

### Desired Codebase Structure

```bash
torrents/
├── docker-compose.yml           # Provider-agnostic VPN service
├── .env.example                 # Updated with VPN_PROVIDER variable
├── scripts/
│   └── vpn/
│       ├── entrypoint.sh       # Smart entrypoint (delegates to provider)
│       ├── common/
│       │   └── kill-switch-base.sh  # Shared kill-switch logic
│       ├── warp/
│       │   ├── setup.sh        # WARP-specific setup
│       │   └── healthcheck.sh  # WARP health check
│       └── pia/
│           ├── setup.sh        # PIA-specific setup
│           └── healthcheck.sh  # PIA health check
└── config/
    └── vpn/                     # Provider configs
```

### Known Gotchas & Library Quirks

```bash
# CRITICAL: Docker compose doesn't unset parent service properties
# Must explicitly set to empty/null to override:
# entrypoint: []  # Clears parent entrypoint
# command: []     # Clears parent command

# CRITICAL: PIA container has its own entrypoint
# Don't override unless providing complete replacement

# CRITICAL: WARP uses 'warp-cli' commands
# PIA uses different commands for status/connection

# CRITICAL: Network isolation via network_mode: "container:vpn"
# This MUST be maintained for qBittorrent
```

## Implementation Blueprint

### Environment Variable Structure

```yaml
# Core VPN selection
VPN_PROVIDER=warp  # Options: warp, pia, none
VPN_ENABLED=true   # Global VPN toggle

# Provider-agnostic variables (work for all providers)
VPN_NETWORK_SUBNET=10.233.0.0/16
VPN_IP_ADDRESS=10.233.0.2
VPN_KILL_SWITCH=true
VPN_HEALTH_CHECK_INTERVAL=30s

# WARP-specific (only used when VPN_PROVIDER=warp)
WARP_LICENSE_KEY=${WARP_LICENSE_KEY:-}

# PIA-specific (only used when VPN_PROVIDER=pia)
PIA_USER=${PIA_USER:-}
PIA_PASS=${PIA_PASS:-}
PIA_REGION=${PIA_REGION:-us_atlanta}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE scripts/vpn/common/kill-switch-base.sh
  - IMPLEMENT: Provider-agnostic iptables rules
  - EXTRACT: Common kill-switch logic from enhanced-vpn-kill-switch.sh
  - REMOVE: WARP-specific commands (warp-cli, CloudflareWARP interface)
  - ADD: Provider interface variables (VPN_INTERFACE, VPN_IPS)
  - NAMING: Functions: apply_base_kill_switch(), monitor_connection()
  - PLACEMENT: scripts/vpn/common/

Task 2: CREATE scripts/vpn/warp/setup.sh
  - IMPLEMENT: WARP-specific initialization
  - EXTRACT: WARP logic from enhanced-vpn-kill-switch.sh (lines 121-186)
  - INCLUDE: warp-cli commands, registration, connection
  - SET: VPN_INTERFACE="CloudflareWARP"
  - CALL: source /scripts/vpn/common/kill-switch-base.sh
  - PLACEMENT: scripts/vpn/warp/

Task 3: CREATE scripts/vpn/warp/healthcheck.sh
  - IMPLEMENT: WARP connection verification
  - COMMAND: warp-cli --accept-tos status | grep -q 'Connected'
  - EXIT: 0 for connected, 1 for disconnected
  - PLACEMENT: scripts/vpn/warp/

Task 4: CREATE scripts/vpn/pia/setup.sh
  - IMPLEMENT: PIA-specific initialization
  - CHECK: Required variables (PIA_USER, PIA_PASS)
  - DELEGATE: To PIA container's native entrypoint
  - SET: VPN_INTERFACE from PIA's created interface
  - CALL: source /scripts/vpn/common/kill-switch-base.sh
  - PLACEMENT: scripts/vpn/pia/

Task 5: CREATE scripts/vpn/pia/healthcheck.sh
  - IMPLEMENT: PIA connection verification
  - COMMAND: curl -f --max-time 10 https://ipinfo.io/ip
  - VERIFY: IP changed from original
  - EXIT: 0 for connected, 1 for disconnected
  - PLACEMENT: scripts/vpn/pia/

Task 6: CREATE scripts/vpn/entrypoint.sh
  - IMPLEMENT: Smart provider detection and delegation
  - READ: VPN_PROVIDER environment variable
  - VALIDATE: Provider is supported (warp, pia, none)
  - DELEGATE: To /scripts/vpn/${VPN_PROVIDER}/setup.sh
  - FALLBACK: Exit with error for unknown providers
  - NAMING: Main entry point for all VPN containers
  - PLACEMENT: scripts/vpn/

Task 7: MODIFY docker-compose.yml
  - REPLACE: Hardcoded WARP image with build context
  - ADD: Build section with dynamic Dockerfile selection
  - CHANGE: entrypoint to ["/scripts/vpn/entrypoint.sh"]
  - ADD: VPN_PROVIDER environment variable
  - UPDATE: Healthcheck to use provider-specific script
  - PRESERVE: Network configuration and security settings

Task 8: CREATE dockerfiles/vpn/Dockerfile.warp
  - BASE: FROM caomingjun/warp:latest
  - COPY: All scripts from scripts/vpn/
  - INSTALL: iptables if not present
  - PLACEMENT: dockerfiles/vpn/

Task 9: CREATE dockerfiles/vpn/Dockerfile.pia
  - BASE: FROM thrnz/docker-wireguard-pia:latest
  - COPY: All scripts from scripts/vpn/
  - PRESERVE: PIA's original entrypoint
  - PLACEMENT: dockerfiles/vpn/

Task 10: MODIFY .env.example
  - ADD: VPN_PROVIDER with explanation and options
  - REORGANIZE: Group provider-specific variables
  - DOCUMENT: Which variables apply to which providers
  - ADD: Examples for switching providers
```

### Implementation Patterns & Key Details

```bash
# scripts/vpn/entrypoint.sh - Smart provider detection
#!/bin/bash
set -e

echo "=== VPN PROVIDER: ${VPN_PROVIDER:-none} ==="

# Provider validation
case "${VPN_PROVIDER,,}" in  # Convert to lowercase
    "warp"|"cloudflare")
        echo "Starting Cloudflare WARP VPN..."
        exec /scripts/vpn/warp/setup.sh "$@"
        ;;
    "pia"|"privateinternetaccess")
        echo "Starting Private Internet Access VPN..."
        exec /scripts/vpn/pia/setup.sh "$@"
        ;;
    "none"|"")
        echo "VPN disabled - running without VPN protection"
        echo "WARNING: Traffic will not be protected!"
        sleep infinity  # Keep container running
        ;;
    *)
        echo "ERROR: Unknown VPN provider: ${VPN_PROVIDER}"
        echo "Supported providers: warp, pia, none"
        exit 1
        ;;
esac

# scripts/vpn/common/kill-switch-base.sh - Shared kill switch
apply_base_kill_switch() {
    local vpn_interface="${1}"
    local allowed_ips="${2}"

    echo "Applying kill switch for interface: ${vpn_interface}"

    # CRITICAL: Default DROP policies first
    iptables -P INPUT DROP
    iptables -P OUTPUT DROP
    iptables -P FORWARD DROP

    # Allow loopback
    iptables -I INPUT 1 -i lo -j ACCEPT
    iptables -I OUTPUT 1 -o lo -j ACCEPT

    # Allow VPN interface if exists
    if [ -n "${vpn_interface}" ]; then
        iptables -I OUTPUT 1 -o "${vpn_interface}" -j ACCEPT
        iptables -I INPUT 1 -i "${vpn_interface}" -j ACCEPT
    fi

    # Provider-specific IPs
    if [ -n "${allowed_ips}" ]; then
        for ip in ${allowed_ips}; do
            iptables -A OUTPUT -d "${ip}" -j ACCEPT
        done
    fi
}

# docker-compose.yml modification
services:
  vpn:
    build:
      context: .
      dockerfile: dockerfiles/vpn/Dockerfile.${VPN_PROVIDER:-warp}
    environment:
      - VPN_PROVIDER=${VPN_PROVIDER:-warp}
    healthcheck:
      test: ["CMD-SHELL", "/scripts/vpn/${VPN_PROVIDER:-warp}/healthcheck.sh"]
```

### Integration Points

```yaml
DOCKER_COMPOSE:
  - modify: docker-compose.yml
  - change: From fixed image to build context
  - update: Healthcheck to use provider scripts

ENVIRONMENT:
  - add to: .env.example and .env
  - variable: VPN_PROVIDER=warp  # or pia

SCRIPTS:
  - create: Provider-specific directories
  - maintain: Backward compatibility with WARP as default

SECURITY:
  - preserve: network_mode: "container:vpn" for qBittorrent
  - maintain: Kill-switch protection for all providers
  - ensure: No IP leaks during provider switching
```

## Validation Loop

### Level 1: File Structure Validation

```bash
# Verify all provider scripts exist
ls -la scripts/vpn/entrypoint.sh
ls -la scripts/vpn/common/kill-switch-base.sh
ls -la scripts/vpn/warp/setup.sh
ls -la scripts/vpn/warp/healthcheck.sh
ls -la scripts/vpn/pia/setup.sh
ls -la scripts/vpn/pia/healthcheck.sh

# Verify Dockerfiles exist
ls -la dockerfiles/vpn/Dockerfile.warp
ls -la dockerfiles/vpn/Dockerfile.pia

# Check script permissions
find scripts/vpn -type f -name "*.sh" -exec ls -l {} \;

# Expected: All files present with executable permissions
```

### Level 2: Provider-Specific Testing

```bash
# Test WARP provider
echo "VPN_PROVIDER=warp" >> .env
docker compose build vpn
docker compose up -d vpn
sleep 30
docker compose exec vpn warp-cli --accept-tos status
docker compose logs vpn | tail -20

# Test PIA provider (requires credentials)
echo "VPN_PROVIDER=pia" >> .env
echo "PIA_USER=your_username" >> .env
echo "PIA_PASS=your_password" >> .env
docker compose build vpn
docker compose up -d vpn
sleep 30
docker compose exec vpn curl https://ipinfo.io
docker compose logs vpn | tail -20

# Test provider switching
docker compose down
sed -i 's/VPN_PROVIDER=.*/VPN_PROVIDER=warp/' .env
docker compose up -d
docker compose ps

# Expected: Each provider starts successfully and connects
```

### Level 3: Network Isolation Testing

```bash
# Verify qBittorrent uses VPN network
docker compose up -d
docker compose exec qbittorrent ip route show
docker compose exec qbittorrent curl https://ipinfo.io

# Test kill switch (stop VPN, verify no connectivity)
docker compose stop vpn
docker compose exec qbittorrent ping -c 1 8.8.8.8 || echo "Kill switch working"

# Verify other services still accessible
curl http://localhost:8080  # qBittorrent WebUI
curl http://localhost:8989  # Sonarr
curl http://localhost:7878  # Radarr

# Expected: qBittorrent has no internet without VPN, other services work
```

### Level 4: Full Stack Validation

```bash
# Complete deployment test with all variations
docker compose down -v

# Test 1: WARP provider
echo "VPN_PROVIDER=warp" > .env
docker compose up -d
docker compose ps
# Wait for all containers to be healthy
sleep 60
for service in vpn qbittorrent sonarr radarr prowlarr; do
    echo "Checking $service..."
    docker compose ps $service | grep -q "healthy" && echo "✓ $service healthy" || echo "✗ $service unhealthy"
done

# Test 2: PIA provider
docker compose down
echo "VPN_PROVIDER=pia" > .env
echo "PIA_USER=username" >> .env
echo "PIA_PASS=password" >> .env
docker compose up -d
sleep 60
for service in vpn qbittorrent sonarr radarr prowlarr; do
    echo "Checking $service..."
    docker compose ps $service | grep -q "healthy" && echo "✓ $service healthy" || echo "✗ $service unhealthy"
done

# Expected: All containers show "Healthy" status with both providers
```

## Final Validation Checklist

### Technical Validation

- [ ] All scripts created in correct directories
- [ ] Entrypoint script correctly detects VPN_PROVIDER
- [ ] WARP provider starts and connects successfully
- [ ] PIA provider starts and connects successfully
- [ ] Kill switch activates for both providers
- [ ] Health checks pass for both providers

### Feature Validation

- [ ] Single docker-compose.yml works for all providers
- [ ] Provider switching via .env file only
- [ ] No compose file overrides needed
- [ ] qBittorrent maintains VPN isolation
- [ ] No IP leaks detected

### Code Quality Validation

- [ ] Scripts follow bash best practices
- [ ] Error handling for missing credentials
- [ ] Clear logging for debugging
- [ ] Graceful fallbacks for unknown providers

### Security Validation

- [ ] Network isolation maintained
- [ ] Kill switch prevents IP leaks
- [ ] No hardcoded credentials
- [ ] VPN-only traffic for torrenting

---

## Anti-Patterns to Avoid

- ❌ Don't remove network isolation for qBittorrent
- ❌ Don't skip kill-switch implementation
- ❌ Don't hardcode provider-specific logic in entrypoint
- ❌ Don't modify PIA container's internal entrypoint
- ❌ Don't use compose overrides for provider selection
- ❌ Don't expose real IP during provider switching

## Confidence Score

**9/10** - Implementation success highly likely. All provider requirements documented, security constraints preserved, and validation comprehensive. Minor uncertainty only in provider-specific edge cases.