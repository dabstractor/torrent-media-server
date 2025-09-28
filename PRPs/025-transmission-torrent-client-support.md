name: "Transmission Torrent Client Support with Dynamic Client Switching"
description: |
  Add Transmission as an alternative torrent client option alongside qBittorrent with
  dynamic switching via TORRENT_CLIENT environment variable and automated service reconfiguration

---

## Goal

**Feature Goal**: Enable users to choose between qBittorrent and Transmission torrent clients through a single environment variable, with automatic service configuration and database pre-loading based on the selected client.

**Deliverable**: Complete torrent client abstraction layer with Transmission Docker integration, conditional database templates, and dynamic service configuration system.

**Success Definition**: Users can switch between torrent clients by changing TORRENT_CLIENT env var and restarting the stack, with all services (Sonarr/Radarr/Prowlarr) automatically configured for the selected client.

## User Persona

**Target User**: Self-hosted media server administrators

**Use Case**: Users who prefer Transmission's simplicity or have existing Transmission configurations want to use this stack without being forced to use qBittorrent.

**User Journey**:
1. User sets TORRENT_CLIENT=transmission in .env file
2. User runs docker compose up -d
3. All services start with Transmission pre-configured
4. Media downloads work seamlessly through Transmission

**Pain Points Addressed**:
- Forced to use qBittorrent when preferring Transmission
- Manual reconfiguration of all services when switching clients
- Complex authentication requirements

## Why

- Transmission is lightweight and preferred by many users for its simplicity
- Some users have existing Transmission configurations they want to preserve
- Provides flexibility in torrent client choice without sacrificing functionality
- Reduces vendor lock-in and increases project adoption

## What

Enable seamless switching between qBittorrent and Transmission torrent clients through:
- Environment variable TORRENT_CLIENT (values: "qbittorrent" or "transmission")
- Automatic database pre-configuration for selected client
- Conditional Docker Compose service loading
- Shared configuration patterns for both clients

### Success Criteria

- [ ] TORRENT_CLIENT environment variable controls active client
- [ ] Transmission runs without authentication requirements
- [ ] All existing qBittorrent functionality works with Transmission
- [ ] Sonarr/Radarr/Prowlarr automatically configure for selected client
- [ ] Both clients maintain VPN isolation (network_mode: "container:vpn")
- [ ] Nginx proxy routes work for both clients
- [ ] Docker health checks pass for all services
- [ ] Switching clients requires only env change and stack restart

## All Needed Context

### Context Completeness Check

_This PRP contains all file paths, patterns, and implementation details needed to add Transmission support without prior knowledge of the codebase._

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://docs.linuxserver.io/images/docker-transmission/#application-setup
  why: Official Transmission Docker configuration and environment variables
  critical: RPC authentication settings and network configuration

- url: https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md
  why: Transmission RPC API specification for integration
  critical: Understanding API endpoints for Sonarr/Radarr integration

- file: /home/dustin/projects/torrents/docker-compose.yml
  why: Container definitions and network architecture
  pattern: qbittorrent service definition (lines with network_mode, volumes, environment)
  gotcha: MUST preserve network_mode: "container:${CONTAINER_PREFIX}vpn" for VPN isolation

- file: /home/dustin/projects/torrents/scripts/qbittorrent-entrypoint.sh
  why: Entrypoint pattern for configuration initialization
  pattern: First-run marker, template processing, background monitoring
  gotcha: Must handle both fresh installs and existing configurations

- file: /home/dustin/projects/torrents/config/templates/sonarr/sonarr.db.template.sql
  why: Database pre-configuration for download client
  pattern: DownloadClients INSERT statement (lines 21-22)
  gotcha: JSON Settings column must match exact structure

- file: /home/dustin/projects/torrents/config/templates/radarr/radarr.db.template.sql
  why: Database pre-configuration for download client
  pattern: DownloadClients INSERT statement (lines 49-50)
  gotcha: Categories configuration for media organization

- file: /home/dustin/projects/torrents/config/templates/prowlarr/complete_database.sql
  why: Complete database with download client references
  pattern: Applications table configuration
  gotcha: Must disable proxy to prevent timeouts (proxyenabled=False)

- file: /home/dustin/projects/torrents/scripts/sonarr-entrypoint.sh
  why: Runtime API configuration pattern
  pattern: curl commands updating download client settings
  gotcha: Background tasks with specific timing for service readiness

- file: /home/dustin/projects/torrents/scripts/radarr-entrypoint.sh
  why: Similar runtime configuration pattern
  pattern: API-based password updates after database restoration
  gotcha: Category configuration for proper media routing

- docfile: PRPs/ai_docs/transmission-settings-structure.md
  why: Complete Transmission settings.json structure for templating
  section: Authentication and RPC configuration
```

### Current Codebase Tree (relevant sections)

```bash
torrents/
├── docker-compose.yml              # Main compose file with qbittorrent service
├── docker-compose.pia.yml          # Alternative VPN provider
├── .env.example                    # Environment variables template
├── config/
│   ├── qbittorrent/               # Runtime qbittorrent config
│   └── templates/
│       ├── qbittorrent/
│       │   └── qBittorrent.conf.template
│       ├── sonarr/
│       │   ├── sonarr.db.template
│       │   └── sonarr.db.template.sql
│       ├── radarr/
│       │   ├── radarr.db.template
│       │   └── radarr.db.template.sql
│       └── prowlarr/
│           ├── prowlarr.db.template
│           └── complete_database.sql
├── scripts/
│   ├── qbittorrent-entrypoint.sh
│   ├── qbittorrent-wrapper.sh
│   ├── sonarr-entrypoint.sh
│   ├── radarr-entrypoint.sh
│   └── prowlarr-entrypoint.sh
└── web-ui/
    └── src/app/api/
        └── qbittorrent/        # API proxy routes
```

### Desired Codebase Tree with Files to be Added

```bash
torrents/
├── docker-compose.yml              # Modified: Conditional service loading
├── .env.example                    # Modified: Add TORRENT_CLIENT variable
├── config/
│   └── templates/
│       ├── transmission/           # NEW: Transmission templates
│       │   └── settings.json.template
│       ├── sonarr/
│       │   ├── sonarr.db.qbittorrent.sql  # NEW: Client-specific SQL
│       │   └── sonarr.db.transmission.sql # NEW: Client-specific SQL
│       ├── radarr/
│       │   ├── radarr.db.qbittorrent.sql  # NEW: Client-specific SQL
│       │   └── radarr.db.transmission.sql # NEW: Client-specific SQL
│       └── prowlarr/
│           ├── applications.qbittorrent.sql  # NEW: Client-specific SQL
│           └── applications.transmission.sql # NEW: Client-specific SQL
├── scripts/
│   ├── transmission-entrypoint.sh # NEW: Transmission initialization
│   ├── common/                    # NEW: Shared utilities
│   │   └── torrent-client-selector.sh
│   ├── sonarr-entrypoint.sh      # Modified: Dynamic client config
│   ├── radarr-entrypoint.sh      # Modified: Dynamic client config
│   └── prowlarr-entrypoint.sh    # Modified: Dynamic client config
└── web-ui/
    └── src/app/api/
        └── transmission/           # NEW: Transmission API routes
```

### Known Gotchas & Library Quirks

```bash
# CRITICAL: VPN Network Isolation
# Both torrent clients MUST use network_mode: "container:vpn"
# Direct port exposure would leak real IP during torrenting

# CRITICAL: Prowlarr Proxy Settings
# Must set proxyenabled=False in database to prevent timeouts
# This applies to both qBittorrent and Transmission configurations

# CRITICAL: Service Dependencies
# Services must wait for torrent client to be healthy before configuring
# Use progressive delays: 5s, 10s, 15s for different configuration stages

# GOTCHA: Transmission Authentication
# Unlike qBittorrent, Transmission uses rpc-authentication-required setting
# Must disable for local network access via whitelist

# GOTCHA: Database JSON Structure
# Settings column in DownloadClients table requires exact JSON structure
# Different fields for qBittorrent vs Transmission configurations

# GOTCHA: First-Run Detection
# Must not overwrite user customizations on container restart
# Use marker files to detect first run vs restart
```

## Implementation Blueprint

### Data Models and Structure

```bash
# Environment Variable Structure
TORRENT_CLIENT=transmission  # or qbittorrent (default)
TRANSMISSION_USERNAME=""      # Empty for no auth
TRANSMISSION_PASSWORD=""      # Empty for no auth
TRANSMISSION_PORT=51413       # Peer port
TRANSMISSION_RPC_PORT=9091    # Web UI/RPC port

# Database JSON Structures

# qBittorrent DownloadClient Settings JSON:
{
  "host": "nginx-proxy",
  "port": 8080,
  "useSsl": false,
  "username": "admin",
  "password": "adminadmin",
  "category": "sonarr",  # or radarr
  "priority": 0,
  "initialState": 0
}

# Transmission DownloadClient Settings JSON:
{
  "host": "nginx-proxy",
  "port": 9091,
  "useSsl": false,
  "username": "",
  "password": "",
  "category": "sonarr",  # folder-based organization
  "directory": "/downloads/complete/sonarr"
}

# Common SQL Template Structure:
INSERT INTO DownloadClients VALUES(
    1,                        # Id
    1,                        # Enable
    'CLIENT_NAME',           # Name (qBittorrent or Transmission)
    'CLIENT_IMPLEMENTATION',  # Implementation class
    'SETTINGS_JSON',         # Settings JSON blob
    'CLIENT_SETTINGS_CONTRACT', # Contract name
    1,                        # Priority
    '[]'                     # Categories
);
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE scripts/common/torrent-client-selector.sh
  - IMPLEMENT: Shared function to determine active torrent client
  - EXPORT: TORRENT_CLIENT_NAME, TORRENT_CLIENT_PORT, TORRENT_CLIENT_INTERNAL_PORT
  - FOLLOW pattern: VPN provider selector pattern in docker-compose.yml
  - NAMING: torrent_client_selector() function
  - PLACEMENT: Common utilities directory for script reuse

Task 2: CREATE config/templates/transmission/settings.json.template
  - IMPLEMENT: Transmission configuration with environment variable placeholders
  - INCLUDE: RPC settings, authentication disabled, download paths
  - FOLLOW pattern: config/templates/qbittorrent/qBittorrent.conf.template
  - CRITICAL: Set rpc-authentication-required to false, configure whitelist
  - PLACEMENT: Parallel to qbittorrent template structure

Task 3: CREATE scripts/transmission-entrypoint.sh
  - IMPLEMENT: Initialization script for Transmission container
  - FOLLOW pattern: scripts/qbittorrent-entrypoint.sh structure
  - INCLUDE: Template processing, first-run detection, config restoration
  - CRITICAL: Handle settings.json generation with proper JSON structure
  - PLACEMENT: Scripts directory alongside other entrypoint scripts

Task 4: CREATE config/templates/sonarr/sonarr.db.qbittorrent.sql
  - EXTRACT: Current SQL from sonarr.db.template.sql
  - PRESERVE: Exact qBittorrent configuration JSON structure
  - NAMING: Client-specific SQL file for clarity
  - PLACEMENT: Alongside existing template

Task 5: CREATE config/templates/sonarr/sonarr.db.transmission.sql
  - COPY: Base structure from sonarr.db.qbittorrent.sql
  - MODIFY: DownloadClients INSERT for Transmission settings
  - CHANGE: Implementation to 'Transmission', Settings to Transmission JSON
  - PLACEMENT: Alongside qbittorrent SQL

Task 6: CREATE config/templates/radarr/radarr.db.qbittorrent.sql
  - EXTRACT: Current SQL from radarr.db.template.sql
  - PRESERVE: Exact qBittorrent configuration
  - PLACEMENT: Alongside existing template

Task 7: CREATE config/templates/radarr/radarr.db.transmission.sql
  - COPY: Base from radarr.db.qbittorrent.sql
  - MODIFY: DownloadClients for Transmission
  - INCLUDE: Folder-based category management
  - PLACEMENT: Alongside qbittorrent SQL

Task 8: CREATE config/templates/prowlarr/applications.qbittorrent.sql
  - EXTRACT: Applications table inserts from complete_database.sql
  - PRESERVE: Current qBittorrent references
  - PLACEMENT: Prowlarr templates directory

Task 9: CREATE config/templates/prowlarr/applications.transmission.sql
  - COPY: Base from applications.qbittorrent.sql
  - MODIFY: Download client references to Transmission
  - CRITICAL: Maintain proxyenabled=False
  - PLACEMENT: Prowlarr templates directory

Task 10: MODIFY scripts/sonarr-entrypoint.sh
  - ADD: Source scripts/common/torrent-client-selector.sh
  - IMPLEMENT: Conditional SQL template selection based on $TORRENT_CLIENT
  - MODIFY: API configuration calls to use dynamic client settings
  - PRESERVE: Existing timing and dependency patterns

Task 11: MODIFY scripts/radarr-entrypoint.sh
  - ADD: Source scripts/common/torrent-client-selector.sh
  - IMPLEMENT: Conditional SQL template selection
  - MODIFY: API configuration for dynamic client
  - PRESERVE: Background task patterns

Task 12: MODIFY scripts/prowlarr-entrypoint.sh
  - ADD: Source scripts/common/torrent-client-selector.sh
  - IMPLEMENT: Conditional SQL loading for applications
  - PRESERVE: Simple restoration pattern

Task 13: MODIFY docker-compose.yml
  - ADD: Transmission service definition with VPN network mode
  - IMPLEMENT: Conditional service profiles or environment-based selection
  - PRESERVE: VPN isolation pattern (network_mode: "container:${CONTAINER_PREFIX}vpn")
  - ADD: Health check for Transmission

Task 14: MODIFY .env.example
  - ADD: TORRENT_CLIENT=transmission (new default)
  - ADD: TRANSMISSION_USERNAME=""
  - ADD: TRANSMISSION_PASSWORD=""
  - ADD: TRANSMISSION_PORT=51413
  - ADD: TRANSMISSION_RPC_PORT=9091
  - DOCUMENT: Clear comments about client selection

Task 15: CREATE web-ui/src/app/api/transmission/[...path]/route.ts
  - COPY: Structure from web-ui/src/app/api/qbittorrent/[...path]/route.ts
  - MODIFY: Proxy to Transmission RPC endpoint
  - IMPLEMENT: RPC request transformation if needed
  - PLACEMENT: Parallel API structure

Task 16: MODIFY nginx configuration
  - ADD: Proxy pass rules for /transmission path
  - FOLLOW pattern: Existing /qbittorrent proxy configuration
  - PRESERVE: Security headers and authentication
  - LOCATION: Check nginx config location in project
```

### Implementation Patterns & Key Details

```bash
# Torrent Client Selector Pattern
#!/bin/bash
# scripts/common/torrent-client-selector.sh

torrent_client_selector() {
    export TORRENT_CLIENT="${TORRENT_CLIENT:-qbittorrent}"

    case "$TORRENT_CLIENT" in
        "transmission")
            export TORRENT_CLIENT_NAME="Transmission"
            export TORRENT_CLIENT_IMPLEMENTATION="Transmission"
            export TORRENT_CLIENT_PORT="${TRANSMISSION_RPC_PORT:-9091}"
            export TORRENT_CLIENT_INTERNAL_PORT="9091"
            export TORRENT_CLIENT_SQL_SUFFIX="transmission"
            ;;
        "qbittorrent"|*)
            export TORRENT_CLIENT_NAME="qBittorrent"
            export TORRENT_CLIENT_IMPLEMENTATION="QBittorrent"
            export TORRENT_CLIENT_PORT="${QBITTORRENT_PORT:-8080}"
            export TORRENT_CLIENT_INTERNAL_PORT="8080"
            export TORRENT_CLIENT_SQL_SUFFIX="qbittorrent"
            ;;
    esac
}

# Conditional SQL Loading Pattern
# In sonarr-entrypoint.sh
source /scripts/common/torrent-client-selector.sh
torrent_client_selector

SQL_TEMPLATE="$TEMPLATE_DIR/sonarr.db.${TORRENT_CLIENT_SQL_SUFFIX}.sql"
if [ -f "$SQL_TEMPLATE" ]; then
    sqlite3 "$CONFIG_DIR/sonarr.db" < "$SQL_TEMPLATE"
fi

# Transmission Settings Template Pattern
{
    "download-dir": "/downloads/complete",
    "incomplete-dir": "/downloads/incomplete",
    "incomplete-dir-enabled": true,
    "rpc-enabled": true,
    "rpc-port": ${TRANSMISSION_RPC_PORT:-9091},
    "rpc-whitelist": "127.0.0.1,192.168.*.*,172.*.*.*,10.*.*.*",
    "rpc-whitelist-enabled": true,
    "rpc-authentication-required": false,
    "rpc-username": "${TRANSMISSION_USERNAME}",
    "rpc-password": "${TRANSMISSION_PASSWORD}"
}

# Docker Compose Service Pattern
transmission:
  image: lscr.io/linuxserver/transmission:latest
  container_name: ${CONTAINER_PREFIX}transmission
  network_mode: "container:${CONTAINER_PREFIX}vpn"  # CRITICAL: VPN isolation
  environment:
    - PUID=1000
    - PGID=1000
    - TZ=${TZ:-America/New_York}
  volumes:
    - ./config/transmission:/config
    - ./config/templates/transmission:/templates:ro
    - ./data/downloads:/downloads
    - ./data:/data
    - ./scripts:/scripts:ro
    - ./scripts/transmission-entrypoint.sh:/scripts/transmission-entrypoint.sh:ro
  entrypoint: ["/scripts/transmission-entrypoint.sh"]
  depends_on:
    vpn:
      condition: service_healthy
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:9091/transmission/web/"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
  profiles:
    - "${TORRENT_CLIENT:-qbittorrent}"  # Conditional loading
```

### Integration Points

```yaml
DATABASE:
  - sonarr.db: "DownloadClients table with conditional Transmission config"
  - radarr.db: "DownloadClients table with conditional Transmission config"
  - prowlarr.db: "Applications table with Transmission references"

CONFIG:
  - add to: .env.example
  - pattern: "TORRENT_CLIENT=transmission"

ROUTES:
  - add to: nginx proxy configuration
  - pattern: "location /transmission { proxy_pass http://transmission:9091; }"

API:
  - add to: web-ui/src/app/api/
  - pattern: "transmission/[...path]/route.ts for RPC proxy"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# After creating shell scripts
shellcheck scripts/transmission-entrypoint.sh
shellcheck scripts/common/torrent-client-selector.sh

# Validate JSON templates
jq . config/templates/transmission/settings.json.template

# Check SQL syntax
sqlite3 test.db < config/templates/sonarr/sonarr.db.transmission.sql
sqlite3 test.db < config/templates/radarr/radarr.db.transmission.sql

# Expected: Zero errors in all checks
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test torrent client selector
TORRENT_CLIENT=transmission bash -c 'source scripts/common/torrent-client-selector.sh && torrent_client_selector && echo $TORRENT_CLIENT_NAME'
# Expected: "Transmission"

TORRENT_CLIENT=qbittorrent bash -c 'source scripts/common/torrent-client-selector.sh && torrent_client_selector && echo $TORRENT_CLIENT_NAME'
# Expected: "qBittorrent"

# Test environment variable substitution
TRANSMISSION_RPC_PORT=9091 envsubst < config/templates/transmission/settings.json.template | jq .
# Expected: Valid JSON with substituted values
```

### Level 3: Integration Testing (System Validation)

```bash
# Build with Transmission
echo "TORRENT_CLIENT=transmission" >> .env
docker compose up -d

# Wait for services to be healthy
sleep 60

# Check all containers are healthy
docker compose ps --format "table {{.Name}}\t{{.Status}}"
# Expected: All containers show "Up X seconds (healthy)"

# Verify Transmission is accessible
curl -f http://localhost:9091/transmission/web/
# Expected: HTML response from Transmission web UI

# Check Sonarr configuration
curl -H "X-Api-Key: $SONARR_API_KEY" http://localhost:8989/api/v3/downloadclient
# Expected: JSON showing Transmission as configured client

# Check Radarr configuration
curl -H "X-Api-Key: $RADARR_API_KEY" http://localhost:7878/api/v3/downloadclient
# Expected: JSON showing Transmission as configured client

# Test with qBittorrent
docker compose down
sed -i 's/TORRENT_CLIENT=transmission/TORRENT_CLIENT=qbittorrent/' .env
docker compose up -d
sleep 60

# Verify qBittorrent is active
curl -f http://localhost:8080/qbittorrent/
# Expected: qBittorrent web UI response
```

### Level 4: VPN & Security Validation

```bash
# CRITICAL: Verify VPN isolation for Transmission
docker exec ${CONTAINER_PREFIX}transmission curl -s https://api.ipify.org
VPN_IP=$?
docker exec ${CONTAINER_PREFIX}nginx curl -s https://api.ipify.org
REAL_IP=$?

[ "$VPN_IP" != "$REAL_IP" ] && echo "PASS: VPN isolation working" || echo "FAIL: VPN isolation broken!"

# Test all Docker Compose variations
docker compose -f docker-compose.yml -f docker-compose.pia.yml up -d
# Expected: All containers healthy with PIA VPN

# Security test script
./test-security.sh
# Expected: All security tests pass

# Verify no authentication required
curl -I http://localhost:9091/transmission/rpc/
# Expected: 200 OK or 409 Conflict (no 401 Unauthorized)
```

## Final Validation Checklist

### Technical Validation

- [ ] All validation levels completed successfully
- [ ] Shell scripts pass shellcheck
- [ ] JSON templates are valid
- [ ] SQL templates execute without errors
- [ ] Docker containers all show healthy status

### Feature Validation

- [ ] TORRENT_CLIENT=transmission starts Transmission
- [ ] TORRENT_CLIENT=qbittorrent starts qBittorrent
- [ ] Sonarr/Radarr/Prowlarr auto-configure for selected client
- [ ] No authentication required for Transmission
- [ ] Downloads complete successfully with both clients
- [ ] VPN isolation maintained for both clients
- [ ] Web UI accessible for both clients

### Code Quality Validation

- [ ] Follows existing entrypoint script patterns
- [ ] Reuses common code via torrent-client-selector.sh
- [ ] Preserves all security requirements (VPN isolation)
- [ ] No hardcoded values - all configurable via environment
- [ ] First-run detection prevents config overwrites
- [ ] Database modifications use proper SQL structure

### Documentation & Deployment

- [ ] .env.example includes all new variables with comments
- [ ] TORRENT_CLIENT defaults to transmission as specified
- [ ] Switching clients only requires env change and restart
- [ ] All existing qBittorrent functionality preserved

---

## Anti-Patterns to Avoid

- ❌ Don't expose torrent client ports directly - use nginx proxy
- ❌ Don't break VPN isolation - maintain network_mode: "container:vpn"
- ❌ Don't hardcode client names - use environment variables
- ❌ Don't skip health checks - all services must be monitored
- ❌ Don't forget proxyenabled=False in Prowlarr database
- ❌ Don't overwrite user customizations on restart
- ❌ Don't mix authentication methods between clients
- ❌ Don't create duplicate code - use shared functions

## Confidence Score

**One-Pass Implementation Success Likelihood: 8/10**

The comprehensive research, detailed patterns, and SQL templates provide strong foundation. Main complexity lies in conditional Docker service loading and ensuring smooth client switching without breaking existing functionality.