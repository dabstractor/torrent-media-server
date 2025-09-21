name: "Autoscan Integration PRP - Automated Library Scanning for Plex and Jellyfin"
description: |
  Comprehensive implementation guide for integrating Autoscan service to automatically update Plex and Jellyfin libraries when new media is imported by Radarr/Sonarr, eliminating the need for manual library scans.

---

## Goal

**Feature Goal**: Integrate Autoscan service to automatically trigger targeted library updates in Plex and Jellyfin when Radarr or Sonarr imports new media, eliminating manual library scanning delays.

**Deliverable**: Complete Autoscan service deployment with Docker integration, webhook configuration for Radarr/Sonarr, and automatic library refresh triggers for both Plex and Jellyfin.

**Success Definition**: New content imported by Radarr/Sonarr appears immediately in both Jellyfin and Plex without requiring manual library scans. All Docker variations (standard and VPN) deploy successfully with healthy containers.

## User Persona

**Target User**: Media enthusiast running automated media management stack (Radarr/Sonarr + Plex/Jellyfin)

**Use Case**: User downloads content through Radarr/Sonarr and expects it to be immediately available in their media servers without waiting for scheduled library scans or manually triggering scans.

**User Journey**:
1. User adds movie/show to Radarr/Sonarr
2. Radarr/Sonarr downloads and imports content
3. Autoscan receives webhook notification
4. Autoscan triggers targeted library refresh in Plex and Jellyfin
5. Content appears immediately in both media servers

**Pain Points Addressed**:
- Waiting hours for scheduled library scans
- Manual intervention required to refresh libraries
- Inconsistent availability between Plex and Jellyfin
- Full library scans being resource-intensive

## Why

- **Immediate Content Availability**: Eliminates waiting period between import and media server visibility
- **Resource Efficiency**: Targeted scans only refresh changed paths instead of full library scans
- **User Experience**: Seamless content discovery without manual library refresh
- **Infrastructure Optimization**: Reduces load on media servers by avoiding unnecessary full scans

## What

Autoscan service deployment that:
- Listens for webhook notifications from Radarr and Sonarr on completed imports
- Triggers targeted library updates for specific paths in both Plex and Jellyfin
- Integrates seamlessly with existing Docker-based media stack
- Maintains network security (no VPN isolation required unlike qBittorrent)
- Provides health monitoring and logging for troubleshooting

### Success Criteria

- [ ] Autoscan service deploys successfully in Docker with health checks
- [ ] Radarr sends webhooks to Autoscan on completed movie imports
- [ ] Sonarr sends webhooks to Autoscan on completed TV episode imports
- [ ] Autoscan triggers immediate library refresh in Jellyfin for new content
- [ ] Autoscan triggers immediate library refresh in Plex for new content
- [ ] All Docker compose variations (standard and VPN) deploy with healthy containers
- [ ] New content appears in both media servers within 30 seconds of import completion

## All Needed Context

### Context Completeness Check

_This PRP provides complete context for someone unfamiliar with the codebase to implement Autoscan integration successfully, including Docker patterns, configuration templates, webhook setup, and validation approaches._

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://github.com/NiNiyas/autoscan
  why: Active fork of autoscan with current Docker images and configuration examples
  critical: This is the maintained version after original Cloudbox autoscan was deprecated

- url: https://docs.saltbox.dev/apps/autoscan/
  why: Comprehensive configuration guide with real-world examples for Plex/Jellyfin integration
  critical: Contains webhook configuration patterns and troubleshooting guides

- url: https://docs.elfhosted.com/app/autoscan/
  why: Docker-specific implementation examples and best practices
  critical: Shows proper volume mounting and environment variable patterns

- file: /home/dustin/projects/torrents-autoscan/docker-compose.yml
  why: Service definition patterns for adding new Docker services
  pattern: Health checks, networking, volume mounts, dependencies
  gotcha: VPN isolation only for qBittorrent, other services use media_network

- file: /home/dustin/projects/torrents-autoscan/config/templates/watchlistarr/config.yaml.template
  why: Template pattern for service configuration with environment variable substitution
  pattern: YAML configuration with ${ENV_VAR} substitution
  gotcha: Use envsubst for template processing in entrypoint scripts

- file: /home/dustin/projects/torrents-autoscan/scripts/jellyfin-entrypoint.sh
  why: Entrypoint script pattern for service initialization and configuration setup
  pattern: Template processing, permission setting, original entrypoint execution
  gotcha: Must call original entrypoint with exec to maintain container lifecycle

- file: /home/dustin/projects/torrents-autoscan/.env.example
  why: Environment variable patterns and naming conventions
  pattern: Service-specific port assignments and API key variables
  gotcha: Use CONTAINER_PREFIX for worktree isolation

- file: /home/dustin/projects/torrents-autoscan/config/nginx/nginx.conf
  why: Reverse proxy configuration for service exposure
  pattern: Server blocks with proxy_pass for internal service communication
  gotcha: Services communicate via Docker internal networking (service:port)
```

### Current Codebase tree

```bash
/home/dustin/projects/torrents-autoscan/
├── docker-compose.yml               # Main service definitions
├── docker-compose.pia.yml          # PIA VPN override
├── .env.example                     # Environment variables template
├── config/
│   ├── nginx/nginx.conf            # Reverse proxy config
│   ├── templates/                  # Service config templates
│   │   ├── jellyfin/
│   │   ├── overseerr/
│   │   ├── plex/
│   │   ├── prowlarr/
│   │   ├── qbittorrent/
│   │   ├── radarr/
│   │   ├── sonarr/
│   │   └── watchlistarr/
│   ├── vpn/                        # VPN configurations
│   └── watchlistarr/
├── scripts/                        # Service entrypoint scripts
├── data/                           # Persistent data storage
│   ├── media/                      # Movies and TV shows
│   │   ├── movies/
│   │   └── tv/
│   └── downloads/                  # Download staging
└── web-ui/                         # React frontend
```

### Desired Codebase tree with files to be added

```bash
/home/dustin/projects/torrents-autoscan/
├── docker-compose.yml               # MODIFY: Add autoscan service definition
├── .env.example                     # MODIFY: Add AUTOSCAN_PORT variable
├── config/
│   └── templates/
│       └── autoscan/               # CREATE: Autoscan configuration templates
│           ├── config.yml.template # CREATE: Main autoscan configuration
│           └── triggers.yml.template # CREATE: Webhook trigger definitions
├── scripts/
│   └── autoscan-entrypoint.sh      # CREATE: Autoscan service initialization script
└── config/nginx/nginx.conf         # MODIFY: Add autoscan proxy configuration (optional)
```

### Known Gotchas of our codebase & Library Quirks

```yaml
# CRITICAL: qBittorrent MUST remain VPN-isolated via network_mode: "container:vpn"
# Autoscan should NOT use VPN isolation - it needs to communicate with Jellyfin/Plex
# and receive webhooks from Radarr/Sonarr on standard network

# CRITICAL: Prowlarr requires proxyenabled=False in database to prevent timeouts
# Autoscan may have similar proxy sensitivity

# CRITICAL: All Docker variations must work:
# - docker compose up -d (standard)
# - docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d (VPN)

# Library Quirks:
# - NiNiyas autoscan uses ghcr.io/niniyas/autoscan:latest image
# - Configuration is YAML-based with environment variable substitution
# - Requires specific volume mounts for media path translation
# - Webhook endpoints expect specific JSON payload formats from Radarr/Sonarr
```

## Implementation Blueprint

### Data models and structure

Autoscan uses YAML configuration files with the following structure:

```yaml
# Main configuration (config.yml)
servers:
  plex:
    url: http://plex:32400
    token: ${PLEX_TOKEN}

  jellyfin:
    url: http://jellyfin:8096
    api_key: ${JELLYFIN_API_KEY}

# Trigger configuration (triggers.yml)
webhooks:
  - name: radarr
    url: http://autoscan:3030/webhook

  - name: sonarr
    url: http://autoscan:3030/webhook
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE config/templates/autoscan/config.yml.template
  - IMPLEMENT: Autoscan main configuration with Plex and Jellyfin server definitions
  - FOLLOW pattern: config/templates/watchlistarr/config.yaml.template (environment variable substitution)
  - NAMING: Use ${PLEX_TOKEN}, ${JELLYFIN_API_KEY} for environment variables
  - PLACEMENT: Template directory following existing convention
  - CONTENT: Server configurations for both Plex (host network) and Jellyfin (Docker network)

Task 2: CREATE config/templates/autoscan/triggers.yml.template
  - IMPLEMENT: Webhook trigger definitions for Radarr and Sonarr
  - FOLLOW pattern: YAML structure with webhook endpoints and path mappings
  - NAMING: Use descriptive trigger names matching service names
  - DEPENDENCIES: None (standalone configuration)
  - PLACEMENT: Alongside main config template

Task 3: CREATE scripts/autoscan-entrypoint.sh
  - IMPLEMENT: Service initialization script with template processing
  - FOLLOW pattern: scripts/jellyfin-entrypoint.sh (template substitution, permissions, exec)
  - NAMING: Service-specific entrypoint script
  - DEPENDENCIES: Config templates from Tasks 1-2
  - PLACEMENT: Scripts directory following existing convention
  - PERMISSIONS: Must be executable (chmod +x)

Task 4: MODIFY docker-compose.yml
  - INTEGRATE: Add autoscan service definition with proper networking and volumes
  - FIND pattern: Existing service definitions (jellyfin, watchlistarr)
  - ADD: Autoscan service with health checks, media_network, volume mounts
  - PRESERVE: Existing service configurations and dependencies
  - NETWORK: Use media_network (NOT VPN isolation)

Task 5: MODIFY .env.example
  - INTEGRATE: Add autoscan-specific environment variables
  - FIND pattern: Existing service port definitions
  - ADD: AUTOSCAN_PORT, JELLYFIN_API_KEY variables
  - PRESERVE: Existing environment variable structure
  - PLACEMENT: Group with other service variables

Task 6: MODIFY Radarr webhook configuration (template)
  - INTEGRATE: Add webhook URL pointing to autoscan service
  - FIND pattern: Existing webhook configurations or API integration examples
  - ADD: Webhook configuration in Radarr template
  - URL: http://autoscan:3030/webhook (Docker internal networking)
  - TRIGGER: On Import/Upgrade events

Task 7: MODIFY Sonarr webhook configuration (template)
  - INTEGRATE: Add webhook URL pointing to autoscan service
  - FOLLOW pattern: Same as Radarr webhook configuration
  - ADD: Webhook configuration in Sonarr template
  - URL: http://autoscan:3030/webhook (Docker internal networking)
  - TRIGGER: On Import/Upgrade events

Task 8: OPTIONAL MODIFY config/nginx/nginx.conf
  - INTEGRATE: Add reverse proxy configuration for autoscan web interface
  - FIND pattern: Existing service proxy configurations
  - ADD: Server block for autoscan if external access needed
  - PRESERVE: Existing proxy configurations
  - PLACEMENT: Follow existing nginx server block structure
```

### Implementation Patterns & Key Details

```yaml
# Autoscan Docker service pattern
autoscan:
  image: ghcr.io/niniyas/autoscan:latest
  container_name: ${CONTAINER_PREFIX}autoscan
  entrypoint: ["/scripts/autoscan-entrypoint.sh"]
  networks:
    - media_network  # NOT vpn - needs communication with Jellyfin/Plex
  ports:
    - "${AUTOSCAN_PORT:-3030}:3030"
  environment:
    - PUID=1000
    - PGID=1000
    - TZ=${TZ:-America/New_York}
    - PLEX_TOKEN=${PLEX_TOKEN}
    - JELLYFIN_API_KEY=${JELLYFIN_API_KEY}
  volumes:
    - ./config/autoscan:/config
    - ./config/templates/autoscan:/templates:ro
    - ./scripts:/scripts:ro
    - ${MEDIA_ROOT:-./data/media}:/media
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3030/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 60s
  restart: unless-stopped
  depends_on:
    jellyfin:
      condition: service_healthy
    plex:
      condition: service_healthy

# Entrypoint script pattern
#!/bin/bash
set -e

CONFIG_DIR="/config"
TEMPLATE_DIR="/templates"

# Setup configuration files
if [ ! -f "$CONFIG_DIR/config.yml" ]; then
    echo "[INIT] Setting up autoscan configuration"
    envsubst < "$TEMPLATE_DIR/config.yml.template" > "$CONFIG_DIR/config.yml"
    envsubst < "$TEMPLATE_DIR/triggers.yml.template" > "$CONFIG_DIR/triggers.yml"
fi

# Set proper permissions
chown -R 1000:1000 "$CONFIG_DIR"

# Execute original entrypoint
exec /init

# Webhook configuration pattern for Radarr/Sonarr
webhook_url: "http://autoscan:3030/webhook"
trigger_events: ["Test", "Download", "Rename", "Import", "Upgrade"]
```

### Integration Points

```yaml
ENVIRONMENT_VARIABLES:
  - add to: .env.example
  - pattern: "AUTOSCAN_PORT=3030"
  - pattern: "JELLYFIN_API_KEY="  # If not already present

DOCKER_COMPOSE:
  - add to: docker-compose.yml
  - section: services
  - pattern: Follow existing service structure with health checks

NETWORK_CONFIG:
  - network: media_network (standard Docker networking)
  - avoid: VPN isolation (qBittorrent only)
  - communication: Internal Docker service names (jellyfin:8096, plex:32400)

WEBHOOKS:
  - radarr: Configure webhook to http://autoscan:3030/webhook
  - sonarr: Configure webhook to http://autoscan:3030/webhook
  - events: Import, Upgrade, Rename (completed downloads only)
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Validate YAML configuration templates
yamllint config/templates/autoscan/*.template
# Expected: Valid YAML syntax with no formatting errors

# Validate shell script syntax
bash -n scripts/autoscan-entrypoint.sh
# Expected: No syntax errors

# Validate Docker Compose syntax
docker-compose -f docker-compose.yml config
# Expected: Valid compose file with autoscan service properly defined

# Check file permissions
ls -la scripts/autoscan-entrypoint.sh
# Expected: Executable permissions (-rwxr-xr-x)
```

### Level 2: Component Validation

```bash
# Test environment variable substitution
export PLEX_TOKEN="test_token"
export JELLYFIN_API_KEY="test_key"
envsubst < config/templates/autoscan/config.yml.template
# Expected: Variables properly substituted in output

# Validate autoscan Docker image availability
docker pull ghcr.io/niniyas/autoscan:latest
# Expected: Image pulls successfully

# Test entrypoint script in isolation
docker run --rm -v $(pwd)/scripts:/scripts:ro ghcr.io/niniyas/autoscan:latest /scripts/autoscan-entrypoint.sh --help
# Expected: Script executes without errors
```

### Level 3: Integration Testing (System Validation)

```bash
# Full Docker stack deployment test
docker compose up -d
# Expected: All services start, autoscan shows healthy status

# VPN variant deployment test
docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d
# Expected: All services including autoscan deploy successfully with VPN variant

# Health check validation
docker ps --filter "name=autoscan" --format "table {{.Names}}\t{{.Status}}"
# Expected: Autoscan container shows "healthy" status

# Service communication test
docker exec autoscan curl -f http://jellyfin:8096/health || echo "Jellyfin communication failed"
docker exec autoscan curl -f http://172.17.0.1:32400/identity || echo "Plex communication failed"
# Expected: Both media servers accessible from autoscan container

# Webhook endpoint test
curl -X POST http://localhost:${AUTOSCAN_PORT:-3030}/webhook \
  -H "Content-Type: application/json" \
  -d '{"eventType": "Test", "movie": {"path": "/media/movies/test"}}' \
  | jq .
# Expected: Webhook endpoint responds successfully

# Configuration file generation test
docker exec autoscan cat /config/config.yml
# Expected: Configuration properly generated from template with substituted variables
```

### Level 4: Creative & Domain-Specific Validation

```bash
# End-to-end workflow simulation
# 1. Simulate Radarr webhook
curl -X POST http://localhost:${AUTOSCAN_PORT:-3030}/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "Import",
    "movie": {
      "title": "Test Movie",
      "path": "/media/movies/Test Movie (2023)"
    }
  }'

# 2. Check autoscan logs for processing
docker logs autoscan --tail 20
# Expected: Shows webhook received and library scan triggered

# 3. Verify Jellyfin library refresh triggered
docker logs jellyfin --tail 10 | grep -i "library scan"
# Expected: Jellyfin shows library scan activity

# Media path validation
# Verify autoscan can access media directories
docker exec autoscan ls -la /media/movies /media/tv
# Expected: Media directories accessible with proper permissions

# Performance validation
# Test webhook response time
time curl -X POST http://localhost:${AUTOSCAN_PORT:-3030}/webhook \
  -H "Content-Type: application/json" \
  -d '{"eventType": "Test"}'
# Expected: Response within 1-2 seconds

# Resource usage validation
docker stats autoscan --no-stream
# Expected: Low CPU and memory usage (< 100MB RAM, < 5% CPU)

# Network isolation validation
# Verify autoscan is NOT on VPN network (unlike qBittorrent)
docker exec autoscan curl -s ipinfo.io/ip
docker exec qbittorrent curl -s ipinfo.io/ip
# Expected: Different IP addresses (autoscan uses host IP, qBittorrent uses VPN IP)

# Security validation
# Verify autoscan configuration doesn't expose sensitive information
docker exec autoscan cat /config/config.yml | grep -i token
# Expected: No plain text tokens visible (should show ${PLEX_TOKEN} format)
```

## Final Validation Checklist

### Technical Validation

- [ ] All Docker compose variations deploy successfully with healthy containers
- [ ] Autoscan service accessible on configured port
- [ ] Configuration templates properly processed with environment variables
- [ ] No Docker networking issues between autoscan and media servers
- [ ] Shell scripts have proper permissions and syntax

### Feature Validation

- [ ] Radarr webhook configured and sending notifications to autoscan
- [ ] Sonarr webhook configured and sending notifications to autoscan
- [ ] Autoscan triggering library refreshes in Jellyfin for new content
- [ ] Autoscan triggering library refreshes in Plex for new content
- [ ] New content appears in both media servers within 30 seconds
- [ ] Webhook processing logs show successful operation

### Code Quality Validation

- [ ] Service follows existing Docker compose patterns
- [ ] Configuration templates follow established environment variable patterns
- [ ] Entrypoint script follows existing script conventions
- [ ] File placement matches project directory structure
- [ ] Network configuration preserves security (VPN isolation for qBittorrent only)

### Security & Network Validation

- [ ] Autoscan correctly isolated from VPN network
- [ ] qBittorrent maintains VPN isolation (network_mode: "container:vpn")
- [ ] No sensitive information exposed in configuration files
- [ ] Internal Docker networking properly configured
- [ ] Health checks functioning for monitoring

---

## Anti-Patterns to Avoid

- ❌ Don't put autoscan on VPN network - it needs direct communication with Jellyfin/Plex
- ❌ Don't skip webhook configuration validation - test with actual Radarr/Sonarr webhooks
- ❌ Don't use hardcoded paths - ensure path translation works across environments
- ❌ Don't assume API keys exist - verify Jellyfin API key is properly configured
- ❌ Don't ignore Docker health checks - they're critical for deployment validation
- ❌ Don't break existing VPN isolation for qBittorrent while adding autoscan
- ❌ Don't skip testing both Docker compose variants (standard and VPN)