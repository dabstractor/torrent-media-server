name: "Jellyseer Integration - Media Request Management for Jellyfin Ecosystem"
description: |

---

## Goal

**Feature Goal**: Integrate Jellyseer as a media request and discovery manager specifically optimized for the Jellyfin ecosystem to complement the existing Overseerr integration.

**Deliverable**: Complete Jellyseer service integration with Docker containerization, web UI integration, configuration templates, and health monitoring following established project patterns.

**Success Definition**: Users can access Jellyseer through the web UI, request movies/TV shows that automatically route to Radarr/Sonarr, and the service operates seamlessly within the existing VPN-isolated media stack with all containers showing "Healthy" status.

## User Persona

**Target User**: Media server administrators and family members who prefer Jellyfin over Plex for media consumption

**Use Case**: Request new movies and TV shows through a user-friendly interface that integrates with Jellyfin library management

**User Journey**:
1. Access Jellyseer through the main web UI dashboard
2. Search for desired movies/TV shows using TMDB/TVDB integration
3. Submit requests with quality preferences
4. Track request status and receive notifications
5. View content in Jellyfin once downloaded and processed

**Pain Points Addressed**:
- No Jellyfin-native request management (Overseerr is Plex-focused)
- Need for unified interface for both Plex and Jellyfin users
- Simplified media request workflow for non-technical users

## Why

- **Jellyfin Ecosystem Completeness**: Provides native request management for Jellyfin users complementing existing Plex/Overseerr setup
- **User Experience Enhancement**: Offers dual request management options for different media server preferences
- **Family-Friendly Interface**: Simplifies media requests for non-technical household members
- **Automation Integration**: Seamlessly connects with existing Radarr/Sonarr automation workflow

## What

Jellyseer will be integrated as a containerized service following the established project patterns with:
- Docker container with custom entrypoint and configuration management
- Web UI integration for service discovery and health monitoring
- Automatic configuration of Jellyfin, Radarr, and Sonarr connections
- Network configuration following security isolation patterns
- Template-based configuration with environment variable substitution
- Health checks and dependency management

### Success Criteria

- [ ] Jellyseer container starts and maintains "Healthy" status
- [ ] Service accessible through web UI dashboard with proper health monitoring
- [ ] Successfully connects to Jellyfin, Radarr, and Sonarr services
- [ ] Users can search for and request movies/TV shows
- [ ] Requests properly route to appropriate download clients
- [ ] Configuration persists across container restarts
- [ ] All Docker build variations work: `docker compose up -d` and `docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d`

## All Needed Context

### Context Completeness Check

_Before writing this PRP, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

✅ **PASSED**: This PRP includes comprehensive patterns from existing services, specific file references, exact configuration templates, and detailed integration instructions.

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://docs.jellyseerr.dev/
  why: Official installation and configuration documentation for Docker deployment
  critical: Environment variables, volume requirements, API endpoint structure

- url: https://github.com/fallenbagel/jellyseerr
  why: Source repository with Docker configuration examples and issue patterns
  critical: Docker image versioning, known limitations, integration patterns

- file: docker-compose.yml (lines 200-250, Overseerr service definition)
  why: Exact pattern to follow for request management service integration
  pattern: Network configuration, dependency management, environment variables
  gotcha: Requires both media_network and vpn_network for proper communication

- file: PRPs/019-overseerr-integration.md
  why: Implementation blueprint for similar request management service
  pattern: Entrypoint script structure, configuration template approach
  gotcha: API key generation, database initialization timing

- file: PRPs/020-jellyfin-integration.md
  why: Jellyfin service integration patterns and configuration management
  pattern: Template processing, volume mounts, health check configuration
  gotcha: Extended startup time requires start_period: 300s in health checks

- file: scripts/overseerr-entrypoint.sh
  why: Entrypoint script pattern for request management services
  pattern: Configuration template processing, secret generation, first-run detection
  gotcha: envsubst error handling, permission setting (1000:1000)

- file: config/templates/overseerr/settings.json.template
  why: Configuration template structure for service integration
  pattern: Service connection pre-configuration, API key substitution
  gotcha: JSON structure validation after envsubst processing

- file: web-ui/src/hooks/use-service-config.ts
  why: Web UI service integration pattern for dashboard display
  pattern: Service mapping, health endpoint configuration, category assignment
  gotcha: Environment variable mapping for frontend vs backend URLs

- file: CLAUDE.md (Network Security Rules section)
  why: Critical network security requirements and VPN isolation patterns
  pattern: qBittorrent VPN isolation, service network classification
  gotcha: Jellyseer does NOT require VPN isolation (management service)

- docfile: PRPs/ai_docs/jellyseer-integration-patterns.md
  why: Custom documentation with Docker patterns and configuration examples
  section: Service integration examples, network configuration, security patterns
```

### Current Codebase Tree

```bash
.
├── docker-compose.yml                    # Main service definitions
├── docker-compose.pia.yml               # VPN provider variation
├── .env                                 # Environment variables
├── config/
│   ├── templates/                       # Service configuration templates
│   │   ├── overseerr/
│   │   │   └── settings.json.template   # Request service pattern
│   │   └── jellyfin/
│   │       └── system.xml.template      # Media server pattern
├── scripts/
│   ├── overseerr-entrypoint.sh         # Request service entrypoint pattern
│   ├── jellyfin-entrypoint.sh          # Media service entrypoint pattern
│   └── create-worktree-env.sh          # Environment isolation
├── web-ui/src/
│   ├── hooks/use-service-config.ts     # Service discovery pattern
│   └── app/api/health/[service]/       # Health check API pattern
└── overseerr.Dockerfile                # Custom build pattern
```

### Desired Codebase Tree with Files to be Added

```bash
.
├── docker-compose.yml                    # ADD: Jellyseer service definition
├── jellyseer.Dockerfile                 # CREATE: Custom Jellyseer build
├── .env                                 # ADD: Jellyseer environment variables
├── config/
│   ├── jellyseer/                      # CREATE: Runtime configuration directory
│   └── templates/
│       └── jellyseer/                  # CREATE: Configuration templates directory
│           └── settings.json.template   # CREATE: Pre-configured service connections
├── scripts/
│   └── jellyseer-entrypoint.sh        # CREATE: Custom initialization script
└── web-ui/src/
    ├── hooks/use-service-config.ts     # MODIFY: Add Jellyseer service mapping
    └── app/api/health/[service]/       # MODIFY: Add Jellyseer health endpoint
```

### Known Gotchas & Library Quirks

```yaml
# CRITICAL: Network Security Requirements
# Jellyseer is a management service - uses dual network pattern like Overseerr
# Does NOT require VPN isolation (that's only for qBittorrent torrenting)
networks: [media_network, vpn_network]  # NOT network_mode: "container:vpn"

# Docker Image Considerations
# Official image: fallenbagel/jellyseerr:latest (not linuxserver.io)
# Volume mount: /app/config (not /config like LinuxServer images)

# Startup Timing Issues
# Jellyseer requires database initialization on first run
# Use start_period: 60s minimum for health checks
# Depends on Jellyfin, Radarr, Sonarr being healthy first

# Configuration Template Processing
# JSON templates require valid structure after envsubst
# Test template validity with: cat settings.json | jq . >/dev/null
# Permission requirements: chown 1000:1000 after template processing

# Port Conflicts
# Default port 5055 conflicts with Overseerr
# Use JELLYSEER_PORT=5056 for differentiation
# Nginx proxy port: NGINX_JELLYSEER_PORT=18056 (worktree safe)
```

## Implementation Blueprint

### Data Models and Structure

Configuration templates and environment variable structure for service integration:

```json
# Jellyseer Settings Template Structure
{
  "jellyfin": {
    "hostname": "jellyfin",
    "port": 8096,
    "useSsl": false,
    "libraries": []
  },
  "sonarr": [{
    "id": 1,
    "hostname": "sonarr",
    "port": 8989,
    "apiKey": "${SONARR_API_KEY}",
    "useSsl": false,
    "baseUrl": "",
    "qualityProfileId": 1,
    "rootFolder": "/data/tvshows",
    "minimumAvailability": "released"
  }],
  "radarr": [{
    "id": 1,
    "hostname": "radarr",
    "port": 7878,
    "apiKey": "${RADARR_API_KEY}",
    "useSsl": false,
    "baseUrl": "",
    "qualityProfileId": 1,
    "rootFolder": "/data/movies",
    "minimumAvailability": "released"
  }]
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE jellyseer.Dockerfile
  - IMPLEMENT: Custom Docker build with entrypoint and tools
  - FOLLOW pattern: overseerr.Dockerfile (alpine packages, script copying)
  - NAMING: jellyseer.Dockerfile in project root
  - PLACEMENT: Project root directory alongside overseerr.Dockerfile

Task 2: CREATE scripts/jellyseer-entrypoint.sh
  - IMPLEMENT: Configuration initialization and template processing
  - FOLLOW pattern: scripts/overseerr-entrypoint.sh (envsubst, permissions, validation)
  - NAMING: jellyseer-entrypoint.sh following service naming convention
  - DEPENDENCIES: Templates from Task 3
  - PLACEMENT: scripts/ directory with executable permissions

Task 3: CREATE config/templates/jellyseer/settings.json.template
  - IMPLEMENT: Pre-configured service connections template
  - FOLLOW pattern: config/templates/overseerr/settings.json.template (structure, substitution)
  - NAMING: settings.json.template for Jellyseer configuration
  - PLACEMENT: config/templates/jellyseer/ directory

Task 4: MODIFY docker-compose.yml
  - INTEGRATE: Add Jellyseer service definition following Overseerr pattern
  - FIND pattern: Overseerr service block (networks, dependencies, health checks)
  - ADD: Complete service definition with dual network configuration
  - PRESERVE: Existing service definitions and network configurations

Task 5: MODIFY .env
  - INTEGRATE: Add Jellyseer environment variables
  - FIND pattern: Overseerr environment variables (PORT, API_KEY, URLs)
  - ADD: JELLYSEER_PORT, NGINX_JELLYSEER_PORT, URL configurations
  - PRESERVE: Existing environment variable structure

Task 6: MODIFY web-ui/src/hooks/use-service-config.ts
  - INTEGRATE: Add Jellyseer service mapping for web UI
  - FIND pattern: Overseerr service configuration (category, icon, health)
  - ADD: Jellyseer service entry in serviceConfig object
  - PRESERVE: Existing service configurations

Task 7: MODIFY web-ui/src/app/api/health/[service]/route.ts
  - INTEGRATE: Add Jellyseer health check endpoint
  - FIND pattern: Jellyfin/Overseerr health check configuration
  - ADD: jellyseer health check with proper URL and timeout
  - PRESERVE: Existing health check implementations

Task 8: CREATE config/jellyseer/ directory
  - IMPLEMENT: Runtime configuration directory creation
  - FOLLOW pattern: config/overseerr/ directory structure
  - NAMING: jellyseer following service naming convention
  - PLACEMENT: config/ directory alongside other services
```

### Implementation Patterns & Key Details

```dockerfile
# Dockerfile Pattern (jellyseer.Dockerfile)
FROM fallenbagel/jellyseerr:latest

# Install required tools for template processing
RUN apk add --no-cache gettext curl

# Copy custom entrypoint
COPY scripts/jellyseer-entrypoint.sh /jellyseer-entrypoint.sh
RUN chmod +x /jellyseer-entrypoint.sh

ENTRYPOINT ["/jellyseer-entrypoint.sh"]
```

```bash
# Entrypoint Script Pattern (jellyseer-entrypoint.sh)
#!/bin/bash
set -e

CONFIG_DIR="/app/config"
TEMPLATE_DIR="/templates"

echo "[INIT] Jellyseer custom entrypoint starting..."

# Create config directory if not exists
mkdir -p "$CONFIG_DIR"

# First run detection and template application
if [ ! -f "$CONFIG_DIR/settings.json" ]; then
    echo "[INIT] First run detected - setting up initial configuration"

    # Apply configuration template with environment substitution
    if [ -f "$TEMPLATE_DIR/settings.json.template" ]; then
        envsubst < "$TEMPLATE_DIR/settings.json.template" > "$CONFIG_DIR/settings.json"

        # Validate JSON structure
        if ! cat "$CONFIG_DIR/settings.json" | jq . >/dev/null 2>&1; then
            echo "[ERROR] Generated settings.json is invalid, using minimal config"
            echo '{}' > "$CONFIG_DIR/settings.json"
        fi

        chown 1000:1000 "$CONFIG_DIR/settings.json"
        echo "[INIT] Configuration template applied successfully"
    fi
fi

# Start Jellyseer with original entrypoint
exec /init
```

```yaml
# Docker Compose Service Pattern
jellyseer:
  build:
    context: .
    dockerfile: jellyseer.Dockerfile
  container_name: ${CONTAINER_PREFIX}jellyseer
  networks:
    - media_network    # Primary network for web access
    - vpn_network     # Secondary for qBittorrent communication
  ports:
    - "${JELLYSEER_PORT:-5056}:5055"
  depends_on:
    init-directories:
      condition: service_completed_successfully
    jellyfin:
      condition: service_healthy
    radarr:
      condition: service_healthy
    sonarr:
      condition: service_healthy
  env_file:
    - .env
  environment:
    - PUID=1000
    - PGID=1000
    - TZ=${TZ:-America/New_York}
    - PORT=${JELLYSEER_PORT:-5056}
  volumes:
    - ./config/jellyseer:/app/config
    - ./config/templates/jellyseer:/templates:ro
    - ./scripts:/scripts:ro
  healthcheck:
    test: ["CMD-SHELL", "curl -f http://localhost:5055/api/v1/status || exit 1"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 60s
  restart: unless-stopped
  stop_grace_period: 60s
```

### Integration Points

```yaml
ENVIRONMENT_VARIABLES:
  - add to: .env
  - pattern: |
    # Jellyseer Configuration
    JELLYSEER_PORT=5056
    NGINX_JELLYSEER_PORT=18056
    JELLYSEER_URL=http://localhost:${NGINX_JELLYSEER_PORT}
    JELLYSEER_BACKEND_URL=http://jellyseer:5055

WEB_UI_INTEGRATION:
  - add to: web-ui/src/hooks/use-service-config.ts
  - pattern: |
    jellyseer: {
      name: 'Jellyseer',
      category: 'management' as const,
      icon: 'Play',
      url: process.env.JELLYSEER_URL || 'http://localhost:5056',
      description: 'Media request management for Jellyfin'
    }

HEALTH_CHECK_API:
  - add to: web-ui/src/app/api/health/[service]/route.ts
  - pattern: |
    jellyseer: {
      url: process.env.JELLYSEER_BACKEND_URL || 'http://jellyseer:5055',
      healthEndpoint: '/api/v1/status',
      authType: 'none',
      timeout: 10000
    }

DOCKER_COMPOSE_WEB_UI:
  - add to: web-ui service environment
  - pattern: |
    - JELLYSEER_URL=http://localhost:${NGINX_JELLYSEER_PORT}
    - JELLYSEER_BACKEND_URL=http://jellyseer:5055
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Validate Dockerfile syntax
docker build -f jellyseer.Dockerfile -t jellyseer:test .

# Validate shell script syntax
bash -n scripts/jellyseer-entrypoint.sh

# Validate JSON template structure
envsubst < config/templates/jellyseer/settings.json.template | jq . >/dev/null

# Validate docker-compose syntax
docker compose config --quiet

# Expected: No syntax errors, clean validation output
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test configuration template processing
cd config/templates/jellyseer/
export SONARR_API_KEY="test123" RADARR_API_KEY="test456"
envsubst < settings.json.template | jq . >/dev/null && echo "Template valid"

# Test Docker build process
docker build -f jellyseer.Dockerfile -t jellyseer:test .
docker run --rm jellyseer:test /bin/sh -c "which envsubst && which curl"

# Test entrypoint script permissions and functionality
chmod +x scripts/jellyseer-entrypoint.sh
bash scripts/jellyseer-entrypoint.sh --help 2>/dev/null || echo "Script ready"

# Expected: All component tests pass, no validation errors
```

### Level 3: Integration Testing (System Validation)

```bash
# Full stack startup validation
docker compose up -d

# Wait for service initialization
sleep 60

# Validate all containers healthy
docker compose ps | grep -E "(healthy|Up)" | wc -l

# Jellyseer service health check
curl -f http://localhost:${JELLYSEER_PORT:-5056}/api/v1/status || echo "Service not ready"

# Web UI health endpoint test
curl -f http://localhost:3000/api/health/jellyseer | jq .status

# Service dependency validation
docker compose logs jellyseer | grep -E "(started|ready|healthy)"

# VPN variation testing (critical requirement)
docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d
sleep 60
docker compose ps | grep healthy

# Expected: All services healthy, Jellyseer accessible, no startup errors
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Jellyseer-specific functional validation

# Test TMDB integration
curl -f "http://localhost:${JELLYSEER_PORT}/api/v1/discover/movie" | jq .results[0].title

# Test service connections (Jellyfin/Radarr/Sonarr)
curl -f "http://localhost:${JELLYSEER_PORT}/api/v1/service/jellyfin/status" | jq .

# Test request workflow
curl -X POST "http://localhost:${JELLYSEER_PORT}/api/v1/request" \
  -H "Content-Type: application/json" \
  -d '{"mediaType": "movie", "mediaId": 550}' | jq .

# Configuration persistence test
docker compose restart jellyseer
sleep 30
curl -f "http://localhost:${JELLYSEER_PORT}/api/v1/status" | jq .

# Network isolation validation
docker exec jellyseer ping -c 1 jellyfin
docker exec jellyseer ping -c 1 radarr
docker exec jellyseer ping -c 1 sonarr

# Web UI integration test
curl -f http://localhost:3000/services | grep -i jellyseer

# Expected: All functional tests pass, service integrations work, persistence confirmed
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] Docker build succeeds: `docker build -f jellyseer.Dockerfile .`
- [ ] Service starts healthy: `docker compose ps jellyseer | grep healthy`
- [ ] Configuration persists: Restart test passes
- [ ] Both compose variations work: standard and PIA VPN

### Feature Validation

- [ ] Jellyseer accessible at configured port
- [ ] Connects successfully to Jellyfin, Radarr, Sonarr
- [ ] Can search for and request media
- [ ] Web UI displays Jellyseer in services dashboard
- [ ] Health checks pass in web UI and docker compose
- [ ] Service shows "Healthy" status consistently

### Code Quality Validation

- [ ] Follows existing Docker service patterns exactly
- [ ] Uses dual network configuration (media_network + vpn_network)
- [ ] Configuration templates follow established envsubst patterns
- [ ] Entrypoint script follows existing script conventions
- [ ] File placement matches desired codebase tree structure

### Documentation & Deployment

- [ ] Environment variables documented in .env.example
- [ ] Service properly integrated into web UI dashboard
- [ ] Health monitoring functional through API endpoints
- [ ] No security warnings or VPN isolation violations
- [ ] Container prefix isolation working correctly

---

## Anti-Patterns to Avoid

- ❌ Don't use VPN network isolation for Jellyseer (it's a management service)
- ❌ Don't skip dependency checks on Jellyfin/Radarr/Sonarr health
- ❌ Don't use port 5055 (conflicts with Overseerr)
- ❌ Don't ignore JSON validation after template processing
- ❌ Don't skip worktree environment variable isolation
- ❌ Don't use LinuxServer.io patterns (this uses official fallenbagel image)
- ❌ Don't hardcode API keys in templates (use environment substitution)