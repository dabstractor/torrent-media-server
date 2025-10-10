name: "Bazarr Subtitle Automation Integration"
description: |
  Complete end-to-end integration of Bazarr subtitle automation service with the existing torrent-media-server stack, including Sonarr, Radarr, and Plex/Jellyfin integration, with zero manual post-deployment configuration required.

---

## Goal

**Feature Goal**: Fully automated subtitle management for all media in the torrent-media-server stack, with Bazarr discovering media from Sonarr/Radarr and automatically downloading optimal subtitles with zero manual configuration.

**Deliverable**: 
- Bazarr container fully integrated into docker-compose.yml
- Automatic configuration via entrypoint script with Sonarr/Radarr API integration
- Pre-configured subtitle providers and language profiles
- Health checks and dependency management
- Validation script to verify complete integration

**Success Definition**: 
- `docker compose up -d` starts Bazarr with complete configuration
- Bazarr automatically discovers all existing and new media from Sonarr/Radarr
- Subtitles are downloaded and placed alongside media files
- All health checks pass
- Works with both qBittorrent and Transmission configurations
- Works with all VPN provider variations (WARP, PIA, custom)

## Why

- **Automation**: Eliminates manual subtitle search and download for every media item
- **Integration**: Leverages existing Sonarr/Radarr library management for subtitle discovery
- **User Experience**: Improves media consumption by ensuring subtitles are always available
- **Consistency**: Applies uniform subtitle quality and language preferences across entire library
- **Zero-Touch Deployment**: Follows project pattern of complete auto-configuration

## What

### Success Criteria

- [ ] Bazarr container starts and achieves healthy status
- [ ] Bazarr automatically connects to Sonarr and Radarr without manual API key entry
- [ ] Existing TV shows and movies are discovered and queued for subtitle search
- [ ] Subtitles are downloaded and stored alongside media files
- [ ] Language profiles and scoring thresholds follow TRaSH Guides best practices
- [ ] Integration works with all torrent client configurations (qBittorrent/Transmission)
- [ ] Works with all VPN provider configurations (WARP/PIA/custom)
- [ ] Health checks validate Bazarr availability and configuration
- [ ] Validation script confirms end-to-end subtitle automation

## All Needed Context

### Context Completeness Check

_This PRP has been validated to provide all information needed for implementation without prior codebase knowledge, including specific file patterns, API integration details, configuration templates, and validation approaches._

### Documentation & References

```yaml
# MUST READ - Bazarr Official Documentation
- url: https://wiki.bazarr.media/Getting-Started/Setup-Guide/
  why: Official setup guide for initial configuration approach
  critical: Config.yaml is created on first start but takes time to populate - must handle timing

- url: https://wiki.bazarr.media/Getting-Started/First-time-installation-configuration/
  why: First-time configuration workflow and post-install requirements
  critical: Bazarr only searches for media added AFTER installation - existing media requires Mass Edit

- url: https://docs.linuxserver.io/images/docker-bazarr/
  why: LinuxServer.io Docker image documentation (official image we'll use)
  critical: PUID/PGID must match media file ownership (1000:1000 in our stack)

- url: https://trash-guides.info/Bazarr/
  why: TRaSH Guides best practices for scoring and configuration
  critical: Sonarr minimum score 90, Radarr minimum score 80, sync thresholds 96/86

# MUST READ - Integration Patterns from Codebase
- file: scripts/sonarr-entrypoint.sh
  why: Entrypoint pattern for *arr services with auto-configuration
  pattern: Template restoration, API key substitution, background configuration scripts
  gotcha: Must wait for service readiness before API calls (sleep delays)

- file: scripts/radarr-entrypoint.sh
  why: Similar pattern to Sonarr, shows consistency in approach
  pattern: Database restoration, config.xml templating, torrent client selection
  gotcha: Dynamic client selection via torrent-client-selector.sh

- file: scripts/overseerr-entrypoint.sh
  why: JSON-based template configuration pattern (alternative to database approach)
  pattern: envsubst for environment variable substitution in JSON templates
  gotcha: Uses envsubst for cleaner JSON templating vs sed for XML

- file: scripts/common/torrent-client-selector.sh
  why: Dynamic torrent client selection utility
  pattern: Exports client-specific variables (name, port, implementation)
  gotcha: Bazarr does NOT need this - no direct torrent client integration

- file: config/templates/overseerr/settings.json.template
  why: Example of pre-configured service integration JSON
  pattern: Container service names for Docker DNS, API keys from env vars
  gotcha: Uses ${VARIABLE} syntax for envsubst substitution

- file: scripts/validate-media-pipeline.sh
  why: Validation script pattern for testing integrations
  pattern: API connectivity tests, configuration validation, error counting
  gotcha: Uses curl with API keys for endpoint testing

# MUST READ - Research Documentation
- docfile: /home/dustin/projects/torrents-bazarr/BAZARR_RESEARCH_REPORT.md
  why: Comprehensive Bazarr research including API limitations, configuration methods, common pitfalls
  section: Section 3 (Sonarr/Radarr Integration), Section 6 (Common Pitfalls), Section 7 (Automation)
  critical: |
    - No official API documentation exists - config via templates only
    - config.yaml created on first start but takes time to populate
    - Cannot use 127.0.0.1 in Docker - must use container names
    - Path mapping only needed if volume mounts differ (avoid by using identical paths)
    - Bazarr uses polling mode (1-5 min), NOT webhooks from Sonarr/Radarr

# Docker Compose Pattern
- file: docker-compose.yml
  why: Service definition patterns, networking, health checks, dependencies
  pattern: |
    - media_network for API communication
    - depends_on with service_healthy conditions
    - LinuxServer.io image pattern with PUID/PGID
    - Custom entrypoint script pattern
  gotcha: |
    - Bazarr does NOT need vpn_network (only downloads subtitles, not torrents)
    - Health checks must allow adequate start_period for initialization
```

### Current Codebase Tree

```bash
torrents-bazarr/
├── docker-compose.yml              # Main orchestration file
├── .env.example                    # Environment variable template
├── scripts/
│   ├── sonarr-entrypoint.sh       # *arr entrypoint pattern
│   ├── radarr-entrypoint.sh
│   ├── overseerr-entrypoint.sh    # JSON template pattern
│   ├── validate-media-pipeline.sh # Validation script pattern
│   └── common/
│       └── torrent-client-selector.sh
├── config/
│   └── templates/
│       ├── sonarr/
│       │   ├── config.xml.template
│       │   └── sonarr.db.*.sql
│       ├── radarr/
│       │   ├── config.xml.template
│       │   └── radarr.db.*.sql
│       └── overseerr/
│           └── settings.json.template
```

### Desired Codebase Tree with Bazarr Files

```bash
torrents-bazarr/
├── docker-compose.yml              # ADD: bazarr service definition
├── .env.example                    # ADD: BAZARR_* environment variables
├── scripts/
│   ├── bazarr-entrypoint.sh       # CREATE: Custom entrypoint for auto-config
│   └── validate-bazarr.sh         # CREATE: Bazarr-specific validation
├── config/
│   ├── bazarr/                    # CREATE: Runtime config directory (gitignored)
│   └── templates/
│       └── bazarr/
│           └── config.yaml.template  # CREATE: Pre-configured template
```

### Known Gotchas & Library Quirks

```python
# CRITICAL: Bazarr Configuration Timing
# config.yaml is created quickly on first start but takes time to populate
# MUST wait for content population before any configuration attempts
# Solution: Use health check delays and startup_period adequately

# CRITICAL: Docker Networking in Bazarr
# Bazarr does NOT work with 127.0.0.1 or localhost for Sonarr/Radarr
# MUST use Docker service names: "sonarr" and "radarr"
# Example (WRONG): ip: 127.0.0.1
# Example (CORRECT): ip: sonarr

# CRITICAL: Path Mapping Confusion
# If volume mounts match across all containers, DO NOT configure path mapping
# Path mapping only needed when actual paths differ
# Our stack uses identical paths - NO PATH MAPPING REQUIRED
# Example: All services see /tv and /movies identically

# CRITICAL: Bazarr Existing Media Limitation
# Bazarr only auto-searches for media added AFTER installation
# Existing media requires manual language profile assignment via Mass Edit
# Solution: Include post-deployment configuration step in entrypoint

# CRITICAL: LinuxServer.io Image Behavior
# PUID/PGID MUST match media file ownership (1000:1000 in our stack)
# Permission errors if PUID/PGID mismatch
# Config directory CANNOT be on NFS (SQLite limitation)
# Solution: Use local storage for config

# CRITICAL: Bazarr Network Requirements
# Bazarr does NOT require VPN isolation (only downloads subtitles via HTTPS)
# Connect to media_network ONLY for Sonarr/Radarr/Jellyfin access
# DO NOT add to vpn_network

# TRaSH Guides Best Practice Settings
# Sonarr Minimum Score: 90 (prevents bad/out-of-sync subs)
# Radarr Minimum Score: 80
# Series Sync Threshold: 96
# Movies Sync Threshold: 86
# Subtitle Storage: "AlongSide Media File" (not in subfolder)
```

## Implementation Blueprint

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE config/templates/bazarr/config.yaml.template
  - IMPLEMENT: Pre-configured Bazarr config.yaml with Sonarr/Radarr integration
  - FOLLOW pattern: config/templates/overseerr/settings.json.template (variable substitution)
  - NAMING: config.yaml (Bazarr's configuration file format)
  - PLACEMENT: config/templates/bazarr/
  - VARIABLES: ${SONARR_API_KEY}, ${RADARR_API_KEY}, ${BAZARR_API_KEY}
  - CRITICAL: 
    - Use container names for IPs (sonarr, radarr, NOT 127.0.0.1)
    - Set subtitle storage to "AlongSide Media File"
    - Configure TRaSH-recommended scoring thresholds
    - Include language profile configuration

Task 2: CREATE scripts/bazarr-entrypoint.sh
  - IMPLEMENT: Custom entrypoint script with template processing and API integration
  - FOLLOW pattern: scripts/sonarr-entrypoint.sh (template restoration, background config)
  - NAMING: bazarr-entrypoint.sh (matches *arr naming pattern)
  - DEPENDENCIES: Requires config.yaml.template from Task 1
  - PLACEMENT: scripts/
  - KEY LOGIC:
    - Check if /config/config.yaml exists
    - If missing, substitute env vars in template using sed
    - Set proper ownership (chown 1000:1000)
    - Wait for Bazarr to be ready (health check endpoint)
    - Exec original LinuxServer.io entrypoint (/init)
  - CRITICAL:
    - Use sed for YAML variable substitution (envsubst may break YAML structure)
    - Add adequate sleep delays for service readiness
    - Handle config.yaml timing issue (created fast, populated slowly)

Task 3: MODIFY docker-compose.yml
  - INTEGRATE: Add bazarr service definition
  - FIND pattern: Existing service definitions (sonarr, radarr, overseerr)
  - ADD: Complete bazarr service with all required configuration
  - PRESERVE: Existing service definitions and network configurations
  - POSITION: After radarr service, before overseerr
  - CONFIGURATION:
    - image: lscr.io/linuxserver/bazarr:latest
    - container_name: ${CONTAINER_PREFIX}bazarr
    - networks: media_network ONLY (no vpn_network)
    - depends_on: sonarr (service_healthy), radarr (service_healthy)
    - volumes: config, templates, scripts, media paths
    - entrypoint: ["/scripts/bazarr-entrypoint.sh"]
    - health check with 60s start_period
    - environment: PUID=1000, PGID=1000, TZ, API keys

Task 4: MODIFY .env.example
  - INTEGRATE: Add Bazarr environment variables
  - FIND pattern: Existing service configurations (SONARR_*, RADARR_*)
  - ADD: Bazarr-specific environment variables
  - PRESERVE: All existing environment variables
  - POSITION: After Radarr configuration section
  - VARIABLES:
    - BAZARR_PORT=6767
    - BAZARR_API_KEY=<generated-key>
    - BAZARR_URL=http://localhost:6767
    - BAZARR_BACKEND_URL=http://bazarr:6767

Task 5: CREATE scripts/validate-bazarr.sh
  - IMPLEMENT: Comprehensive validation script for Bazarr integration
  - FOLLOW pattern: scripts/validate-media-pipeline.sh (API testing, config validation)
  - NAMING: validate-bazarr.sh (follows validation script naming)
  - COVERAGE: 
    - Bazarr API accessibility
    - Sonarr connection from Bazarr
    - Radarr connection from Bazarr
    - Config.yaml exists and has content
    - Volume mounts accessible (/tv, /movies)
    - PUID/PGID verification
  - PLACEMENT: scripts/
  - OUTPUT: Success/failure summary with error count

Task 6: MODIFY CLAUDE.md
  - INTEGRATE: Add Bazarr to validation requirements
  - FIND pattern: Existing validation requirements
  - ADD: "All containers must show 'Healthy'" includes bazarr
  - PRESERVE: Existing network security rules and validation requirements
```

### Implementation Patterns & Key Details

```yaml
# Pattern 1: Bazarr Service Definition (docker-compose.yml)
bazarr:
  image: lscr.io/linuxserver/bazarr:latest
  container_name: ${CONTAINER_PREFIX}bazarr
  entrypoint: ["/scripts/bazarr-entrypoint.sh"]
  networks:
    - media_network  # NO vpn_network - subtitles via HTTPS only
  ports:
    - "${BAZARR_PORT:-6767}:6767"
  depends_on:
    init-directories:
      condition: service_completed_successfully
    sonarr:
      condition: service_healthy  # Wait for Sonarr API
    radarr:
      condition: service_healthy  # Wait for Radarr API
  env_file:
    - .env
  environment:
    - PUID=1000
    - PGID=1000
    - TZ=${TZ:-America/New_York}
  volumes:
    - ./config/bazarr:/config
    - ./config/templates/bazarr:/templates:ro
    - ./scripts:/scripts:ro
    - ${MEDIA_ROOT:-./data/media}/tv:/tv
    - ${MEDIA_ROOT:-./data/media}/movies:/movies
  healthcheck:
    test: ["CMD-SHELL", "curl -f http://localhost:6767 || exit 1"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 60s  # Allow time for config.yaml population
  restart: unless-stopped
  stop_grace_period: 30s

# Pattern 2: Bazarr Entrypoint Script (bazarr-entrypoint.sh)
#!/bin/bash
CONFIG_DIR="/config"
TEMPLATE_DIR="/templates"

echo "[INIT] Bazarr custom entrypoint starting..."

# Check if configuration exists
if [ ! -f "$CONFIG_DIR/config.yaml" ]; then
    echo "[INIT] Fresh installation - applying configuration template..."
    
    # Substitute environment variables in template
    sed -e "s/\${SONARR_API_KEY}/$SONARR_API_KEY/g" \
        -e "s/\${RADARR_API_KEY}/$RADARR_API_KEY/g" \
        -e "s/\${BAZARR_API_KEY}/$BAZARR_API_KEY/g" \
        "$TEMPLATE_DIR/config.yaml.template" > "$CONFIG_DIR/config.yaml"
    
    chown 1000:1000 "$CONFIG_DIR/config.yaml"
    echo "[INIT] Configuration created"
    echo "[INIT] - Sonarr: http://sonarr:8989"
    echo "[INIT] - Radarr: http://radarr:7878"
else
    echo "[INIT] Existing configuration found"
fi

echo "[INIT] Starting Bazarr..."
exec /init "$@"  # Execute original LinuxServer.io entrypoint

# Pattern 3: Config Template (config.yaml.template)
# CRITICAL: Use container names for Docker DNS resolution
general:
  port: 6767
  base_url: ""
  
sonarr:
  - ip: sonarr  # Container name, NOT 127.0.0.1
    port: 8989
    base_url: ""
    ssl: false
    apikey: ${SONARR_API_KEY}
    full_update: Daily
    only_monitored: false
    
radarr:
  - ip: radarr  # Container name, NOT 127.0.0.1
    port: 7878
    base_url: ""
    ssl: false
    apikey: ${RADARR_API_KEY}
    full_update: Daily
    only_monitored: false

settings:
  general:
    minimum_score: 90  # Sonarr threshold (TRaSH guide)
    minimum_score_movie: 80  # Radarr threshold (TRaSH guide)
  
  # Subtitle storage alongside media files
  subfolder: "current"  # Means "alongside media file"
```

### Integration Points

```yaml
DOCKER_COMPOSE:
  - location: docker-compose.yml
  - pattern: Add bazarr service after radarr, before overseerr
  - networks: media_network only
  - depends_on: sonarr, radarr with service_healthy

ENVIRONMENT:
  - add to: .env.example
  - pattern: "BAZARR_PORT=6767"
  - pattern: "BAZARR_API_KEY=<generated-key>"
  - pattern: "BAZARR_BACKEND_URL=http://bazarr:6767"

VALIDATION:
  - add to: CLAUDE.md validation requirements
  - pattern: "All containers must show 'Healthy'" includes bazarr
  - create: scripts/validate-bazarr.sh for specific testing

WEB_UI:
  - update: web-ui environment variables
  - add: BAZARR_URL=http://localhost:${BAZARR_PORT}
  - add: BAZARR_BACKEND_URL=http://bazarr:6767
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Validate shell scripts
shellcheck scripts/bazarr-entrypoint.sh scripts/validate-bazarr.sh

# Validate YAML syntax
yamllint docker-compose.yml
yamllint config/templates/bazarr/config.yaml.template

# Validate environment file syntax
bash -n .env.example

# Expected: Zero errors. Fix before proceeding.
```

### Level 2: Docker Compose Validation

```bash
# Validate docker-compose syntax
docker compose config > /dev/null
echo "Exit code: $?"

# Validate with PIA VPN overlay
docker compose -f docker-compose.yml -f docker-compose.pia.yml config > /dev/null
echo "Exit code: $?"

# Expected: Exit code 0 for both commands
```

### Level 3: Integration Testing (System Validation)

```bash
# Start all services
docker compose up -d

# Wait for services to be healthy
sleep 60

# Check all container health status
docker ps --filter "name=bazarr" --format "{{.Names}}: {{.Status}}"
docker ps --filter "name=sonarr" --format "{{.Names}}: {{.Status}}"
docker ps --filter "name=radarr" --format "{{.Names}}: {{.Status}}"

# Expected: All show "(healthy)" in status

# Run Bazarr validation script
./scripts/validate-bazarr.sh

# Expected: All validation tests pass

# Verify Bazarr can reach Sonarr
docker exec bazarr curl -f http://sonarr:8989/api/v3/system/status \
  -H "X-Api-Key: $SONARR_API_KEY"

# Expected: HTTP 200 with JSON response

# Verify Bazarr can reach Radarr
docker exec bazarr curl -f http://radarr:7878/api/v3/system/status \
  -H "X-Api-Key: $RADARR_API_KEY"

# Expected: HTTP 200 with JSON response

# Check Bazarr logs for errors
docker logs bazarr | grep -i error

# Expected: No critical errors

# Verify config.yaml was created and populated
docker exec bazarr cat /config/config.yaml | grep -E "(sonarr|radarr)"

# Expected: Shows sonarr and radarr configuration
```

### Level 4: Feature Validation

```bash
# Verify Bazarr Web UI accessible
curl -f http://localhost:6767/

# Expected: HTTP 200

# Check Bazarr discovers Sonarr series (requires API - undocumented)
# Manual verification: Open http://localhost:6767 and check Series tab

# Check Bazarr discovers Radarr movies
# Manual verification: Open http://localhost:6767 and check Movies tab

# Verify subtitle download capability
# Manual verification: Trigger manual subtitle search in Bazarr UI

# Test with different VPN configurations
docker compose down
VPN_PROVIDER=pia docker compose -f docker-compose.yml -f docker-compose.pia.yml up -d

# Wait and validate again
sleep 60
./scripts/validate-bazarr.sh

# Expected: Validation passes with PIA configuration

# Test with Transmission torrent client
docker compose down
TORRENT_CLIENT=transmission docker compose up -d

# Wait and validate
sleep 60
./scripts/validate-bazarr.sh

# Expected: Validation passes (Bazarr doesn't depend on torrent client)
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] Bazarr container status shows "healthy"
- [ ] No errors in Bazarr logs: `docker logs bazarr`
- [ ] Config.yaml exists and contains Sonarr/Radarr configuration
- [ ] Bazarr Web UI accessible at http://localhost:6767
- [ ] Bazarr validation script passes: `./scripts/validate-bazarr.sh`

### Feature Validation

- [ ] Bazarr Series tab shows TV shows from Sonarr
- [ ] Bazarr Movies tab shows movies from Radarr
- [ ] Sonarr/Radarr connection tests pass in Bazarr Settings
- [ ] Language profiles configured (English, or user preference)
- [ ] Subtitle providers configured (OpenSubtitles minimum)
- [ ] Scoring thresholds set (Sonarr: 90, Radarr: 80)
- [ ] Subtitle storage set to "AlongSide Media File"

### Integration Validation

- [ ] Works with qBittorrent configuration
- [ ] Works with Transmission configuration
- [ ] Works with WARP VPN provider
- [ ] Works with PIA VPN provider
- [ ] All docker-compose variations build successfully:
  - [ ] `docker compose up -d`
  - [ ] `docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d`

### Code Quality Validation

- [ ] Follows existing entrypoint script patterns
- [ ] File placement matches desired codebase tree
- [ ] Environment variables follow naming conventions
- [ ] Health check timing allows proper initialization
- [ ] Dependencies properly managed (sonarr, radarr healthy)

### Documentation & Deployment

- [ ] .env.example updated with Bazarr variables
- [ ] CLAUDE.md updated with validation requirements
- [ ] Config template includes all critical settings
- [ ] Entrypoint script has proper error handling
- [ ] Validation script provides clear success/failure output

---

## Anti-Patterns to Avoid

- ❌ Don't use 127.0.0.1 or localhost for Sonarr/Radarr in Bazarr config (use container names)
- ❌ Don't add Bazarr to vpn_network (subtitles don't need VPN)
- ❌ Don't configure path mapping if volume mounts are identical (they are in our stack)
- ❌ Don't use envsubst on YAML files (can break structure - use sed instead)
- ❌ Don't skip health check start_period (config.yaml takes time to populate)
- ❌ Don't hardcode API keys in templates (use environment variable substitution)
- ❌ Don't forget to set PUID/PGID to 1000:1000 (must match media ownership)
- ❌ Don't expect webhooks from Sonarr/Radarr (Bazarr uses polling mode)
- ❌ Don't skip existing media configuration (requires Mass Edit after deployment)
- ❌ Don't store config on NFS (SQLite limitation - use local storage)

---

## Failure Mode Analysis & Contingencies

### Layer 1: Configuration Failures

**Failure**: config.yaml not created on first start
- **Detection**: Health check fails, logs show config errors
- **Root Cause**: Template processing failed, permissions issue
- **Mitigation**: 
  - Entrypoint script validates template exists before processing
  - Check file permissions in logs
  - Fallback: Manual config.yaml creation with default values

**Failure**: API keys not substituted in config.yaml
- **Detection**: Sonarr/Radarr connection tests fail in Bazarr UI
- **Root Cause**: Environment variables not passed to container
- **Mitigation**:
  - Validate env_file in docker-compose.yml
  - Check .env file exists and has correct values
  - Add logging in entrypoint to show substituted values (masked)

**Failure**: config.yaml populated slowly, services timeout
- **Detection**: Bazarr shows empty configuration initially
- **Root Cause**: Known Bazarr behavior - file created fast, content slow
- **Mitigation**:
  - Increase health check start_period to 90s
  - Add retry logic in validation script
  - Document expected behavior in logs

### Layer 2: Network & Connectivity Failures

**Failure**: Bazarr cannot reach Sonarr/Radarr
- **Detection**: Connection tests fail, "Connection refused" errors
- **Root Cause**: Wrong hostname (127.0.0.1) or network isolation
- **Mitigation**:
  - Template uses container names (sonarr, radarr)
  - Validate containers on same Docker network
  - Add network diagnostic commands to validation script

**Failure**: Bazarr accessible from host but not from other containers
- **Detection**: curl from host works, container-to-container fails
- **Root Cause**: Port binding but no network connectivity
- **Mitigation**:
  - Ensure bazarr on media_network
  - Test with `docker exec sonarr curl http://bazarr:6767`
  - Verify network configuration in docker-compose

### Layer 3: Permission & Filesystem Failures

**Failure**: Cannot write subtitles to media directories
- **Detection**: "Permission denied" in Bazarr logs, subtitles not saved
- **Root Cause**: PUID/PGID mismatch, directory ownership wrong
- **Mitigation**:
  - Hardcode PUID=1000, PGID=1000 (matches stack standard)
  - Verify with: `docker exec bazarr id`
  - Check directory ownership: `ls -la /data/media`

**Failure**: Config directory on NFS causes database locks
- **Detection**: "Database is locked" errors
- **Root Cause**: SQLite limitation with NFS
- **Mitigation**:
  - Validate config volume is local storage
  - Document NFS limitation in comments
  - Consider PostgreSQL if NFS required (out of scope)

### Layer 4: Integration & Sync Failures

**Failure**: Existing media not discovered by Bazarr
- **Detection**: Series/Movies tabs empty despite Sonarr/Radarr having content
- **Root Cause**: Bazarr only searches media added after installation
- **Mitigation**:
  - Document known limitation in PRP
  - Post-deployment step: Mass Edit to assign language profiles
  - Consider background script to trigger sync (complex, defer to v2)

**Failure**: Subtitles downloaded but not found by Plex/Jellyfin
- **Detection**: Subtitles in Bazarr history but not available in media player
- **Root Cause**: Wrong storage location setting
- **Mitigation**:
  - Template sets storage to "AlongSide Media File"
  - Validate subtitle file location after download
  - Check Plex/Jellyfin subtitle scanner settings

### Layer 5: Torrent Client Variation Failures

**Failure**: Bazarr behaves differently with Transmission vs qBittorrent
- **Detection**: Unexpected behavior changes when switching clients
- **Root Cause**: N/A - Bazarr doesn't interact with torrent clients
- **Mitigation**:
  - Document that Bazarr is client-agnostic
  - Validate with both clients to confirm independence
  - No torrent-client-selector needed for Bazarr

### Layer 6: VPN Provider Variation Failures

**Failure**: Bazarr cannot download subtitles through VPN
- **Detection**: Subtitle provider timeouts, SSL errors
- **Root Cause**: N/A - Bazarr uses media_network, not vpn_network
- **Mitigation**:
  - Keep Bazarr off vpn_network
  - Subtitle providers use HTTPS (no VPN needed)
  - Validate with multiple VPN configurations

### Layer 7: Upgrade & Migration Failures

**Failure**: Bazarr container update breaks configuration
- **Detection**: After image pull, config.yaml missing or corrupted
- **Root Cause**: Volume mount issue or image breaking change
- **Mitigation**:
  - Volume persists config across updates
  - Backup config.yaml before updates
  - Pin image version if stability critical

**Failure**: Database migration from SQLite to PostgreSQL fails
- **Detection**: Data loss, connection errors
- **Root Cause**: Out of scope for initial implementation
- **Mitigation**:
  - Document PostgreSQL as future enhancement
  - Stick with SQLite for MVP
  - Provide migration path in future PRP if needed

---

## Operational Considerations

### Resource Usage

**CPU**: Low - subtitle matching and download (sporadic spikes)
**Memory**: ~200-300MB baseline (LinuxServer.io container)
**Disk**: Minimal - config.yaml + SQLite database (<100MB)
**Network**: Low - periodic API calls to Sonarr/Radarr + subtitle downloads

**Scaling Considerations**:
- No horizontal scaling needed (single instance sufficient)
- Database size grows with media library (thousands of entries = MB)
- No performance tuning required for typical home use (<10k media items)

### Backup & Restore

**Critical Files to Backup**:
1. `/config/config.yaml` - All settings and provider configuration
2. `/config/db/bazarr.db` - Download history and subtitle metadata
3. `.env` - API keys and environment configuration

**Backup Script** (reference):
```bash
#!/bin/bash
docker exec bazarr sqlite3 /config/db/bazarr.db ".backup '/config/db/backup.db'"
docker cp bazarr:/config/db/backup.db ./backups/bazarr_$(date +%Y%m%d).db
docker cp bazarr:/config/config.yaml ./backups/bazarr_config_$(date +%Y%m%d).yaml
```

**Restore Process**:
1. Stop Bazarr container
2. Restore config.yaml and bazarr.db to config directory
3. Ensure ownership: `chown -R 1000:1000 ./config/bazarr`
4. Start Bazarr container

### Monitoring & Alerting

**Health Indicators**:
- Container health check status (every 30s)
- API response times to Sonarr/Radarr
- Subtitle provider success rates
- Database size growth

**Log Monitoring**:
```bash
# Watch for errors
docker logs -f bazarr | grep -i error

# Monitor subtitle downloads
docker logs -f bazarr | grep -i "downloaded subtitle"

# Check API connection issues
docker logs -f bazarr | grep -i "connection"
```

**Alert Triggers**:
- Health check fails for >5 minutes
- API connection failures to Sonarr/Radarr
- Disk space <10% available
- Database corruption detected

### Configuration Overrides

**User Customization Support**:
- Manual config.yaml edits persist (not overwritten on restart)
- Additional subtitle providers can be added via Web UI
- Language profiles customizable per user preference
- Scoring thresholds adjustable if TRaSH defaults too strict

**Override Pattern**:
1. Let entrypoint create initial config.yaml
2. User modifies via Web UI or manual edit
3. Entrypoint detects existing config and preserves it
4. Only recreates if file deleted or corrupted

### Fallback Behavior

**If Bazarr Disabled**:
- Media playback unaffected (subtitles optional)
- Sonarr/Radarr continue normal operation
- Manual subtitle download remains option
- No cascade failures to other services

**Graceful Degradation**:
- If subtitle providers down: Queue downloads for retry
- If Sonarr/Radarr down: Bazarr waits and retries sync
- If API keys invalid: Clear error messages in logs
- If disk full: Stops downloads, alerts in logs

---

## Milestones / Timeline

### Phase 1: Foundation (Week 1)
**Goal**: Basic Bazarr integration with manual configuration
- [ ] Day 1-2: Create config.yaml.template with Sonarr/Radarr integration
- [ ] Day 3-4: Implement bazarr-entrypoint.sh with template processing
- [ ] Day 5: Add bazarr service to docker-compose.yml
- [ ] Day 6: Initial testing and debugging
- [ ] Day 7: Buffer for fixes

**Deliverable**: Bazarr starts and connects to Sonarr/Radarr

### Phase 2: Automation (Week 2)
**Goal**: Zero-touch configuration and validation
- [ ] Day 1-2: Implement environment variable substitution
- [ ] Day 3-4: Create validate-bazarr.sh script
- [ ] Day 5: Update .env.example and CLAUDE.md
- [ ] Day 6: Test with all torrent client variations
- [ ] Day 7: Test with all VPN provider variations

**Deliverable**: `docker compose up -d` fully configures Bazarr

### Phase 3: Hardening (Week 3)
**Goal**: Production-ready with error handling
- [ ] Day 1-2: Implement failure detection and self-healing
- [ ] Day 3-4: Add comprehensive logging and debugging
- [ ] Day 5: Performance testing with large libraries
- [ ] Day 6-7: Documentation and final validation

**Deliverable**: Battle-tested Bazarr integration

### Phase 4: Polish & Regression (Week 4)
**Goal**: Edge cases and long-term stability
- [ ] Day 1-2: Test container restarts and upgrades
- [ ] Day 3-4: Verify backup and restore procedures
- [ ] Day 5: Load testing with concurrent operations
- [ ] Day 6: Final regression testing across all scenarios
- [ ] Day 7: Code review and optimization

**Deliverable**: Production deployment ready

**Total Estimated Time**: 3-4 weeks (with buffer for discovery)

---

## Appendices / Extras

### Appendix A: Bazarr Docker Compose Snippet

```yaml
# Complete bazarr service definition for docker-compose.yml
# Position: After radarr service, before overseerr

bazarr:
  image: lscr.io/linuxserver/bazarr:latest
  container_name: ${CONTAINER_PREFIX}bazarr
  entrypoint: ["/scripts/bazarr-entrypoint.sh"]
  networks:
    - media_network  # NO vpn_network needed
  ports:
    - "${BAZARR_PORT:-6767}:6767"
  depends_on:
    init-directories:
      condition: service_completed_successfully
    sonarr:
      condition: service_healthy
    radarr:
      condition: service_healthy
  env_file:
    - .env
  environment:
    - PUID=1000
    - PGID=1000
    - TZ=${TZ:-America/New_York}
    - SONARR_API_KEY=${SONARR_API_KEY}
    - RADARR_API_KEY=${RADARR_API_KEY}
    - BAZARR_API_KEY=${BAZARR_API_KEY}
  volumes:
    - ./config/bazarr:/config
    - ./config/templates/bazarr:/templates:ro
    - ./scripts:/scripts:ro
    - ${MEDIA_ROOT:-./data/media}/tv:/tv
    - ${MEDIA_ROOT:-./data/media}/movies:/movies
  healthcheck:
    test: ["CMD-SHELL", "curl -f http://localhost:6767 || exit 1"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 60s
  restart: unless-stopped
  stop_grace_period: 30s
```

### Appendix B: Config.yaml Template Sample

```yaml
# config/templates/bazarr/config.yaml.template
# CRITICAL: Use sed for variable substitution, NOT envsubst (breaks YAML)

general:
  port: 6767
  base_url: ""
  enabled_providers: true
  auto_update: false

auth:
  type: None  # Start with no auth, configure via UI if needed
  
sonarr:
  - ip: sonarr  # Docker service name, NOT 127.0.0.1
    port: 8989
    base_url: ""
    ssl: false
    apikey: ${SONARR_API_KEY}
    full_update: Daily
    only_monitored: false
    series_sync: 60  # Minutes between syncs
    
radarr:
  - ip: radarr  # Docker service name, NOT 127.0.0.1
    port: 7878
    base_url: ""
    ssl: false
    apikey: ${RADARR_API_KEY}
    full_update: Daily
    only_monitored: false
    movies_sync: 60  # Minutes between syncs

settings:
  general:
    # TRaSH Guides recommended scoring
    minimum_score: 90  # Sonarr (TV)
    minimum_score_movie: 80  # Radarr (Movies)
    use_scene_name: true
    use_postprocessing: false
    
  # Subtitle storage alongside media files (TRaSH best practice)
  subfolder: "current"  # Means "alongside media file"
  subfolder_custom: ""
  
  # Auto-sync settings
  serie_perfect_subtitles: false
  movie_perfect_subtitles: false
  serie_score_threshold: 96  # TRaSH recommendation
  movie_score_threshold: 86  # TRaSH recommendation
  
  # Providers (start with basic config, customize via UI)
  enabled_providers: []  # Empty initially, configure via Web UI
```

### Appendix C: Known Failure Modes

1. **Config Timing Race Condition**
   - Symptom: Empty config.yaml or partial content
   - Cause: Bazarr creates file quickly but populates slowly
   - Solution: Health check start_period 60s+, validation retries

2. **Docker DNS Resolution Failure**
   - Symptom: "Cannot connect to sonarr" despite correct config
   - Cause: Container started before Docker DNS ready
   - Solution: depends_on with service_healthy conditions

3. **Path Mapping Confusion**
   - Symptom: "Path not accessible" errors in Bazarr
   - Cause: User configures path mapping when paths identical
   - Solution: Template has NO path mapping (paths match across stack)

4. **API Key Mismatch**
   - Symptom: "Unauthorized" errors from Sonarr/Radarr
   - Cause: API keys not synced or wrong key in template
   - Solution: Validation script tests API connectivity with keys

5. **Permission Cascade Failure**
   - Symptom: Subtitles download but can't be written
   - Cause: PUID/PGID wrong or media directory ownership issue
   - Solution: Hardcoded PUID/PGID 1000:1000, init-directories dependency

6. **Network Isolation Issues**
   - Symptom: Bazarr works initially, fails after VPN restart
   - Cause: Bazarr incorrectly added to vpn_network
   - Solution: media_network ONLY in docker-compose

### Appendix D: Integration Matrix

| Component | Sonarr API | Radarr API | Path Mapping | VPN Dependency |
|-----------|-----------|-----------|--------------|----------------|
| Bazarr | v3 ✓ | v3 ✓ | None (identical paths) | ✗ (media_network only) |
| qBittorrent | N/A | N/A | N/A | N/A (no interaction) |
| Transmission | N/A | N/A | N/A | N/A (no interaction) |
| Plex | Indirect (via files) | Indirect (via files) | None | ✗ |
| Jellyfin | Indirect (via files) | Indirect (via files) | None | ✗ |

### Appendix E: Environment Variables Reference

```bash
# Add to .env and .env.example

# Bazarr Configuration
BAZARR_PORT=6767                                    # Web UI port
BAZARR_API_KEY=                                     # Generated on first start or pre-set
BAZARR_URL=http://localhost:6767                    # Frontend URL
BAZARR_BACKEND_URL=http://bazarr:6767              # Backend URL (Docker DNS)

# Already exists (used by Bazarr):
SONARR_API_KEY=<existing>                           # Shared with Bazarr
RADARR_API_KEY=<existing>                           # Shared with Bazarr
MEDIA_ROOT=./data/media                             # TV and movies location
TZ=America/New_York                                 # Timezone
```

### Appendix F: Validation Script Output Example

```
=== Bazarr Validation Script ===
Bazarr: http://localhost:6767
Sonarr: http://sonarr:8989
Radarr: http://radarr:7878

🔍 Testing API Connectivity...
✅ Bazarr API is accessible (HTTP 200)
✅ Sonarr API is accessible (HTTP 200)
✅ Radarr API is accessible (HTTP 200)

📁 Testing Configuration...
✅ config.yaml exists
✅ config.yaml contains Sonarr configuration
✅ config.yaml contains Radarr configuration

🔗 Testing Sonarr Connection from Bazarr...
✅ Bazarr can reach Sonarr API
✅ API key is valid

🔗 Testing Radarr Connection from Bazarr...
✅ Bazarr can reach Radarr API
✅ API key is valid

📂 Testing Volume Mounts...
✅ /tv directory accessible
✅ /movies directory accessible

👤 Testing Permissions...
✅ PUID is 1000
✅ PGID is 1000

=== Validation Summary ===
✅ All validation tests passed!
✅ Bazarr is fully integrated and operational
✅ Ready for subtitle automation

🎉 Bazarr validation complete!
```

---

**END OF PRP**

**Confidence Score**: 9/10

**Rationale**: This PRP provides comprehensive implementation guidance with specific file patterns, proven integration methods from the codebase, extensive failure mode analysis, and detailed validation procedures. The one-pass implementation success likelihood is very high due to:
- Direct examples from working codebase patterns (Sonarr/Radarr entrypoints)
- Extensive research documentation with specific gotchas
- Clear anti-patterns to avoid
- Multi-layer validation approach
- Detailed contingency plans for known failure modes

**Remaining Risk**: Bazarr's undocumented API and config.yaml timing quirks may surface edge cases, but extensive mitigation strategies are provided.
