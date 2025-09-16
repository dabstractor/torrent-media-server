name: "Remove qBittorrent Download Limits and Queueing - Comprehensive Implementation"
description: |
  Complete removal of all qBittorrent limitations including bandwidth caps, download limits,
  peer connection limits, and torrent queueing to enable unlimited simultaneous downloads.

---

## Goal

**Feature Goal**: Configure qBittorrent client to have no bandwidth caps, no limits on torrent downloads, no limits on peer connections, and no other obstructions to downloading files, while maintaining VPN security isolation.

**Deliverable**: Modified qBittorrent configuration template with all limiting settings removed, validated across both WARP and PIA VPN configurations.

**Success Definition**: All torrents download immediately without queueing, no artificial bandwidth or connection limits, all docker compose variations build successfully with healthy containers.

## User Persona (if applicable)

**Target User**: System administrator managing automated media downloading infrastructure

**Use Case**: Need to download multiple large media files simultaneously without artificial throttling

**User Journey**: Add multiple torrents → All start downloading immediately → No queuing or speed limitations → Efficient utilization of available bandwidth

**Pain Points Addressed**: Current 3-torrent download limit and 10 KiB/s bandwidth caps severely limit download efficiency

## Why

- Enable full utilization of available internet bandwidth for faster media acquisition
- Remove artificial queueing that delays content availability
- Optimize the torrenting infrastructure for bulk downloading scenarios
- Maintain security through VPN isolation while maximizing performance
- Support the automated media pipeline with unlimited concurrent downloads

## What

Remove all qBittorrent configuration limits including:
- Torrent queueing system (Session\QueueingSystemEnabled, Downloads\QueueingSystemEnabled)
- Active download limits (Session\MaxActiveDownloads, Downloads\MaxActiveDownloads)
- Active torrent limits (Session\MaxActiveTorrents, Downloads\MaxActiveTorrents)
- Active upload limits (Session\MaxActiveUploads, Downloads\MaxActiveUploads)
- Bandwidth limitations (Connection\GlobalDLLimitAlt, Connection\GlobalUPLimitAlt)
- Connection constraints while maintaining reasonable system resource usage

### Success Criteria

- [ ] qBittorrent configuration template updated with unlimited settings
- [ ] All Docker compose variations build successfully (`docker compose up -d`)
- [ ] PIA VPN variation builds successfully (`docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d`)
- [ ] All containers show "Healthy" status after startup
- [ ] Multiple torrents download simultaneously without queueing
- [ ] No artificial bandwidth limitations detected
- [ ] VPN isolation maintained (qBittorrent remains in container:vpn network mode)
- [ ] Existing security and authentication bypass functionality preserved

## All Needed Context

### Context Completeness Check

_This PRP provides complete context for implementing unlimited qBittorrent downloads including specific configuration values, file locations, testing procedures, and validation commands for someone unfamiliar with this codebase._

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://github.com/qbittorrent/qBittorrent/wiki/Explanation-of-Options-in-qBittorrent
  why: Official documentation for all qBittorrent configuration options and unlimited values
  critical: Explains -1 vs 0 value meanings for different setting types

- url: https://trash-guides.info/Downloaders/qBittorrent/Basic-Setup/
  why: Community best practices for qBittorrent unlimited configuration
  critical: Performance considerations and resource management for unlimited downloads

- file: config/templates/qbittorrent/qBittorrent.conf.template
  why: Primary configuration template that controls all qBittorrent settings
  pattern: INI file format with [Section]\Key=Value structure
  gotcha: Must maintain VPN security settings and authentication bypass compatibility

- file: scripts/qbittorrent-wrapper.sh
  why: Container startup script that processes configuration template
  pattern: Shell script with envsubst template processing and path corrections
  gotcha: Script does not override limit settings, so template changes will persist

- file: scripts/validate-qbittorrent-categories.sh
  why: Existing validation script pattern for qBittorrent functionality testing
  pattern: Comprehensive API testing with retry logic and error handling
  gotcha: Uses curl with authentication to test qBittorrent API endpoints

- docfile: PRPs/ai_docs/qbittorrent-api.md
  why: API documentation for validation and testing procedures
  section: Preferences API for verifying unlimited settings

- file: docker-compose.yml
  why: Default Docker configuration with WARP VPN that must maintain qBittorrent isolation
  pattern: VPN container sharing with network_mode: "container:vpn"
  gotcha: qBittorrent MUST remain VPN-isolated for IP leak prevention

- file: docker-compose.pia.yml
  why: PIA VPN override configuration for testing alternate VPN provider
  pattern: Overlay compose file that modifies VPN service configuration
  gotcha: Must work with both WARP and PIA VPN configurations per CLAUDE.md requirements
```

### Current Codebase tree (run `tree` in the root of the project) to get an overview of the codebase

```bash
torrents-torrent-settings/
├── config/
│   └── templates/
│       └── qbittorrent/
│           ├── qBittorrent.conf.template (PRIMARY CONFIG)
│           └── runtime-qBittorrent.conf.template
├── scripts/
│   ├── qbittorrent-wrapper.sh (STARTUP WRAPPER)
│   ├── validate-qbittorrent-categories.sh (VALIDATION)
│   └── test-qbittorrent-category-fix.sh (TESTING)
├── docker-compose.yml (DEFAULT WARP VPN)
├── docker-compose.pia.yml (PIA VPN OVERLAY)
└── PRPs/
    └── 018-remove-qbittorrent-limits.md (EXISTING INCOMPLETE)
```

### Desired Codebase tree with files to be added and responsibility of file

```bash
# No new files needed - only modifications to existing template
config/templates/qbittorrent/qBittorrent.conf.template (MODIFIED: unlimited settings)
```

### Known Gotchas of our codebase & Library Quirks

```ini
# CRITICAL: qBittorrent requires specific value types for unlimited settings
# Session and Downloads sections use -1 for unlimited counts
# Connection sections use 0 for unlimited bandwidth
# QueueingSystemEnabled must be false (boolean) not 0/-1

# CRITICAL: VPN Network Isolation MUST be preserved
# qBittorrent MUST remain on network_mode: "container:vpn" for security
# Any network configuration changes risk exposing real IP address

# GOTCHA: Template processing uses envsubst for environment variable substitution
# Environment variables like ${QBITTORRENT_PORT:-6881} are processed at startup
# Static values (like our unlimited settings) should not use variable substitution

# GOTCHA: qBittorrent configuration has duplicate sections
# Both [BitTorrent] and [Preferences] sections may contain similar settings
# Both must be updated consistently for reliable unlimited behavior

# GOTCHA: Wrapper script creates runtime configuration overrides
# Runtime template in scripts/qbittorrent-wrapper.sh may override main template
# Current runtime already has QueueingSystemEnabled=false, which is compatible
```

## Implementation Blueprint

### Data models and structure

```ini
# qBittorrent Configuration Structure (INI format)
[BitTorrent]
Session\MaxActiveDownloads=-1        # Unlimited active downloads
Session\MaxActiveTorrents=-1         # Unlimited active torrents
Session\MaxActiveUploads=-1          # Unlimited active uploads
Session\QueueingSystemEnabled=false  # Disable torrent queueing

[Preferences]
Connection\GlobalDLLimitAlt=0        # Unlimited download bandwidth
Connection\GlobalUPLimitAlt=0        # Unlimited upload bandwidth
Downloads\QueueingSystemEnabled=false # Disable download queueing
Downloads\MaxActiveDownloads=-1      # Unlimited downloads (legacy)
Downloads\MaxActiveTorrents=-1       # Unlimited torrents (legacy)
Downloads\MaxActiveUploads=-1        # Unlimited uploads (legacy)
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY config/templates/qbittorrent/qBittorrent.conf.template
  - CHANGE: Session\MaxActiveDownloads=3 → Session\MaxActiveDownloads=-1
  - CHANGE: Session\MaxActiveTorrents=5 → Session\MaxActiveTorrents=-1
  - CHANGE: Session\MaxActiveUploads=3 → Session\MaxActiveUploads=-1
  - CHANGE: Session\QueueingSystemEnabled=true → Session\QueueingSystemEnabled=false
  - CHANGE: Connection\GlobalDLLimitAlt=10 → Connection\GlobalDLLimitAlt=0
  - CHANGE: Connection\GlobalUPLimitAlt=10 → Connection\GlobalUPLimitAlt=0
  - CHANGE: Downloads\QueueingSystemEnabled=true → Downloads\QueueingSystemEnabled=false
  - CHANGE: Downloads\MaxActiveDownloads=3 → Downloads\MaxActiveDownloads=-1
  - CHANGE: Downloads\MaxActiveTorrents=5 → Downloads\MaxActiveTorrents=-1
  - CHANGE: Downloads\MaxActiveUploads=3 → Downloads\MaxActiveUploads=-1
  - PRESERVE: All VPN security settings, authentication settings, and path configurations
  - PRESERVE: Environment variable substitutions like ${QBITTORRENT_PORT:-6881}

Task 2: VALIDATE Docker build with default WARP VPN configuration
  - RUN: docker compose down --volumes --remove-orphans
  - RUN: docker compose up -d
  - VERIFY: All containers reach "Healthy" status within startup timeouts
  - VERIFY: qBittorrent accessible via http://localhost:18080
  - VERIFY: VPN isolation maintained (network_mode: "container:vpn")

Task 3: VALIDATE Docker build with PIA VPN configuration
  - RUN: docker compose -f docker-compose.yml -f docker-compose.pia.yml down --volumes --remove-orphans
  - RUN: docker compose -f docker-compose.yml -f docker-compose.pia.yml up -d
  - VERIFY: All containers reach "Healthy" status with PIA VPN provider
  - VERIFY: qBittorrent accessible through PIA VPN network isolation
  - VERIFY: No IP leaks when using PIA configuration

Task 4: VALIDATE qBittorrent unlimited configuration via API
  - RUN: scripts/validate-qbittorrent-categories.sh
  - VERIFY: API returns unlimited values for all modified settings
  - VERIFY: QueueingSystemEnabled=false in API response
  - VERIFY: MaxActiveDownloads=-1 in API preferences
  - VERIFY: Bandwidth limits show 0 (unlimited) in API response

Task 5: FUNCTIONAL testing with multiple torrents
  - ADD: Multiple test torrents (Ubuntu ISOs recommended for testing)
  - VERIFY: All torrents start downloading immediately (no queueing)
  - VERIFY: No artificial speed limitations applied
  - VERIFY: Connection counts increase appropriately
  - VERIFY: Memory and CPU usage remain reasonable
```

### Implementation Patterns & Key Details

```ini
# qBittorrent Unlimited Configuration Pattern
# Values: -1 = unlimited counts, 0 = unlimited bandwidth, false = disable feature

[BitTorrent]
Session\MaxActiveDownloads=-1          # PATTERN: -1 for unlimited session limits
Session\MaxActiveTorrents=-1           # PATTERN: -1 for unlimited session limits
Session\MaxActiveUploads=-1            # PATTERN: -1 for unlimited session limits
Session\QueueingSystemEnabled=false    # PATTERN: false to disable queueing

[Preferences]
Connection\GlobalDLLimitAlt=0          # PATTERN: 0 for unlimited bandwidth
Connection\GlobalUPLimitAlt=0          # PATTERN: 0 for unlimited bandwidth
Downloads\QueueingSystemEnabled=false  # PATTERN: false to disable queueing
Downloads\MaxActiveDownloads=-1        # PATTERN: -1 for unlimited download limits
Downloads\MaxActiveTorrents=-1         # PATTERN: -1 for unlimited torrent limits
Downloads\MaxActiveUploads=-1          # PATTERN: -1 for unlimited upload limits

# GOTCHA: Preserve existing environment variables
Session\Port=${QBITTORRENT_PORT:-6881} # PRESERVE: Environment substitution
WebUI\Username=${QBITTORRENT_USERNAME:-admin} # PRESERVE: Auth configuration

# CRITICAL: Maintain VPN security settings - these must remain unchanged
# All authentication bypass and security settings must be preserved
```

### Integration Points

```yaml
DOCKER:
  - preserve: VPN network isolation for qBittorrent security
  - test: Both WARP and PIA VPN configurations must build successfully
  - verify: All containers show "Healthy" status after configuration changes

WRAPPER_SCRIPT:
  - integration: scripts/qbittorrent-wrapper.sh processes template with envsubst
  - compatibility: Wrapper does not override limit settings, template changes persist
  - verify: Template processing completes without errors

VALIDATION:
  - api: Use existing scripts/validate-qbittorrent-categories.sh for testing
  - health: Verify container health checks pass with new configuration
  - functionality: Test multiple simultaneous torrents download without queueing
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Validate INI file syntax after template modification
python3 -c "
import configparser
config = configparser.ConfigParser()
try:
    config.read('config/templates/qbittorrent/qBittorrent.conf.template')
    print('✓ INI syntax validation passed')
except Exception as e:
    print(f'✗ INI syntax error: {e}')
    exit(1)
"

# Verify environment variable substitution works
envsubst < config/templates/qbittorrent/qBittorrent.conf.template > /tmp/test_config.conf
echo "✓ Environment substitution test completed"

# Expected: No syntax errors, valid INI format, envsubst processes successfully
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test qBittorrent configuration template processing
docker run --rm -v "$(pwd)/config:/config" alpine:latest sh -c "
  apk add --no-cache gettext
  envsubst < /config/templates/qbittorrent/qBittorrent.conf.template > /tmp/processed.conf
  grep -q 'MaxActiveDownloads=-1' /tmp/processed.conf && echo '✓ Unlimited downloads configured'
  grep -q 'QueueingSystemEnabled=false' /tmp/processed.conf && echo '✓ Queueing disabled'
  grep -q 'GlobalDLLimitAlt=0' /tmp/processed.conf && echo '✓ Bandwidth unlimited'
"

# Validate Docker compose configuration syntax
docker compose config --quiet && echo "✓ Docker compose syntax valid"
docker compose -f docker-compose.yml -f docker-compose.pia.yml config --quiet && echo "✓ PIA override syntax valid"

# Expected: All configuration tests pass, templates process correctly
```

### Level 3: Integration Testing (System Validation)

```bash
# Test default WARP VPN configuration
echo "Testing default WARP configuration..."
docker compose down --volumes --remove-orphans
docker compose up -d

# Wait for all services to become healthy
echo "Waiting for services to become healthy..."
timeout 300s bash -c 'while [[ "$(docker compose ps --format json | jq -r ".[].Health")" == *"starting"* ]]; do sleep 10; done'

# Verify all containers are healthy
docker compose ps --format "table {{.Service}}\t{{.Status}}\t{{.Health}}"

# Test qBittorrent API accessibility
curl -f "http://localhost:18080/api/v2/app/version" || echo "qBittorrent API not accessible"

# Test PIA VPN configuration (if credentials available)
echo "Testing PIA VPN configuration..."
docker compose -f docker-compose.yml -f docker-compose.pia.yml down --volumes --remove-orphans
if [ -n "$PIA_USER" ] && [ -n "$PIA_PASS" ]; then
    docker compose -f docker-compose.yml -f docker-compose.pia.yml up -d
    timeout 300s bash -c 'while [[ "$(docker compose -f docker-compose.yml -f docker-compose.pia.yml ps --format json | jq -r ".[].Health")" == *"starting"* ]]; do sleep 10; done'
    docker compose -f docker-compose.yml -f docker-compose.pia.yml ps --format "table {{.Service}}\t{{.Status}}\t{{.Health}}"
else
    echo "⚠ PIA credentials not available, skipping PIA test"
fi

# Expected: All containers healthy, qBittorrent API accessible, both VPN configs work
```

### Level 4: Creative & Domain-Specific Validation

```bash
# qBittorrent Configuration Validation
echo "Validating qBittorrent unlimited configuration..."
./scripts/validate-qbittorrent-categories.sh

# API-based configuration verification
QBIT_SESSION=$(curl -c /tmp/qb_cookies -d "username=admin&password=" "http://localhost:18080/api/v2/auth/login")
PREFS=$(curl -b /tmp/qb_cookies "http://localhost:18080/api/v2/app/preferences")

# Verify unlimited settings via API
echo "$PREFS" | jq -r '.max_active_downloads' | grep -q "\-1" && echo "✓ Unlimited downloads confirmed"
echo "$PREFS" | jq -r '.queueing_enabled' | grep -q "false" && echo "✓ Queueing disabled confirmed"
echo "$PREFS" | jq -r '.dl_limit' | grep -q "0" && echo "✓ Download limit removed confirmed"

# Functional testing with Ubuntu torrent
echo "Testing functional unlimited downloading..."
UBUNTU_MAGNET="magnet:?xt=urn:btih:5a8a4b5c8b4e4f4a7a5d6c3b2e1f9a8b7c6d5e4f&dn=ubuntu-22.04.3-desktop-amd64.iso"
curl -X POST -b /tmp/qb_cookies -d "urls=$UBUNTU_MAGNET" "http://localhost:18080/api/v2/torrents/add"

# Add multiple test torrents to verify no queueing
for i in {1..5}; do
    curl -X POST -b /tmp/qb_cookies -d "urls=$UBUNTU_MAGNET" "http://localhost:18080/api/v2/torrents/add"
    sleep 1
done

# Verify all torrents are active (not queued)
ACTIVE_COUNT=$(curl -b /tmp/qb_cookies "http://localhost:18080/api/v2/torrents/info?filter=downloading" | jq length)
echo "Active torrents: $ACTIVE_COUNT (should be >3 to confirm no 3-torrent limit)"

# VPN IP leak testing
echo "Verifying VPN isolation (IP leak protection)..."
QBIT_IP=$(docker exec qbittorrent curl -s https://ipinfo.io/ip 2>/dev/null || echo "VPN_ISOLATED")
echo "qBittorrent IP: $QBIT_IP (should be VPN IP, not real IP)"

# Performance monitoring
echo "Monitoring resource usage..."
docker stats --no-stream qbittorrent

# Expected: All unlimited settings confirmed via API, multiple torrents active, VPN isolation maintained
```

## Final Validation Checklist

### Technical Validation

- [ ] INI syntax validation passes for modified template
- [ ] Environment variable substitution works correctly
- [ ] Default WARP VPN configuration builds successfully: `docker compose up -d`
- [ ] PIA VPN configuration builds successfully: `docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d`
- [ ] All containers show "Healthy" status in both configurations
- [ ] qBittorrent API accessible and responsive

### Feature Validation

- [ ] QueueingSystemEnabled=false confirmed via API
- [ ] MaxActiveDownloads=-1 confirmed via API
- [ ] MaxActiveTorrents=-1 confirmed via API
- [ ] MaxActiveUploads=-1 confirmed via API
- [ ] GlobalDLLimitAlt=0 (unlimited) confirmed via API
- [ ] GlobalUPLimitAlt=0 (unlimited) confirmed via API
- [ ] Multiple torrents download simultaneously without queueing
- [ ] No artificial bandwidth limitations detected

### Code Quality Validation

- [ ] VPN network isolation preserved (network_mode: "container:vpn")
- [ ] Authentication bypass functionality maintained
- [ ] Template environment variable substitutions preserved
- [ ] Configuration file formatting and structure maintained
- [ ] No breaking changes to existing security or path settings

### Documentation & Deployment

- [ ] Validation scripts execute successfully
- [ ] Resource usage remains reasonable with unlimited downloads
- [ ] Both VPN provider configurations tested and validated
- [ ] IP leak protection confirmed (qBittorrent traffic routed through VPN)

---

## Anti-Patterns to Avoid

- ❌ Don't modify VPN network configuration - qBittorrent MUST remain VPN-isolated
- ❌ Don't change authentication or security settings - only modify limit/queueing settings
- ❌ Don't use inconsistent unlimited values (-1 for counts, 0 for bandwidth)
- ❌ Don't skip testing both WARP and PIA VPN configurations
- ❌ Don't ignore container health checks - all must show "Healthy"
- ❌ Don't remove environment variable substitutions like ${QBITTORRENT_PORT}
- ❌ Don't test with copyrighted content - use Ubuntu ISOs for testing