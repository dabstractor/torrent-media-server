name: "Add Watchlistarr Service Integration"
description: |

---

## Goal

**Feature Goal**: Integrate nylonee's watchlistarr service to automatically sync Plex watchlists with Sonarr (TV shows) and Radarr (movies) in real-time, with full delete sync enabled by default.

**Deliverable**: Complete watchlistarr service integrated into docker-compose stack with automated configuration, API key management, and seamless first-run setup.

**Success Definition**: Users running `docker compose up -d` for the first time automatically get fully configured watchlistarr that syncs Plex watchlists to Sonarr/Radarr with bidirectional delete sync enabled.

## User Persona

**Target User**: Docker users setting up automated media acquisition stack

**Use Case**: User adds movies/TV shows to Plex watchlist and wants them automatically downloaded via Sonarr/Radarr without manual intervention

**User Journey**:
1. User adds content to Plex watchlist
2. Watchlistarr detects the addition within 60 seconds
3. Content automatically appears in Sonarr (TV) or Radarr (movies) for download
4. When user removes from Plex watchlist, content is automatically removed from Sonarr/Radarr

**Pain Points Addressed**:
- Manual content addition to Sonarr/Radarr
- Keeping watchlist and download queues in sync
- Managing content across multiple services

## Why

- Automates the media acquisition workflow from Plex discovery to download management
- Eliminates manual content management across multiple services
- Provides bidirectional sync to keep systems clean and organized
- Integrates seamlessly with existing security-focused architecture

## What

Real-time synchronization service that:
- Monitors Plex watchlists every 60 seconds
- Routes TV shows to Sonarr, movies to Radarr
- Supports multiple Plex users/friends
- Enables full delete sync by default (removes content from Sonarr/Radarr when removed from watchlist)
- Auto-configures on first run with existing service APIs

### Success Criteria

- [ ] Watchlistarr service starts successfully with `docker compose up -d`
- [ ] Service auto-discovers and configures Sonarr/Radarr/Plex APIs without manual intervention
- [ ] Adding content to Plex watchlist triggers automatic addition to appropriate service within 60 seconds
- [ ] Removing content from Plex watchlist triggers automatic removal from Sonarr/Radarr within 7 days
- [ ] All VPN configurations (default Cloudflare WARP and PIA override) work correctly
- [ ] Service health checks pass consistently
- [ ] No API configuration required by end user

## All Needed Context

### Context Completeness Check

_This PRP provides complete context for someone unfamiliar with the codebase to successfully implement watchlistarr integration following established patterns._

### Documentation & References

```yaml
- url: https://github.com/nylonee/watchlistarr
  why: Main repository with complete implementation details and Docker configuration
  critical: Service behavior, API requirements, configuration options

- url: https://raw.githubusercontent.com/nylonee/watchlistarr/refs/heads/main/CONFIGURATION.md
  why: Complete configuration documentation with all available options
  critical: Environment variables, YAML configuration structure, API integration requirements

- file: docker-compose.yml
  why: Main service definition patterns and network configuration
  pattern: Service definition structure, network assignment, dependency management
  gotcha: VPN network isolation must be preserved, media_network for communication

- file: config/templates/sonarr/config.xml.template
  why: API key injection and service configuration patterns
  pattern: Environment variable substitution using ${VAR} syntax
  gotcha: XML template structure must be preserved for service startup

- file: scripts/sonarr-entrypoint.sh
  why: Multi-stage initialization pattern and background API configuration
  pattern: Template restoration, background automation, service startup sequence
  gotcha: Background scripts must run after service API is available

- file: config/nginx/nginx.conf
  why: Reverse proxy configuration for new service access
  pattern: Server block structure, header preservation, health check endpoints
  gotcha: All API headers must be passed through for authentication

- file: .env.example
  why: Environment variable patterns and secret management
  pattern: Service-specific prefixes, API key generation, network configuration
  gotcha: All services use pre-generated API keys for automated configuration

- file: scripts/02-generate-secrets.sh
  why: API key generation and distribution pattern
  pattern: Secure random hex generation, environment variable export
  gotcha: Keys must be available before service entrypoint scripts run
```

### Current Codebase Tree (relevant sections)

```bash
torrents-watchlistarr/
├── docker-compose.yml                    # Main service definitions
├── docker-compose.pia.yml               # VPN provider override
├── .env.example                         # Environment variables template
├── config/
│   ├── templates/
│   │   ├── prowlarr/
│   │   │   ├── config.xml.template      # Service configuration pattern
│   │   │   └── prowlarr.db.template     # Pre-configured database
│   │   ├── sonarr/config.xml.template   # API key injection pattern
│   │   └── radarr/config.xml.template   # Service configuration
│   └── nginx/nginx.conf                 # Reverse proxy configuration
├── scripts/
│   ├── 02-generate-secrets.sh           # API key generation
│   ├── sonarr-entrypoint.sh            # Multi-stage initialization pattern
│   ├── radarr-entrypoint.sh            # Background configuration pattern
│   └── configure-download-handling.sh   # API automation scripts
└── web-ui/                             # React dashboard
    └── src/components/                  # Health check patterns
```

### Desired Codebase Tree with Watchlistarr Integration

```bash
torrents-watchlistarr/
├── docker-compose.yml                    # + watchlistarr service definition
├── .env.example                         # + PLEX_TOKEN and watchlistarr config
├── config/
│   ├── templates/
│   │   └── watchlistarr/
│   │       └── config.yaml.template     # Pre-configured YAML with delete sync enabled
│   └── nginx/nginx.conf                 # + watchlistarr proxy block (if web interface needed)
├── scripts/
│   ├── 02-generate-secrets.sh           # + PLEX_TOKEN handling (no generation needed)
│   └── watchlistarr-entrypoint.sh       # NEW: Configuration automation script
└── web-ui/src/components/
    └── services/                        # + Watchlistarr health check component
```

### Known Gotchas of Codebase & Library Quirks

```yaml
# CRITICAL: VPN network isolation must be preserved
# qBittorrent MUST remain fully VPN-isolated via network_mode: "container:vpn"
# Watchlistarr uses media_network for communication with Sonarr/Radarr/Plex

# CRITICAL: API Key Management Pattern
# All services use pre-generated API keys from scripts/02-generate-secrets.sh
# PLEX_TOKEN is user-provided, not generated (required external authentication)

# CRITICAL: Service Dependencies
# Watchlistarr MUST start after Sonarr, Radarr, and Plex are healthy
# Health checks required for proper startup sequencing

# CRITICAL: Network Communication
# Internal service URLs use container names (http://sonarr:8989)
# External access through nginx proxy for VPN-isolated services

# CRITICAL: Configuration Template Pattern
# Services use .template files with ${VARIABLE} substitution
# Templates restored only if config files don't exist

# CRITICAL: Entrypoint Script Pattern
# Multi-stage: 1) Template restoration 2) Background configuration 3) Service startup
# Background scripts run API calls after service becomes available
```

## Implementation Blueprint

### Data Models and Structure

Watchlistarr uses YAML configuration and doesn't require custom data models, but integrates with existing API structures:

```yaml
# config/templates/watchlistarr/config.yaml.template
interval:
  seconds: 60

sonarr:
  baseUrl: "http://sonarr:8989"
  apikey: "${SONARR_API_KEY}"
  qualityProfile: "Any"
  rootFolder: "/tv"
  bypassIgnored: false
  seasonMonitoring: "all"
  tags:
    - watchlistarr

radarr:
  baseUrl: "http://radarr:7878"
  apikey: "${RADARR_API_KEY}"
  qualityProfile: "Any"
  rootFolder: "/movies"
  bypassIgnored: false
  tags:
    - watchlistarr

plex:
  token: "${PLEX_TOKEN}"
  skipfriendsync: false

# CRITICAL: Full delete sync enabled by default per user requirement
delete:
  movie: true
  endedShow: true
  continuingShow: true
  interval:
    days: 7
  deleteFiles: true
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY .env.example
  - ADD: PLEX_TOKEN environment variable with documentation
  - FOLLOW pattern: Other API key definitions with clear comments
  - NAMING: PLEX_TOKEN (matches watchlistarr documentation)
  - PLACEMENT: Group with other service authentication variables

Task 2: CREATE config/templates/watchlistarr/config.yaml.template
  - IMPLEMENT: Complete YAML configuration with environment variable substitution
  - FOLLOW pattern: config/templates/sonarr/config.xml.template (${VAR} substitution)
  - CRITICAL: Enable delete sync by default (delete.movie: true, delete.endedShow: true, delete.continuingShow: true)
  - PLACEMENT: New watchlistarr template directory

Task 3: CREATE scripts/watchlistarr-entrypoint.sh
  - IMPLEMENT: Multi-stage entrypoint following existing pattern
  - FOLLOW pattern: scripts/sonarr-entrypoint.sh (template restoration, background config, service startup)
  - STAGES: 1) Config template restoration 2) Environment substitution 3) Service startup
  - DEPENDENCIES: Template from Task 2, environment variables from Task 1
  - PLACEMENT: Scripts directory with executable permissions

Task 4: MODIFY docker-compose.yml
  - ADD: Watchlistarr service definition with proper networking and dependencies
  - FOLLOW pattern: Existing service definitions (sonarr, radarr structure)
  - NETWORKING: Add to media_network for service communication
  - DEPENDENCIES: depends_on sonarr, radarr, plex with health check conditions
  - PLACEMENT: Insert before web-ui service to maintain dependency order

Task 5: MODIFY scripts/02-generate-secrets.sh
  - ADD: PLEX_TOKEN handling (validation, not generation)
  - FOLLOW pattern: API key export logic but validate instead of generate
  - CRITICAL: PLEX_TOKEN is user-provided, validate presence and format
  - PLACEMENT: Add to existing secret handling section

Task 6: UPDATE config/nginx/nginx.conf (optional)
  - ADD: Watchlistarr proxy block if web interface needed
  - FOLLOW pattern: Existing service proxy blocks (prowlarr, sonarr structure)
  - CONDITIONAL: Only if watchlistarr exposes web interface
  - PLACEMENT: Add new server block for watchlistarr port
```

### Implementation Patterns & Key Details

```bash
# Service Definition Pattern (docker-compose.yml)
watchlistarr:
  image: nylonee/watchlistarr:latest
  container_name: ${CONTAINER_PREFIX}watchlistarr
  restart: unless-stopped
  environment:
    - PLEX_TOKEN=${PLEX_TOKEN}
    - SONARR_API_KEY=${SONARR_API_KEY}
    - SONARR_BASE_URL=http://sonarr:8989
    - RADARR_API_KEY=${RADARR_API_KEY}
    - RADARR_BASE_URL=http://radarr:7878
  volumes:
    - ./config/watchlistarr:/app/config
    - ./config/templates/watchlistarr:/templates:ro
    - ./scripts:/scripts:ro
  entrypoint: ["/scripts/watchlistarr-entrypoint.sh"]
  networks:
    - media_network
  depends_on:
    sonarr:
      condition: service_healthy
    radarr:
      condition: service_healthy
    plex:
      condition: service_started
  healthcheck:
    test: ["CMD", "test", "-f", "/app/config/config.yaml"]
    interval: 30s
    timeout: 10s
    retries: 3

# Entrypoint Script Pattern (scripts/watchlistarr-entrypoint.sh)
#!/bin/bash
set -e

CONFIG_DIR="/app/config"
TEMPLATE_DIR="/templates"

# Stage 1: Template Restoration
if [ ! -f "$CONFIG_DIR/config.yaml" ] && [ -f "$TEMPLATE_DIR/config.yaml.template" ]; then
    echo "Restoring watchlistarr configuration from template..."
    mkdir -p "$CONFIG_DIR"

    # Stage 2: Environment Variable Substitution
    envsubst < "$TEMPLATE_DIR/config.yaml.template" > "$CONFIG_DIR/config.yaml"
    echo "Watchlistarr configuration restored and configured"
fi

# Stage 3: Original Service Startup
exec "$@"

# Environment Variable Pattern (.env.example)
# Plex Authentication (required for watchlistarr)
PLEX_TOKEN=your-plex-token-here

# CRITICAL: Docker networks must match existing pattern
# NETWORKING: watchlistarr joins media_network for service communication
# SECURITY: No VPN isolation needed (watchlistarr doesn't download torrents)
```

### Integration Points

```yaml
ENVIRONMENT:
  - add to: .env.example
  - pattern: "PLEX_TOKEN=your-plex-token-here"
  - validation: Non-empty string, format validation in entrypoint

NETWORKING:
  - add to: docker-compose.yml networks section
  - pattern: "media_network" membership for service communication
  - security: No VPN isolation required (read-only service)

DEPENDENCIES:
  - add to: docker-compose.yml depends_on section
  - pattern: Health check dependencies on sonarr, radarr, plex
  - timing: Must start after all integrated services are healthy

TEMPLATES:
  - add to: config/templates/watchlistarr/
  - pattern: YAML configuration with ${VAR} substitution
  - critical: Delete sync enabled by default per user requirement

HEALTH_CHECKS:
  - pattern: File-based health check (config.yaml existence)
  - integration: Service readiness for dependency management
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Docker Compose Validation
docker-compose config                              # Validate compose file syntax
docker-compose -f docker-compose.yml -f docker-compose.pia.yml config  # Validate PIA override

# Shell Script Validation
shellcheck scripts/watchlistarr-entrypoint.sh     # Validate shell script syntax
chmod +x scripts/watchlistarr-entrypoint.sh       # Ensure executable permissions

# YAML Template Validation
yamllint config/templates/watchlistarr/config.yaml.template  # Validate YAML syntax

# Expected: No syntax errors, valid configuration files
```

### Level 2: Unit Tests (Component Validation)

```bash
# Template Substitution Testing
export PLEX_TOKEN="test-token"
export SONARR_API_KEY="test-sonarr-key"
export RADARR_API_KEY="test-radarr-key"

envsubst < config/templates/watchlistarr/config.yaml.template > /tmp/test-config.yaml
yamllint /tmp/test-config.yaml                    # Validate generated config

# Verify critical settings in generated config
grep "delete:" /tmp/test-config.yaml              # Ensure delete sync section exists
grep "movie: true" /tmp/test-config.yaml          # Verify movie delete enabled
grep "endedShow: true" /tmp/test-config.yaml      # Verify TV delete enabled

# Expected: All substitutions correct, delete sync enabled
```

### Level 3: Integration Testing (System Validation)

```bash
# Full Stack Startup (Default Cloudflare WARP)
docker-compose down
docker-compose up -d --build

# Multi-VPN Validation (PIA Override)
docker-compose down
docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d --build

# Service Health Validation
docker-compose ps                                  # All containers should be healthy
docker logs watchlistarr                         # Check for successful startup

# API Connectivity Testing
docker exec watchlistarr cat /app/config/config.yaml | grep -E "(baseUrl|apikey|token)"
# Verify all service URLs and authentication configured correctly

# Plex Watchlist Sync Testing (manual verification)
# 1. Add item to Plex watchlist
# 2. Wait 60 seconds
# 3. Check Sonarr/Radarr for automatic addition
# 4. Remove item from Plex watchlist
# 5. Verify removal from Sonarr/Radarr (may take up to 7 days)

# Expected: All containers healthy, successful API connections, sync working
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Watchlistarr Logs Analysis
docker logs watchlistarr 2>&1 | grep -E "(ERROR|WARN|connection|sync|watchlist)"
# Expected: No connection errors, successful sync messages

# Service Discovery Validation
docker exec watchlistarr nslookup sonarr          # DNS resolution working
docker exec watchlistarr nslookup radarr          # DNS resolution working
docker exec watchlistarr nslookup plex            # DNS resolution working

# API Authentication Testing
docker exec watchlistarr wget -qO- --header="X-Api-Key: $SONARR_API_KEY" http://sonarr:8989/api/v3/system/status
docker exec watchlistarr wget -qO- --header="X-Api-Key: $RADARR_API_KEY" http://radarr:7878/api/v3/system/status

# Plex API Testing
docker exec watchlistarr wget -qO- --header="X-Plex-Token: $PLEX_TOKEN" http://plex:32400/identity

# Configuration Validation
docker exec watchlistarr cat /app/config/config.yaml | yq eval '.delete.movie' -
# Expected: "true" (delete sync enabled)

# VPN Network Isolation Verification
docker exec qbittorrent curl -s https://ipinfo.io/ip    # Should show VPN IP
docker exec watchlistarr curl -s https://ipinfo.io/ip   # Should show real IP
# Expected: Different IPs confirming proper network isolation

# Expected: All API connections successful, proper network isolation maintained
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] Docker compose files validate without errors
- [ ] Shell scripts pass shellcheck validation
- [ ] YAML templates generate valid configuration files
- [ ] All containers start and reach healthy status

### Feature Validation

- [ ] Watchlistarr service starts automatically with `docker compose up -d`
- [ ] Configuration auto-generated with correct API keys and URLs
- [ ] Delete sync enabled by default (movie: true, endedShow: true, continuingShow: true)
- [ ] Service discovers and connects to Sonarr, Radarr, and Plex APIs
- [ ] Both VPN configurations work (default Cloudflare WARP and PIA override)
- [ ] Manual sync testing successful (add/remove items from Plex watchlist)

### Code Quality Validation

- [ ] Follows existing codebase patterns (entrypoint scripts, template structure)
- [ ] Service definition matches existing patterns (networking, dependencies, health checks)
- [ ] Environment variable naming consistent with project conventions
- [ ] Network security preserved (VPN isolation for qBittorrent maintained)
- [ ] Template restoration pattern followed correctly

### Documentation & Deployment

- [ ] Environment variables documented in .env.example
- [ ] Service integrates seamlessly with existing infrastructure
- [ ] No manual configuration required for basic operation
- [ ] Health checks provide proper dependency management

---

## Anti-Patterns to Avoid

- ❌ Don't add watchlistarr to VPN network (it doesn't download torrents)
- ❌ Don't generate PLEX_TOKEN (it's user-provided authentication)
- ❌ Don't start watchlistarr before dependencies are healthy
- ❌ Don't hardcode API keys in templates (use environment variables)
- ❌ Don't disable delete sync (user specifically requested it enabled by default)
- ❌ Don't break existing VPN isolation for qBittorrent
- ❌ Don't skip health checks (needed for proper startup sequencing)