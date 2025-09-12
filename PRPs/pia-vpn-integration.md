name: "PIA VPN WireGuard Integration PRP"
description: |
  Comprehensive implementation guide for integrating Private Internet Access (PIA) VPN 
  with WireGuard in the existing Docker torrent stack, replacing generic WireGuard setup 
  with PIA credential-based authentication.

---

## Goal

**Feature Goal**: Replace the generic WireGuard VPN setup with Private Internet Access (PIA) integration that uses username/password credentials for automatic WireGuard configuration and authentication.

**Deliverable**: Modified Docker Compose configuration and supporting scripts that automatically configure WireGuard using PIA credentials, ensuring all torrent traffic is routed through PIA's VPN servers with proper authentication.

**Success Definition**: 
- All torrent services (qBittorrent, Sonarr, Radarr, Prowlarr) route traffic through PIA VPN
- VPN connection automatically established using PIA username/password
- WireGuard configuration generated dynamically from PIA API
- Port forwarding enabled for torrent client functionality
- VPN reconnects automatically on failure or token expiration
- IP address verification shows PIA server IP, not host IP

## User Persona

**Target User**: Self-hosted media server administrator seeking secure, automated torrent downloads through a commercial VPN provider

**Use Case**: Protecting torrent traffic through PIA VPN while maintaining the existing media automation stack (Sonarr/Radarr/Prowlarr/qBittorrent/Plex)

**User Journey**:
1. Configure PIA credentials in environment variables
2. Start Docker stack with `docker-compose up -d`
3. VPN automatically connects using PIA credentials
4. All torrent traffic routes through PIA servers
5. Port forwarding enables proper torrent functionality
6. VPN maintains connection and handles token refresh

**Pain Points Addressed**:
- Manual WireGuard configuration complexity
- VPN credential management and rotation
- Ensuring torrent traffic protection
- Port forwarding setup for optimal torrent performance

## Why

- **Security Compliance**: PIA provides commercial-grade VPN protection for torrent activities
- **Automation**: Eliminates manual WireGuard configuration and credential management
- **Legal Protection**: Routes torrent traffic through PIA's infrastructure for privacy
- **Integration Efficiency**: Maintains existing container architecture while adding VPN security
- **Operational Reliability**: Automated connection management and health monitoring

## What

Replace the current generic WireGuard container (`ghcr.io/linuxserver/wireguard`) with PIA-integrated solution that:

### User-Visible Behavior
- Docker stack starts with PIA VPN automatically configured
- All torrent services show PIA server IP addresses
- Port forwarding works seamlessly for torrent downloads
- VPN status visible in container logs and health checks
- Automatic reconnection on connection failures

### Technical Requirements
- PIA username/password authentication
- Dynamic WireGuard configuration generation
- Token-based API authentication with PIA services
- Port forwarding automation
- Health monitoring and automatic recovery
- Persistent configuration and credential storage

### Success Criteria
- [ ] VPN container successfully authenticates with PIA using credentials
- [ ] WireGuard configuration generated automatically from PIA API
- [ ] All dependent containers (qbittorrent, sonarr, radarr, prowlarr) route through VPN
- [ ] IP verification shows PIA server address, not host IP
- [ ] Port forwarding enabled and working for torrent client
- [ ] VPN reconnects automatically on failure or 24-hour token expiration
- [ ] Container health checks pass consistently
- [ ] Existing functionality (torrent downloads, media management) remains intact

## All Needed Context

### Context Completeness Check

_This PRP provides everything needed to implement PIA VPN integration: existing Docker setup analysis, PIA authentication patterns, WireGuard configuration methods, container integration approaches, and comprehensive validation procedures._

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://github.com/pia-foss/manual-connections/blob/master/connect_to_wireguard_with_token.sh
  why: Official PIA WireGuard connection script showing token-based authentication flow
  critical: Demonstrates API endpoints, authentication method, and config generation
  section: Authentication flow, config generation, API endpoints

- url: https://github.com/thrnz/docker-wireguard-pia
  why: Production-ready Docker container for PIA WireGuard integration
  critical: Environment variables, Docker Compose patterns, volume management
  section: README.md, docker-compose examples, environment configuration

- url: https://github.com/linuxserver-labs/wireguard-pia
  why: LinuxServer container modification for PIA integration - maintains familiar structure
  critical: Migration path from existing linuxserver/wireguard setup
  section: Installation, configuration, environment variables

- file: /home/dustin/projects/torrents/docker-compose.yml
  why: Current VPN container configuration and network setup
  pattern: Service dependencies, network_mode usage, health checks
  gotcha: Existing containers use `network_mode: service:vpn` - must maintain compatibility

- file: /home/dustin/projects/torrents/config/vpn/templates/server.conf
  why: Current WireGuard configuration template structure
  pattern: Interface configuration, PostUp/PostDown iptables rules
  gotcha: Template variables need replacement with PIA-specific configuration

- file: /home/dustin/projects/torrents/.env.example
  why: Environment variable patterns and naming conventions
  pattern: VPN_* variable naming, credential management approach
  gotcha: Need to add PIA_USER and PIA_PASS variables securely

- docfile: PRPs/ai_docs/pia-integration-patterns.md
  why: PIA-specific authentication patterns and Docker integration methods
  section: Token authentication, port forwarding, credential management
```

### Current Codebase tree

```bash
torrents/
├── docker-compose.yml           # Main container orchestration - VPN service definition
├── .env.example                # Environment template - needs PIA credentials added
├── config/
│   └── vpn/                    # VPN configuration directory
│       ├── templates/          # WireGuard templates - replace with PIA automation
│       ├── wg_confs/          # Generated configs - PIA will populate this
│       └── coredns/           # DNS configuration - may need PIA DNS servers
├── data/                       # Persistent data storage
└── web-ui/                     # Web interface - no changes needed
```

### Desired Codebase tree with files to be added and responsibility of file

```bash
torrents/
├── docker-compose.yml           # MODIFY: Replace wireguard service with PIA container
├── .env.example                # MODIFY: Add PIA_USER, PIA_PASS, PIA_REGION variables
├── .env                        # MODIFY: User adds actual PIA credentials
├── config/
│   └── vpn/                    
│       ├── pia/                # CREATE: PIA-specific configuration directory
│       │   ├── auth.json       # CREATE: PIA authentication token storage
│       │   └── servers.json    # CREATE: PIA server list cache
│       ├── scripts/            # CREATE: Automation scripts directory
│       │   ├── pia-connect.sh  # CREATE: PIA connection automation script
│       │   ├── healthcheck.sh  # CREATE: VPN health monitoring script
│       │   └── port-forward.sh # CREATE: Port forwarding automation script
│       └── wg_confs/           # PRESERVE: Auto-generated WireGuard configs
└── PRPs/
    └── ai_docs/
        └── pia-integration-patterns.md  # CREATE: PIA implementation patterns doc
```

### Known Gotchas of our codebase & Library Quirks

```bash
# CRITICAL: Docker container dependencies
# Current containers use network_mode: service:vpn which requires VPN container name "vpn"
# All dependent containers will fail if VPN container doesn't start properly

# CRITICAL: PIA token expiration
# PIA tokens expire every 24 hours and need automatic refresh
# Container must handle token refresh without breaking dependent services

# CRITICAL: Port forwarding requirement
# qBittorrent requires incoming ports for optimal performance
# PIA port forwarding must be enabled and configured properly

# CRITICAL: DNS configuration
# Current setup may use custom DNS - ensure PIA DNS doesn't conflict
# Consider using PIA DNS servers for better privacy

# CRITICAL: IP leak prevention  
# Must verify all traffic routes through VPN, not just torrent traffic
# Disable IPv6 to prevent potential IP leaks

# CRITICAL: LinuxServer container patterns
# Existing setup uses LinuxServer containers (PUID/PGID patterns)
# New PIA container must follow same user/group ID patterns for file permissions
```

## Implementation Blueprint

### Data models and structure

```bash
# PIA Authentication Configuration
PIA_USER=your_pia_username        # PIA account username
PIA_PASS=your_pia_password        # PIA account password  
PIA_REGION=swiss                  # Preferred PIA server region
PORT_FORWARDING=1                 # Enable port forwarding (1=yes, 0=no)
LOCAL_NETWORK=192.168.1.0/24      # Local network for LAN access
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE PRPs/ai_docs/pia-integration-patterns.md
  - IMPLEMENT: PIA authentication patterns documentation
  - INCLUDE: Token-based authentication flow, Docker integration examples, troubleshooting guide
  - CONTENT: PIA API endpoints, environment variable patterns, security considerations
  - PURPOSE: Reference documentation for implementation context

Task 2: MODIFY .env.example
  - ADD: PIA credential environment variables (PIA_USER, PIA_PASS, PIA_REGION)
  - ADD: Port forwarding and network configuration variables
  - FOLLOW pattern: existing VPN_* variable naming conventions in file
  - PRESERVE: All existing environment variables and structure
  - SECURITY: Add comments about credential protection

Task 3: CREATE config/vpn/scripts/ directory structure
  - IMPLEMENT: Three automation scripts (pia-connect.sh, healthcheck.sh, port-forward.sh)
  - FOLLOW pattern: executable permissions, error handling, logging
  - PLACEMENT: config/vpn/scripts/ - persistent storage accessible by container
  - DEPENDENCIES: None - creates foundation for automation

Task 4: MODIFY docker-compose.yml VPN service
  - REPLACE: current wireguard service with PIA-compatible container
  - EVALUATE: thrnz/docker-wireguard-pia vs linuxserver/wireguard with PIA mod
  - PRESERVE: network configuration, volume mounts, dependent service compatibility
  - ADD: PIA environment variables, health checks, restart policies
  - MAINTAIN: container name "vpn" for existing service dependencies

Task 5: IMPLEMENT PIA authentication automation
  - CREATE: config/vpn/pia/ directory for PIA-specific files
  - IMPLEMENT: Token generation and refresh mechanism
  - HANDLE: 24-hour token expiration with automatic renewal
  - FOLLOW pattern: LinuxServer container init script conventions
  - ERROR handling: connection failures, authentication errors, token refresh failures

Task 6: CONFIGURE WireGuard integration
  - IMPLEMENT: Dynamic WireGuard configuration generation using PIA API
  - GENERATE: config/vpn/wg_confs/ files from PIA server responses
  - FOLLOW pattern: existing WireGuard config template structure
  - PRESERVE: existing volume mount paths for configuration files
  - ENABLE: Port forwarding integration with generated configurations

Task 7: IMPLEMENT health monitoring
  - CREATE: Container health checks for VPN connectivity
  - VERIFY: IP address shows PIA server, not host IP
  - MONITOR: Token expiration and automatic refresh
  - LOG: Connection status, authentication events, errors
  - ALERT: Health check failures for dependent services

Task 8: VALIDATE dependent service integration  
  - VERIFY: qbittorrent, sonarr, radarr, prowlarr route through VPN
  - TEST: network_mode: service:vpn still functions correctly
  - CONFIRM: Port forwarding works for torrent functionality
  - VALIDATE: File permissions maintained with PUID/PGID
  - ENSURE: All services can communicate internally
```

### Implementation Patterns & Key Details

```bash
# PIA Container Selection Pattern - choose most appropriate option
OPTION_1="thrnz/docker-wireguard-pia"     # Dedicated PIA container - recommended
OPTION_2="linuxserver/wireguard + PIA mod" # Familiar LinuxServer pattern

# Environment Variable Pattern - secure credential management
environment:
  - PIA_USER=${PIA_USER}                   # From .env file, never hardcoded
  - PIA_PASS=${PIA_PASS}                   # From .env file, never hardcoded  
  - PIA_REGION=swiss                       # Server selection
  - PORT_FORWARDING=1                      # Enable for torrents
  - LOCAL_NETWORK=192.168.1.0/24          # LAN access preservation

# Volume Mount Pattern - preserve existing structure
volumes:
  - ./config/vpn:/config                   # Main VPN configuration
  - ./config/vpn/scripts:/scripts          # Automation scripts
  - ./config/vpn/pia:/pia                  # PIA-specific files

# Network Pattern - maintain existing dependent service compatibility
services:
  vpn:                                     # MUST keep name "vpn" 
    container_name: vpn                    # Required by dependent services
    network_mode: bridge                   # Standard network mode
  qbittorrent:
    network_mode: service:vpn              # Routes through VPN container
    depends_on:
      vpn:
        condition: service_healthy         # Wait for VPN health check
```

### Integration Points

```yaml
DOCKER_COMPOSE:
  - modify: services.vpn (replace image and configuration)
  - add: PIA environment variables to VPN service
  - preserve: all dependent service network_mode configurations
  - maintain: container names and dependency structure

ENVIRONMENT:
  - add to: .env.example
  - pattern: "PIA_USER=your_pia_username"
  - pattern: "PIA_PASS=your_pia_password"  
  - pattern: "PIA_REGION=swiss"

VOLUMES:
  - preserve: ./config/vpn:/config mapping
  - add: PIA-specific subdirectories
  - maintain: file permissions with PUID/PGID

NETWORKING:
  - preserve: vpn_network configuration
  - maintain: service:vpn network mode for dependent containers
  - verify: port forwarding works through VPN
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Docker Compose validation - run after each modification
docker-compose config                    # Validate YAML syntax and structure
docker-compose pull                      # Verify all images are accessible

# Environment file validation  
set -a && source .env && set +a         # Test environment variable loading
env | grep PIA                          # Verify PIA variables are set correctly

# Script permissions and syntax
chmod +x config/vpn/scripts/*.sh        # Ensure scripts are executable
bash -n config/vpn/scripts/*.sh         # Check script syntax without execution

# Expected: No YAML errors, all images pullable, environment variables set, scripts syntactically correct
```

### Level 2: Unit Tests (Component Validation)

```bash
# VPN container startup and authentication
docker-compose up -d vpn                # Start VPN container only
docker logs vpn                         # Check for successful PIA authentication
docker exec vpn curl -s ipinfo.io       # Verify IP shows PIA server, not host

# Dependent service routing validation
docker-compose up -d qbittorrent       # Start dependent service
docker exec qbittorrent curl -s ipinfo.io  # Verify qbittorrent uses VPN IP
docker exec sonarr curl -s ipinfo.io    # Verify sonarr uses VPN IP
docker exec radarr curl -s ipinfo.io    # Verify radarr uses VPN IP

# Port forwarding functionality
docker logs vpn | grep -i "port"        # Check port forwarding activation
netstat -tulpn | grep 51413             # Verify forwarded port availability

# Expected: All containers show PIA IP address, not host IP. Port forwarding active.
```

### Level 3: Integration Testing (System Validation)

```bash
# Full stack startup and connectivity
docker-compose down && docker-compose up -d  # Complete restart
sleep 60                                      # Allow full initialization

# Service health verification
docker-compose ps                       # All services should show "healthy" status
curl -f http://localhost:8080           # qBittorrent web interface accessible
curl -f http://localhost:8989           # Sonarr accessible  
curl -f http://localhost:7878           # Radarr accessible
curl -f http://localhost:9696           # Prowlarr accessible

# VPN functionality validation
docker exec qbittorrent curl -s https://ipinfo.io/json | jq .org  # Should show PIA
docker exec vpn ping -c 3 8.8.8.8      # Internet connectivity through VPN
docker logs vpn | grep -i "connected"   # VPN connection established

# Torrent functionality validation
# Add a test torrent through qbittorrent web interface
# Verify download starts and progresses properly
# Check that incoming connections work (port forwarding)

# Expected: All services accessible, all traffic routed through PIA, torrent functionality working
```

### Level 4: Creative & Domain-Specific Validation

```bash
# PIA-Specific Validation
# Verify PIA token authentication and refresh
docker exec vpn cat /config/auth.json | jq .token  # Token should be present and valid
docker logs vpn | grep -i "token"                   # Token refresh events logged

# Security Validation  
# Ensure no IP leaks when VPN disconnects
docker stop vpn && sleep 5                          # Simulate VPN failure
docker exec qbittorrent curl -s ipinfo.io 2>&1 | grep -i "resolve\|network"  # Should fail
docker start vpn && sleep 30                        # Restart VPN

# Performance Testing
# Test torrent download performance through PIA
# Monitor CPU and memory usage of VPN container
docker stats vpn --no-stream                        # Resource usage check

# Port Forwarding Validation
# Test incoming torrent connections work properly
# Verify port forwarding survives VPN reconnections
docker restart vpn && sleep 60                      # Restart VPN
# Check that port forwarding re-establishes automatically

# Long-term Stability Testing
# Test 24-hour token refresh cycle
# Monitor logs for authentication renewal events
# Verify services remain connected through token refresh

# Expected: No IP leaks, port forwarding stable, token refresh automatic, performance acceptable
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully  
- [ ] Docker Compose configuration validates: `docker-compose config`
- [ ] All services start and show healthy status: `docker-compose ps`
- [ ] VPN container authenticates with PIA successfully
- [ ] All dependent containers route traffic through VPN
- [ ] Port forwarding enabled and functional for torrents

### Feature Validation

- [ ] PIA credentials authenticate successfully using username/password
- [ ] WireGuard configuration generated automatically from PIA API
- [ ] IP verification shows PIA server address for all torrent services
- [ ] Torrent downloads work properly with port forwarding
- [ ] VPN connection survives restarts and maintains port forwarding
- [ ] Token refresh happens automatically every 24 hours
- [ ] Container health checks consistently pass

### Code Quality Validation

- [ ] Environment variables follow existing .env.example patterns
- [ ] Container configuration maintains existing naming conventions ("vpn")
- [ ] Volume mounts preserve existing configuration directory structure  
- [ ] Scripts follow executable permissions and error handling patterns
- [ ] PIA credentials secured in environment variables, never hardcoded
- [ ] Container dependencies preserved (network_mode: service:vpn)

### Documentation & Deployment

- [ ] .env.example updated with clear PIA credential instructions
- [ ] PIA configuration directory created with proper structure
- [ ] Automation scripts documented with purpose and usage
- [ ] Container logs provide clear status and error information
- [ ] Health check commands verify VPN connectivity and authentication

---

## Anti-Patterns to Avoid

- ❌ Don't hardcode PIA credentials in Docker Compose files
- ❌ Don't skip IP verification testing - torrent traffic must route through VPN
- ❌ Don't ignore token expiration - implement automatic refresh
- ❌ Don't disable port forwarding - torrents need incoming connections  
- ❌ Don't change container names - dependent services rely on "vpn" name
- ❌ Don't forget health checks - VPN failures should trigger container restarts
- ❌ Don't mix container types - choose either dedicated PIA container or modded LinuxServer