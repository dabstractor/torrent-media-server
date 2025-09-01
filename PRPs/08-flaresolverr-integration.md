name: "FlareSolverr Integration PRP"
description: |

---

## Goal

**Feature Goal**: Integrate FlareSolverr service into the Docker Compose stack to bypass CloudFlare protection for Prowlarr indexers

**Deliverable**: Fully functional FlareSolverr service running on port 8191 with Prowlarr configured to use it for CloudFlare-protected indexers

**Success Definition**: Popular indexers (like 1337x, The Pirate Bay) work reliably in Prowlarr searches without "blocked by CloudFlare Protection" errors

## User Persona

**Target User**: System administrator managing the torrent media stack

**Use Case**: Admin wants to search for torrents using Prowlarr but encounters CloudFlare protection blocking access to popular indexers

**User Journey**: 
1. Admin notices search failures with CloudFlare protection errors
2. Admin deploys FlareSolverr integration 
3. Admin configures Prowlarr to use FlareSolverr
4. Indexers now work reliably for torrent searches

**Pain Points Addressed**: CloudFlare blocking automated requests from Prowlarr to popular torrent indexers

## Why

- **Business Value**: Enables access to popular torrent indexers that were previously blocked
- **Integration**: Seamlessly integrates with existing Docker Compose VPN-based architecture
- **User Impact**: Dramatically improves search result coverage and reliability

## What

### User-visible Behavior
- FlareSolverr runs as a background service accessible on port 8191
- Prowlarr automatically uses FlareSolverr for CloudFlare-protected indexers
- Search results include content from previously blocked indexers
- No user interface changes required

### Technical Requirements
- FlareSolverr Docker service integrated into docker-compose.yml
- Service accessible on host port 8191 
- Proper network configuration with existing VPN setup
- Health check validation for service availability
- Integration with both base and PIA VPN configurations

### Success Criteria
- [ ] FlareSolverr service starts successfully with docker compose up -d
- [ ] FlareSolverr service starts successfully with PIA VPN: docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d
- [ ] Service accessible via http://localhost:8191/ endpoint
- [ ] Health check shows service as healthy
- [ ] Prowlarr can connect to FlareSolverr service
- [ ] Previously blocked indexers return search results
- [ ] All existing services continue to work normally

## All Needed Context

### Context Completeness Check

_"If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://github.com/FlareSolverr/FlareSolverr#docker
  why: Official Docker configuration and environment variables
  critical: Resource requirements and container setup patterns

- url: https://trash-guides.info/Prowlarr/prowlarr-setup-flaresolverr/
  why: Prowlarr-specific FlareSolverr configuration steps
  critical: Indexer proxy setup and tagging system

- file: docker-compose.yml
  why: Current Docker Compose service patterns and network configuration
  pattern: VPN network setup, health checks, service dependencies, port mappings
  gotcha: Services using network_mode: service:vpn cannot expose ports directly

- file: docker-compose.pia.yml
  why: PIA VPN override configuration patterns 
  pattern: Service overrides and environment variable structure
  gotcha: Must maintain compatibility with both WARP and PIA VPN configurations

- file: .env
  why: Environment variable patterns and network configuration
  pattern: Port configuration, network settings, service URLs
  gotcha: PROWLARR_URL uses vpn hostname due to network_mode: service:vpn

- file: web-ui/__tests__/api/proxy-routes.test.ts
  why: Testing patterns for service integration and health checks
  pattern: Mock fetch, error handling, service connectivity tests
  gotcha: Tests expect 503 errors for unavailable services
```

### Current Codebase tree

```bash
/home/dustin/projects/torrents
├── docker-compose.yml           # Main service definitions
├── docker-compose.pia.yml       # PIA VPN overrides
├── .env                         # Environment configuration
├── config/                      # Service configurations
│   ├── prowlarr/               # Prowlarr data and config
│   └── vpn/                    # VPN configuration files
├── web-ui/
│   ├── __tests__/api/          # API integration tests
│   ├── e2e/                    # End-to-end tests with Playwright
│   └── playwright.config.ts    # Test configuration
└── PRPs/                       # Project Reference Prompts
    ├── ai_docs/                # Technical documentation
    └── templates/              # PRP templates
```

### Desired Codebase tree with files to be added

```bash
/home/dustin/projects/torrents
├── docker-compose.yml           # MODIFY: Add flaresolverr service
├── docker-compose.pia.yml       # MODIFY: Ensure FlareSolverr compatibility
├── .env                         # MODIFY: Add FLARESOLVERR_URL variable
├── config/
│   └── flaresolverr/           # CREATE: FlareSolverr config directory (if needed)
└── web-ui/
    └── __tests__/
        └── integration/         # CREATE: FlareSolverr integration tests
            └── flaresolverr.test.ts  # CREATE: Service connectivity test
```

### Known Gotchas of our codebase & Library Quirks

```yaml
# CRITICAL: Docker networking constraints
# Services using network_mode: service:vpn cannot expose ports directly
# Port exposure must happen on the vpn service itself

# CRITICAL: FlareSolverr resource usage
# Each request spawns a new browser instance - can consume significant RAM
# Recommendation: minimum 2GB RAM, prefer 4GB+ for stability

# CRITICAL: VPN network configuration
# web-ui container must be on vpn_network to resolve service hostnames
# FlareSolverr should be accessible to both web-ui and prowlarr containers

# LIBRARY QUIRK: FlareSolverr container architecture
# Use ghcr.io/flaresolverr/flaresolverr:latest for best compatibility
# Supports multiple architectures including ARM64 and x86-64

# CODEBASE PATTERN: Health check consistency
# All services use curl-based health checks with specific retry patterns
# Health checks prevent dependent services from starting prematurely
```

## Implementation Blueprint

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY docker-compose.yml
  - ADD: flaresolverr service definition with proper image and ports
  - FOLLOW pattern: existing service structure with health checks
  - NAMING: service name "flaresolverr", container name "flaresolverr"
  - PLACEMENT: After vpn service, before prowlarr service
  - NETWORK: Add to vpn_network for service discovery
  - DEPENDENCIES: depends_on vpn service health

Task 2: MODIFY .env file
  - ADD: FLARESOLVERR_URL=http://flaresolverr:8191
  - FOLLOW pattern: existing service URL format
  - PLACEMENT: In API Configuration section
  - CONSISTENCY: Use service hostname format like other URLs

Task 3: MODIFY docker-compose.pia.yml (optional)
  - VERIFY: FlareSolverr compatibility with PIA VPN configuration
  - TEST: Ensure no conflicts with PIA service overrides
  - FOLLOW pattern: Only add overrides if needed for PIA compatibility

Task 4: CREATE integration test
  - CREATE: web-ui/__tests__/integration/flaresolverr.test.ts
  - IMPLEMENT: Service connectivity test following proxy-routes.test.ts pattern
  - FOLLOW pattern: Mock fetch, test health endpoint, error handling
  - COVERAGE: Test FlareSolverr endpoint availability and response format

Task 5: VALIDATE Docker build
  - TEST: docker compose up -d builds all services including FlareSolverr
  - TEST: docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d works
  - VERIFY: All containers show "Healthy" status
  - CONFIRM: FlareSolverr accessible on http://localhost:8191/

Task 6: CREATE Prowlarr configuration documentation
  - CREATE: PRPs/ai_docs/flaresolverr-prowlarr-config.md
  - DOCUMENT: Step-by-step Prowlarr FlareSolverr proxy setup
  - INCLUDE: Screenshots or detailed UI navigation steps
  - REFERENCE: Manual configuration steps for indexer integration
```

### Implementation Patterns & Key Details

```yaml
# FlareSolverr Docker Service Pattern
flaresolverr:
  image: ghcr.io/flaresolverr/flaresolverr:latest
  container_name: flaresolverr
  networks:
    - vpn_network  # CRITICAL: Must be on same network as prowlarr
  ports:
    - "8191:8191"  # PATTERN: Standard FlareSolverr port
  environment:
    - LOG_LEVEL=info  # GOTCHA: Control logging verbosity
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8191/"]
    interval: 30s
    timeout: 10s 
    retries: 3
    start_period: 30s
  restart: unless-stopped
  depends_on:
    vpn:
      condition: service_healthy

# Health Check Pattern - Test service availability
curl -f http://localhost:8191/ || echo "FlareSolverr health check failed"

# Integration Test Pattern - Service connectivity validation
const response = await fetch('http://localhost:8191/', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
});
expect(response.status).toBe(200);
```

### Integration Points

```yaml
DOCKER_COMPOSE:
  - modify: docker-compose.yml
  - pattern: "Add flaresolverr service with vpn_network, health checks, proper dependencies"
  
ENVIRONMENT:
  - add to: .env
  - pattern: "FLARESOLVERR_URL=http://flaresolverr:8191"
  
NETWORKING:
  - network: vpn_network
  - pattern: "Same network as prowlarr for service discovery"
  
VALIDATION:
  - test: Both docker compose configurations
  - pattern: "docker compose up -d && docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Validate Docker Compose syntax
docker-compose config                     # Validate main configuration
docker-compose -f docker-compose.yml -f docker-compose.pia.yml config  # Validate with PIA

# Expected: Valid configuration with no syntax errors
```

### Level 2: Unit Tests (Component Validation)  

```bash
# Run integration tests
cd web-ui
npm test __tests__/integration/flaresolverr.test.ts

# Expected: FlareSolverr connectivity test passes
```

### Level 3: Integration Testing (System Validation)

```bash
# Start services with base configuration
docker compose up -d

# Verify all services are healthy
docker ps --format "table {{.Names}}\t{{.Status}}"

# Test FlareSolverr endpoint
curl -f http://localhost:8191/ || echo "FlareSolverr not accessible"

# Stop and test with PIA configuration
docker compose down
docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d

# Verify all services healthy with PIA
docker ps --format "table {{.Names}}\t{{.Status}}"

# Test FlareSolverr with PIA
curl -f http://localhost:8191/ || echo "FlareSolverr not accessible with PIA"

# Expected: All services show "healthy" status, FlareSolverr responds on port 8191
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Prowlarr Integration Test
# Access Prowlarr web UI and configure FlareSolverr proxy
curl -f http://localhost:9696/

# FlareSolverr API Test
# Test actual CloudFlare bypass functionality
curl -X POST http://localhost:8191/v1 \
  -H "Content-Type: application/json" \
  -d '{"cmd": "request.get", "url": "https://httpbin.org/headers", "maxTimeout": 60000}'

# Resource Usage Monitoring
# Verify FlareSolverr doesn't consume excessive resources
docker stats --no-stream flaresolverr

# Network Connectivity Test
# Verify service discovery between containers
docker exec prowlarr ping -c 3 flaresolverr

# Expected: Prowlarr accessible, FlareSolverr API responds, reasonable resource usage, container connectivity
```

## Final Validation Checklist

### Technical Validation
- [ ] Docker Compose configuration validates successfully
- [ ] Both base and PIA configurations build and start all containers
- [ ] All services show "healthy" status including FlareSolverr
- [ ] FlareSolverr accessible on http://localhost:8191/
- [ ] Integration test passes verifying service connectivity
- [ ] No port conflicts or networking issues

### Feature Validation
- [ ] FlareSolverr service integrated into Docker Compose stack
- [ ] Service accessible on host port 8191 as specified
- [ ] Compatible with both WARP and PIA VPN configurations
- [ ] Proper network configuration allows Prowlarr to connect
- [ ] Health checks prevent premature dependent service startup
- [ ] Service restarts automatically with restart: unless-stopped

### Code Quality Validation
- [ ] Follows existing Docker Compose service patterns
- [ ] Uses consistent naming conventions and file placement
- [ ] Environment variables follow project standards
- [ ] Health checks match existing service patterns
- [ ] Dependencies properly configured with condition: service_healthy

### Documentation & Deployment
- [ ] Configuration documented for manual Prowlarr setup
- [ ] Integration test covers service availability scenarios
- [ ] Environment variables clearly defined in .env
- [ ] Docker service follows security best practices

---

## Anti-Patterns to Avoid

- ❌ Don't expose FlareSolverr ports through VPN service - it should have its own port mapping
- ❌ Don't skip health checks - they prevent cascading service failures
- ❌ Don't hardcode URLs - use environment variables for service discovery
- ❌ Don't ignore resource constraints - FlareSolverr uses significant RAM per request
- ❌ Don't break existing VPN configurations - test both WARP and PIA compatibility
- ❌ Don't assume immediate availability - use proper service dependencies and health checks