name: "Infrastructure Setup - Local Torrent + Plex Media Hub (PRP-01)"
description: |
  Complete infrastructure setup for a self-hosted torrent management and media streaming solution.
  Creates Docker orchestration, directory structure, React web UI skeleton, and service configurations.

---

## Goal

**Feature Goal**: Establish fully functional infrastructure for local torrent management and media streaming with VPN-protected downloads, torrent indexing, and Plex media server integration.

**Deliverable**: Working Docker Compose environment with Prowlarr, qBittorrent+VPN, Plex, and React web UI, plus all required directory structure and configuration files.

**Success Definition**: All containers start successfully with proper health checks, services can communicate, VPN connection is active, and basic web UI loads without errors.

## User Persona

**Target User**: Technical home user setting up a self-hosted media server

**Use Case**: Initial system deployment and configuration for torrent-based media acquisition and streaming

**User Journey**: 
1. Clone repository
2. Configure VPN credentials and environment variables
3. Run docker-compose up
4. Access web UI to confirm all services are operational
5. Begin using system for torrent search and media management

**Pain Points Addressed**: Complex multi-service setup, VPN configuration challenges, service dependency coordination

## Why

- Establishes foundation for all subsequent features (search, downloads, media streaming)
- Ensures proper security through VPN isolation and container separation
- Creates scalable architecture for future feature additions
- Provides reliable service orchestration with health monitoring and automatic recovery

## What

A complete infrastructure setup that creates:
- Docker Compose orchestration with health checks and service dependencies
- VPN-protected qBittorrent container with proper network isolation
- Prowlarr indexer aggregation service
- Plex media server with library scanning
- React/Next.js web UI application skeleton with mobile-first responsive design
- Proper directory structure for downloads, torrents, configs, and media
- Environment configuration with secure defaults

### Success Criteria

- [ ] All Docker containers start and reach healthy status
- [ ] VPN connection established and verified (no IP leaks)
- [ ] Prowlarr web interface accessible at localhost:9696
- [ ] qBittorrent web interface accessible at localhost:8080 through VPN
- [ ] Plex web interface accessible at localhost:32400
- [ ] React web UI accessible at localhost:3000 with service status dashboard
- [ ] All services can communicate via Docker network
- [ ] Directory structure created with proper permissions
- [ ] Health checks passing for all services

## All Needed Context

### Context Completeness Check

_This PRP provides complete infrastructure setup context including Docker configuration, VPN setup, service integration patterns, and modern React application architecture._

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://github.com/binhex/arch-qbittorrentvpn
  why: Official VPN container configuration, environment variables, troubleshooting
  critical: NET_ADMIN capability requirement, VPN provider setup, network isolation patterns

- url: https://docs.linuxserver.io/images/docker-prowlarr/
  why: LinuxServer Prowlarr container configuration and volume mounting
  critical: API key generation, indexer configuration workflow

- url: https://docs.linuxserver.io/images/docker-plex/
  why: LinuxServer Plex container setup, hardware transcoding, claim tokens
  critical: Network mode considerations, media library structure

- url: https://docs.docker.com/compose/compose-file/compose-file-v3/
  why: Health check syntax, service dependencies with condition: service_healthy
  critical: Proper depends_on usage, restart policies, volume syntax

- url: https://nextjs.org/docs/app/building-your-application/routing
  why: Next.js App Router patterns for API integration and mobile-first design
  critical: API routes for service integration, responsive design patterns

- url: https://tailwindcss.com/docs/responsive-design
  why: Mobile-first CSS framework configuration and touch-friendly design
  critical: Breakpoint strategy, accessibility considerations

- file: docker-compose.yml
  why: Complete service configuration already exists - use as reference
  pattern: Health check implementation, volume mounting, environment variables
  gotcha: web-ui service expects ./web-ui directory that doesn't exist yet

- file: .env.example
  why: Environment variable structure and VPN configuration template
  pattern: VPN credentials, network configuration, service passwords
  gotcha: VPN_USER and VPN_PASS must be configured for container to start
```

### Current Codebase tree

```bash
/home/dustin/projects/torrents
├── docker-compose.yml          # Complete multi-service configuration
├── PRD.md                     # Project requirements document
└── PRPs/                      # PRP framework and templates
    ├── README.md
    ├── templates/
    └── PRDs/
```

### Desired Codebase tree with files to be added

```bash
/home/dustin/projects/torrents
├── docker-compose.yml          # Existing - complete service orchestration
├── .env                       # Created from .env.example with real credentials
├── web-ui/                    # React/Next.js application directory
│   ├── package.json           # Dependencies: Next.js 14, TypeScript, Tailwind
│   ├── tsconfig.json          # TypeScript configuration with path mapping
│   ├── tailwind.config.js     # Mobile-first responsive design config
│   ├── next.config.js         # Next.js configuration for API proxy
│   ├── src/
│   │   ├── app/               # Next.js App Router structure
│   │   │   ├── layout.tsx     # Root layout with responsive navigation
│   │   │   ├── page.tsx       # Dashboard with service status
│   │   │   ├── api/           # API routes for service integration
│   │   │   └── globals.css    # Tailwind CSS imports and custom styles
│   │   ├── components/        # Reusable UI components
│   │   │   ├── ServiceStatus.tsx    # Health monitoring component
│   │   │   ├── Layout/              # Navigation and responsive layout
│   │   │   └── ui/                  # Base UI components (buttons, inputs)
│   │   ├── lib/               # Utilities and API clients
│   │   │   ├── api.ts         # HTTP client for Prowlarr/qBittorrent APIs
│   │   │   └── utils.ts       # Helper functions
│   │   └── types/             # TypeScript interfaces for APIs
│   ├── Dockerfile             # Multi-stage production build
│   └── .env.example           # Environment template for API endpoints
├── config/                    # Service configuration directories
│   ├── prowlarr/             # Prowlarr configuration persistence
│   ├── qbittorrent/          # qBittorrent settings and session data
│   └── plex/                 # Plex Media Server configuration
├── data/                     # Data persistence directories
│   ├── downloads/            # qBittorrent download directories
│   │   ├── incomplete/       # Active downloads
│   │   └── complete/         # Completed downloads (Plex media source)
│   └── torrents/             # Stored .torrent files for re-download
└── README.md                 # Setup and usage instructions
```

### Known Gotchas of our codebase & Library Quirks

```yaml
# CRITICAL: binhex/arch-qbittorrentvpn requires specific setup
VPN_CONTAINER:
  - Requires NET_ADMIN capability in docker-compose
  - Must have VPN_USER and VPN_PASS configured or container fails to start
  - Uses strict port forwarding - network issues if VPN doesn't support it
  - Health check depends on qBittorrent API being accessible through VPN

# LinuxServer containers use specific user/group patterns
LINUXSERVER_CONTAINERS:
  - PUID=1000 and PGID=1000 must match host user for file permissions
  - Config directories must be writable by these UIDs
  - Volume mount paths must be consistent between services

# Docker Compose service dependencies
SERVICE_DEPENDENCIES:
  - web-ui depends on prowlarr and qbittorrent being healthy
  - condition: service_healthy requires health check implementation
  - Services with VPN may take longer to reach healthy state
  - Restart policies must account for VPN connection delays

# Next.js production build requirements
NEXTJS_BUILD:
  - Requires Node.js 18+ for App Router features
  - Build process needs API endpoint environment variables
  - Production builds need explicit host binding (0.0.0.0) for Docker
  - Static file serving needs proper base path configuration
```

## Implementation Blueprint

### Data models and structure

Define TypeScript interfaces for API integration and component props:

```typescript
// Service status monitoring
interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  url: string;
  lastCheck: Date;
}

// Prowlarr API types
interface ProwlarrSearchResult {
  title: string;
  size: number;
  seeders: number;
  leechers: number;
  downloadUrl: string;
  magnetUrl: string;
  indexer: string;
  category: string;
  publishDate: string;
}

// qBittorrent API types
interface TorrentInfo {
  hash: string;
  name: string;
  size: number;
  progress: number;
  dlspeed: number;
  upspeed: number;
  state: string;
  eta: number;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE directory structure and permissions
  - EXECUTE: mkdir -p config/{prowlarr,qbittorrent,plex} data/{downloads/{incomplete,complete},torrents}
  - EXECUTE: sudo chown -R 1000:1000 config/ data/
  - VERIFY: All directories exist with correct permissions
  - PLACEMENT: Project root directory structure

Task 2: CREATE .env file from template
  - COPY: .env.example to .env
  - CONFIGURE: Add real VPN credentials (VPN_USER, VPN_PASS)
  - CONFIGURE: Set LAN_NETWORK to match local subnet
  - CONFIGURE: Generate strong passwords for QBITTORRENT_PASS
  - PLACEMENT: Project root as .env

Task 3: CREATE web-ui/package.json with dependencies
  - IMPLEMENT: Next.js 14 project with TypeScript and Tailwind CSS
  - DEPENDENCIES: next@^14, react@^18, typescript, tailwindcss, @types/node
  - DEPENDENCIES: lucide-react for icons, clsx for conditional classes
  - DEV_DEPENDENCIES: @types/react, eslint-config-next, prettier
  - SCRIPTS: dev, build, start, lint, type-check
  - PLACEMENT: web-ui/package.json

Task 4: CREATE web-ui TypeScript configuration
  - IMPLEMENT: tsconfig.json with path mapping and strict mode
  - CONFIGURE: Module resolution for src/* paths
  - CONFIGURE: Next.js specific compiler options
  - FOLLOW pattern: Modern TypeScript configuration with strict settings
  - PLACEMENT: web-ui/tsconfig.json

Task 5: CREATE web-ui/next.config.js for API proxy
  - IMPLEMENT: Next.js configuration with API rewrites
  - CONFIGURE: Proxy rules for Prowlarr (/api/prowlarr/* -> http://prowlarr:9696/api/*)
  - CONFIGURE: Proxy rules for qBittorrent (/api/qbittorrent/* -> http://qbittorrent:8080/api/*)
  - CONFIGURE: Production build optimization
  - PLACEMENT: web-ui/next.config.js

Task 6: CREATE web-ui/tailwind.config.js for mobile-first design
  - IMPLEMENT: Tailwind CSS configuration with mobile-first breakpoints
  - CONFIGURE: Touch-friendly spacing (minimum 44px touch targets)
  - CONFIGURE: Custom colors for dark/light themes
  - CONFIGURE: Typography scale starting from 16px base
  - PLACEMENT: web-ui/tailwind.config.js

Task 7: CREATE web-ui/src/app/layout.tsx root layout
  - IMPLEMENT: HTML document structure with responsive viewport
  - IMPLEMENT: Navigation header with mobile hamburger menu
  - IMPLEMENT: Service status indicator in header
  - FOLLOW pattern: Next.js App Router layout with TypeScript
  - PLACEMENT: web-ui/src/app/layout.tsx

Task 8: CREATE web-ui/src/app/page.tsx dashboard
  - IMPLEMENT: Service health monitoring dashboard
  - IMPLEMENT: Quick action buttons (search, downloads, settings)
  - IMPLEMENT: System status overview (disk space, active downloads)
  - RESPONSIVE: Mobile-first design with touch-friendly elements
  - PLACEMENT: web-ui/src/app/page.tsx

Task 9: CREATE web-ui/src/lib/api.ts service integration
  - IMPLEMENT: HTTP client for Prowlarr and qBittorrent APIs
  - IMPLEMENT: Authentication handling for qBittorrent sessions
  - IMPLEMENT: Error handling and retry logic
  - IMPLEMENT: TypeScript interfaces for API responses
  - PLACEMENT: web-ui/src/lib/api.ts

Task 10: CREATE web-ui/Dockerfile for production builds
  - IMPLEMENT: Multi-stage Docker build (build and runtime stages)
  - CONFIGURE: Node.js 18 Alpine base image for smaller size
  - CONFIGURE: Dependency caching for faster rebuilds
  - CONFIGURE: Security best practices (non-root user, minimal attack surface)
  - PLACEMENT: web-ui/Dockerfile

Task 11: TEST Docker Compose startup sequence
  - EXECUTE: docker-compose up -d
  - VERIFY: All services reach healthy status within 2 minutes
  - VERIFY: No container restart loops or failure states
  - TROUBLESHOOT: Check logs for any configuration errors
  - DEPENDENCY: All previous tasks completed

Task 12: VERIFY VPN connectivity and isolation
  - EXECUTE: docker exec qbittorrent curl ipinfo.io
  - VERIFY: IP address differs from host IP (VPN active)
  - VERIFY: qBittorrent web UI accessible through VPN tunnel
  - TROUBLESHOOT: VPN logs if connectivity fails
  - DEPENDENCY: Task 11 (containers running)

Task 13: CREATE comprehensive setup documentation
  - IMPLEMENT: README.md with step-by-step setup instructions
  - DOCUMENT: Environment variable configuration requirements
  - DOCUMENT: Troubleshooting guide for common issues
  - DOCUMENT: Service access URLs and default credentials
  - PLACEMENT: Project root README.md
```

### Implementation Patterns & Key Details

```typescript
// Next.js API route pattern for service proxy
export async function GET(request: Request) {
  try {
    const response = await fetch('http://prowlarr:9696/api/v1/system/status', {
      headers: {
        'X-Api-Key': process.env.PROWLARR_API_KEY || '',
      },
    });
    return Response.json(await response.json());
  } catch (error) {
    return Response.json({ error: 'Service unavailable' }, { status: 503 });
  }
}

// Service health check component pattern
const useServiceHealth = (serviceName: string, url: string) => {
  const [health, setHealth] = useState<ServiceHealth>({
    name: serviceName,
    status: 'unknown',
    url,
    lastCheck: new Date(),
  });

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`/api/${serviceName}/health`);
        setHealth(prev => ({
          ...prev,
          status: response.ok ? 'healthy' : 'unhealthy',
          lastCheck: new Date(),
        }));
      } catch (error) {
        setHealth(prev => ({
          ...prev,
          status: 'unhealthy',
          lastCheck: new Date(),
        }));
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [serviceName]);

  return health;
};

// Docker Compose health check pattern
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:9696/api/v1/system/status"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Integration Points

```yaml
DOCKER_NETWORKS:
  - Bridge network for inter-service communication
  - Host network for Plex (optimal streaming performance)
  - VPN network isolation for qBittorrent

VOLUME_MOUNTS:
  - Shared data/downloads between qBittorrent and Plex
  - Persistent config directories for service settings
  - Torrent file storage for re-download capability

API_ENDPOINTS:
  - Prowlarr: :9696/api/v1 (search, indexer management)
  - qBittorrent: :8080/api/v2 (torrent management, authentication)
  - Plex: :32400 (media library, streaming)
  - Web UI: :3000 (dashboard, service orchestration)
```

## Validation Loop

### Level 1: Infrastructure Validation (Immediate)

```bash
# Verify directory structure creation
ls -la config/ data/
# Expected: All service directories with 1000:1000 ownership

# Validate Docker Compose syntax
docker-compose config
# Expected: No YAML syntax errors, all services defined

# Check environment variables
grep -E "^VPN_(USER|PASS)=" .env | wc -l
# Expected: 2 (both VPN credentials configured)

# Verify container image availability
docker-compose pull
# Expected: All images downloaded successfully
```

### Level 2: Service Startup Validation (System Health)

```bash
# Start all services
docker-compose up -d

# Monitor startup sequence
docker-compose logs -f --tail=50
# Expected: All services start without fatal errors

# Check container health status
docker-compose ps
# Expected: All services show 'healthy' status within 2 minutes

# Verify service accessibility
curl -f http://localhost:9696/api/v1/system/status || echo "Prowlarr not ready"
curl -f http://localhost:8080/api/v2/app/version || echo "qBittorrent not ready"  
curl -f http://localhost:32400/web/index.html || echo "Plex not ready"
curl -f http://localhost:3000/health || echo "Web UI not ready"
# Expected: All services respond successfully
```

### Level 3: Integration Testing (Cross-Service)

```bash
# Test VPN isolation
docker exec qbittorrent curl -s ipinfo.io | grep -E "ip|country"
# Expected: Different IP from host, VPN provider location

# Test web UI service communication
curl -f http://localhost:3000/api/status
# Expected: JSON response with all service health status

# Test directory permissions
docker exec qbittorrent ls -la /downloads
docker exec plex ls -la /data
# Expected: Directories accessible by service users

# Verify volume mounts
docker exec qbittorrent touch /downloads/test.txt
docker exec plex ls /data/test.txt
# Expected: File visible in both containers (shared volume)
```

### Level 4: Functional Validation (User Experience)

```bash
# Web UI accessibility on mobile viewports
playwright-test --device="iPhone 13" http://localhost:3000
# Expected: Responsive design, touch-friendly navigation

# Service dashboard functionality
curl http://localhost:3000 | grep -E "(Prowlarr|qBittorrent|Plex)"
# Expected: Service status indicators visible

# API proxy functionality
curl http://localhost:3000/api/prowlarr/system/status
curl http://localhost:3000/api/qbittorrent/app/version
# Expected: Successful proxy to backend services

# Performance testing
ab -n 50 -c 5 http://localhost:3000/
# Expected: All requests successful, reasonable response times
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] Docker Compose starts all services without errors
- [ ] All containers reach healthy status: `docker-compose ps`
- [ ] VPN connectivity confirmed: Different IP from host
- [ ] Web UI loads without JavaScript errors in mobile and desktop viewports

### Infrastructure Validation

- [ ] Directory structure created with correct permissions
- [ ] Environment variables configured (no placeholder values)
- [ ] All service ports accessible from host machine
- [ ] Inter-service communication working (web UI can reach APIs)
- [ ] Volume mounts properly shared between containers

### Security Validation

- [ ] VPN isolation verified (torrent traffic protected)
- [ ] No services exposed beyond local network
- [ ] Container isolation confirmed (proper user/group mappings)
- [ ] Sensitive credentials stored in .env file (not hardcoded)
- [ ] Default passwords changed from example values

### User Experience Validation

- [ ] Web UI responsive on mobile devices (minimum 320px width)
- [ ] Service status dashboard shows real health information
- [ ] Navigation intuitive for touch interfaces
- [ ] All critical user flows work end-to-end
- [ ] Error states handled gracefully with informative messages

### Documentation & Deployment

- [ ] README.md includes complete setup instructions
- [ ] Environment variable documentation comprehensive
- [ ] Troubleshooting guide covers common issues
- [ ] Service URLs and credentials documented
- [ ] Known limitations and gotchas documented

---

## Troubleshooting Common Issues

### VPN Connection Problems
```bash
# Check VPN container logs
docker logs qbittorrent

# Common fixes for VPN issues:
# 1. Verify credentials in .env file
grep VPN_USER .env
# 2. Check VPN provider status
ping your-vpn-endpoint.com
# 3. Restart with clean config
docker-compose down && rm -rf config/qbittorrent/* && docker-compose up -d

# Verify VPN is working
docker exec qbittorrent curl ipinfo.io
```

### Service Health Check Failures
```bash
# Prowlarr not healthy
docker exec prowlarr curl localhost:9696/api/v1/system/status
# If fails: Check config directory permissions, restart container

# qBittorrent not healthy through VPN
docker exec qbittorrent curl localhost:8080/api/v2/app/version  
# If fails: VPN connection issue, check logs for authentication errors

# Web UI build failures
docker-compose logs web-ui
# If fails: Node.js version, missing dependencies, port conflicts
```

### File Permission Issues
```bash
# Fix ownership for all service directories
sudo chown -R 1000:1000 config/ data/

# Check current permissions
ls -la config/ data/
# Expected: drwxr-xr-x 1000 1000

# Fix if containers can't write
sudo chmod -R 755 config/ data/
```

## Success Metrics

**Confidence Score: 9/10** - High confidence for one-pass implementation success

**Reasoning**: 
- Complete Docker Compose configuration already exists and tested
- All external dependencies researched with specific documentation URLs
- Directory structure and file creation tasks are deterministic
- React application patterns well-established with clear examples
- Comprehensive validation at 4 levels catches issues early
- Troubleshooting guide covers most common failure modes

**Risk Factors** (1 point deduction):
- VPN provider connectivity issues outside our control
- Potential Node.js version conflicts in different environments

**Validation**: This PRP enables an AI agent unfamiliar with the codebase to implement the complete infrastructure setup successfully using only the PRP content, external documentation URLs, and codebase access.

---

## Anti-Patterns to Avoid

- ❌ Don't start services without confirming VPN credentials are configured
- ❌ Don't ignore health check failures - investigate and fix root causes
- ❌ Don't use localhost URLs inside containers - use service names
- ❌ Don't skip directory permission setup - causes container failures
- ❌ Don't hardcode API endpoints - use environment variables for flexibility
- ❌ Don't assume VPN connects instantly - allow sufficient startup time