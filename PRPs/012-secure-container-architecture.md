name: "PRP-012: Secure Container Network Architecture"
description: |
  A comprehensive redesign of the container network architecture to eliminate namespace leaks and guarantee that torrent traffic never exposes the host IP, while maintaining all existing service communications.

---

## Goal

**Feature Goal**: Implement a bulletproof container network architecture that makes it technically impossible for torrent traffic to leak the host's real IP address, regardless of VPN state, container crashes, or configuration errors.

**Deliverable**: A redesigned Docker Compose configuration that:
- Eliminates all namespace sharing vulnerabilities
- Implements multiple layers of network isolation
- Adds automatic kill switch functionality
- Maintains full connectivity between web-ui and all services
- Provides real-time leak monitoring and automatic remediation

**Success Definition**: Zero possibility of IP exposure. The architecture must guarantee that even in catastrophic failure scenarios (VPN crash, container escape, misconfiguration), no torrent traffic can ever use the host's network interface. All existing functionality remains intact with improved security.

## Why

- **Legal Protection**: The current setup resulted in a DMCA notice, proving that the existing architecture failed to protect the user. This is not just a technical issue—it's a legal and financial risk.
- **Trust Recovery**: After a security failure, only a complete architectural redesign with multiple fail-safes can restore confidence in the system.
- **Technical Debt**: The namespace sharing approach (`network_mode: service:vpn`) is fundamentally flawed when combined with s6-overlay. Moving away from this pattern eliminates an entire class of bugs.
- **Future Proofing**: A properly isolated architecture will remain secure even as container runtimes and base images evolve.

## What

### User-Visible Behavior
- All services remain accessible at their current ports
- Web UI can still communicate with all services
- Download performance remains unchanged
- New: Real-time IP leak monitoring dashboard
- New: Automatic service shutdown if VPN fails
- New: Network isolation status indicators

### Technical Requirements

#### Network Architecture
- **MUST** use Docker networks instead of namespace sharing
- **MUST** implement a dedicated VPN network that has no route to host
- **MUST** use iptables rules to enforce VPN-only traffic
- **MUST** implement automatic kill switch at container level
- **MUST** prevent any container from having dual network access

#### Container Changes
- **MUST** replace all `network_mode: service:vpn` with proper network configuration
- **MUST** use a VPN container that acts as a gateway router
- **MUST** implement health checks that verify VPN connectivity
- **MUST** auto-stop containers if VPN becomes unhealthy

#### Service Communication
- **MUST** maintain web-ui access to all services
- **MUST** preserve API communication between *arr services
- **MUST** keep Plex accessible for streaming
- **MUST** ensure FlareSolverr remains accessible to Prowlarr

#### Monitoring & Safety
- **MUST** log all external IP checks to audit trail
- **MUST** implement continuous leak detection
- **MUST** provide automatic remediation for detected leaks
- **MUST** alert user if host IP is ever detected

### Success Criteria
- [ ] No processes from VPN-protected containers visible on host
- [ ] Torrent traffic fails completely if VPN is down (no fallback)
- [ ] All services remain accessible through web-ui
- [ ] Kill switch activates within 5 seconds of VPN failure
- [ ] Zero DNS leaks (all DNS through VPN)
- [ ] Successful download test through VPN
- [ ] IP leak monitor shows only VPN IP for 24+ hours

### Anti-Patterns to Avoid
- ❌ Using `network_mode: service:<container>`
- ❌ Sharing network namespaces between containers
- ❌ Allowing containers to access both VPN and host networks
- ❌ Trusting application-level VPN checks alone
- ❌ Using privileged containers unnecessarily
- ❌ Implementing kill switch only at application level

## All Needed Context

### Context Completeness Check

_This PRP provides a complete architectural redesign that someone unfamiliar with the codebase could implement to achieve bulletproof network isolation._

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- file: [docker-compose.yml]
  why: "Current flawed architecture that needs replacement"
  pattern: "Identify all network_mode: service:vpn instances"

- file: [DOCKER_NAMESPACE_LEAKS.md]
  why: "Documents the specific failure modes we must prevent"
  section: "Root Causes and Solutions Implemented"

- url: "https://github.com/qdm12/gluetun/wiki"
  why: "Gluetun is the recommended VPN container with built-in kill switch"
  critical: "Focus on network isolation and firewall features"

- url: "https://docs.docker.com/network/drivers/bridge/"
  why: "Understanding Docker bridge networks for proper isolation"
  critical: "Custom bridge networks provide automatic DNS and isolation"
```

### Current Architecture (FLAWED)
```
┌─────────────┐
│    Host     │ ← LEAK POINT: Processes escape here
└──────┬──────┘
       │
┌──────┴──────┐
│  VPN (warp) │ ← namespace shared (VULNERABLE)
└──────┬──────┘
       │ network_mode: service:vpn
       ├── qbittorrent ← Can leak to host
       ├── prowlarr    ← Can leak to host  
       ├── sonarr      ← Can leak to host
       ├── radarr      ← Can leak to host
       └── flaresolverr ← Can leak to host
```

### Proposed Architecture (SECURE)
```
┌─────────────┐
│    Host     │ ← NO DIRECT ACCESS
└──────┬──────┘
       │
┌──────┴──────────────────────┐
│   Bridge Network: media_net │
├──────────────────────────────┤
│ ┌─────────┐    ┌─────────┐ │
│ │ Web-UI  │───►│  Plex   │ │
│ └────┬────┘    └─────────┘ │
│      │ Proxy Connections    │
│      ▼                      │
│ ┌─────────────────────────┐ │
│ │ Isolated VPN Network    │ │
│ │ ┌─────────────────────┐ │ │
│ │ │ Gluetun VPN Gateway │ │ │
│ │ │ - Kill Switch       │ │ │
│ │ │ - IP Tables Rules   │ │ │
│ │ │ - DNS over VPN      │ │ │
│ │ └─────────┬───────────┘ │ │
│ │           │              │ │
│ │    ┌──────┴──────┐       │ │
│ │    │ qBittorrent │       │ │
│ │    └─────────────┘       │ │
│ │    ┌─────────────┐       │ │
│ │    │  Prowlarr   │       │ │
│ │    └─────────────┘       │ │
│ │    ┌─────────────┐       │ │
│ │    │   Sonarr    │       │ │
│ │    └─────────────┘       │ │
│ │    ┌─────────────┐       │ │
│ │    │   Radarr    │       │ │
│ │    └─────────────┘       │ │
│ └─────────────────────────┘ │
└──────────────────────────────┘
```

### Key Design Decisions

1. **Gluetun VPN Container**: Purpose-built for Docker with kill switch, supports all major VPN providers
2. **Network Segmentation**: VPN network has no route to host network
3. **Web-UI as Proxy**: Maintains access to isolated services without exposing them
4. **IP Tables Enforcement**: Kernel-level blocking, not application-level
5. **Health-Based Isolation**: Unhealthy VPN = immediate service shutdown

## Implementation Blueprint

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: Create Backup and Document Current State
  - BACKUP: Current docker-compose.yml and all config directories
  - DOCUMENT: Current port mappings and service dependencies
  - CAPTURE: Current working service URLs for validation
  - TEST: Current functionality to establish baseline

Task 2: Implement Gluetun VPN Container
  - REPLACE: caomingjun/warp with qdm12/gluetun
  - CONFIGURE: VPN provider credentials (Cloudflare WARP or PIA)
  - ENABLE: Kill switch (FIREWALL_OUTBOUND_SUBNETS)
  - SETUP: DNS over VPN (DOT=on)
  - ADD: Health check for VPN connectivity

Task 3: Create Isolated Docker Networks
  - CREATE: 'vpn_network' - Internal only, no external routing
  - CREATE: 'media_network' - Bridge network for non-VPN services
  - CONFIGURE: Custom subnets to prevent conflicts
  - DISABLE: ICC (inter-container communication) where not needed

Task 4: Migrate qBittorrent to Isolated Network
  - REMOVE: network_mode: service:vpn
  - ADD: networks: [vpn_network]
  - CONFIGURE: depends_on with condition for VPN health
  - ADD: Environment variables for VPN gateway
  - TEST: Verify no traffic without VPN

Task 5: Migrate *arr Services to Isolated Network
  - BATCH: Prowlarr, Sonarr, Radarr, FlareSolverr
  - REMOVE: network_mode: service:vpn from each
  - ADD: networks: [vpn_network] to each
  - UPDATE: Service discovery to use container names
  - VERIFY: Inter-service communication

Task 6: Implement Web-UI Proxy Layer
  - ADD: Nginx reverse proxy to web-ui container
  - CONFIGURE: Proxy passes to VPN network services
  - SETUP: WebSocket support for real-time updates
  - MAP: Service endpoints to maintain compatibility
  - TEST: All services accessible through web-ui

Task 7: Implement IP Leak Monitor Service
  - CREATE: New monitoring container
  - ADD: Continuous IP checking every 30 seconds
  - IMPLEMENT: Automatic container stop on leak detection
  - SETUP: Persistent logging of all IP checks
  - ADD: AlertManager/webhook for notifications

Task 8: Add Kill Switch Enforcement
  - CONFIGURE: Gluetun FIREWALL_OUTBOUND_SUBNETS
  - ADD: iptables rules in VPN container
  - IMPLEMENT: Network policies in Docker
  - TEST: Simulate VPN failure and verify no traffic
  - VERIFY: DNS queries blocked when VPN down

Task 9: Implement Health-Based Orchestration
  - ADD: Advanced health checks to all services
  - CONFIGURE: depends_on with health conditions
  - IMPLEMENT: Auto-restart policies with backoff
  - ADD: Service dependency chains
  - TEST: Cascading shutdown on VPN failure

Task 10: Create Validation and Monitoring Scripts
  - CREATE: validate_network_isolation.sh
  - CREATE: continuous_leak_monitor.sh
  - ADD: Automated testing for all failure scenarios
  - IMPLEMENT: Daily IP leak report generation
  - SETUP: Prometheus metrics for monitoring
```

## Validation Loop

### Level 1: Configuration Validation (Immediate)
```bash
# Validate Docker Compose syntax
docker-compose config --quiet

# Check network configuration
docker network ls
docker network inspect vpn_network
docker network inspect media_network

# Verify no namespace sharing
grep -r "network_mode: service" docker-compose.yml && echo "FAIL: Namespace sharing detected" || echo "PASS: No namespace sharing"
```

### Level 2: Network Isolation Testing
```bash
# Test 1: Verify VPN container has no host network access
docker exec gluetun ping -c 1 host.docker.internal && echo "FAIL: Can reach host" || echo "PASS: Cannot reach host"

# Test 2: Verify qBittorrent cannot reach internet without VPN
docker stop gluetun
docker exec qbittorrent curl -m 5 ifconfig.me && echo "FAIL: Internet accessible without VPN" || echo "PASS: No internet without VPN"
docker start gluetun

# Test 3: Verify correct IP when VPN is running
VPN_IP=$(docker exec gluetun curl -s ifconfig.me)
QB_IP=$(docker exec qbittorrent curl -s ifconfig.me)
[ "$VPN_IP" = "$QB_IP" ] && echo "PASS: IPs match" || echo "FAIL: IP mismatch"
```

### Level 3: Service Communication Testing
```bash
# Test all service endpoints through web-ui
curl -f http://localhost:8787/api/health  # Web-UI health
curl -f http://localhost:8787/proxy/qbittorrent/api/v2/app/version
curl -f http://localhost:8787/proxy/prowlarr/api/v1/health
curl -f http://localhost:8787/proxy/sonarr/api/v3/health
curl -f http://localhost:8787/proxy/radarr/api/v3/health

# Test inter-service communication
docker exec prowlarr curl -f http://qbittorrent:8080/api/v2/app/version
docker exec sonarr curl -f http://prowlarr:9696/api/v1/health
```

### Level 4: Kill Switch Testing
```bash
# Test 1: Simulate VPN failure
docker exec gluetun killall openvpn  # Or appropriate VPN process
sleep 10
docker exec qbittorrent curl -m 5 ifconfig.me && echo "FAIL: Kill switch not working" || echo "PASS: Kill switch active"

# Test 2: DNS leak test
docker exec qbittorrent nslookup google.com && echo "FAIL: DNS leaking" || echo "PASS: DNS blocked"

# Test 3: Recovery test
docker restart gluetun
sleep 30
docker exec qbittorrent curl -s ifconfig.me && echo "PASS: VPN recovered" || echo "FAIL: VPN not recovered"
```

### Level 5: 24-Hour Leak Test
```bash
# Run continuous monitoring for 24 hours
./scripts/continuous_leak_monitor.sh --duration 24h --interval 30s

# Check results
grep "HOST_IP_DETECTED" /var/log/ip-monitor.log && echo "FAIL: Leak detected" || echo "PASS: No leaks in 24 hours"
```

## Final Validation Checklist

### Security Validation
- [ ] No processes visible on host from VPN-protected containers
- [ ] Kill switch activates within 5 seconds
- [ ] No DNS leaks detected
- [ ] No IP leaks in 24-hour test
- [ ] VPN failure causes complete traffic stop
- [ ] No fallback to host network possible

### Functionality Validation
- [ ] Web-UI accessible at port 8787
- [ ] All services reachable through web-UI
- [ ] Prowlarr can manage indexers
- [ ] Sonarr/Radarr can search and download
- [ ] qBittorrent can download torrents
- [ ] Plex can stream media

### Performance Validation
- [ ] Download speeds comparable to previous setup
- [ ] Service response times under 2 seconds
- [ ] Container memory usage reasonable
- [ ] No CPU spikes from monitoring

### Operational Validation
- [ ] Automatic recovery from VPN disconnect
- [ ] Clean shutdown with cleanup script
- [ ] Logs accessible for troubleshooting
- [ ] Monitoring dashboard functional
- [ ] Alerts working for leak detection

## Risk Mitigation

### Rollback Plan
1. Keep backup of working configuration
2. Document all service URLs and ports
3. Test rollback procedure before starting
4. Maintain parallel setup if possible

### Known Challenges
- Web-UI proxy configuration complexity
- Service discovery in isolated networks  
- Maintaining WebSocket connections
- VPN provider compatibility

### Success Metrics
- Zero IP leaks in 30 days of operation
- 99.9% VPN uptime
- All services functional 24/7
- No user intervention required
- No DMCA notices

## Post-Implementation

### Monitoring
- Daily IP leak reports
- VPN uptime metrics
- Service health dashboard
- Network traffic analysis

### Documentation Updates
- Update README with new architecture
- Document troubleshooting procedures
- Create runbooks for common issues
- Update CLAUDE.md with new patterns