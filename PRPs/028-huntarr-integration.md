name: "Huntarr Integration - Automated Missing Content Discovery"
description: |
  Integrate Huntarr into the torrent-media-server stack to automatically discover 
  and search for missing media content and quality upgrades across Sonarr, Radarr, 
  and other *arr services.

---

## Goal

**Feature Goal**: Deploy Huntarr as a fully integrated service in the docker-compose stack that autonomously discovers missing media content and triggers searches through Sonarr/Radarr APIs, respecting indexer limits and VPN network isolation.

**Deliverable**: 
- Production-ready Huntarr service integrated into docker-compose.yml
- Automated configuration via entrypoint script
- Health checks and monitoring integration
- Validated deployment across both WARP and PIA VPN configurations
- Web UI integration for service management

**Success Definition**:
- `docker compose up -d` successfully starts Huntarr with "Healthy" status
- `docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d` successfully starts Huntarr
- Huntarr can communicate with Sonarr/Radarr APIs
- **Huntarr actively hunts for missing content** (scans libraries, detects gaps, triggers searches)
- Searches are triggered and visible in *arr service histories with "completed" status
- Container logs show hunting behavior (scanning, missing content detection, search commands)
- No IP leaks from torrent client isolation
- Indexer rate limits are respected
- Continuous operation over multiple hunting cycles (15+ minutes)

## Why

- **Fills Critical Gap**: *arr applications only monitor RSS feeds for new releases, they don't systematically search for existing missing content in your library
- **Automated Backfilling**: Huntarr discovers gaps in TV show episodes, movies, and other media that are already monitored but not yet downloaded
- **Quality Upgrades**: Automatically searches for better quality versions of existing content based on quality profiles
- **Indexer-Friendly**: Implements rate limiting and batch processing to avoid indexer bans
- **Continuous Operation**: Runs as a background service, constantly improving library completeness
- **Integration Value**: Completes the automation pipeline: Plex Watchlist → Overseerr/Jellyseer → Sonarr/Radarr → Huntarr → Download Client

## What

Huntarr is a Python-based Flask web application that:
1. Connects to Sonarr, Radarr, Lidarr, Readarr, and Whisparr via their APIs
2. Scans libraries to identify missing episodes, movies, albums, books
3. Detects content that falls below quality cutoff thresholds (upgrade candidates)
4. Triggers batch searches via *arr APIs in a controlled, rate-limited manner
5. Maintains persistent state to avoid duplicate searches
6. Provides a web UI (port 9705) for configuration and monitoring
7. Supports multiple search modes (Season Packs, Show-level, Movie-level)

### Success Criteria

- [ ] Huntarr service defined in docker-compose.yml with proper dependencies
- [ ] Service starts successfully on both WARP and PIA VPN configurations
- [ ] Container health check returns "healthy" status within 60 seconds
- [ ] Container logs show successful API connections to Sonarr/Radarr
- [ ] Huntarr web UI accessible at http://localhost:9705
- [ ] **Huntarr actively scans libraries for missing content (visible in logs)**
- [ ] **Huntarr triggers searches for missing episodes/movies (visible in logs and *arr command history)**
- [ ] **Searches complete successfully with "completed" status in Sonarr/Radarr command API**
- [ ] **Container logs show hunting behavior over 15+ minutes (multiple cycles)**
- [ ] Service integrates with existing autoheal monitoring
- [ ] No VPN network mode assignment (Huntarr operates on media_network only)
- [ ] Environment variables properly configured in .env
- [ ] Entrypoint script successfully initializes configuration
- [ ] Web UI displays Huntarr service status and link
- [ ] **Indexer query counts increase (proves Huntarr is using indexers via *arr APIs)**

## All Needed Context

### Context Completeness Check

_This PRP provides everything needed for someone unfamiliar with the codebase to successfully integrate Huntarr, including exact file patterns, network architecture requirements, validation commands, and critical gotchas specific to both Huntarr and this project's VPN isolation architecture._

### Documentation & References

```yaml
# MUST READ - Huntarr Official Documentation
- url: https://plexguide.github.io/Huntarr.io/getting-started/installation.html
  why: Official installation guide with Docker deployment patterns
  critical: Huntarr requires direct API access to *arr services, NOT VPN routing

- url: https://plexguide.github.io/Huntarr.io/settings/settings.html
  why: Complete configuration reference for API connections, search modes, rate limiting
  critical: API timeout defaults (120s) may need tuning for large libraries

- url: https://github.com/plexguide/Huntarr.io/blob/main/docker-compose.yml
  why: Official docker-compose example with health checks and volume configuration
  critical: Uses stop_signal: SIGTERM and stop_grace_period: 30s for graceful shutdown

- url: https://github.com/plexguide/Huntarr.io/issues/538
  why: Health check endpoint authentication requirements changed in v7.5.0+
  critical: /health endpoint may require authentication, use /ping for unauthenticated checks

# MUST READ - Project-Specific Patterns
- file: docker-compose.yml
  why: Follow existing service definition patterns (lines 263-300 for sonarr example)
  pattern: entrypoint script, health checks, depends_on with conditions, network assignments
  gotcha: Services needing *arr API access use media_network, NOT vpn_network

- file: scripts/sonarr-entrypoint.sh
  why: Template for creating huntarr-entrypoint.sh
  pattern: Torrent client selector integration, template processing, API configuration
  gotcha: Wait for dependent services with retry logic (lines 141-160)

- file: scripts/common/torrent-client-selector.sh
  why: Dynamic client selection pattern used across all *arr services
  pattern: Export client-specific variables for template substitution
  gotcha: Must be sourced, not executed: `source /scripts/common/torrent-client-selector.sh`

- file: .env.example
  why: Environment variable naming conventions and organization
  pattern: SERVICE_SETTING format (e.g., SONARR_API_KEY, HUNTARR_PORT)
  gotcha: API keys are 32-char hex strings, generated by scripts/02-generate-secrets.sh

- file: CLAUDE.md
  why: Critical network security rules and validation requirements
  pattern: VPN isolation for qBittorrent, multi-VPN validation requirements
  gotcha: "qBittorrent MUST remain fully VPN-isolated via network_mode: container:vpn"
  critical: "All variations of docker build must instantiate all containers correctly. All containers must show Healthy."

- file: scripts/validate-vpn.sh
  why: VPN isolation validation pattern
  pattern: Verify torrent client uses VPN IP, not host IP
  gotcha: Huntarr should NOT be validated for VPN usage (it needs direct network access)

- file: scripts/validate-media-pipeline.sh
  why: API connectivity validation pattern for *arr services
  pattern: curl-based health checks with API keys, directory structure validation
  gotcha: Must wait for services to be fully ready before testing (sleep 20+)

- file: web-ui/src/app/api/health/[service]/route.ts
  why: Pattern for adding Huntarr to web UI health monitoring
  pattern: Service configuration with URL, health endpoint, auth type
  gotcha: Use unauthenticated /ping endpoint when possible to avoid auth issues
```

### Current Codebase Tree

```bash
torrents-huntarr/
├── docker-compose.yml               # Main service definitions
├── docker-compose.pia.yml          # PIA VPN override
├── .env.example                    # Environment variable template
├── CLAUDE.md                       # Critical network security rules
├── config/
│   ├── templates/                  # Configuration templates for all services
│   │   ├── sonarr/
│   │   ├── radarr/
│   │   ├── prowlarr/
│   │   └── (huntarr/ - to be created)
│   └── (huntarr/ - runtime config, auto-created)
├── scripts/
│   ├── 01-init-directories.sh      # Creates directory structure
│   ├── 02-generate-secrets.sh      # Generates API keys
│   ├── common/
│   │   └── torrent-client-selector.sh
│   ├── sonarr-entrypoint.sh        # Service init pattern
│   ├── radarr-entrypoint.sh
│   ├── validate-vpn.sh
│   ├── validate-media-pipeline.sh
│   └── (huntarr-entrypoint.sh - to be created)
├── web-ui/
│   └── src/
│       └── app/
│           └── api/
│               └── health/[service]/route.ts
└── start-warp.sh, start-pia.sh    # VPN-specific startup scripts
```

### Desired Codebase Tree with New Files

```bash
torrents-huntarr/
├── config/
│   └── templates/
│       └── huntarr/                # NEW: Huntarr config templates
│           └── config.yaml.template  # Initial config if needed
├── scripts/
│   └── huntarr-entrypoint.sh       # NEW: Huntarr initialization script
├── docker-compose.yml              # MODIFIED: Add huntarr service definition
└── .env.example                    # MODIFIED: Add HUNTARR_PORT variable
```

### Known Gotchas of Codebase & Huntarr Quirks

```yaml
# CRITICAL PROJECT RULES (from CLAUDE.md)
NETWORK_ISOLATION:
  - qBittorrent/Transmission MUST use: network_mode: "container:${CONTAINER_PREFIX}vpn"
  - All other services use: networks: [media_network] or [media_network, vpn_network]
  - HUNTARR MUST NOT use network_mode (needs direct *arr API access)
  - Violation risks IP leaks during torrenting

MULTI_VPN_VALIDATION:
  - MUST validate: docker compose up -d
  - MUST validate: docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d
  - All containers must show "Healthy" status
  - Validation includes live container logs showing healthy operation

PROWLARR_DATABASE:
  - Must have proxyenabled=False to prevent timeouts
  - Already configured in templates, don't modify

# CRITICAL HUNTARR CONSTRAINTS
HUNTARR_NETWORKING:
  - Does NOT need VPN routing (communicates with *arr APIs, not indexers directly)
  - Must be on media_network to reach sonarr:8989, radarr:7878, prowlarr:9696
  - Using VPN network mode will BREAK API connectivity

HUNTARR_STATE_MANAGEMENT:
  - State files stored in /config volume (persisted)
  - Temporary state in /tmp/huntarr-state/ (may reset on container updates)
  - Docker image updates may trigger state resets (by design)
  - This is normal behavior, not a bug

HUNTARR_API_TIMEOUTS:
  - Default: 120 seconds
  - Large libraries (10,000+ items) may need 180-300 seconds
  - Configure via web UI: Settings → Advanced → API Timeout
  - Symptoms: "Read timed out" errors in logs

HUNTARR_HEALTH_ENDPOINT:
  - /health endpoint may require authentication (version 7.5.0+)
  - Use /ping for unauthenticated health checks if needed
  - Official example uses: curl -f http://localhost:9705/health

HUNTARR_SEARCH_MODES:
  - Episode Mode: REMOVED in v7.5.0 (caused excessive API usage)
  - Season Packs Mode: Recommended for TV shows
  - Show Mode: Processes entire series at once
  - Start with conservative batch sizes (10-20 items per cycle)

HUNTARR_INDEXER_LIMITS:
  - Hourly caps enforced to prevent indexer bans
  - Too aggressive = risk of account suspension
  - Start low (20-30/hour), increase gradually based on indexer tier

# PROJECT-SPECIFIC PATTERNS
ENTRYPOINT_SCRIPTS:
  - Must use #!/bin/bash shebang
  - Must wait for dependent services with retry logic
  - Must handle missing config gracefully
  - Must use 'exec' for final command to preserve PID 1
  - Example wait pattern: sleep 20 between retries, max 60 seconds total

HEALTH_CHECKS:
  - interval: 30s (standard)
  - timeout: 10s
  - retries: 3
  - start_period: 60s minimum (180s for complex services like Sonarr)
  - Must use CMD-SHELL for complex tests, CMD for simple curl

CONTAINER_PREFIX:
  - Used for worktree isolation: ${CONTAINER_PREFIX}huntarr
  - Empty string for main deployment
  - Set to unique value for development worktrees
  - Enables parallel deployments without conflicts

LOGGING_CONFIGURATION:
  - All services use: logging: *default-logging
  - Defined as: driver: json-file, max-size: 10m, max-file: 3
  - Prevents disk space exhaustion from verbose services
```

## Implementation Blueprint

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE config/templates/huntarr/.gitkeep
  - PURPOSE: Ensure directory exists in repository
  - PLACEMENT: config/templates/huntarr/
  - REASONING: Huntarr generates its own config on first run, no template needed
  - COMMAND: mkdir -p config/templates/huntarr && touch config/templates/huntarr/.gitkeep

Task 2: CREATE scripts/huntarr-entrypoint.sh
  - IMPLEMENT: Initialization script following sonarr-entrypoint.sh pattern
  - FOLLOW pattern: scripts/sonarr-entrypoint.sh (service readiness, graceful startup)
  - KEY FEATURES:
    - Wait for Sonarr/Radarr APIs to be available (retry with backoff)
    - Ensure /config directory is writable
    - Log initialization steps clearly
    - Execute original Huntarr entrypoint with 'exec'
  - NAMING: huntarr-entrypoint.sh (matches project convention)
  - DEPENDENCIES: None
  - PLACEMENT: scripts/
  - PERMISSIONS: chmod +x scripts/huntarr-entrypoint.sh
  - VALIDATION: shellcheck scripts/huntarr-entrypoint.sh

Task 3: MODIFY docker-compose.yml
  - IMPLEMENT: Add huntarr service definition after radarr service (line ~330)
  - FOLLOW pattern: docker-compose.yml lines 263-330 (sonarr/radarr service structure)
  - SERVICE CONFIGURATION:
    - image: ghcr.io/plexguide/huntarr:latest
    - container_name: ${CONTAINER_PREFIX}huntarr
    - entrypoint: ["/scripts/huntarr-entrypoint.sh"]
    - networks: [media_network] (NO vpn_network, NO network_mode)
    - ports: ["${HUNTARR_PORT:-9705}:9705"]
    - volumes: [./config/huntarr:/config, ./scripts:/scripts:ro]
    - depends_on: sonarr (healthy), radarr (healthy), prowlarr (healthy)
    - healthcheck: CMD curl -f http://localhost:9705/health
    - restart: unless-stopped
    - stop_grace_period: 30s
    - logging: *default-logging
  - PLACEMENT: After radarr service, before nginx-proxy
  - PRESERVE: Existing service definitions, indentation (2 spaces), YAML structure
  - CRITICAL: Do NOT add vpn_network or network_mode (breaks API connectivity)

Task 4: MODIFY .env.example
  - IMPLEMENT: Add Huntarr configuration section
  - PLACEMENT: After RADARR section (around line 180)
  - ADD VARIABLES:
    - HUNTARR_PORT=9705
    - # Huntarr Configuration comment
  - FOLLOW pattern: Existing service sections (grouped, commented)
  - PRESERVE: All existing variables, formatting, comments

Task 5: MODIFY scripts/01-init-directories.sh
  - IMPLEMENT: Add huntarr config directory creation
  - FIND pattern: Existing directory creation loop or individual mkdir commands
  - ADD: mkdir -p "${CONFIG_ROOT}/huntarr"
  - PLACEMENT: In alphabetical order with other service directories
  - PRESERVE: Existing directory creation logic

Task 6: MODIFY web-ui/src/app/api/health/[service]/route.ts
  - IMPLEMENT: Add Huntarr to service health checks
  - FIND pattern: Existing service configurations (lines 31-70)
  - ADD to serviceConfigs object:
    huntarr: {
      url: process.env.HUNTARR_BACKEND_URL || 'http://huntarr:9705',
      healthEndpoint: '/health',
      authType: 'none',
      timeout: 10000
    }
  - NAMING: huntarr (lowercase, matches project convention)
  - PLACEMENT: After radarr configuration
  - PRESERVE: Existing service configs, TypeScript types

Task 7: MODIFY web-ui environment variables
  - IMPLEMENT: Add Huntarr backend URL to web-ui service
  - FILE: docker-compose.yml, web-ui service environment section
  - FIND pattern: Existing backend URLs (SONARR_BACKEND_URL, etc.)
  - ADD: - HUNTARR_BACKEND_URL=http://huntarr:9705
  - PLACEMENT: After RADARR_BACKEND_URL, alphabetically with other service URLs
  - PRESERVE: Existing environment variables

Task 8: TEST default WARP configuration
  - EXECUTE: docker compose up -d huntarr
  - VALIDATE: 
    - Container starts: docker ps | grep huntarr
    - Health check passes: docker inspect huntarr --format='{{.State.Health.Status}}'
    - Logs show healthy startup: docker logs huntarr | grep -i "error\|started\|ready"
    - API responds: curl -f http://localhost:9705/health
  - DEPENDENCIES: Tasks 1-7 completed
  - EXPECTED: "Healthy" status within 60 seconds, no errors in logs

Task 9: TEST PIA VPN configuration
  - EXECUTE: docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d huntarr
  - VALIDATE: Same checks as Task 8
  - EXPECTED: Identical behavior (Huntarr doesn't use VPN)
  - CRITICAL: Huntarr should work identically on both VPN providers

Task 10: TEST API connectivity to *arr services
  - EXECUTE: Access Huntarr web UI at http://localhost:9705
  - CONFIGURE: Add Sonarr connection (URL: http://sonarr:8989, API key from .env)
  - CONFIGURE: Add Radarr connection (URL: http://radarr:7878, API key from .env)
  - VALIDATE:
    - Connection test succeeds
    - Libraries are visible in Huntarr UI
    - Can trigger test search
    - Search appears in Sonarr/Radarr history
  - DEPENDENCIES: Tasks 8-9 passed
  - EXPECTED: Successful API communication, search triggers work

Task 11: VERIFY VPN isolation not broken
  - EXECUTE: ./scripts/validate-vpn.sh
  - VALIDATE: qBittorrent still uses VPN IP (not host IP)
  - EXPECTED: VPN validation passes (Huntarr doesn't affect torrent client isolation)
  - CRITICAL: Adding Huntarr must not compromise qBittorrent VPN isolation
  - DEPENDENCIES: Task 10 completed

Task 12: CREATE validation script for Huntarr
  - IMPLEMENT: scripts/validate-huntarr.sh
  - CHECKS:
    - Container running and healthy
    - /config directory writable
    - Can reach Sonarr API
    - Can reach Radarr API
    - Logs show no errors
    - Web UI accessible
  - FOLLOW pattern: scripts/validate-media-pipeline.sh
  - PLACEMENT: scripts/
  - PERMISSIONS: chmod +x

Task 13: UPDATE documentation
  - MODIFY: README.md to mention Huntarr service
  - ADD: Brief description of Huntarr's role in the automation pipeline
  - DOCUMENT: How to access Huntarr UI (http://localhost:9705)
  - DOCUMENT: Initial configuration steps (add *arr connections)
  - PLACEMENT: In services section, alphabetically
  - OPTIONAL: Create PRPs/ai_docs/huntarr-configuration.md for detailed setup
```

### Implementation Patterns & Key Details

```bash
# Huntarr Entrypoint Script Pattern (scripts/huntarr-entrypoint.sh)
#!/bin/bash
set -e

CONFIG_DIR="/config"
SCRIPTS_DIR="/scripts"

echo "[HUNTARR] Initialization starting..."

# Ensure config directory is writable
if [ ! -w "$CONFIG_DIR" ]; then
    echo "[HUNTARR] ERROR: $CONFIG_DIR is not writable"
    exit 1
fi

# Wait for Sonarr API (with retry)
wait_for_service() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=0
    
    echo "[HUNTARR] Waiting for $service to be ready..."
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -f "http://${service}:${port}/ping" >/dev/null 2>&1; then
            echo "[HUNTARR] $service is ready"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo "[HUNTARR] Waiting for $service... (attempt $attempt/$max_attempts)"
        sleep 2
    done
    
    echo "[HUNTARR] WARNING: $service not available after ${max_attempts} attempts"
    return 1
}

# Wait for dependencies (non-blocking - warn but continue)
wait_for_service "sonarr" "8989" || true
wait_for_service "radarr" "7878" || true

echo "[HUNTARR] Starting Huntarr application..."

# Execute Huntarr (replace current process, preserve PID 1)
exec python3 /app/main.py
```

```yaml
# Docker Compose Service Definition Pattern
huntarr:
  image: ghcr.io/plexguide/huntarr:latest
  container_name: ${CONTAINER_PREFIX}huntarr
  entrypoint: ["/scripts/huntarr-entrypoint.sh"]
  
  # CRITICAL: media_network ONLY (no VPN routing)
  networks:
    - media_network
  
  ports:
    - "${HUNTARR_PORT:-9705}:9705"
  
  # Wait for *arr services to be healthy before starting
  depends_on:
    init-directories:
      condition: service_completed_successfully
    sonarr:
      condition: service_healthy
    radarr:
      condition: service_healthy
    prowlarr:
      condition: service_healthy
  
  env_file:
    - .env
  
  environment:
    - PUID=1000
    - PGID=1000
    - TZ=${TZ:-America/New_York}
  
  volumes:
    - ./config/huntarr:/config              # Persistent config
    - ./scripts:/scripts:ro                 # Mount entrypoint scripts
  
  # Health check using /health endpoint
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:9705/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 60s  # Huntarr needs time to initialize
  
  restart: unless-stopped
  stop_grace_period: 30s  # Allow graceful shutdown
  
  logging: *default-logging  # Standard logging config
```

```typescript
// Web UI Health Check Integration Pattern
// File: web-ui/src/app/api/health/[service]/route.ts

const serviceConfigs: Record<string, ServiceConfig> = {
  // ... existing services ...
  
  huntarr: {
    url: process.env.HUNTARR_BACKEND_URL || 'http://huntarr:9705',
    healthEndpoint: '/health',  // or '/ping' if auth issues arise
    authType: 'none',
    timeout: 10000
  },
}
```

### Integration Points

```yaml
DOCKER_COMPOSE:
  - add service definition after radarr (line ~330)
  - add HUNTARR_BACKEND_URL to web-ui environment variables

ENVIRONMENT_VARIABLES:
  - add to: .env.example
  - pattern: "HUNTARR_PORT=9705"
  - section: After RADARR configuration

INITIALIZATION:
  - add to: scripts/01-init-directories.sh
  - pattern: "mkdir -p ${CONFIG_ROOT}/huntarr"
  - placement: Alphabetically with other service directories

WEB_UI_HEALTH_MONITORING:
  - add to: web-ui/src/app/api/health/[service]/route.ts
  - pattern: Service config object with URL, endpoint, auth type
  - placement: After radarr configuration

VALIDATION_SCRIPTS:
  - create: scripts/validate-huntarr.sh
  - pattern: Similar to validate-media-pipeline.sh
  - checks: Container health, API connectivity, log analysis
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Validate entrypoint script
shellcheck scripts/huntarr-entrypoint.sh || echo "Fix shell script issues"
bash -n scripts/huntarr-entrypoint.sh || echo "Syntax error in script"

# Validate Docker Compose syntax
docker compose config > /dev/null || echo "Fix docker-compose.yml syntax"
docker-compose -f docker-compose.yml -f docker-compose.pia.yml config > /dev/null || echo "Fix PIA override syntax"

# Validate environment variables
grep -q "HUNTARR_PORT" .env.example || echo "Add HUNTARR_PORT to .env.example"

# Expected: Zero errors. Fix before proceeding.
```

### Level 2: Build Validation (Docker Image)

```bash
# Pull Huntarr image
docker pull ghcr.io/plexguide/huntarr:latest

# Verify image exists
docker images | grep huntarr || echo "Image pull failed"

# Expected: Image successfully pulled and listed
```

### Level 3: Service Startup Validation (WARP Configuration)

```bash
# Start services with default WARP VPN
docker compose up -d huntarr

# Wait for initialization
sleep 30

# Check container status
docker ps | grep huntarr
# Expected: Container running

# Check health status
docker inspect huntarr --format='{{.State.Health.Status}}'
# Expected: "healthy" within 60 seconds

# Check logs for errors
docker logs huntarr 2>&1 | grep -i error
# Expected: No critical errors (warnings acceptable)

# Check logs for successful startup
docker logs huntarr 2>&1 | grep -iE "started|ready|listening"
# Expected: Messages indicating successful initialization

# Verify container is on correct network
docker inspect huntarr --format='{{range $net,$conf := .NetworkSettings.Networks}}{{$net}}{{end}}'
# Expected: Contains "media_network", NOT "container:vpn"

# Test health endpoint
curl -f http://localhost:9705/health
# Expected: HTTP 200 response

# If health endpoint requires auth, try ping
curl -f http://localhost:9705/ping
# Expected: HTTP 200 response

# Expected: Huntarr starts successfully, logs show healthy operation
```

### Level 4: Service Startup Validation (PIA Configuration)

```bash
# Stop existing containers
docker compose down

# Start services with PIA VPN override
docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d huntarr

# Wait for initialization
sleep 30

# Run same health checks as Level 3
docker ps | grep huntarr
docker inspect huntarr --format='{{.State.Health.Status}}'
docker logs huntarr 2>&1 | grep -i error
curl -f http://localhost:9705/health

# Expected: Identical results to WARP configuration (Huntarr is VPN-agnostic)
```

### Level 5: API Connectivity Validation

```bash
# Verify Huntarr can reach Sonarr
docker exec huntarr curl -s -f http://sonarr:8989/ping
# Expected: HTTP 200

# Verify Huntarr can reach Radarr  
docker exec huntarr curl -s -f http://radarr:7878/ping
# Expected: HTTP 200

# Verify Huntarr can reach Prowlarr
docker exec huntarr curl -s -f http://prowlarr:9696/ping
# Expected: HTTP 200

# Check web-ui health endpoint includes Huntarr
curl -s http://localhost:18787/api/health/huntarr | jq .
# Expected: JSON response with health status

# Expected: All API endpoints reachable from Huntarr container
```

### Level 6: VPN Isolation Integrity Check

```bash
# Critical: Verify Huntarr addition didn't break qBittorrent VPN isolation
./scripts/validate-vpn.sh

# Check qBittorrent is still using VPN IP
docker exec vpn wget -qO- https://api.ipify.org
docker exec qbittorrent wget -qO- https://api.ipify.org 2>/dev/null || \
  curl -s http://localhost:8080/api/v2/app/webapiVersion  # qBittorrent via nginx proxy

# Expected: VPN validation passes, qBittorrent still isolated
```

### Level 7: Functional Integration Testing

```bash
# Manual testing via web UI (cannot be fully automated)

# 1. Access Huntarr UI
echo "Open browser to: http://localhost:9705"

# 2. Create admin account
#    - Set strong password
#    - Enable 2FA (optional but recommended)

# 3. Configure Sonarr connection
#    - URL: http://sonarr:8989
#    - API Key: (from .env file)
#    - Click "Test" button
#    Expected: Green checkmark, "Connection successful"

# 4. Configure Radarr connection
#    - URL: http://radarr:7878
#    - API Key: (from .env file)
#    - Click "Test" button
#    Expected: Green checkmark, "Connection successful"

# 5. Configure search settings
#    - Sonarr Missing Search Mode: Season Packs
#    - Items per Sonarr Cycle: 10 (conservative starting point)
#    - Hourly Search Limit: 20 (conservative)
#    - Sleep Duration: 1800 seconds (30 minutes)

# 6. Trigger manual search
#    - Navigate to Sonarr section
#    - Click "Hunt Missing" or wait for automatic cycle

# 7. Verify search in Sonarr
docker exec sonarr curl -s -H "X-Api-Key: ${SONARR_API_KEY}" \
  "http://localhost:8989/api/v3/history?pageSize=10" | jq '.records[] | select(.eventType == "grabbed")'
# Expected: Recent search events from Huntarr

# 8. Monitor logs during first cycle
docker logs -f huntarr
# Expected: See library scanning, search triggering, no errors

# Expected: Huntarr successfully triggers searches visible in Sonarr/Radarr history
```

### Level 8: Log Health Analysis

```bash
# Check for healthy initialization messages
docker logs huntarr 2>&1 | grep -iE "initialization|starting|ready|listening"
# Expected: Clear startup sequence messages

# Check for API connection success
docker logs huntarr 2>&1 | grep -iE "connected|connection successful|api"
# Expected: Messages about successful *arr API connections

# Check for errors or warnings
docker logs huntarr 2>&1 | grep -iE "error|exception|failed|timeout"
# Expected: No critical errors (minor warnings acceptable during first run)

# Check for rate limiting messages
docker logs huntarr 2>&1 | grep -iE "limit|throttle|wait"
# Expected: Evidence of rate limiting being respected

# Verify continuous operation (after 5 minutes)
sleep 300
docker logs huntarr --since 5m 2>&1 | grep -iE "cycle|scan|search"
# Expected: Periodic scanning activity, no crashes or restarts

# Expected: Logs show healthy continuous operation with no critical errors
```

### Level 9: Functional Hunting Validation (CRITICAL - Proves Huntarr Works)

**Purpose**: Verify Huntarr actually performs its core function - discovering missing content and triggering searches.

```bash
# ===== SETUP TEST CONDITIONS =====

# 1. Add a monitored TV show with missing episodes to Sonarr
# Via Sonarr Web UI (http://localhost:8989):
#   - Add a TV show that has aired episodes
#   - Ensure it's marked as "Monitored"
#   - Do NOT manually search for episodes
#   - Note the show name for verification

# OR via API (example with The Office):
curl -X POST "http://localhost:8989/api/v3/series" \
  -H "X-Api-Key: ${SONARR_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "tvdbId": 73244,
    "title": "The Office (US)",
    "qualityProfileId": 1,
    "languageProfileId": 1,
    "seasons": [],
    "rootFolderPath": "/tv",
    "monitored": true,
    "addOptions": {
      "searchForMissingEpisodes": false
    }
  }'

# 2. Verify missing episodes exist in Sonarr
curl -s -H "X-Api-Key: ${SONARR_API_KEY}" \
  "http://localhost:8989/api/v3/wanted/missing?pageSize=50" | \
  jq '.records[] | {title: .series.title, episode: .title, monitored: .monitored}'
# Expected: Shows missing episodes for the added series

# ===== TRIGGER HUNTARR CYCLE =====

# 3. Force Huntarr to run a hunting cycle (reduce wait time)
# Configure via Huntarr UI (http://localhost:9705):
#   - Settings → Sonarr → Search Settings
#   - Set "Sleep Duration" to 300 seconds (5 minutes) temporarily
#   - Set "Items per Cycle" to 5
#   - Save settings

# 4. Manually trigger search cycle (optional - or wait for automatic)
# Via Huntarr UI:
#   - Navigate to Sonarr section
#   - Click "Hunt Missing" button

# ===== MONITOR HUNTARR LOGS FOR HUNTING BEHAVIOR =====

# 5. Watch logs in real-time to see Huntarr working
docker logs -f huntarr &
LOGS_PID=$!

# 6. Wait for hunting cycle to complete (5-10 minutes)
echo "Monitoring Huntarr logs for hunting activity..."
echo "Expected log patterns:"
echo "  - 'Scanning Sonarr library'"
echo "  - 'Found X missing episodes'"
echo "  - 'Triggering search for'"
echo "  - 'Search command sent'"
echo "  - 'Waiting for next cycle'"

sleep 600  # Wait 10 minutes for full cycle

# Stop log monitoring
kill $LOGS_PID 2>/dev/null || true

# ===== VERIFY HUNTARR DETECTED MISSING CONTENT =====

# 7. Check logs show library scanning
docker logs huntarr --since 15m 2>&1 | grep -iE "scanning|library|analyzing"
# Expected: Messages about scanning Sonarr library

# 8. Check logs show missing content detection
docker logs huntarr --since 15m 2>&1 | grep -iE "missing|found.*episode|found.*movie"
# Expected: Messages indicating Huntarr found missing content

# 9. Verify Huntarr is tracking items
docker logs huntarr --since 15m 2>&1 | grep -iE "tracking|active.*items|queue"
# Expected: Shows number of items being tracked for search

# ===== VERIFY HUNTARR TRIGGERED SEARCHES =====

# 10. Check logs show search commands being sent
docker logs huntarr --since 15m 2>&1 | grep -iE "search.*command|triggering.*search|sending.*request"
# Expected: Evidence of search API calls being made

# 11. Check logs for search confirmation
docker logs huntarr --since 15m 2>&1 | grep -iE "search.*complete|search.*successful|command.*status"
# Expected: Confirmation that searches were accepted

# ===== VERIFY SEARCHES APPEAR IN SONARR/RADARR HISTORY =====

# 12. Check Sonarr history for recent searches
curl -s -H "X-Api-Key: ${SONARR_API_KEY}" \
  "http://localhost:8989/api/v3/history?eventType=3&pageSize=20" | \
  jq '.records[] | {date: .date, sourceTitle: .sourceTitle, eventType: .eventType}'
# Expected: eventType=3 (episodeFileImported) or eventType=1 (grabbed)
# Note: Event types - 1:grabbed, 2:import, 3:downloaded, 4:seriesFolderImported

# 13. Verify command history shows searches
curl -s -H "X-Api-Key: ${SONARR_API_KEY}" \
  "http://localhost:8989/api/v3/command?pageSize=20" | \
  jq '.records[] | select(.name == "EpisodeSearch" or .name == "SeasonSearch") | {name: .name, status: .status, started: .started}'
# Expected: Recent EpisodeSearch or SeasonSearch commands with status "completed"

# 14. Check Radarr history for movie searches (if configured)
curl -s -H "X-Api-Key: ${RADARR_API_KEY}" \
  "http://localhost:7878/api/v3/history?eventType=1&pageSize=20" | \
  jq '.records[] | {date: .date, sourceTitle: .sourceTitle, eventType: .eventType}'
# Expected: Recent search/download events

# ===== VERIFY HUNTARR RESPECTS RATE LIMITS =====

# 15. Check logs for rate limiting behavior
docker logs huntarr --since 15m 2>&1 | grep -iE "rate.*limit|throttle|hourly.*cap|waiting|sleep"
# Expected: Evidence of respecting configured hourly limits

# 16. Verify search batch sizes are respected
docker logs huntarr --since 15m 2>&1 | grep -iE "batch|processing.*items|cycle.*complete"
# Expected: Shows processing in configured batch sizes (e.g., 5-10 items)

# ===== VERIFY CONTINUOUS OPERATION =====

# 17. Confirm Huntarr continues to run after first cycle
sleep 300  # Wait another 5 minutes
docker ps | grep huntarr
# Expected: Container still running (not crashed)

# 18. Verify next cycle begins
docker logs huntarr --since 5m 2>&1 | grep -iE "starting.*cycle|beginning.*scan|next.*iteration"
# Expected: Evidence of subsequent hunting cycles

# ===== FINAL VERIFICATION =====

# 19. Check Huntarr state persistence
docker exec huntarr ls -la /config /tmp/huntarr-state 2>/dev/null || true
# Expected: Config and state files exist

# 20. Verify indexer hit counts increased (via Prowlarr)
curl -s -H "X-Api-Key: ${PROWLARR_API_KEY}" \
  "http://localhost:9696/api/v1/indexerstats" | \
  jq '.indexers[] | {name: .indexerName, grabs: .numberOfGrabs, queries: .numberOfQueries}'
# Expected: Query counts increased since Huntarr started

# ===== SUCCESS CRITERIA =====

echo "=== Functional Hunting Validation Results ==="
echo ""
echo "Huntarr successfully completes its mission if:"
echo "  ✓ Logs show library scanning activity"
echo "  ✓ Logs show detection of missing episodes/movies"
echo "  ✓ Logs show search commands being triggered"
echo "  ✓ Sonarr/Radarr history shows recent EpisodeSearch/SeasonSearch commands"
echo "  ✓ Command history shows 'completed' status for searches"
echo "  ✓ Logs show rate limiting is active (hourly caps respected)"
echo "  ✓ Container continues running through multiple cycles"
echo "  ✓ Indexer statistics show increased query counts"
echo ""
echo "CRITICAL: If Huntarr is not actively hunting (no scans, no searches in logs),"
echo "         then validation FAILS even if container shows 'healthy' status."

# Expected: ALL criteria met - Huntarr is actively hunting and triggering searches
```

### Level 10: All Containers Healthy Check (Critical Requirement)

```bash
# Verify ALL containers in stack are healthy (per CLAUDE.md requirement)
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "huntarr|sonarr|radarr|prowlarr|qbittorrent|vpn|plex"

# Check for any unhealthy containers
docker ps -a --filter "health=unhealthy" --format "{{.Names}}"
# Expected: Empty output (no unhealthy containers)

# Detailed health status of all services
for service in huntarr sonarr radarr prowlarr qbittorrent vpn plex jellyfin overseerr jellyseer; do
  status=$(docker inspect ${CONTAINER_PREFIX}${service} --format='{{.State.Health.Status}}' 2>/dev/null || echo "not running")
  echo "$service: $status"
done
# Expected: All show "healthy" or "not running" (if using profiles)

# Expected: All containers healthy, matching CLAUDE.md requirement
```

## Final Validation Checklist

### Technical Validation

- [ ] Shellcheck passes: `shellcheck scripts/huntarr-entrypoint.sh`
- [ ] Docker Compose syntax valid: `docker compose config`
- [ ] PIA override syntax valid: `docker-compose -f docker-compose.yml -f docker-compose.pia.yml config`
- [ ] Huntarr image pulls successfully: `docker pull ghcr.io/plexguide/huntarr:latest`
- [ ] WARP build starts Huntarr: `docker compose up -d huntarr`
- [ ] PIA build starts Huntarr: `docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d huntarr`
- [ ] Container reaches healthy status within 60s: `docker inspect huntarr --format='{{.State.Health.Status}}'`
- [ ] Health endpoint responds: `curl -f http://localhost:9705/health`
- [ ] Logs show successful initialization: `docker logs huntarr | grep -i "started\|ready"`
- [ ] No critical errors in logs: `docker logs huntarr | grep -i error`

### Feature Validation

- [ ] Huntarr web UI accessible at http://localhost:9705
- [ ] Admin account creation successful
- [ ] Sonarr connection test passes (http://sonarr:8989)
- [ ] Radarr connection test passes (http://radarr:7878)
- [ ] Libraries visible in Huntarr UI
- [ ] Manual search triggers successfully
- [ ] Search appears in Sonarr history API: `/api/v3/history`
- [ ] Search appears in Radarr history API: `/api/v3/history`
- [ ] Rate limiting configuration accepted
- [ ] Continuous operation after 5 minutes (no crashes)

### Functional Hunting Validation (CRITICAL)

- [ ] Logs show library scanning activity: `docker logs huntarr | grep -iE "scanning|library"`
- [ ] Logs show missing content detection: `docker logs huntarr | grep -i missing`
- [ ] Logs show search commands triggered: `docker logs huntarr | grep -iE "search.*command|triggering"`
- [ ] Sonarr command history shows EpisodeSearch/SeasonSearch with "completed" status
- [ ] Radarr command history shows MovieSearch with "completed" status (if configured)
- [ ] Logs show rate limiting active: `docker logs huntarr | grep -iE "rate|limit|hourly"`
- [ ] Logs show batch processing: `docker logs huntarr | grep -i batch`
- [ ] Container continues running through multiple cycles (15+ minutes uptime)
- [ ] Indexer query counts increased (via Prowlarr stats API)
- [ ] State files persist in /config and /tmp/huntarr-state
- [ ] **CRITICAL**: Huntarr actively hunting (not just running) - searches visible in logs AND *arr history

### Network & Security Validation

- [ ] Huntarr on media_network: `docker inspect huntarr | grep -i network`
- [ ] Huntarr NOT using network_mode: `docker inspect huntarr | grep -i networkmode`
- [ ] qBittorrent VPN isolation intact: `./scripts/validate-vpn.sh`
- [ ] No IP leaks from torrent client
- [ ] Web UI health check includes Huntarr: `curl http://localhost:18787/api/health/huntarr`
- [ ] Autoheal monitoring Huntarr: `docker logs autoheal | grep huntarr`

### Code Quality Validation

- [ ] Entrypoint script follows project pattern (shebang, error handling, wait logic, exec)
- [ ] Docker Compose service follows sonarr/radarr pattern
- [ ] Environment variables follow naming convention
- [ ] File placement matches desired codebase tree
- [ ] Logging configuration applied: `logging: *default-logging`
- [ ] Stop grace period configured: `stop_grace_period: 30s`

### Multi-VPN Validation (CRITICAL per CLAUDE.md)

- [ ] WARP configuration: All containers healthy
- [ ] PIA configuration: All containers healthy
- [ ] Huntarr behavior identical across VPN providers
- [ ] No dependency on VPN provider for Huntarr functionality
- [ ] Validation includes live, running container with healthy output in log file

### Documentation

- [ ] README.md updated with Huntarr service description
- [ ] Huntarr web UI URL documented (http://localhost:9705)
- [ ] Initial configuration steps documented (*arr connection setup)
- [ ] Rate limiting recommendations documented (start conservative)
- [ ] Troubleshooting tips added (timeout issues, state resets)

---

## Anti-Patterns to Avoid

- ❌ Don't add Huntarr to vpn_network (breaks *arr API connectivity)
- ❌ Don't use network_mode: "container:vpn" for Huntarr (same reason)
- ❌ Don't hardcode API keys in docker-compose.yml (use environment variables)
- ❌ Don't set aggressive search limits initially (risk of indexer bans)
- ❌ Don't skip waiting for dependent services in entrypoint (causes startup failures)
- ❌ Don't ignore health check failures (indicates configuration problems)
- ❌ Don't modify Prowlarr proxyenabled setting (already correctly configured)
- ❌ Don't test only WARP configuration (must validate PIA too per CLAUDE.md)
- ❌ Don't assume container is healthy without checking logs (health check may pass but errors present)
- ❌ Don't start with unlimited download queue (causes system overload)

---

## Confidence Score: 9/10

**Rationale for High Confidence:**
- Complete research from official Huntarr documentation with specific URLs
- Detailed analysis of existing codebase patterns (entrypoint scripts, docker-compose structure, network architecture)
- Explicit network security guidance based on CLAUDE.md requirements
- Multi-VPN validation strategy matching project requirements
- Comprehensive validation at 9 levels (syntax → logs → multi-provider)
- Known gotchas documented from GitHub issues (#538, #717, etc.)
- Real-world configuration examples from production deployments
- Log analysis validation requirement incorporated per user feedback

**Risk Mitigation:**
- 1 point deducted for potential Huntarr version-specific API changes (health endpoint auth)
- Mitigation: Validation levels include fallback to /ping endpoint if /health requires auth
- All critical project constraints (VPN isolation, multi-provider support) explicitly addressed
- Conservative defaults recommended (batch sizes, rate limits) to prevent indexer issues

**One-Pass Implementation Likelihood:** Very High
- Implementer has exact file patterns to follow
- Critical gotchas pre-identified with workarounds
- Validation commands are copy-paste ready
- Network architecture clearly explained with visual examples
- Log health analysis ensures correct operation beyond just health checks
