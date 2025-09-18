name: "Jellyfin Media Server Integration with Cloudflare Tunnel"
description: |
  Comprehensive PRP for integrating Jellyfin media server into the existing Docker-based media stack
  with secure remote access via Cloudflare Tunnel, following all established project patterns.

---

## Goal

**Feature Goal**: Integrate Jellyfin media server into the existing media stack with secure remote access via Cloudflare Tunnel, providing an open-source alternative to Plex with automatic media library scanning.

**Deliverable**: Fully configured Jellyfin service with Cloudflare Tunnel for remote access, integrated into docker-compose stack with automated configuration, web UI dashboard integration, and complete validation suite.

**Success Definition**: Jellyfin is accessible both locally and remotely via permanent HTTPS tunnel URL, automatically scans media when downloads complete, appears in web UI services dashboard with health checks, and all Docker configurations (default and PIA) work correctly.

## User Persona

**Target User**: Self-hosted media enthusiasts running Docker-based media stacks

**Use Case**: Users want a free, open-source media server alternative to Plex with secure remote access that doesn't require port forwarding, static IPs, or domain ownership.

**User Journey**:
1. User runs `docker compose up -d` - Jellyfin starts automatically
2. User performs one-time Cloudflare tunnel authentication
3. User accesses Jellyfin locally via web UI services dashboard
4. User shares permanent tunnel URL for remote access
5. Downloaded media automatically appears in Jellyfin libraries

**Pain Points Addressed**:
- Complex remote access setup (port forwarding, DDNS, certificates)
- Manual library scanning after downloads
- Dependence on proprietary Plex service
- Lack of unified dashboard for all services

## Why

- **Free & Open Source**: Jellyfin provides a completely free alternative to Plex without licensing restrictions
- **Secure Remote Access**: Cloudflare Tunnel eliminates port forwarding risks and provides automatic HTTPS
- **Seamless Integration**: Reuses existing media directories managed by Radarr/Sonarr
- **Enhanced Automation**: Automatic library scanning on download completion reduces manual intervention
- **Unified Experience**: Integration with web UI dashboard provides single control point

## What

The integration introduces Jellyfin media server with Cloudflare Tunnel for secure remote access. Jellyfin runs alongside existing services, accessing shared media directories in read-only mode. A Cloudflare Tunnel provides a permanent `*.cfargotunnel.com` HTTPS URL without exposing local ports. The web UI services dashboard displays Jellyfin status with health monitoring. Automatic library scanning triggers when downloads complete via webhook integration.

### Success Criteria

- [ ] Jellyfin service starts successfully with `docker compose up -d`
- [ ] Cloudflare Tunnel generates and persists permanent HTTPS URL
- [ ] Tunnel URL is displayed in web UI services dashboard
- [ ] Jellyfin health checks report healthy status
- [ ] Media libraries (/movies, /tv) are accessible in Jellyfin
- [ ] Both default (Cloudflare WARP) and PIA VPN configurations work
- [ ] No VPN IP leaks (qBittorrent remains isolated)
- [ ] Remote access works without port forwarding

## All Needed Context

### Context Completeness Check

_This PRP contains all necessary implementation details, file contents, and patterns for someone unfamiliar with the codebase to successfully implement Jellyfin with Cloudflare Tunnel integration._

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://jellyfin.org/docs/general/installation/container/
  why: Official Jellyfin Docker setup documentation
  critical: Container configuration, volume requirements, environment variables

- url: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide/local/
  why: Cloudflare Tunnel Docker setup documentation
  critical: Authentication flow, tunnel creation, config.yml structure

- url: https://hub.docker.com/r/jellyfin/jellyfin
  why: Official Jellyfin Docker image documentation
  critical: Latest image tags, architecture support, configuration options

- url: https://hub.docker.com/r/cloudflare/cloudflared
  why: Official cloudflared Docker image documentation
  critical: Container usage, volume requirements, command structure

- file: docker-compose.yml
  why: Main service definitions and network configuration
  pattern: Service structure, network assignment, dependency management
  gotcha: VPN network isolation critical for qBittorrent only

- file: scripts/plex-entrypoint.sh
  why: Template for Jellyfin entrypoint script pattern
  pattern: Configuration restoration, environment substitution, background tasks
  gotcha: Health checks must wait for service initialization

- file: config/nginx/nginx.conf
  why: Reverse proxy patterns for service exposure
  pattern: Server blocks, header preservation, WebSocket support
  gotcha: Streaming services need extended timeouts and disabled buffering

- file: web-ui/src/hooks/use-service-config.ts
  why: Service dashboard integration patterns
  pattern: Service mapping, health endpoint configuration
  gotcha: Frontend and backend URLs differ for Docker networking

- file: .env.example
  why: Environment variable patterns and documentation
  pattern: Service ports, API keys, network configuration
  gotcha: Worktree isolation requires unique ports

- file: scripts/02-generate-secrets.sh
  why: Secret generation patterns (not used for Cloudflare)
  pattern: API key generation for other services
  gotcha: Cloudflare credentials are external, not generated
```

### Current Codebase Tree (relevant sections)

```bash
torrents-jellyfin/
├── docker-compose.yml                    # Main service definitions
├── docker-compose.pia.yml                # PIA VPN override
├── .env.example                          # Environment template
├── config/
│   ├── templates/                        # Service config templates
│   │   ├── plex/                         # Reference pattern
│   │   └── [services]/                   # Other service templates
│   └── nginx/nginx.conf                  # Reverse proxy config
├── scripts/
│   ├── *-entrypoint.sh                   # Service entrypoints
│   ├── 01-init-directories.sh            # Directory creation
│   └── create-worktree-env.sh            # Worktree configuration
└── web-ui/
    └── src/
        ├── hooks/use-service-config.ts   # Service configuration
        └── app/api/health/[service]/     # Health check API
```

### Desired Codebase Tree with Jellyfin Integration

```bash
torrents-jellyfin/
├── docker-compose.yml                    # + jellyfin, cloudflared services
├── .env.example                          # + Jellyfin/tunnel variables
├── config/
│   ├── jellyfin/                         # NEW: Jellyfin config directory
│   ├── cloudflared/                      # NEW: Tunnel credentials
│   └── templates/
│       └── jellyfin/
│           └── system.xml.template       # NEW: Skip setup wizard
├── scripts/
│   ├── jellyfin-entrypoint.sh            # NEW: Jellyfin initialization
│   └── start-tunnel.sh                   # NEW: Tunnel URL persistence
└── data/
    └── shared/
        └── tunnel-url.txt                 # NEW: Persisted tunnel URL
```

### Known Gotchas of Codebase & Library Quirks

```bash
# CRITICAL: qBittorrent MUST remain VPN-isolated via network_mode: "container:vpn"
# Jellyfin does NOT require VPN isolation - uses media_network only

# CRITICAL: Cloudflare Tunnel requires one-time manual authentication
# Cannot be fully automated - user must run auth commands once

# CRITICAL: Health checks fail during Jellyfin startup/migration
# Use extended start_period (90s+) to prevent false failures

# CRITICAL: Jellyfin needs specific permissions (PUID/PGID)
# Must match media file ownership for read access

# CRITICAL: Tunnel URL must be persisted to shared file
# Web UI reads from ./data/shared/tunnel-url.txt

# CRITICAL: Services use pre-configured API keys
# Jellyfin doesn't have pre-auth API - setup wizard bypass via template

# CRITICAL: LinuxServer.io images preferred for consistency
# Alternative: Official jellyfin/jellyfin with different paths

# CRITICAL: Host networking conflicts with container isolation
# Use bridge networking with explicit port exposure
```

## Implementation Blueprint

### Data Models and Structure

```xml
<!-- config/templates/jellyfin/system.xml.template -->
<?xml version="1.0" encoding="utf-8"?>
<ServerConfiguration>
  <!-- Skip setup wizard on first run -->
  <IsStartupWizardCompleted>true</IsStartupWizardCompleted>
  <MetadataPath>/config/metadata</MetadataPath>
  <MetadataNetworkPath></MetadataNetworkPath>
  <EnableCaseSensitiveItemIds>false</EnableCaseSensitiveItemIds>
  <DisableLiveTvChannelUserDataName>false</DisableLiveTvChannelUserDataName>
  <EnableNewOmdbSupport>false</EnableNewOmdbSupport>
  <EnableExternalContentInSuggestions>true</EnableExternalContentInSuggestions>
  <RequireHttps>false</RequireHttps>
  <EnableLocalizedGuids>false</EnableLocalizedGuids>
  <EnableNormalizedItemByNameIds>true</EnableNormalizedItemByNameIds>
  <IsPortAuthorized>true</IsPortAuthorized>
  <QuickConnectAvailable>false</QuickConnectAvailable>
  <EnableCase>false</EnableCase>
  <EnableMetrics>false</EnableMetrics>
  <ServerName>${CONTAINER_PREFIX}Jellyfin</ServerName>
  <BaseUrl></BaseUrl>
  <CertificatePath></CertificatePath>
  <CertificatePassword></CertificatePassword>
  <LocalNetworkSubnets>
    <string>172.16.0.0/12</string>
    <string>10.0.0.0/8</string>
    <string>192.168.0.0/16</string>
  </LocalNetworkSubnets>
  <LocalNetworkAddresses/>
  <RemoteIPFilter/>
  <IsRemoteIPFilterBlacklist>false</IsRemoteIPFilterBlacklist>
  <PublicPort>8096</PublicPort>
  <PublicHttpsPort>8920</PublicHttpsPort>
  <HttpServerPortNumber>8096</HttpServerPortNumber>
  <HttpsPortNumber>8920</HttpsPortNumber>
  <EnableHttps>false</EnableHttps>
  <AllowRemoteAccess>true</AllowRemoteAccess>
  <LogFileRetentionDays>3</LogFileRetentionDays>
  <EnableUPnP>false</EnableUPnP>
</ServerConfiguration>
```

```yaml
# config/cloudflared/config.yml (created after tunnel creation)
tunnel: jellyfin-tunnel
credentials-file: /home/nonroot/.cloudflared/[UUID].json

ingress:
  - service: http://jellyfin:8096
    originRequest:
      noTLSVerify: true
      connectTimeout: 30s
  - service: http_status:404
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY .env.example
  - ADD: JELLYFIN_PORT=8096
  - ADD: NGINX_JELLYFIN_PORT=18096  # Worktree-safe port
  - ADD: JELLYFIN_URL=http://localhost:${NGINX_JELLYFIN_PORT}
  - ADD: JELLYFIN_BACKEND_URL=http://jellyfin:8096
  - FOLLOW pattern: Existing service port definitions
  - PLACEMENT: Group with other service ports

Task 2: CREATE config/templates/jellyfin/system.xml.template
  - IMPLEMENT: ServerConfiguration XML to bypass setup wizard
  - FOLLOW pattern: config/templates/plex/Preferences.xml structure
  - CRITICAL: Set IsStartupWizardCompleted=true
  - PLACEMENT: New jellyfin template directory

Task 3: CREATE scripts/jellyfin-entrypoint.sh
  - IMPLEMENT: Multi-stage initialization script
  - FOLLOW pattern: scripts/plex-entrypoint.sh structure
  - STAGES: 1) Directory setup 2) Template restoration 3) Permissions 4) Service start
  - CRITICAL: Check if config exists before restoration
  - PLACEMENT: Scripts directory with executable permissions

Task 4: CREATE scripts/start-tunnel.sh
  - IMPLEMENT: Tunnel startup with URL extraction and persistence
  - PATTERN: Start tunnel, grep logs for URL, save to shared file
  - CRITICAL: URL pattern matching for *.cfargotunnel.com
  - DEPENDENCIES: Requires cloudflared config.yml
  - PLACEMENT: Scripts directory with executable permissions

Task 5: MODIFY docker-compose.yml - Add Jellyfin service
  - ADD: Complete jellyfin service definition
  - FOLLOW pattern: Plex service structure
  - NETWORKING: media_network only (no VPN needed)
  - VOLUMES: Media as read-only, config as read-write
  - HEALTH: HTTP check on /health endpoint
  - PLACEMENT: After Plex service, before web-ui

Task 6: MODIFY docker-compose.yml - Add Cloudflared service
  - ADD: cloudflared tunnel service
  - FOLLOW pattern: Standard service template
  - NETWORKING: media_network for Jellyfin access
  - VOLUMES: Credentials, shared data, scripts
  - DEPENDENCIES: Requires jellyfin healthy
  - PLACEMENT: After jellyfin service

Task 7: MODIFY config/nginx/nginx.conf
  - ADD: Jellyfin server block on port 8096
  - FOLLOW pattern: Plex server block structure
  - CRITICAL: WebSocket support, disabled buffering for streaming
  - HEADERS: Security headers, proxy headers preservation
  - PLACEMENT: After Plex server block

Task 8: MODIFY scripts/create-worktree-env.sh
  - ADD: NGINX_JELLYFIN_PORT to worktree ports
  - FOLLOW pattern: Existing port generation
  - CRITICAL: Ensure unique port allocation
  - PLACEMENT: With other NGINX port definitions

Task 9: MODIFY web-ui/src/hooks/use-service-config.ts
  - ADD: Jellyfin service mapping
  - FOLLOW pattern: Plex service configuration
  - CATEGORY: 'media' (shares icon with Plex)
  - HEALTH: Configure health endpoint
  - PLACEMENT: After Plex service mapping

Task 10: MODIFY web-ui/src/app/api/health/[service]/route.ts
  - ADD: Jellyfin health check configuration
  - FOLLOW pattern: Plex health check setup
  - ENDPOINT: /health for Jellyfin
  - TIMEOUT: 10000ms for startup delays
  - PLACEMENT: In getServiceConfigs function

Task 11: MODIFY web-ui environment in docker-compose.yml
  - ADD: JELLYFIN_URL and JELLYFIN_BACKEND_URL to web-ui service
  - FOLLOW pattern: Existing service URL variables
  - CRITICAL: Frontend uses NGINX port, backend uses internal port
  - PLACEMENT: web-ui service environment section

Task 12: CREATE Cloudflare authentication documentation
  - DOCUMENT: One-time tunnel setup commands
  - INCLUDE: Login and tunnel creation steps
  - PLACEMENT: README or setup documentation
```

### Implementation Patterns & Key Details

```bash
# Jellyfin Service Definition (docker-compose.yml)
jellyfin:
  image: ghcr.io/linuxserver/jellyfin:latest
  container_name: ${CONTAINER_PREFIX}jellyfin
  entrypoint: ["/scripts/jellyfin-entrypoint.sh"]
  networks:
    - media_network
  ports:
    - "${JELLYFIN_PORT:-8096}:8096"
    - "8920:8920"              # HTTPS port (optional)
    - "7359:7359/udp"          # Client discovery
    - "1900:1900/udp"          # DLNA
  depends_on:
    init-directories:
      condition: service_completed_successfully
  env_file:
    - .env
  environment:
    - PUID=1000
    - PGID=1000
    - TZ=${TZ:-America/New_York}
    - JELLYFIN_PublishedServerUrl=${JELLYFIN_TUNNEL_URL:-http://localhost:8096}
  volumes:
    - ./config/jellyfin:/config
    - ./config/templates/jellyfin:/templates:ro
    - ./scripts:/scripts:ro
    - ${MEDIA_ROOT:-./data/media}/movies:/data/movies:ro
    - ${MEDIA_ROOT:-./data/media}/tv:/data/tvshows:ro
    - ${DOWNLOADS_ROOT:-./data/downloads}:/downloads:ro
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8096/health"]
    interval: 60s
    timeout: 10s
    retries: 3
    start_period: 90s
  restart: unless-stopped
  stop_grace_period: 60s

# Cloudflare Tunnel Service (docker-compose.yml)
cloudflared:
  image: cloudflare/cloudflared:latest
  container_name: ${CONTAINER_PREFIX}cloudflared
  networks:
    - media_network
  volumes:
    - ./config/cloudflared:/home/nonroot/.cloudflared
    - ./data/shared:/shared-data
    - ./scripts:/scripts:ro
  entrypoint: ["/scripts/start-tunnel.sh"]
  depends_on:
    jellyfin:
      condition: service_healthy
  restart: unless-stopped

# Jellyfin Entrypoint Script (scripts/jellyfin-entrypoint.sh)
#!/bin/bash
set -e

CONFIG_DIR="/config"
TEMPLATE_DIR="/templates"

echo "[INIT] Jellyfin custom entrypoint starting..."

# Ensure config directory exists
mkdir -p "$CONFIG_DIR"

# Check if first run (no existing configuration)
if [ ! -f "$CONFIG_DIR/system.xml" ]; then
    echo "[INIT] First run detected - setting up initial configuration"

    # Create required directories
    mkdir -p "$CONFIG_DIR/data"
    mkdir -p "$CONFIG_DIR/log"
    mkdir -p "$CONFIG_DIR/cache"
    mkdir -p "$CONFIG_DIR/metadata"

    # Copy template to bypass setup wizard
    if [ -f "$TEMPLATE_DIR/system.xml.template" ]; then
        echo "[INIT] Applying system configuration template"
        envsubst < "$TEMPLATE_DIR/system.xml.template" > "$CONFIG_DIR/system.xml"
        chown 1000:1000 "$CONFIG_DIR/system.xml"
    fi

    echo "[INIT] Initial configuration complete"
else
    echo "[INIT] Existing configuration found - skipping setup"
fi

# Set proper permissions
chown -R 1000:1000 "$CONFIG_DIR"

echo "[INIT] Starting Jellyfin..."
# Execute original LinuxServer.io entrypoint
exec /init

# Tunnel Startup Script (scripts/start-tunnel.sh)
#!/bin/sh
set -e

URL_FILE="/shared-data/tunnel-url.txt"
LOG_FILE="/tmp/cloudflared.log"
CONFIG_FILE="/home/nonroot/.cloudflared/config.yml"

# Ensure shared directory exists
mkdir -p "$(dirname "$URL_FILE")"

# Check if tunnel is configured
if [ ! -f "$CONFIG_FILE" ]; then
    echo "ERROR: Tunnel not configured. Please run setup commands first."
    echo "See documentation for tunnel setup instructions."
    exit 1
fi

# Start tunnel in background, capturing output
echo "Starting Cloudflare Tunnel..."
cloudflared tunnel --config "$CONFIG_FILE" run > "$LOG_FILE" 2>&1 &
TUNNEL_PID=$!

echo "Waiting for tunnel URL..."
URL=""
ATTEMPTS=0
MAX_ATTEMPTS=60

# Poll logs for tunnel URL
while [ -z "$URL" ] && [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    sleep 2
    ATTEMPTS=$((ATTEMPTS + 1))
    URL=$(grep -o 'https://[a-zA-Z0-9-]\+\.cfargotunnel\.com' "$LOG_FILE" 2>/dev/null || true)
done

if [ -n "$URL" ]; then
    echo "Tunnel URL found: $URL"
    echo "$URL" > "$URL_FILE"
    echo "URL saved to $URL_FILE"
else
    echo "ERROR: Failed to obtain tunnel URL after $MAX_ATTEMPTS attempts"
    echo "Check logs: $LOG_FILE"
fi

# Keep container running and show logs
tail -f "$LOG_FILE"

# Nginx Proxy Configuration (config/nginx/nginx.conf addition)
server {
    listen 8096;
    server_name _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Jellyfin proxy
    location / {
        proxy_pass http://jellyfin:8096;
        proxy_http_version 1.1;

        # Required headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Disable buffering for streaming
        proxy_buffering off;
        proxy_request_buffering off;

        # Extended timeouts for large files
        proxy_connect_timeout 3600;
        proxy_send_timeout 3600;
        proxy_read_timeout 3600;
        send_timeout 3600;

        # WebSocket support for real-time updates
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Large body size for uploads
        client_max_body_size 100M;
    }
}
```

### Integration Points

```yaml
ENVIRONMENT:
  - add to: .env.example
  - variables: JELLYFIN_PORT, NGINX_JELLYFIN_PORT, JELLYFIN_URL, JELLYFIN_BACKEND_URL

NETWORKING:
  - network: media_network only (no VPN isolation)
  - ports: 8096 (HTTP), 8920 (HTTPS), 7359/udp, 1900/udp

VOLUMES:
  - config: ./config/jellyfin:/config
  - media: Read-only mounts to /data/movies and /data/tvshows
  - shared: ./data/shared for tunnel URL persistence

DEPENDENCIES:
  - jellyfin: Depends on init-directories
  - cloudflared: Depends on jellyfin healthy
  - nginx-proxy: Add jellyfin to dependencies

TEMPLATES:
  - config/templates/jellyfin/system.xml.template: Bypass setup wizard

SCRIPTS:
  - scripts/jellyfin-entrypoint.sh: Service initialization
  - scripts/start-tunnel.sh: Tunnel management

WEB_UI:
  - hooks/use-service-config.ts: Add Jellyfin service mapping
  - api/health/[service]/route.ts: Add Jellyfin health config
  - Environment: Add JELLYFIN_URL and JELLYFIN_BACKEND_URL
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Docker Compose validation
docker compose config                              # Validate compose syntax
docker compose -f docker-compose.yml -f docker-compose.pia.yml config  # PIA variant

# Shell script validation
shellcheck scripts/jellyfin-entrypoint.sh scripts/start-tunnel.sh
chmod +x scripts/jellyfin-entrypoint.sh scripts/start-tunnel.sh

# XML template validation
xmllint --noout config/templates/jellyfin/system.xml.template

# Nginx configuration test
docker exec nginx-proxy nginx -t

# Expected: Zero syntax errors
```

### Level 2: Unit Tests (Component Validation)

```bash
# Template substitution test
export CONTAINER_PREFIX="test-"
envsubst < config/templates/jellyfin/system.xml.template > /tmp/test-system.xml
xmllint --noout /tmp/test-system.xml
grep "IsStartupWizardCompleted>true" /tmp/test-system.xml

# Directory creation verification
docker compose run --rm init-directories
ls -la ./config/jellyfin ./config/cloudflared ./data/shared

# Port availability check
nc -zv localhost 8096 && echo "Port 8096 in use" || echo "Port 8096 available"

# Expected: Templates process correctly, directories exist
```

### Level 3: Integration Testing (System Validation)

```bash
# Service startup - Default Cloudflare WARP
docker compose down
docker compose up -d jellyfin

# Wait for healthy status
docker compose ps jellyfin
docker logs jellyfin

# Health check verification
curl -f http://localhost:8096/health || echo "Health check failed"

# Web interface accessibility
curl -I http://localhost:8096/web/index.html

# Multi-VPN validation - PIA configuration
docker compose down
docker compose -f docker-compose.yml -f docker-compose.pia.yml up -d

# Verify VPN isolation maintained
docker exec qbittorrent curl -s https://ipinfo.io/ip  # Should show VPN IP
docker exec jellyfin curl -s https://ipinfo.io/ip     # Should show real IP

# Media access verification
docker exec jellyfin ls -la /data/movies /data/tvshows

# Expected: All services healthy, proper network isolation
```

### Level 4: Creative & Domain-Specific Validation

```bash
# One-time Cloudflare Tunnel Setup (Manual)
echo "=== ONE-TIME SETUP REQUIRED ==="
echo "Run these commands once to set up the tunnel:"
echo ""
echo "# Step 1: Authenticate with Cloudflare"
echo "docker run --rm -it -v ./config/cloudflared:/home/nonroot/.cloudflared cloudflare/cloudflared tunnel login"
echo ""
echo "# Step 2: Create tunnel"
echo "docker run --rm -it -v ./config/cloudflared:/home/nonroot/.cloudflared cloudflare/cloudflared tunnel create jellyfin-tunnel"
echo ""
echo "# Step 3: Create config.yml with tunnel details"
echo "# Note: Get UUID from the .json file created in step 2"

# After tunnel setup, start cloudflared
docker compose up -d cloudflared

# Verify tunnel URL persistence
sleep 10
cat ./data/shared/tunnel-url.txt

# Web UI integration test
docker compose up -d web-ui
sleep 5
curl http://localhost:3000/api/health/jellyfin

# Media library scan test
# 1. Add media file to ./data/media/movies
# 2. Access Jellyfin web UI
# 3. Verify media appears in library

# Performance validation
docker stats --no-stream jellyfin
docker exec jellyfin df -h /config /data

# Network connectivity matrix
docker exec jellyfin ping -c 1 sonarr      # Should work
docker exec jellyfin ping -c 1 radarr      # Should work
docker exec jellyfin ping -c 1 plex        # Should work

# Expected: Tunnel URL generated, all integrations working
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] Docker Compose files validate without syntax errors
- [ ] Shell scripts pass shellcheck validation
- [ ] XML templates generate valid configuration
- [ ] All containers reach healthy status
- [ ] No port conflicts in worktree environments

### Feature Validation

- [ ] Jellyfin starts automatically with `docker compose up -d`
- [ ] Setup wizard is bypassed via template configuration
- [ ] Cloudflare Tunnel generates permanent HTTPS URL
- [ ] Tunnel URL is persisted to ./data/shared/tunnel-url.txt
- [ ] Media libraries (/movies, /tv) are accessible and scannable
- [ ] Web UI displays Jellyfin with working health checks
- [ ] Remote access works via Cloudflare Tunnel URL
- [ ] Both VPN configurations (WARP and PIA) work correctly

### Code Quality Validation

- [ ] Follows existing service patterns (entrypoint, volumes, networking)
- [ ] Uses established template restoration pattern
- [ ] Environment variables follow naming conventions
- [ ] Network isolation preserved (qBittorrent remains VPN-only)
- [ ] Scripts are executable with proper error handling
- [ ] Configuration files use appropriate substitution patterns

### Documentation & Deployment

- [ ] Environment variables documented in .env.example
- [ ] One-time tunnel setup clearly documented
- [ ] Service integrates with existing dashboard
- [ ] Health monitoring provides accurate status
- [ ] Logs are informative without being verbose

---

## Anti-Patterns to Avoid

- ❌ Don't add Jellyfin to VPN network (it doesn't need torrent protection)
- ❌ Don't use host networking (conflicts with container isolation)
- ❌ Don't hardcode tunnel URLs (they're dynamically generated)
- ❌ Don't skip health check start_period (Jellyfin has slow startup)
- ❌ Don't write to media directories (keep them read-only)
- ❌ Don't expose unnecessary ports externally
- ❌ Don't generate Cloudflare credentials (user must authenticate)
- ❌ Don't modify VPN isolation for qBittorrent
- ❌ Don't skip directory permission setup (PUID/PGID critical)
- ❌ Don't ignore template restoration checks (avoid overwriting configs)

---

## Confidence Score: 9/10

This PRP provides comprehensive implementation details following all established project patterns. The only manual step is the one-time Cloudflare authentication, which cannot be automated. All other aspects are fully automated and follow existing conventions precisely.