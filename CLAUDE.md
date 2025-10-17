# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
- Feature validation must ensure successful docker build with `docker compose up -d` as well as `docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d` and any other VPN providers that are added in the future. All variations of the docker build must instantiate all relevant containers correctly. All containers must show "Healthy".

## Network Security Rules
**CRITICAL**: qBittorrent MUST remain fully VPN-isolated via `network_mode: "container:vpn"` to prevent IP leaks during torrenting. Other services do not require this. Any network configuration changes risk exposing the real IP address.

Ensure `proxyenabled=False` in Prowlarr database to prevent timeouts.

## Common Development Commands

### Docker Operations
```bash
# Standard stack startup (Cloudflare WARP VPN)
docker-compose up -d

# PIA VPN provider startup
docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d

# Stop all services
docker-compose down

# View service status
docker-compose ps

# View logs for specific service
docker-compose logs [service-name]

# Force rebuild of web-ui
docker-compose up -d --build web-ui
```

### Web UI Development
```bash
cd web-ui

# Install dependencies
npm install

# Development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Testing
npm run test
npm run test:watch

# E2E Testing
npm run e2e
npm run e2e:headed

# Production build
npm run build
npm start
```

### VPN Validation
```bash
# Validate VPN isolation and IP masking
./scripts/validate-vpn.sh

# Check VPN connection status
docker logs vpn

# Verify torrent client is using VPN
docker exec qbittorrent curl -s ipinfo.io/ip
```

### Media Pipeline Scripts
```bash
# Trigger Plex organization for specific file
./scripts/trigger-plex-organization.sh [filename]

# Refresh Plex library
./scripts/refresh-plex-library.sh [library_id]

# Process recent downloads
./scripts/process-recent-downloads.sh
```

## Architecture Overview

### Container Network Isolation
- **VPN-Isolated**: qBittorrent/Transmission use `network_mode: "container:vpn"` for complete traffic routing through VPN
- **Direct Internet**: Prowlarr, Sonarr/Radarr, Plex, Web-UI require direct internet access for metadata/API communication
- **Bridge Networks**: `media_network` (172.27.0.0/16) for service communication, `vpn_network` (172.29.0.0/16) for VPN isolation

### VPN Providers
- **Default**: Cloudflare WARP (zero configuration, free)
- **Premium**: Private Internet Access (PIA) with WireGuard and port forwarding
- **Switching**: Use provider-specific scripts or docker-compose overlay files

### Media Pipeline Architecture
1. **Download Completion**: Torrent clients trigger completion events
2. **File Analysis**: MediaAnalysisService determines codec compatibility
3. **Organization**: Compatible files get symlinked, incompatible files converted to H.264/AAC MP4
4. **Plex Integration**: Automatic library refresh and metadata association

### Key Services
- **VPN**: Gluetun unified client supporting multiple providers
- **Torrent**: qBittorrent (default) or Transmission (alternative)
- **Indexer**: Prowlarr with FlareSolverr for CloudFlare bypass
- **Media Management**: Sonarr (TV), Radarr (Movies), Plex (server)
- **Web UI**: Next.js dashboard with mobile-first responsive design

## Project Structure

### Configuration Templates
```
config/templates/
├── qbittorrent/     # qBittorrent configuration templates
├── prowlarr/        # Prowlarr indexer templates
├── sonarr/          # Sonarr TV show templates
├── radarr/          # Radarr movie templates
└── plex/            # Plex Media Server templates
```

### Service Entry Points
All services use custom entrypoint scripts in `/scripts/` for:
- Configuration initialization from templates
- Health check setup
- Directory permission management
- API key and service integration

### Web UI Tech Stack
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS (mobile-first)
- **State**: Zustand + SWR for server state
- **Testing**: Jest + React Testing Library + Playwright
- **Real-time**: Server-Sent Events for download progress

## Critical Security Considerations

### VPN Isolation Validation
Always verify torrent client isolation:
```bash
# Host IP should differ from torrent client IP
curl -s ipinfo.io/ip
docker exec qbittorrent curl -s ipinfo.io/ip
```

### Container Security
- All services run as UID:GID 1000:1000 for consistent file permissions
- qBittorrent web UI authentication bypass configured for local network access
- Prowlarr proxy disabled to prevent FlareSolverr timeouts

### Network Security
- VPN container includes built-in kill switch via Gluetun
- Torrent clients have no direct internet access outside VPN tunnel
- External access limited to local network ranges

## Development Workflow

### Adding New Services
1. Create service in docker-compose.yml with proper health checks
2. Add configuration template in `config/templates/`
3. Create entrypoint script in `/scripts/`
4. Configure network access (VPN vs direct)
5. Update Web UI backend/frontend URLs

### Modifying VPN Configuration
- Test changes with both WARP and PIA providers
- Validate isolation after changes
- Check health check functionality
- Verify port forwarding for PIA

### Web UI Development
- Use API route handlers for backend communication
- Implement proper error handling and loading states
- Test responsive design across device sizes
- Validate real-time updates via SSE

## Troubleshooting

### VPN Issues
- Check VPN container logs: `docker logs vpn`
- Validate IP differences: `./scripts/validate-vpn.sh`
- Restart VPN stack: `docker-compose down && docker-compose up -d`

### Service Communication
- Verify container networking: `docker-compose exec service ping other-service`
- Check API key configurations
- Validate health check endpoints
- Review network isolation requirements

### Media Pipeline
- Check file permissions in `/data/` directories
- Verify Plex library scanning paths
- Review conversion logs in Web UI
- Validate symlink creation and accessibility

## Success Criteria
- All Docker containers show "healthy" status
- VPN connection active with different IP from host
- Media files automatically processed and appear in Plex
- Web UI accessible and functional on mobile devices
- Torrent client traffic fully isolated through VPN