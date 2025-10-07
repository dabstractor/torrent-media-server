name: "Migrate to Gluetun VPN Client with PIA and Cloudflare WARP Support"
description: |
  Replace DIY VPN implementation with gluetun unified VPN client supporting both PIA and Cloudflare WARP
  via wireguard, maintaining all security features and network isolation.

---

## Goal

**Feature Goal**: Migrate from custom DIY VPN containers (caomingjun/warp + thrnz/docker-wireguard-pia) to a unified gluetun-based VPN solution that supports both PIA and Cloudflare WARP via wireguard protocol.

**Deliverable**: Production-ready gluetun VPN integration with:
- PIA wireguard support (native or custom provider)
- Cloudflare WARP wireguard support (custom provider with wgcf)  
- Maintained network isolation and kill-switch protection
- Validated IP leak prevention
- All containers showing "Healthy" status

**Success Definition**: 
- Setting `VPN_PROVIDER=pia` and running `docker compose up -d` successfully raises all healthy containers
- Transmission/qBittorrent container fetches different IP from host machine
- Setting `VPN_PROVIDER=warp` works identically
- All VPN provider variations pass health checks

## User Persona

**Target User**: Self-hosting enthusiasts running media server stacks with VPN protection

**Use Case**: Switching between VPN providers (PIA for premium features, WARP for free/simple) with single environment variable

**User Journey**:
1. User sets `VPN_PROVIDER=pia` or `VPN_PROVIDER=warp` in `.env`
2. User runs `docker compose up -d`
3. System automatically configures appropriate wireguard connection via gluetun
4. All containers start healthy with VPN protection active
5. Torrent client shows different IP from host (validates VPN working)

**Pain Points Addressed**:
- Current DIY implementation requires maintaining multiple container images
- Provider-specific health checks and setup scripts need separate maintenance
- No unified VPN client for consistent behavior across providers

## Why

- **Standardization**: Gluetun is industry-standard VPN container with extensive provider support
- **Maintainability**: Single container image instead of provider-specific builds
- **Security**: Proven kill-switch and leak protection built into gluetun
- **Feature parity**: Supports port forwarding, health checks, and monitoring
- **Future-proof**: Easy to add new VPN providers supported by gluetun

## What

### Current Architecture
```
DIY VPN Implementation:
├── dockerfiles/vpn/Dockerfile.warp (caomingjun/warp base)
├── dockerfiles/vpn/Dockerfile.pia (thrnz/docker-wireguard-pia base)
├── scripts/vpn/entrypoint.sh (provider detection)
├── scripts/vpn/warp/setup.sh (WARP-specific)
├── scripts/vpn/pia/setup.sh (PIA-specific)
└── scripts/vpn/common/kill-switch-base.sh
```

### Target Architecture
```
Gluetun VPN Implementation:
├── gluetun container (qmcgaw/gluetun image)
├── wgcf config generator (for WARP wireguard)
├── Environment-based provider selection
├── Built-in kill switch and health checks
└── Unified network isolation pattern
```

### Success Criteria

- [ ] Gluetun container builds and starts successfully
- [ ] PIA connects via gluetun (native or custom wireguard provider)
- [ ] WARP connects via gluetun custom provider (wgcf-generated config)
- [ ] qBittorrent/Transmission shows different IP from host
- [ ] Kill-switch prevents IP leaks when VPN disconnects
- [ ] All containers show "Healthy" status
- [ ] Port forwarding works with PIA (if available in region)
- [ ] `docker compose up -d` works for both providers
- [ ] Network isolation maintained via `network_mode: "container:gluetun"`

## All Needed Context

### Context Completeness Check

_"If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_ - YES. This PRP provides complete gluetun setup, wgcf integration, provider configurations, and validation commands.

### Documentation & References

```yaml
# MUST READ - Gluetun Documentation
- url: https://github.com/qdm12/gluetun
  why: Official gluetun repository and documentation
  critical: Understand gluetun architecture and capabilities
  
- url: https://github.com/qdm12/gluetun-wiki
  why: Comprehensive wiki with provider setup guides
  critical: Provider-specific configuration patterns

- url: https://github.com/qdm12/gluetun-wiki/blob/main/setup/providers/custom.md
  why: Custom wireguard provider setup for WARP
  pattern: Environment variables for custom wireguard config
  gotcha: Requires WIREGUARD_PRIVATE_KEY, PUBLIC_KEY, ENDPOINT_IP, ENDPOINT_PORT, ADDRESSES

- url: https://github.com/qdm12/gluetun-wiki/blob/main/setup/providers/private-internet-access.md
  why: Native PIA configuration in gluetun
  pattern: VPN_SERVICE_PROVIDER=private internet access, credentials, regions
  gotcha: Port forwarding may have limitations with wireguard

- url: https://github.com/qdm12/gluetun-wiki/blob/main/setup/inter-containers-networking.md
  why: How to connect other containers through gluetun network
  pattern: network_mode: "service:gluetun" or "container:gluetun"
  critical: This maintains VPN isolation for torrent clients

# MUST READ - WARP Wireguard Config Generation
- url: https://github.com/ViRb3/wgcf
  why: Tool to generate Cloudflare WARP wireguard configuration
  pattern: wgcf register -> wgcf generate -> wgcf-profile.conf
  critical: This is the ONLY way to get WARP wireguard config for gluetun

- url: https://github.com/cmj2002/warp-docker  
  why: Reference WARP docker implementation
  pattern: Volume mount for /var/lib/cloudflare-warp persistence
  gotcha: Registration needs to persist across container restarts

- url: https://github.com/Neilpang/wgcf-docker
  why: Docker container that runs wgcf for config generation
  pattern: Privileged mode, NET_ADMIN capability
  critical: Can run wgcf in temporary container for setup

# MUST READ - Working Examples
- url: https://github.com/AdrienPoua/docker-compose-nas
  why: Production docker-compose with gluetun + qBittorrent
  pattern: Complete working example of gluetun network isolation
  critical: Shows proper service dependency and networking

- url: https://github.com/tonyp7/gluetun-qbittorrent
  why: Minimal gluetun + qBittorrent setup
  pattern: Simplified configuration for VPN-routed torrenting
  gotcha: Port mappings must be on gluetun container, not torrent client

# MUST READ - Current Codebase Files
- file: docker-compose.yml
  why: Current VPN service configuration
  pattern: Lines 40-103 show VPN service with provider switching
  gotcha: Build context uses Dockerfile.${VPN_PROVIDER}, needs replacement with gluetun
  critical: network_mode: "container:vpn" pattern MUST be preserved

- file: docker-compose.pia.yml
  why: PIA override configuration (will be deprecated)
  pattern: Shows PIA-specific environment variables and ports
  gotcha: This file may no longer be needed with gluetun
  
- file: .env.example  
  why: Environment variable patterns
  pattern: VPN_PROVIDER, PIA_*, WARP_* variables
  gotcha: Will need gluetun-specific variables added

- file: CLAUDE.md (Project Instructions)
  why: Critical security requirements
  pattern: "qBittorrent MUST remain fully VPN-isolated via network_mode: container:vpn"
  critical: Any network config changes risk IP leaks - VALIDATE THOROUGHLY
  gotcha: "Feature validation must ensure successful docker build with docker compose up -d"

- file: scripts/vpn/entrypoint.sh
  why: Current provider detection logic  
  pattern: Case statement switching on VPN_PROVIDER
  gotcha: This entire scripts/vpn/ directory may be replaced by gluetun built-ins

- file: scripts/vpn/common/kill-switch-base.sh
  why: Current kill-switch iptables rules
  pattern: apply_base_kill_switch() function with iptables rules
  gotcha: Gluetun has built-in kill switch, may not need custom script
```

### Current Codebase Tree

```bash
torrents/
├── docker-compose.yml              # Main compose - VPN build at lines 40-103
├── docker-compose.pia.yml          # PIA override (may deprecate)
├── .env.example                    # Environment variables
├── dockerfiles/
│   └── vpn/
│       ├── Dockerfile.warp         # WARP container build
│       ├── Dockerfile.pia          # PIA container build  
│       └── patch-run.sh            # PIA patches
├── scripts/
│   ├── vpn/
│   │   ├── entrypoint.sh           # Provider detection
│   │   ├── common/
│   │   │   └── kill-switch-base.sh # Shared kill switch
│   │   ├── warp/
│   │   │   ├── setup.sh            # WARP connection
│   │   │   └── healthcheck.sh      # WARP health check
│   │   └── pia/
│   │       ├── setup.sh            # PIA connection
│   │       └── healthcheck.sh      # PIA health check
│   ├── qbittorrent-entrypoint.sh
│   └── transmission-entrypoint.sh
├── config/
│   └── vpn/                        # VPN configs storage
└── PRPs/
    └── 024-modular-vpn-provider-system.md  # Previous VPN work
```

### Desired Codebase Tree

```bash
torrents/
├── docker-compose.yml              # Main compose - gluetun service
├── .env.example                    # Updated with gluetun variables
├── scripts/
│   ├── wgcf/
│   │   ├── generate-warp-config.sh # Generate WARP wireguard config
│   │   └── Dockerfile.wgcf         # wgcf tool container (optional)
│   ├── gluetun/
│   │   └── setup-warp-provider.sh  # Helper to configure WARP in gluetun
│   ├── qbittorrent-entrypoint.sh   # Unchanged
│   └── transmission-entrypoint.sh  # Unchanged
├── config/
│   ├── gluetun/                    # Gluetun configs
│   │   └── warp/
│   │       └── wg0.conf            # WARP wireguard config (generated)│   └── vpn/                        # Legacy VPN configs (archived)
└── PRPs/
    ├── 024-modular-vpn-provider-system.md  # Previous VPN work (reference)
    └── 026-gluetun-vpn-migration.md        # This PRP
```

### Known Gotchas & Library Quirks

```yaml
# CRITICAL: Gluetun Container Requirements
- devices: ["/dev/net/tun:/dev/net/tun"]  # Required for tunnel interface
- cap_add: ["NET_ADMIN"]                   # Required for network configuration
- Must run as root or with proper capabilities

# CRITICAL: WARP Configuration via wgcf
- wgcf generates account.toml and profile.conf files
- wgcf-profile.conf contains: [Interface] and [Peer] sections
- Must extract: PrivateKey, Address, PublicKey, Endpoint, AllowedIPs
- WARP uses specific MTU (1280) for compatibility
- Registration must persist or re-register on each container restart

# CRITICAL: PIA in Gluetun
- Native provider: VPN_SERVICE_PROVIDER=private internet access
- Supports both OpenVPN and Wireguard
- Port forwarding: VPN_PORT_FORWARDING=on (limited wireguard support)
- For full wireguard: May need custom provider with kylegrantlucas/pia-wg-config

# CRITICAL: Network Isolation Pattern
- Torrent clients MUST use: network_mode: "container:gluetun"
- Port mappings move FROM torrent client TO gluetun container
- Health check dependencies ensure VPN up before torrent client starts
- Kill switch is built into gluetun (FIREWALL=on by default)

# CRITICAL: Validation Requirements (from CLAUDE.md)
- docker compose up -d must work (default WARP)
- docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d must work
- All containers must show "Healthy"
- Transmission/qBittorrent must show different IP from host

# GOTCHA: Gluetun Env Variable Precedence
- Mounted config files override environment variables
- For WARP: Use env vars for custom provider (simpler than file mount)
- For PIA: Use native provider env vars (simpler than custom)

# GOTCHA: Health Check Timing
- Gluetun has internal health server on :9999/healthz
- Start period must be sufficient for VPN connection (60-90s)
- Dependent services must wait for gluetun healthy status
```

## Implementation Blueprint

### Phase 1: WARP Wireguard Config Generation

The WARP integration requires generating wireguard configuration using wgcf tool, then passing it to gluetun as a custom provider.

```yaml
Step 1.1: Create wgcf config generator script
  - CREATE: scripts/wgcf/generate-warp-config.sh
  - PURPOSE: Run wgcf to generate WARP wireguard configuration
  - OUTPUT: config/gluetun/warp/wg0.conf or environment variables
  - DECISION: Config file OR environment variables (env vars recommended for simplicity)

Step 1.2: Run wgcf to generate config (one-time setup or automated)
  - OPTION A: Manual - User runs wgcf locally, copies config to env vars
  - OPTION B: Docker container - Temporary wgcf container generates config
  - OPTION C: Init container - Runs before gluetun, generates if not exists
  - RECOMMENDATION: Option C (init container) for automation

Step 1.3: Extract wireguard parameters from wgcf output
  - PARSE: wgcf-profile.conf [Interface] section for:
    - PrivateKey -> WIREGUARD_PRIVATE_KEY
    - Address -> WIREGUARD_ADDRESSES  
  - PARSE: wgcf-profile.conf [Peer] section for:
    - PublicKey -> WIREGUARD_PUBLIC_KEY
    - Endpoint -> WIREGUARD_ENDPOINT_IP and WIREGUARD_ENDPOINT_PORT
  - PERSISTENCE: Save to .env or config file for reuse
```

### Phase 2: Gluetun Container Configuration

Configure gluetun to support both PIA (native) and WARP (custom provider) based on VPN_PROVIDER environment variable.

```yaml
Step 2.1: Replace VPN service in docker-compose.yml
  - REMOVE: build context with Dockerfile.${VPN_PROVIDER}
  - REPLACE WITH: image: qmcgaw/gluetun
  - ADD: devices and cap_add requirements
  - PRESERVE: network configuration (vpn_network, static IP)
  - PRESERVE: depends_on startup-coordinator

Step 2.2: Configure environment variables for PIA
  - VPN_SERVICE_PROVIDER=private internet access (when VPN_PROVIDER=pia)
  - OPENVPN_USER=${PIA_USER} or WIREGUARD_* for wireguard
  - OPENVPN_PASSWORD=${PIA_PASS} (or omit for wireguard)
  - SERVER_REGIONS=${PIA_REGION}
  - VPN_PORT_FORWARDING=on (if needed)
  - FIREWALL=on (gluetun kill switch)

Step 2.3: Configure environment variables for WARP
  - VPN_SERVICE_PROVIDER=custom (when VPN_PROVIDER=warp)
  - VPN_TYPE=wireguard
  - WIREGUARD_PRIVATE_KEY=${WARP_PRIVATE_KEY}
  - WIREGUARD_PUBLIC_KEY=${WARP_PUBLIC_KEY}
  - WIREGUARD_ENDPOINT_IP=${WARP_ENDPOINT_IP}
  - WIREGUARD_ENDPOINT_PORT=${WARP_ENDPOINT_PORT}
  - WIREGUARD_ADDRESSES=${WARP_ADDRESSES}

Step 2.4: Update health check
  - REPLACE: /scripts/vpn/${VPN_PROVIDER}/healthcheck.sh
  - WITH: curl -f http://localhost:9999/healthz
  - OR: Built-in gluetun healthcheck (automatically configured)

Step 2.5: Move port mappings to gluetun container
  - IDENTIFY: Ports currently on qbittorrent/transmission
  - MOVE TO: gluetun container port mappings
  - REASON: Containers using network_mode: "container:gluetun" can't have own ports
```

### Phase 3: Update Dependent Services

Ensure qBittorrent, Transmission, and other services properly use gluetun network.

```yaml
Step 3.1: Update qBittorrent service
  - VERIFY: network_mode: "container:${CONTAINER_PREFIX}vpn" is correct
  - CHANGE TO: network_mode: "container:${CONTAINER_PREFIX}gluetun" (if renaming service)
  - OR KEEP: network_mode: "container:${CONTAINER_PREFIX}vpn" (if keeping service name)
  - REMOVE: Any port mappings (moved to gluetun)
  - UPDATE: depends_on to reference gluetun (or vpn if same name)

Step 3.2: Update Transmission service  
  - SAME CHANGES: as qBittorrent above
  - VERIFY: Health check uses internal ports (no external access)

Step 3.3: Update nginx-proxy if needed
  - VERIFY: Can still access qbittorrent/transmission via VPN network
  - CHECK: Proxy configuration in config/nginx/nginx.conf
  - ENSURE: Routes to correct internal addresses

Step 3.4: Update prowlarr/sonarr/radarr (if they use VPN)
  - CHECK: Current network configuration
  - VERIFY: Can access VPN-routed services
  - MAINTAIN: Own network access for indexer communication
```

### Phase 4: Environment Variable Management

Update .env.example with gluetun-specific variables and clear documentation.

```yaml
Step 4.1: Add gluetun PIA variables
  - VPN_PROVIDER=pia (selection variable)
  - PIA_USER=your_pia_username
  - PIA_PASS=your_pia_password  
  - PIA_REGION=us_atlanta
  - VPN_PORT_FORWARDING=on

Step 4.2: Add gluetun WARP variables  
  - VPN_PROVIDER=warp (selection variable)
  - WARP_PRIVATE_KEY= (from wgcf output)
  - WARP_PUBLIC_KEY= (from wgcf output)
  - WARP_ENDPOINT_IP= (from wgcf output)
  - WARP_ENDPOINT_PORT= (from wgcf output)
  - WARP_ADDRESSES= (from wgcf output)

Step 4.3: Add gluetun common variables
  - FIREWALL=on (kill switch)
  - DOT=off (DNS over TLS, optional)
  - HEALTH_VPN_DURATION_INITIAL=60s
  - HEALTH_VPN_DURATION_ADDITION=10s

Step 4.4: Document provider switching
  - ADD COMMENTS: How to switch between PIA and WARP
  - ADD EXAMPLES: Working configurations for each provider
  - ADD WARNINGS: About IP leak risks during switching
```

### Phase 5: Deprecate Old VPN Scripts (Optional)

Old VPN scripts in scripts/vpn/ may no longer be needed with gluetun.

```yaml
Step 5.1: Archive old VPN scripts
  - MOVE: scripts/vpn/ to scripts/vpn-legacy/
  - OR DELETE: If confident gluetun replacement is complete
  - KEEP: Any scripts still used by other services

Step 5.2: Remove old Dockerfiles
  - REMOVE: dockerfiles/vpn/Dockerfile.warp
  - REMOVE: dockerfiles/vpn/Dockerfile.pia
  - REMOVE: dockerfiles/vpn/patch-run.sh

Step 5.3: Update documentation
  - UPDATE: VPN-PROVIDERS.md with gluetun information
  - REMOVE: References to old DIY implementation
  - ADD: Gluetun setup instructions and troubleshooting
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: RESEARCH - Generate WARP wireguard config with wgcf
  - INSTALL: wgcf locally or in docker container
  - RUN: wgcf register && wgcf generate
  - EXTRACT: Parameters from wgcf-profile.conf
  - DOCUMENT: Values for WIREGUARD_* environment variables
  - PLACEMENT: Manual step or automated script

Task 2: CREATE scripts/wgcf/generate-warp-config.sh (Optional automation)
  - IMPLEMENT: Automated wgcf config generation
  - OUTPUT: Environment variables or config file
  - ERROR HANDLING: If wgcf registration fails
  - PERSISTENCE: Save registration for reuse
  - PLACEMENT: scripts/wgcf/

Task 3: MODIFY docker-compose.yml - Replace VPN service
  - CHANGE: image from build to qmcgaw/gluetun
  - ADD: devices: ["/dev/net/tun:/dev/net/tun"]
  - ADD: cap_add: ["NET_ADMIN"]
  - REMOVE: build context and Dockerfile reference
  - ADD: Conditional environment variables based on VPN_PROVIDER
  - UPDATE: healthcheck to use gluetun's built-in check
  - PRESERVE: networks, depends_on, restart policy

Task 4: CREATE docker-compose.yml environment variable logic
  - IMPLEMENT: Conditional env vars for PIA vs WARP
  - METHOD: Use YAML anchors or separate services with profiles
  - OR: Single service with all vars, gluetun ignores unused ones
  - VALIDATE: Both providers can start from same service definition

Task 5: MODIFY .env.example - Add gluetun variables
  - ADD: Gluetun common variables section
  - ADD: PIA-specific gluetun variables
  - ADD: WARP-specific wireguard variables
  - DOCUMENT: How to obtain WARP config (wgcf process)
  - EXAMPLES: Working configurations for both providers

Task 6: UPDATE dependent services network_mode
  - VERIFY: qbittorrent network_mode correct
  - VERIFY: transmission network_mode correct  
  - MOVE: Port mappings to gluetun container
  - UPDATE: depends_on to wait for gluetun healthy
  - TEST: Services can still communicate

Task 7: CREATE validation script (Optional)
  - IMPLEMENT: IP leak test script
  - CHECK: Container IP vs host IP
  - VERIFY: IP changes when VPN provider switches
  - AUTOMATE: Validation from CLAUDE.md requirements
  - PLACEMENT: scripts/validate-vpn.sh

Task 8: TEST PIA provider configuration
  - SET: VPN_PROVIDER=pia in .env
  - SET: PIA credentials in .env
  - RUN: docker compose up -d
  - WAIT: For all containers healthy
  - VERIFY: IP is different from host
  - CHECK: Port forwarding if enabled

Task 9: TEST WARP provider configuration
  - SET: VPN_PROVIDER=warp in .env
  - SET: WARP wireguard variables in .env
  - RUN: docker compose up -d
  - WAIT: For all containers healthy
  - VERIFY: IP is different from host
  - CHECK: No IP leaks

Task 10: TEST provider switching
  - SWITCH: From PIA to WARP in .env
  - RUN: docker compose down && docker compose up -d
  - VERIFY: Clean transition, no errors
  - SWITCH: From WARP to PIA
  - VERIFY: Both directions work smoothly

Task 11: ARCHIVE old VPN scripts (Optional)
  - MOVE: scripts/vpn/ to scripts/vpn-legacy/
  - REMOVE: dockerfiles/vpn/
  - UPDATE: Documentation references
  - CLEAN: Unused files

Task 12: UPDATE VPN-PROVIDERS.md documentation
  - REWRITE: For gluetun-based setup
  - ADD: wgcf setup instructions for WARP
  - ADD: Gluetun troubleshooting section
  - REMOVE: Old DIY implementation details
```

### Implementation Patterns & Key Details

```yaml
# docker-compose.yml - Gluetun service definition
services:
  vpn:  # Keep same service name for compatibility
    image: qmcgaw/gluetun
    container_name: ${CONTAINER_PREFIX}vpn
    cap_add:
      - NET_ADMIN
    devices:
      - /dev/net/tun:/dev/net/tun
    ports:
      # Ports moved from torrent clients (they use this network)
      - "${VPN_BITTORRENT_PORT:-16881}:6881"
      - "${VPN_BITTORRENT_PORT:-16881}:6881/udp"
    environment:
      # Provider selection (determines which vars below are used)
      - VPN_PROVIDER_TYPE=${VPN_PROVIDER:-warp}  # warp or pia
      
      # Common gluetun variables (all providers)
      - TZ=${TZ:-America/New_York}
      - FIREWALL=on  # Built-in kill switch
      - DOT=off
      
      # PIA-specific (only used when VPN_PROVIDER=pia)
      - VPN_SERVICE_PROVIDER=private internet access
      - OPENVPN_USER=${PIA_USER}
      - OPENVPN_PASSWORD=${PIA_PASS}
      - SERVER_REGIONS=${PIA_REGION:-US Atlanta}
      - VPN_PORT_FORWARDING=${VPN_PORT_FORWARDING:-off}
      
      # WARP-specific (only used when VPN_PROVIDER=warp)
      - VPN_SERVICE_PROVIDER=custom
      - VPN_TYPE=wireguard
      - WIREGUARD_PRIVATE_KEY=${WARP_PRIVATE_KEY}
      - WIREGUARD_PUBLIC_KEY=${WARP_PUBLIC_KEY}
      - WIREGUARD_ENDPOINT_IP=${WARP_ENDPOINT_IP}
      - WIREGUARD_ENDPOINT_PORT=${WARP_ENDPOINT_PORT}
      - WIREGUARD_ADDRESSES=${WARP_ADDRESSES}
    networks:
      default:
      vpn_network:
        ipv4_address: ${VPN_IP_ADDRESS}
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:9999/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 90s
    depends_on:
      startup-coordinator:
        condition: service_started
    restart: unless-stopped

# GOTCHA: Gluetun selector pattern (if using different providers)
# OPTION A: Use profiles to select provider
  vpn-pia:
    image: qmcgaw/gluetun
    profiles: ["pia"]
    environment:
      - VPN_SERVICE_PROVIDER=private internet access
      # ... PIA vars

  vpn-warp:
    image: qmcgaw/gluetun  
    profiles: ["warp"]
    environment:
      - VPN_SERVICE_PROVIDER=custom
      # ... WARP vars

# OPTION B: Single service with all vars (recommended - simpler)
# Gluetun ignores unused environment variables for other providers
```

```bash
# scripts/wgcf/generate-warp-config.sh - WARP config generator
#!/bin/bash
set -e

CONFIG_DIR="./config/gluetun/warp"
mkdir -p "${CONFIG_DIR}"

echo "=== Generating Cloudflare WARP Wireguard Configuration ==="

# Check if wgcf is installed
if ! command -v wgcf &> /dev/null; then
    echo "ERROR: wgcf not found. Install from: https://github.com/ViRb3/wgcf"
    echo "Or use docker: docker run --rm -v \$(pwd):/output neilpang/wgcf-docker"
    exit 1
fi

# Register with WARP (reuse existing if present)
if [ ! -f "wgcf-account.toml" ]; then
    echo "Registering new WARP account..."
    wgcf register
else
    echo "Using existing WARP account"
fi

# Generate wireguard profile
echo "Generating wireguard configuration..."
wgcf generate

# Extract values for gluetun environment variables
PRIVATE_KEY=$(grep PrivateKey wgcf-profile.conf | cut -d' ' -f3)
ADDRESSES=$(grep Address wgcf-profile.conf | cut -d' ' -f3)
PUBLIC_KEY=$(grep PublicKey wgcf-profile.conf | cut -d' ' -f3)
ENDPOINT=$(grep Endpoint wgcf-profile.conf | cut -d' ' -f3)
ENDPOINT_IP=$(echo $ENDPOINT | cut -d: -f1)
ENDPOINT_PORT=$(echo $ENDPOINT | cut -d: -f2)

# Output environment variables
cat <<EOF

=== Add these to your .env file ===

# Cloudflare WARP Wireguard Configuration (Generated $(date))
WARP_PRIVATE_KEY=${PRIVATE_KEY}
WARP_PUBLIC_KEY=${PUBLIC_KEY}
WARP_ENDPOINT_IP=${ENDPOINT_IP}
WARP_ENDPOINT_PORT=${ENDPOINT_PORT}
WARP_ADDRESSES=${ADDRESSES}

=== Configuration Complete ===

EOF

# Save to config file (optional, for reference)
cp wgcf-profile.conf "${CONFIG_DIR}/wg0.conf"
echo "Config saved to ${CONFIG_DIR}/wg0.conf"
```

```bash
# scripts/validate-vpn.sh - IP leak validation#!/bin/bash
set -e

echo "=== VPN IP Leak Validation ==="

# Get host IP
echo -n "Host IP: "
HOST_IP=$(curl -s https://ipinfo.io/ip)
echo "${HOST_IP}"

# Get VPN container IP (gluetun)
echo -n "VPN Container IP: "
VPN_IP=$(docker compose exec vpn wget -qO- https://ipinfo.io/ip 2>/dev/null || echo "FAILED")
echo "${VPN_IP}"

# Get torrent client IP (qbittorrent or transmission)
if docker compose ps qbittorrent >/dev/null 2>&1; then
    echo -n "qBittorrent IP: "
    TORRENT_IP=$(docker compose exec qbittorrent wget -qO- https://ipinfo.io/ip 2>/dev/null || echo "FAILED")
    echo "${TORRENT_IP}"
elif docker compose ps transmission >/dev/null 2>&1; then
    echo -n "Transmission IP: "
    TORRENT_IP=$(docker compose exec transmission wget -qO- https://ipinfo.io/ip 2>/dev/null || echo "FAILED")
    echo "${TORRENT_IP}"
fi

# Validate IPs are different
echo ""
echo "=== Validation Results ==="

if [ "${HOST_IP}" = "${VPN_IP}" ]; then
    echo "❌ FAILED: VPN IP matches host IP (VPN not working!)"
    exit 1
elif [ "${VPN_IP}" = "FAILED" ]; then
    echo "❌ FAILED: Could not get VPN IP (VPN not connected!)"
    exit 1
else
    echo "✅ PASSED: VPN IP (${VPN_IP}) differs from host IP (${HOST_IP})"
fi

if [ -n "${TORRENT_IP}" ] && [ "${TORRENT_IP}" = "${VPN_IP}" ]; then
    echo "✅ PASSED: Torrent client IP matches VPN IP (isolation working!)"
elif [ "${TORRENT_IP}" = "FAILED" ]; then
    echo "⚠️  WARNING: Could not get torrent client IP"
elif [ -n "${TORRENT_IP}" ]; then
    echo "❌ FAILED: Torrent client IP (${TORRENT_IP}) differs from VPN IP (${VPN_IP})"
    exit 1
fi

echo ""
echo "=== VPN Validation Complete ==="
```

### Integration Points

```yaml
DOCKER_COMPOSE:
  - replace: VPN service with gluetun image
  - update: Environment variables for gluetun
  - move: Port mappings from torrent clients to gluetun
  - preserve: Network isolation patterns

ENVIRONMENT_FILES:
  - modify: .env.example with gluetun variables
  - add: WARP wireguard configuration variables
  - update: PIA variables for gluetun compatibility
  - document: Provider switching process

SCRIPTS:
  - create: scripts/wgcf/generate-warp-config.sh (WARP config)
  - create: scripts/validate-vpn.sh (IP leak testing)
  - archive: scripts/vpn/ (old DIY implementation)

CONFIGURATION:
  - create: config/gluetun/warp/ (WARP configs)
  - preserve: config/vpn/ (legacy, can archive)

DOCUMENTATION:
  - update: VPN-PROVIDERS.md with gluetun instructions
  - update: README.md if it references VPN setup
  - create: PRPs/ai_docs/gluetun-setup-guide.md (optional)
```

## Validation Loop

### Level 1: Environment Setup Validation

```bash
# Verify wgcf is available (for WARP setup)
which wgcf || echo "Install wgcf or use docker container"

# Generate WARP configuration (one-time setup)
./scripts/wgcf/generate-warp-config.sh

# Verify WARP configuration extracted
grep "WARP_PRIVATE_KEY" .env
grep "WARP_ENDPOINT_IP" .env
grep "WARP_ADDRESSES" .env

# Verify PIA credentials (if using PIA)
grep "PIA_USER" .env
grep "PIA_PASS" .env
grep "PIA_REGION" .env

# Expected: All required variables present in .env
```

### Level 2: Gluetun Container Validation (PIA)

```bash
# Set PIA as provider
sed -i 's/VPN_PROVIDER=.*/VPN_PROVIDER=pia/' .env

# Build and start gluetun with PIA
docker compose build vpn 2>&1 | tee /tmp/build.log
docker compose up -d vpn

# Wait for gluetun to connect (check logs)
sleep 30
docker compose logs vpn | tail -50

# Check gluetun health endpoint
curl -f http://localhost:9999/healthz && echo "✅ Gluetun healthy" || echo "❌ Gluetun unhealthy"

# Verify VPN connection and IP
docker compose exec vpn sh -c "wget -qO- https://ipinfo.io/ip"

# Check that IP differs from host
HOST_IP=$(curl -s https://ipinfo.io/ip)
VPN_IP=$(docker compose exec vpn sh -c "wget -qO- https://ipinfo.io/ip" 2>/dev/null)
[ "$HOST_IP" != "$VPN_IP" ] && echo "✅ VPN IP different" || echo "❌ Same IP!"

# Expected: Gluetun connects to PIA, shows different IP
```

### Level 3: Gluetun Container Validation (WARP)

```bash
# Set WARP as provider  
sed -i 's/VPN_PROVIDER=.*/VPN_PROVIDER=warp/' .env

# Verify WARP wireguard variables are set
grep "WARP_PRIVATE_KEY" .env
grep "WARP_ENDPOINT_IP" .env

# Restart gluetun with WARP config
docker compose down vpn
docker compose up -d vpn

# Wait for connection
sleep 30
docker compose logs vpn | tail -50

# Check gluetun health
curl -f http://localhost:9999/healthz && echo "✅ Gluetun healthy" || echo "❌ Gluetun unhealthy"

# Verify VPN connection and IP
docker compose exec vpn sh -c "wget -qO- https://ipinfo.io/ip"

# Validate IP changed
VPN_IP=$(docker compose exec vpn sh -c "wget -qO- https://ipinfo.io/ip" 2>/dev/null)
[ "$HOST_IP" != "$VPN_IP" ] && echo "✅ VPN IP different" || echo "❌ Same IP!"

# Expected: Gluetun connects to WARP, shows different IP
```

### Level 4: Torrent Client Network Isolation

```bash
# Start full stack with VPN (use either provider)
docker compose up -d

# Wait for all containers to be healthy
sleep 60

# Check all containers are healthy
docker compose ps | grep -E "(vpn|qbittorrent|transmission)" | grep -v "healthy" && echo "❌ Unhealthy containers!" || echo "✅ All healthy"

# Verify qBittorrent uses VPN network
if docker compose ps qbittorrent >/dev/null 2>&1; then
    echo "=== qBittorrent Network Validation ==="
    
    # Check IP from inside qBittorrent container
    QBIT_IP=$(docker compose exec qbittorrent sh -c "wget -qO- https://ipinfo.io/ip" 2>/dev/null || echo "FAILED")
    
    # Compare with VPN IP
    VPN_IP=$(docker compose exec vpn sh -c "wget -qO- https://ipinfo.io/ip" 2>/dev/null)
    
    if [ "$QBIT_IP" = "$VPN_IP" ]; then
        echo "✅ qBittorrent using VPN IP: ${QBIT_IP}"
    else
        echo "❌ CRITICAL: qBittorrent IP (${QBIT_IP}) != VPN IP (${VPN_IP})"
        exit 1
    fi
fi

# Verify Transmission uses VPN network (if active)
if docker compose ps transmission >/dev/null 2>&1; then
    echo "=== Transmission Network Validation ==="
    
    TRANS_IP=$(docker compose exec transmission sh -c "wget -qO- https://ipinfo.io/ip" 2>/dev/null || echo "FAILED")
    VPN_IP=$(docker compose exec vpn sh -c "wget -qO- https://ipinfo.io/ip" 2>/dev/null)
    
    if [ "$TRANS_IP" = "$VPN_IP" ]; then
        echo "✅ Transmission using VPN IP: ${TRANS_IP}"
    else
        echo "❌ CRITICAL: Transmission IP (${TRANS_IP}) != VPN IP (${VPN_IP})"
        exit 1
    fi
fi

# Expected: Torrent client IP matches VPN IP exactly
```

### Level 5: Kill Switch Validation

```bash
# Test gluetun built-in firewall (kill switch)
echo "=== Testing Kill Switch ==="

# Get current torrent client IP (should be VPN IP)
BEFORE_IP=$(docker compose exec qbittorrent sh -c "wget -qO- https://ipinfo.io/ip" 2>/dev/null || echo "FAILED")
echo "IP before VPN stop: ${BEFORE_IP}"

# Stop VPN container
docker compose stop vpn
sleep 5

# Try to get IP from torrent client (should fail or timeout)
echo "Testing connectivity without VPN..."
AFTER_IP=$(timeout 10 docker compose exec qbittorrent sh -c "wget -qO- https://ipinfo.io/ip" 2>/dev/null || echo "BLOCKED")

if [ "$AFTER_IP" = "BLOCKED" ] || [ "$AFTER_IP" = "FAILED" ]; then
    echo "✅ Kill switch working: No connectivity without VPN"
else
    echo "❌ CRITICAL: Traffic leaked! IP without VPN: ${AFTER_IP}"
    docker compose start vpn
    exit 1
fi

# Restart VPN and verify connectivity restored
docker compose start vpn
sleep 30

RESTORED_IP=$(docker compose exec qbittorrent sh -c "wget -qO- https://ipinfo.io/ip" 2>/dev/null || echo "FAILED")
if [ "$RESTORED_IP" != "FAILED" ]; then
    echo "✅ VPN restored: IP is ${RESTORED_IP}"
else
    echo "❌ VPN failed to restore connectivity"
    exit 1
fi

# Expected: No connectivity without VPN, connectivity restored when VPN up
```

### Level 6: Provider Switching Validation

```bash
# Test switching between providers
echo "=== Provider Switching Validation ==="

# Start with PIA
echo "Starting with PIA..."
sed -i 's/VPN_PROVIDER=.*/VPN_PROVIDER=pia/' .env
docker compose down
docker compose up -d
sleep 60

# Verify PIA working
PIA_IP=$(docker compose exec vpn sh -c "wget -qO- https://ipinfo.io/ip" 2>/dev/null)
echo "PIA IP: ${PIA_IP}"
[ -n "$PIA_IP" ] && echo "✅ PIA connected" || { echo "❌ PIA failed"; exit 1; }

# Switch to WARP
echo "Switching to WARP..."
sed -i 's/VPN_PROVIDER=.*/VPN_PROVIDER=warp/' .env
docker compose down
docker compose up -d
sleep 60

# Verify WARP working
WARP_IP=$(docker compose exec vpn sh -c "wget -qO- https://ipinfo.io/ip" 2>/dev/null)
echo "WARP IP: ${WARP_IP}"
[ -n "$WARP_IP" ] && echo "✅ WARP connected" || { echo "❌ WARP failed"; exit 1; }

# Verify IPs are different (different providers)
if [ "$PIA_IP" != "$WARP_IP" ]; then
    echo "✅ Provider switch successful: Different IPs"
else
    echo "⚠️  WARNING: PIA and WARP showing same IP (unusual but possible)"
fi

# Expected: Both providers work, clean switching between them
```

### Level 7: Full Stack Validation (CLAUDE.md Requirements)

```bash
# Validation requirement: docker compose up -d with all containers healthy
echo "=== Full Stack Validation (Default WARP) ==="

# Set WARP as default provider
sed -i 's/VPN_PROVIDER=.*/VPN_PROVIDER=warp/' .env

# Full stack up
docker compose down -v
docker compose up -d

# Wait for all services to stabilize
echo "Waiting for services to start..."
sleep 90

# Check all containers are healthy
echo "=== Container Health Status ==="
docker compose ps

# Verify all show "healthy"
UNHEALTHY=$(docker compose ps | grep -v "healthy" | grep -v "NAME" | grep -v "^$" || true)
if [ -z "$UNHEALTHY" ]; then
    echo "✅ All containers healthy with WARP"
else
    echo "❌ Some containers unhealthy:"
    echo "$UNHEALTHY"
    exit 1
fi

# Verify torrent client IP differs from host
./scripts/validate-vpn.sh

# Test PIA with override file (if PIA compose file exists)
if [ -f "docker-compose.pia.yml" ]; then
    echo "=== Testing PIA Override ==="
    docker compose down
    sed -i 's/VPN_PROVIDER=.*/VPN_PROVIDER=pia/' .env
    docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d
    sleep 90
    
    docker compose ps
    UNHEALTHY=$(docker compose ps | grep -v "healthy" | grep -v "NAME" | grep -v "^$" || true)
    if [ -z "$UNHEALTHY" ]; then
        echo "✅ All containers healthy with PIA override"
    else
        echo "❌ Some containers unhealthy with PIA"
        exit 1
    fi
fi

# Expected: docker compose up -d works, all containers healthy, IP validation passes
```

## Final Validation Checklist

### Technical Validation

- [ ] wgcf installed or docker container available
- [ ] WARP wireguard config generated successfully
- [ ] WARP environment variables extracted and added to .env
- [ ] PIA credentials configured in .env
- [ ] Gluetun container builds without errors
- [ ] Gluetun health endpoint (`:9999/healthz`) responds
- [ ] Gluetun connects successfully with PIA provider
- [ ] Gluetun connects successfully with WARP custom provider

### Feature Validation (CLAUDE.md Requirements)

- [ ] `docker compose up -d` starts all containers successfully
- [ ] `docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d` works (if PIA file exists)
- [ ] All containers show "Healthy" status within 90 seconds
- [ ] Transmission/qBittorrent fetches different IP from host machine
- [ ] IP validation script passes for both providers
- [ ] Provider switching works cleanly (PIA ↔ WARP)

### Network Isolation Validation

- [ ] qBittorrent IP matches gluetun VPN IP exactly
- [ ] Transmission IP matches gluetun VPN IP exactly (if using Transmission)
- [ ] Torrent client has NO connectivity when VPN stopped (kill switch)
- [ ] Other services (Sonarr, Radarr, Prowlarr) still accessible
- [ ] nginx-proxy can still route to torrent client WebUI
- [ ] No IP leaks detected during provider switching

### Security Validation

- [ ] Gluetun firewall (kill switch) enabled (`FIREWALL=on`)
- [ ] No traffic flows from torrent client when VPN down
- [ ] Host IP never exposed from torrent client
- [ ] VPN credentials not hardcoded in compose files
- [ ] WARP registration persists across container restarts
- [ ] Port forwarding works with PIA (if enabled and supported by region)

### Code Quality Validation

- [ ] Environment variables clearly documented in .env.example
- [ ] Provider switching instructions clear and tested
- [ ] Old VPN scripts archived or removed
- [ ] No dead code or unused Dockerfiles
- [ ] VPN-PROVIDERS.md updated with gluetun instructions
- [ ] Validation scripts are executable and working

### Documentation Validation

- [ ] WARP setup instructions complete (wgcf process)
- [ ] PIA setup instructions updated for gluetun
- [ ] Troubleshooting section covers common gluetun issues
- [ ] IP leak validation process documented
- [ ] Provider switching steps clearly explained

---

## Anti-Patterns to Avoid

- ❌ Don't skip wgcf config generation for WARP (required for custom provider)
- ❌ Don't remove network_mode: "container:gluetun" from torrent clients
- ❌ Don't put port mappings on torrent client (they go on gluetun)
- ❌ Don't disable gluetun firewall (`FIREWALL=off`) - this is the kill switch
- ❌ Don't hardcode VPN credentials in docker-compose.yml
- ❌ Don't skip IP leak validation - critical security requirement
- ❌ Don't assume gluetun auto-detects WARP (it doesn't - needs custom provider)
- ❌ Don't use PIA OpenVPN if wireguard is available (slower, less secure)
- ❌ Don't forget to update .env.example with new gluetun variables
- ❌ Don't remove docker-compose.pia.yml if it's required for validation

## Post-Implementation Notes

### WARP Configuration Persistence

The wgcf-generated WARP configuration should be committed to the repository (in .env.example as placeholders) or documented for easy regeneration. The registration is tied to the generated private key, so losing it means re-registering.

### PIA Port Forwarding Limitations

Gluetun's PIA wireguard port forwarding may be limited compared to OpenVPN. If port forwarding is critical:
1. Test with wireguard first
2. If issues, fallback to OpenVPN (`VPN_TYPE=openvpn`)
3. Document any limitations in VPN-PROVIDERS.md

### Provider-Specific Gotchas

**WARP:**
- Config must be regenerated if WARP account expires
- MTU of 1280 is required (gluetun handles this)
- Cannot manually choose server location

**PIA:**
- Port forwarding regions: https://github.com/qdm12/gluetun-wiki/blob/main/setup/providers/private-internet-access.md#port-forwarding
- Some regions don't support wireguard port forwarding
- Server selection affects performance and features

### Migration Rollback Plan

If gluetun migration fails, rollback procedure:
1. Restore old Dockerfiles: `git checkout dockerfiles/vpn/`
2. Restore old docker-compose: `git checkout docker-compose.yml`
3. Restore old scripts: `git checkout scripts/vpn/`
4. Run: `docker compose down && docker compose up -d`

## Confidence Score

**7/10** - Implementation success likely with careful attention to WARP configuration and gluetun setup.

**Uncertainties:**
- WARP custom provider in gluetun requires precise wireguard config extraction (wgcf output parsing)
- PIA wireguard port forwarding may have limitations in gluetun
- Provider switching may need additional validation beyond documented tests
- Docker-compose.pia.yml file may need significant changes or deprecation

**Mitigations:**
- Detailed wgcf setup script provided
- Both PIA native and custom providers documented as options
- Extensive validation loop covering all scenarios
- Rollback plan documented for migration failures

**Success Factors:**
- Gluetun is battle-tested and widely used
- Extensive research and documentation reviewed
- Validation requirements from CLAUDE.md are clear and testable
- Network isolation pattern (network_mode: container) is well understood