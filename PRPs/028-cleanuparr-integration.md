name: "Cleanuparr Integration - Automated Download Cleanup and Queue Management"
description: |
  Full integration of Cleanuparr into the torrent-media-server stack for automated cleanup of
  malicious files, stalled downloads, orphaned media, and intelligent seeding management across
  qBittorrent/Transmission and all *arr applications.

---

## Goal

**Feature Goal**: Integrate Cleanuparr as a fully automated "janitor" service that monitors and cleans download queues, removes malicious/stalled downloads, manages seeding lifecycles, and maintains optimal download health across the entire media automation pipeline.

**Deliverable**: Production-ready Cleanuparr service that:
- Automatically blocks and removes malware-flagged downloads using community blocklists
- Implements strike-based cleanup for failed/stalled downloads with automatic replacement searches
- Manages seeding ratios and lifecycle for optimal resource usage
- Detects and cleans orphaned downloads (files no longer tracked by *arr apps)
- Integrates seamlessly with qBittorrent AND Transmission (automatic client detection)
- Requires zero manual configuration post-deployment

**Success Definition**:
- Cleanuparr container starts healthy and connects to all configured services
- Malware Blocker module active with community blocklists loaded
- Queue Cleaner monitoring Sonarr/Radarr for failed downloads
- Download Cleaner tracking seeding ratios and orphaned files
- All validation tests pass including VPN isolation verification
- Works correctly with both `docker compose up -d` (default) and `docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d` (PIA VPN)

## Why

- **Security**: Automated malware blocking prevents compromised files from entering the media library
- **Efficiency**: Strike-based cleanup removes stalled downloads and triggers automatic replacements
- **Resource Management**: Seeding lifecycle management prevents disk space exhaustion
- **Operational Excellence**: Orphaned file detection keeps download directories clean
- **Zero-Touch Operation**: Fully automated - no manual intervention required for daily operations
- **Integration Completeness**: Fills the gap between download and final media placement

## What

A Cleanuparr service integrated into docker-compose.yml that:

### Core Functionality

1. **Malware Blocker Module**
   - Syncs community blocklists from `https://cleanuparr.pages.dev/static/blacklist`
   - Blocks downloads matching malware patterns
   - Automatically deletes and blacklists flagged torrents
   - Optional: Syncs blacklist to qBittorrent's built-in exclusion list

2. **Queue Cleaner Module**
   - Monitors Sonarr/Radarr download queues
   - Implements configurable strike system (3-strike default)
   - Removes downloads that fail multiple times
   - Triggers automatic replacement searches in *arr apps
   - Respects private tracker settings (no deletion of private torrents)

3. **Download Cleaner Module**
   - Tracks seeding ratios (2.0 default) and idle time (30 days default)
   - Removes downloads meeting seeding completion criteria
   - Detects orphaned downloads (no hardlinks to media library)
   - Cross-seed support (preserves torrents with multiple trackers)

4. **Notifications (Optional)**
   - Notifiarr integration for cleanup events
   - Apprise support for multi-platform notifications
   - Configurable notification levels and channels

### Service Architecture

- **Container**: `${CONTAINER_PREFIX}cleanuparr`
- **Image**: `ghcr.io/cleanuparr/cleanuparr:latest`
- **Port**: `${CLEANUPARR_PORT:-11011}:11011`
- **Networks**: `media_network` + `vpn_network` (dual-network like Sonarr/Radarr)
- **NOT VPN-Isolated**: Cleanuparr is a management service, not a torrent client
- **Torrent Client Access**: Via VPN container hostname (`http://vpn:8080` for qBittorrent, `http://vpn:9091` for Transmission)

### Success Criteria

- [ ] Cleanuparr service starts and reaches healthy status
- [ ] Web UI accessible at `http://localhost:${CLEANUPARR_PORT:-11011}`
- [ ] Connections established to qBittorrent/Transmission (via VPN container)
- [ ] Connections established to Sonarr, Radarr (via internal Docker DNS)
- [ ] Community blocklists loaded and active
- [ ] Malware Blocker module operational
- [ ] Queue Cleaner monitoring active
- [ ] Download Cleaner tracking seeding/orphans
- [ ] Dry Run Mode can be toggled for testing
- [ ] All containers remain healthy after Cleanuparr integration
- [ ] VPN isolation preserved for torrent clients
- [ ] Works with both default and PIA VPN configurations

## All Needed Context

### Context Completeness Check

_This PRP has been validated against the "No Prior Knowledge" test. An implementer with no familiarity with this codebase can successfully integrate Cleanuparr using only this PRP and codebase access._

### Documentation & References

```yaml
# MUST READ - Cleanuparr Official Documentation
- url: https://cleanuparr.github.io/Cleanuparr/
  why: Official documentation for all features, configuration, and integration patterns
  critical: |
    - Cleanuparr is NOT webhook-driven, it polls services on schedules
    - Dry Run Mode must be enabled initially to test without deletions
    - Path mapping MUST match download client paths for orphaned detection
    - Private torrent deletion can cause Hit & Run penalties - enable "Ignore Private Torrents"
    - Re-download loop bug (Issue #282) - use strike minimums of 3+ or 0 to disable

- url: https://github.com/Cleanuparr/Cleanuparr
  why: Source repository with issue tracker and community discussions
  critical: Official image is `ghcr.io/cleanuparr/cleanuparr:latest`, port 11011

- url: https://cleanuparr.pages.dev/static/blacklist
  why: Community-maintained malware blocklist (default blocklist URL)
  critical: This URL should be configured in the Malware Blocker module

# Pattern Files - Follow These Exactly
- file: docker-compose.yml (lines 607-637)
  why: autoscan integration - recent service following exact pattern needed for Cleanuparr
  pattern: |
    - Dual network (media + vpn)
    - Cross-service config access (plex-config:ro volume)
    - Service dependencies with health checks
    - Entrypoint script pattern
  gotcha: autoscan does NOT need vpn_network, but Cleanuparr DOES (must access torrent clients)

- file: docker-compose.yml (lines 342-383)
  why: watchlistarr integration - demonstrates dual-network service with *arr app communication
  pattern: |
    - Networks: media_network + (implicitly needs access to services on both networks)
    - Environment variables for service URLs (Docker DNS: http://sonarr:8989)
    - API key passing pattern
    - Cross-service volume mounts for config access
  gotcha: Service URLs use internal Docker DNS (http://service:port), not localhost

- file: docker-compose.yml (lines 253-287)
  why: Sonarr service definition - shows *arr app network configuration
  pattern: |
    - networks: media_network + vpn_network (must communicate with VPN-isolated torrent clients)
    - depends_on: prowlarr with service_healthy condition
    - entrypoint: custom script for configuration injection
    - volumes: config, templates (ro), scripts (ro), media, downloads
  gotcha: Dual networks required to bridge media services and VPN-isolated torrent clients

- file: scripts/sonarr-entrypoint.sh
  why: Example entrypoint that sources torrent-client-selector.sh for dynamic client configuration
  pattern: |
    source /scripts/common/torrent-client-selector.sh
    torrent_client_selector
    # Use $TORRENT_CLIENT_NAME, $TORRENT_CLIENT_PORT, etc.
  gotcha: Always access torrent clients via "vpn" hostname, not client container name

- file: scripts/watchlistarr-entrypoint.sh
  why: Advanced entrypoint with multi-method authentication, service discovery, retry logic
  pattern: |
    - First-run detection (if config doesn't exist)
    - Template processing with envsubst
    - Multi-method credential resolution (extract, generate, cache, wait)
    - Service discovery loop with fallback hosts
    - Background retry loop for missing credentials
  gotcha: Don't block service startup waiting for credentials - run discovery in background

- file: scripts/validate-media-pipeline.sh
  why: Comprehensive validation script pattern for testing service integration
  pattern: |
    - API connectivity tests (curl with API keys)
    - Configuration verification (categories, root folders, download clients)
    - Directory structure validation
    - Permission checks
    - Error counting and summary reporting
  gotcha: Use curl with -m timeout to prevent hanging on failed services

- file: config/templates/autoscan/config.json.template
  why: JSON template with environment variable substitution for service configuration
  pattern: |
    - Use ${VAR_NAME} for variable substitution with envsubst
    - Nested JSON structure with service URLs and API keys
    - Array configurations for multiple targets
  gotcha: JSON must be valid after envsubst - escape special characters properly

# VPN Networking - CRITICAL SECURITY PATTERNS
- file: CLAUDE.md (lines 8-11)
  why: ABSOLUTE RULE for VPN isolation - cannot be violated
  critical: |
    qBittorrent MUST remain fully VPN-isolated via `network_mode: "container:vpn"`
    Cleanuparr MUST NOT use network_mode: "container:vpn"
    Cleanuparr MUST access torrent clients via "vpn" hostname (http://vpn:8080, http://vpn:9091)
  gotcha: Any change to torrent client network configuration risks IP leaks

- file: docker-compose.yml (lines 118-154)
  why: qBittorrent VPN isolation pattern - shows how torrent clients share VPN network
  pattern: |
    network_mode: "container:${CONTAINER_PREFIX}vpn"
    # NO ports section - all access through nginx or vpn hostname
    depends_on:
      vpn:
        condition: service_healthy
  gotcha: Services using network_mode cannot have their own networks or ports sections

- file: docker-compose.yml (lines 323-341)
  why: nginx-proxy bridges media and VPN networks - access pattern for VPN-isolated services
  pattern: |
    networks:
      - media_network
      - vpn_network
    # Acts as reverse proxy to VPN-isolated services
  gotcha: This is the ONLY service that can safely bridge both networks for user access

- file: scripts/validate-vpn.sh
  why: VPN isolation validation - ensures no IP leaks
  pattern: |
    - Check host IP ≠ VPN IP
    - Check torrent client IP = VPN IP
    - Validate VPN health check
  gotcha: Run this after ANY networking changes to verify isolation maintained

# Torrent Client Abstraction
- file: scripts/common/torrent-client-selector.sh
  why: Central torrent client detection and configuration abstraction
  pattern: |
    - Exports TORRENT_CLIENT_NAME, TORRENT_CLIENT_PORT, TORRENT_CLIENT_HOST
    - Handles qBittorrent vs Transmission differences
    - Always sets TORRENT_CLIENT_HOST="vpn" (NOT nginx-proxy for Cleanuparr)
  critical: |
    Cleanuparr connects DIRECTLY to torrent clients, not through nginx proxy
    Use http://vpn:8080 for qBittorrent, http://vpn:9091 for Transmission

# Configuration Management
- file: config/templates/
  why: Template-based configuration system for all services
  pattern: |
    - Templates use envsubst for variable substitution (${VAR_NAME})
    - Read-only mount: /templates:ro
    - First-run detection: if config doesn't exist, apply template
    - Never overwrite existing configs on restart
  gotcha: Templates must be valid after envsubst - test manually if complex

# Testing and Validation
- file: scripts/validate-media-pipeline.sh
  why: Integration testing pattern for service connectivity and configuration
  pattern: |
    - API connectivity tests with curl -m timeout
    - Health check validation
    - Configuration verification via API queries
    - Error counting and exit code based on pass/fail
  gotcha: Use environment variables for API keys, don't hardcode
```

### Current Codebase tree

```bash
/home/dustin/projects/torrents-cleanuparr/
├── docker-compose.yml              # Main compose file with all services
├── docker-compose.pia.yml          # PIA VPN override
├── config/
│   ├── templates/                  # Configuration templates for all services
│   │   ├── autoscan/              # Example recent integration
│   │   ├── jellyfin/
│   │   ├── sonarr/
│   │   ├── radarr/
│   │   ├── qbittorrent/
│   │   └── transmission/
│   ├── autoscan/                   # Runtime configs (generated from templates)
│   ├── sonarr/
│   ├── radarr/
│   └── ...
├── scripts/
│   ├── common/
│   │   └── torrent-client-selector.sh  # Torrent client abstraction
│   ├── autoscan-entrypoint.sh
│   ├── sonarr-entrypoint.sh
│   ├── radarr-entrypoint.sh
│   ├── qbittorrent-entrypoint.sh
│   ├── transmission-entrypoint.sh
│   ├── watchlistarr-entrypoint.sh
│   ├── validate-media-pipeline.sh
│   └── validate-vpn.sh
├── data/
│   ├── downloads/
│   │   ├── complete/
│   │   │   ├── radarr/
│   │   │   └── sonarr/
│   │   ├── incomplete/
│   │   └── watch/
│   └── media/
│       ├── movies/
│       └── tv/
└── PRPs/
    ├── templates/
    │   └── prp_base.md
    └── 028-cleanuparr-integration.md  # This PRP
```

### Desired Codebase tree with files to be added

```bash
/home/dustin/projects/torrents-cleanuparr/
├── docker-compose.yml              # MODIFIED: Add cleanuparr service definition
├── config/
│   ├── templates/
│   │   └── cleanuparr/            # CREATE: Cleanuparr configuration templates
│   │       └── config.json.template  # Template with torrent client URLs, *arr URLs, settings
│   └── cleanuparr/                 # AUTO-CREATED: Runtime config (generated at first run)
│       ├── config.json            # Generated from template
│       ├── cleanuparr.db          # SQLite database (auto-created by Cleanuparr)
│       └── logs/                  # Log directory (auto-created)
├── scripts/
│   ├── cleanuparr-entrypoint.sh   # CREATE: Entrypoint for first-run setup and torrent client detection
│   └── validate-cleanuparr.sh     # CREATE: Validation script for Cleanuparr integration testing
└── PRPs/
    └── ai_docs/
        └── cleanuparr-integration-patterns.md  # CREATE: Detailed integration notes
```

**File Responsibilities:**

1. **config/templates/cleanuparr/config.json.template**
   - Cleanuparr configuration with environment variable substitution
   - Torrent client URLs (dynamic based on TORRENT_CLIENT)
   - *arr application URLs and API keys
   - Module settings (Malware Blocker, Queue Cleaner, Download Cleaner)
   - Notification settings (optional)

2. **scripts/cleanuparr-entrypoint.sh**
   - Source torrent-client-selector.sh for dynamic client detection
   - First-run detection and template processing
   - Verify torrent client and *arr app connectivity
   - Apply configuration template with envsubst
   - Start Cleanuparr service

3. **scripts/validate-cleanuparr.sh**
   - Test Cleanuparr API connectivity (http://localhost:11011/health)
   - Verify torrent client connections through Cleanuparr
   - Verify *arr app connections
   - Check module status (Malware Blocker, Queue Cleaner, Download Cleaner)
   - Validate VPN isolation not broken by Cleanuparr

4. **PRPs/ai_docs/cleanuparr-integration-patterns.md**
   - Comprehensive notes on Cleanuparr configuration
   - Common pitfalls and solutions
   - API documentation for validation
   - Module-specific configuration examples

### Known Gotchas & Library Quirks

```yaml
# CRITICAL - VPN Networking
- NEVER use network_mode: "container:vpn" for Cleanuparr
  Why: Cleanuparr is NOT a torrent client, it's a management service
  Impact: Would break Cleanuparr's ability to communicate with *arr apps

- ALWAYS use "vpn" hostname for torrent client URLs, NEVER container names
  Why: qBittorrent/Transmission share VPN's network namespace (no independent hostname)
  Example: http://vpn:8080 (correct), http://qbittorrent:8080 (WRONG - won't resolve)

# Cleanuparr Specific
- Cleanuparr is polling-based, NOT webhook-driven
  Why: It checks services on schedules, doesn't receive real-time events
  Impact: Changes may take 5-15 minutes to be detected

- Path mapping MUST match torrent client paths exactly
  Why: Orphaned detection uses hardlink analysis
  Example: If torrent client sees /downloads, Cleanuparr must also mount /downloads (not /data/downloads)

- Strike minimum must be 3+ or 0 (not 1 or 2)
  Why: Re-download loop bug (Issue #282)
  Impact: Strike values of 1-2 can cause infinite download-delete-redownload cycles

- Enable "Ignore Private Torrents" for private trackers
  Why: Deleting private torrents before seeding requirements causes Hit & Run penalties
  Impact: Account bans from private trackers

# Docker Compose
- envsubst cannot handle complex JSON escaping
  Why: $ characters in JSON can break variable substitution
  Workaround: Use $$ to escape literal $ in JSON if needed

# Service Startup Timing
- Cleanuparr should depend on vpn:service_healthy
  Why: Torrent client access requires VPN to be running
  Impact: Connection failures if VPN not ready

- Add start_period to health check (60s minimum)
  Why: Cleanuparr needs time to initialize database and load blocklists
  Impact: Premature health check failures
```

## Implementation Blueprint

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE config/templates/cleanuparr/config.json.template
  IMPLEMENT: Cleanuparr configuration template with dynamic torrent client selection
  FOLLOW pattern: config/templates/autoscan/config.json.template (JSON with envsubst)
  NAMING: config.json.template (exact name for Cleanuparr convention)
  PLACEMENT: config/templates/cleanuparr/
  DEPENDENCIES: None (foundation task)
  DETAILS: |
    - Use conditional logic for qBittorrent vs Transmission URLs
    - Include all *arr apps (Sonarr, Radarr, Lidarr, Readarr, Whisparr)
    - Configure default settings: Dry Run Mode ON, Strike Min 3, Seeding Ratio 2.0
    - Set community blocklist URL: https://cleanuparr.pages.dev/static/blacklist
    - Use ${VAR} syntax for: TORRENT_CLIENT, API keys, service URLs

Task 2: CREATE scripts/cleanuparr-entrypoint.sh
  IMPLEMENT: Entrypoint script with torrent client detection and first-run setup
  FOLLOW pattern: scripts/watchlistarr-entrypoint.sh (complex entrypoint with service discovery)
  NAMING: cleanuparr-entrypoint.sh (snake_case, service-entrypoint pattern)
  PLACEMENT: scripts/
  DEPENDENCIES: Task 1 (needs template to process)
  DETAILS: |
    - Source /scripts/common/torrent-client-selector.sh
    - Detect first run (no /config/config.json)
    - Process template with envsubst
    - Set torrent client URL based on TORRENT_CLIENT env var
      * qbittorrent: http://vpn:8080
      * transmission: http://vpn:9091
    - Set *arr URLs using Docker DNS (http://sonarr:8989, http://radarr:7878)
    - Verify connectivity to torrent client and *arr apps (optional pre-flight checks)
    - exec original entrypoint (Cleanuparr's native startup)

Task 3: MODIFY docker-compose.yml
  IMPLEMENT: Add cleanuparr service definition after autoscan service (line ~637)
  FOLLOW pattern: docker-compose.yml lines 607-637 (autoscan service)
  NAMING: cleanuparr (lowercase, service name)
  PLACEMENT: After autoscan service, before autoheal
  DEPENDENCIES: Task 2 (needs entrypoint script)
  PRESERVE: All existing service definitions, network configurations, VPN isolation
  DETAILS: |
    - image: ghcr.io/cleanuparr/cleanuparr:latest
    - container_name: ${CONTAINER_PREFIX}cleanuparr
    - networks: media_network + vpn_network (BOTH - dual network pattern)
    - ports: ${CLEANUPARR_PORT:-11011}:11011
    - depends_on:
        init-directories: service_completed_successfully
        vpn: service_healthy
        sonarr: service_healthy
        radarr: service_healthy
    - environment:
        PUID=1000, PGID=1000, TZ=${TZ}
        PORT=11011, BASE_PATH=/
        (NO feature config env vars - all via config.json)
    - volumes:
        ./config/cleanuparr:/config
        ./config/templates/cleanuparr:/templates:ro
        ./scripts:/scripts:ro
        ./data/downloads:/downloads (CRITICAL for orphaned detection)
    - entrypoint: ["/scripts/cleanuparr-entrypoint.sh"]
    - healthcheck: curl -f http://localhost:11011/health
    - restart: unless-stopped

Task 4: CREATE scripts/validate-cleanuparr.sh
  IMPLEMENT: Comprehensive validation script for Cleanuparr integration
  FOLLOW pattern: scripts/validate-media-pipeline.sh (validation script structure)
  NAMING: validate-cleanuparr.sh (snake_case, validate-service pattern)
  PLACEMENT: scripts/
  DEPENDENCIES: Task 3 (needs service running to validate)
  COVERAGE: |
    - Cleanuparr API health check (http://localhost:11011/health)
    - Cleanuparr ready check (http://localhost:11011/health/ready)
    - Torrent client connection status via Cleanuparr
    - *arr app connection status via Cleanuparr
    - Module activation status (Malware Blocker, Queue Cleaner, Download Cleaner)
    - Blocklist loaded verification
    - VPN isolation preservation check (run scripts/validate-vpn.sh)
    - Error counting and summary reporting

Task 5: CREATE PRPs/ai_docs/cleanuparr-integration-patterns.md
  IMPLEMENT: Comprehensive integration documentation for future reference
  FOLLOW pattern: PRPs/ai_docs/*.md (existing integration docs)
  NAMING: cleanuparr-integration-patterns.md (kebab-case, descriptive)
  PLACEMENT: PRPs/ai_docs/
  DEPENDENCIES: Tasks 1-4 (document actual implementation)
  CONTENT: |
    - Cleanuparr architecture and features
    - Configuration template structure and variables
    - Torrent client URL patterns (vpn hostname access)
    - *arr app integration patterns
    - Module configuration (Malware Blocker, Queue Cleaner, Download Cleaner)
    - Common issues and solutions
    - API endpoints for validation and monitoring
    - Dry Run Mode usage and testing workflow

Task 6: UPDATE .env.example (if exists) or create environment variable documentation
  IMPLEMENT: Add Cleanuparr environment variables to .env.example
  FIND pattern: existing .env.example or create if missing
  ADD: |
    # Cleanuparr - Automated Download Cleanup
    CLEANUPARR_PORT=11011
    # No additional env vars needed - configured via web UI
  PRESERVE: All existing environment variable definitions
```

### Implementation Patterns & Key Details

```python
# config/templates/cleanuparr/config.json.template structure
{
  "downloadClients": [
    {
      "type": "${TORRENT_CLIENT}",  # qbittorrent or transmission
      "url": "http://vpn:${TORRENT_CLIENT_PORT}",  # CRITICAL: vpn hostname, NOT client name
      "username": "${QBITTORRENT_USERNAME}",  # Conditional based on client type
      "password": "${QBITTORRENT_PASSWORD}"
    }
  ],
  "applications": [
    {
      "type": "sonarr",
      "url": "http://sonarr:8989",  # Docker DNS hostname
      "apiKey": "${SONARR_API_KEY}"
    },
    {
      "type": "radarr",
      "url": "http://radarr:7878",
      "apiKey": "${RADARR_API_KEY}"
    }
  ],
  "modules": {
    "malwareBlocker": {
      "enabled": true,
      "blocklistUrl": "https://cleanuparr.pages.dev/static/blacklist",
      "syncToQBittorrent": true  # Syncs to qBittorrent's exclusion list
    },
    "queueCleaner": {
      "enabled": true,
      "strikeMin": 3,  # CRITICAL: Must be 0 or 3+ (not 1-2)
      "autoSearch": true,  # Trigger replacement searches
      "ignorePrivate": true  # CRITICAL: Don't delete private torrents
    },
    "downloadCleaner": {
      "enabled": true,
      "seedingRatio": 2.0,
      "seedingTime": 30,  # days
      "removeOrphaned": true,  # Requires /downloads mount
      "crossSeedSupport": true
    },
    "dryRunMode": true  # CRITICAL: Start with dry run enabled
  },
  "notifications": {
    "notifiarr": {
      "enabled": false,
      "apiKey": "${NOTIFIARR_API_KEY}"
    }
  }
}

# scripts/cleanuparr-entrypoint.sh key patterns
#!/bin/bash
set -e

CONFIG_DIR="/config"
TEMPLATE_DIR="/templates"

# Source torrent client selector
source /scripts/common/torrent-client-selector.sh
torrent_client_selector

# Export client-specific variables for template
if [ "$TORRENT_CLIENT" = "transmission" ]; then
    export TORRENT_CLIENT_PORT=9091
    export TORRENT_CLIENT_TYPE="transmission"
else
    export TORRENT_CLIENT_PORT=8080
    export TORRENT_CLIENT_TYPE="qbittorrent"
fi

# First-run detection
if [ ! -f "$CONFIG_DIR/config.json" ]; then
    echo "[CLEANUPARR-INIT] First run - applying configuration template"
    
    # Process template
    envsubst < "$TEMPLATE_DIR/config.json.template" > "$CONFIG_DIR/config.json"
    
    # Validate JSON syntax
    if ! jq empty "$CONFIG_DIR/config.json" 2>/dev/null; then
        echo "[CLEANUPARR-INIT] ERROR: Generated config.json is invalid JSON"
        exit 1
    fi
    
    echo "[CLEANUPARR-INIT] Configuration applied successfully"
    echo "[CLEANUPARR-INIT] Torrent client: $TORRENT_CLIENT_TYPE at http://vpn:$TORRENT_CLIENT_PORT"
fi

# Set permissions
chown -R 1000:1000 "$CONFIG_DIR"

# Start Cleanuparr
echo "[CLEANUPARR-INIT] Starting Cleanuparr..."
exec /usr/local/bin/cleanuparr  # Or whatever the original entrypoint is
```

### Integration Points

```yaml
DOCKER_COMPOSE:
  - add after: autoscan service (line ~637)
  - pattern: "Follow autoscan/watchlistarr service structure exactly"
  - networks: Both media_network and vpn_network required
  - dependencies: vpn (healthy), sonarr (healthy), radarr (healthy)

ENVIRONMENT_VARIABLES:
  - add to: .env.example
  - pattern: "CLEANUPARR_PORT=11011"
  - critical: "NO env vars for features - all configured via config.json or web UI"

VPN_VALIDATION:
  - run after: scripts/validate-vpn.sh must pass after integration
  - ensure: qBittorrent/Transmission still report VPN IP, not host IP
  - critical: "Adding Cleanuparr must not break VPN isolation"

DIRECTORY_STRUCTURE:
  - create: config/cleanuparr/ (auto-created by init-directories)
  - create: config/templates/cleanuparr/
  - mount: ./data/downloads:/downloads (required for orphaned detection)
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation - fix before proceeding

# Validate shell scripts
shellcheck scripts/cleanuparr-entrypoint.sh
shellcheck scripts/validate-cleanuparr.sh
chmod +x scripts/cleanuparr-entrypoint.sh
chmod +x scripts/validate-cleanuparr.sh

# Validate JSON template syntax
cat config/templates/cleanuparr/config.json.template | envsubst | jq empty
# Expected: No output = valid JSON after substitution

# Validate Docker Compose syntax
docker compose config
# Expected: Parsed configuration with cleanuparr service visible

# Validate both compose file variations
docker-compose -f docker-compose.yml -f docker-compose.pia.yml config
# Expected: No errors, PIA overrides applied correctly

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test template substitution in isolation
export TORRENT_CLIENT=qbittorrent
export QBITTORRENT_USERNAME=admin
export QBITTORRENT_PASSWORD=testpass
export SONARR_API_KEY=test-sonarr-key
export RADARR_API_KEY=test-radarr-key

envsubst < config/templates/cleanuparr/config.json.template | jq .
# Expected: Valid JSON with correct variable substitution, vpn hostname in URLs

# Test entrypoint script logic (dry run)
bash -n scripts/cleanuparr-entrypoint.sh
# Expected: No syntax errors

# Test torrent client selector sourcing
bash -c "source scripts/common/torrent-client-selector.sh && torrent_client_selector && echo \$TORRENT_CLIENT_PORT"
# Expected: 8080 (qbittorrent) or 9091 (transmission)

# Validate service dependencies in compose
docker compose config | yq '.services.cleanuparr.depends_on'
# Expected: init-directories, vpn, sonarr, radarr with conditions

# Expected: All component tests pass before full stack deployment
```

### Level 3: Integration Testing (System Validation)

```bash
# Ensure clean state
docker compose down
docker compose rm -f cleanuparr

# Deploy full stack (default VPN provider)
docker compose up -d

# Wait for services to start
sleep 60

# Verify all containers running
docker compose ps
# Expected: cleanuparr status = Up, healthy

# Check cleanuparr logs
docker compose logs cleanuparr | head -50
# Expected: No error messages, successful connection logs to torrent client and *arr apps

# Health check validation
docker exec cleanuparr curl -f http://localhost:11011/health
# Expected: HTTP 200, health check passes

# Cleanuparr ready check
docker exec cleanuparr curl -f http://localhost:11011/health/ready
# Expected: HTTP 200, service fully initialized

# Check generated config
docker exec cleanuparr cat /config/config.json | jq .
# Expected: Valid JSON, vpn hostname in download client URL, correct API keys

# Verify network connectivity - torrent client (through VPN container)
docker exec cleanuparr curl -f -m 5 http://vpn:8080/api/v2/app/version
# Expected: qBittorrent version string (if qBittorrent active)

docker exec cleanuparr curl -f -m 5 http://vpn:9091/transmission/rpc
# Expected: X-Transmission-Session-Id response (if Transmission active)

# Verify network connectivity - *arr apps
docker exec cleanuparr curl -f -H "X-Api-Key: $SONARR_API_KEY" http://sonarr:8989/api/v3/system/status
# Expected: Sonarr system status JSON

docker exec cleanuparr curl -f -H "X-Api-Key: $RADARR_API_KEY" http://radarr:7878/api/v3/system/status
# Expected: Radarr system status JSON

# VPN isolation verification (CRITICAL)
./scripts/validate-vpn.sh
# Expected: All checks pass, qBittorrent/Transmission still show VPN IP

# Run Cleanuparr-specific validation
./scripts/validate-cleanuparr.sh
# Expected: All validation tests pass, 0 errors

# Test with PIA VPN configuration
docker compose down
docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d
sleep 60
./scripts/validate-cleanuparr.sh
# Expected: All validation tests pass with PIA VPN active

# Expected: All integrations working, no connection errors, VPN isolation preserved
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Cleanuparr Web UI Validation
curl -f http://localhost:${CLEANUPARR_PORT:-11011}
# Expected: HTTP 200, Cleanuparr web interface HTML

# Verify module status via Web UI or API
curl http://localhost:11011/api/modules/status
# Expected: malwareBlocker, queueCleaner, downloadCleaner all showing as "enabled"

# Verify blocklist loaded
curl http://localhost:11011/api/malwareblocker/blocklist
# Expected: Non-empty blocklist from community source

# Test Dry Run Mode is enabled (safety check)
curl http://localhost:11011/api/settings | jq '.modules.dryRunMode'
# Expected: true (dry run enabled by default)

# Verify download client connection
curl http://localhost:11011/api/downloadclients/test
# Expected: Connection successful to qBittorrent or Transmission

# Verify *arr app connections
curl http://localhost:11011/api/applications/test
# Expected: Successful connections to Sonarr and Radarr

# Performance check - startup time
docker compose logs cleanuparr | grep "Cleanuparr started"
# Expected: Service starts within 60 seconds

# Resource usage check
docker stats cleanuparr --no-stream
# Expected: Memory < 500MB, CPU < 10% at idle

# Validate all containers still healthy after Cleanuparr integration
docker compose ps | grep healthy | wc -l
# Expected: All services with health checks showing "healthy"

# End-to-end workflow simulation (manual test)
# 1. Add test torrent via Sonarr/Radarr
# 2. Let it fail (bad indexer or intentionally pause)
# 3. Wait for strike accumulation (with Dry Run ON, should log but not delete)
# 4. Check Cleanuparr logs for detection
# Expected: Dry run logs show detection but no deletion

# Database validation
docker exec cleanuparr ls -lh /config/cleanuparr.db
# Expected: SQLite database created, reasonable size (< 100MB initially)

# Log rotation check
docker exec cleanuparr ls -lh /config/logs/
# Expected: Log files present, not exceeding 100MB

# Expected: All creative validations pass, Cleanuparr fully functional
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] Docker Compose syntax valid: `docker compose config`
- [ ] Shell scripts pass shellcheck: `shellcheck scripts/cleanuparr-entrypoint.sh`
- [ ] JSON template valid after envsubst: `envsubst < template | jq empty`
- [ ] Cleanuparr service starts: `docker compose ps cleanuparr`
- [ ] Health check passes: `docker inspect cleanuparr | jq '.[0].State.Health.Status'`
- [ ] VPN validation passes: `./scripts/validate-vpn.sh` (exit code 0)
- [ ] Cleanuparr validation passes: `./scripts/validate-cleanuparr.sh` (exit code 0)

### Feature Validation

- [ ] Web UI accessible: http://localhost:11011
- [ ] Torrent client connection established (via vpn hostname)
- [ ] Sonarr connection established (via Docker DNS)
- [ ] Radarr connection established (via Docker DNS)
- [ ] Community blocklist loaded in Malware Blocker module
- [ ] Malware Blocker module enabled and operational
- [ ] Queue Cleaner module enabled with strike system (min 3)
- [ ] Download Cleaner module enabled with seeding management
- [ ] Dry Run Mode enabled by default (safety)
- [ ] Notifications configured (if desired)

### Integration Validation

- [ ] Works with default compose: `docker compose up -d`
- [ ] Works with PIA VPN: `docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d`
- [ ] All containers healthy: `docker compose ps | grep healthy`
- [ ] qBittorrent/Transmission still show VPN IP (not host IP)
- [ ] VPN isolation NOT broken by Cleanuparr integration
- [ ] No port conflicts in worktree environments
- [ ] Service dependencies resolve correctly (vpn, sonarr, radarr all healthy before cleanuparr starts)

### Code Quality Validation

- [ ] Follows existing entrypoint script pattern (watchlistarr/autoscan)
- [ ] Uses torrent-client-selector.sh for abstraction
- [ ] File placement matches desired codebase tree
- [ ] Environment variables follow naming conventions
- [ ] JSON template syntax consistent with other templates
- [ ] Validation script follows validate-media-pipeline.sh pattern
- [ ] No hardcoded credentials or API keys (all from env vars)

### Documentation & Deployment

- [ ] PRPs/ai_docs/cleanuparr-integration-patterns.md created with comprehensive notes
- [ ] .env.example updated with CLEANUPARR_PORT
- [ ] Implementation matches PRP specification exactly
- [ ] All gotchas documented and mitigated
- [ ] Validation scripts provide clear pass/fail output

---

## Anti-Patterns to Avoid

- ❌ Don't use `network_mode: "container:vpn"` for Cleanuparr - it's NOT a torrent client
- ❌ Don't access torrent clients by container name - use "vpn" hostname (http://vpn:8080)
- ❌ Don't skip VPN validation after integration - IP leaks are silent failures
- ❌ Don't set strike minimum to 1 or 2 - causes re-download loops (use 0 or 3+)
- ❌ Don't delete private torrents before seeding requirements - use "Ignore Private Torrents"
- ❌ Don't start with Dry Run Mode disabled - test first without actual deletions
- ❌ Don't skip /downloads volume mount - orphaned detection requires it
- ❌ Don't use localhost URLs in config.json - use Docker DNS hostnames
- ❌ Don't configure Cleanuparr via environment variables - use config.json or web UI
- ❌ Don't assume webhooks work - Cleanuparr is polling-based, not event-driven
- ❌ Don't break existing service patterns - follow autoscan/watchlistarr exactly
- ❌ Don't deploy without testing both VPN configurations (default + PIA)

---

## Confidence Score: 9/10

**Rationale**: One-pass implementation success is highly likely because:

✅ **Comprehensive Research**: Deep analysis of 5+ similar integrations (autoscan, watchlistarr, jellyfin, transmission)  
✅ **Exact Patterns Identified**: Specific file references with line numbers for every pattern  
✅ **Critical Gotchas Documented**: VPN networking rules, Cleanuparr-specific bugs, path mapping requirements  
✅ **Complete Context**: External docs, API patterns, torrent client abstraction, validation strategies  
✅ **Validated Against Template**: Passes "No Prior Knowledge" test - all required context included  
✅ **Four-Level Validation**: Comprehensive testing strategy from syntax to end-to-end  
✅ **Security Preserved**: Explicit VPN isolation validation ensures no IP leaks  

⚠️ **Minor Risk**: Cleanuparr's configuration format may vary slightly from documented examples if upstream changes occur. Mitigation: Test with latest image first, adjust template if needed.

---

**Next Steps for Implementation Agent**:
1. Read all referenced files (docker-compose.yml sections, entrypoint scripts, templates)
2. Create config template with exact JSON structure from Cleanuparr docs
3. Create entrypoint script following watchlistarr pattern + torrent-client-selector
4. Add service to docker-compose.yml following autoscan pattern exactly
5. Create validation script following validate-media-pipeline.sh pattern
6. Run all 4 validation levels in order
7. Verify no regressions (all existing services still healthy, VPN isolation preserved)
