# PRP-01: Infrastructure Setup

**Priority**: High  
**Estimated Time**: 1-2 days  
**Dependencies**: None  
**Phase**: Foundation

## Overview
Set up the core Docker Compose infrastructure with VPN-protected qBittorrent, Prowlarr indexer service, and Plex media server. This PRP establishes the foundation for all subsequent development.

## Objectives
1. Deploy VPN-protected torrent client container
2. Configure Prowlarr with public indexers
3. Set up Plex media server with proper volume mounts
4. Implement health checks for all services
5. Verify inter-service connectivity
6. Create persistent volume structure

## Tasks

### Docker Compose Setup
- [ ] Copy and configure docker-compose.yml in project root
- [ ] Set up .env file from template with VPN credentials
- [ ] Create directory structure for volumes and configs
- [ ] Verify Docker and docker-compose versions

### VPN + qBittorrent Configuration
- [ ] Configure binhex/arch-qbittorrentvpn container
- [ ] Set up VPN provider credentials (PIA recommended)
- [ ] Verify VPN connection and IP leak protection
- [ ] Configure qBittorrent WebUI access and credentials
- [ ] Set up download directories and permissions

### Prowlarr Indexer Setup
- [ ] Deploy Prowlarr container with persistent config
- [ ] Configure public torrent indexers (1337x, RARBG, etc.)
- [ ] Test API connectivity and search functionality
- [ ] Set up API key for authentication
- [ ] Verify indexer health and response times

### Plex Media Server
- [ ] Deploy Plex container with proper volume mounts
- [ ] Configure library to scan /data/downloads/complete
- [ ] Set up Plex claim token for initial setup
- [ ] Configure hardware transcoding (if available)
- [ ] Test library scanning and media detection

### Volume Structure
```
/data/
├── downloads/
│   ├── incomplete/     # qBittorrent active downloads
│   └── complete/       # Finished downloads (Plex scans here)
├── torrents/           # Stored .torrent files for re-download
└── config/
    ├── prowlarr/       # Prowlarr configuration
    ├── qbittorrent/    # qBittorrent settings
    └── plex/          # Plex media library database
```

### Health Checks
- [ ] Implement health check endpoints for all services
- [ ] Configure proper startup dependencies
- [ ] Set restart policies for container resilience
- [ ] Test container restart and recovery procedures

### Connectivity Testing
- [ ] Verify Prowlarr API responds to search requests
- [ ] Test qBittorrent WebUI API authentication
- [ ] Confirm VPN is routing all torrent traffic
- [ ] Validate Plex can access media directories
- [ ] Test inter-container communication

## Deliverables
- [x] docker-compose.yml with all service definitions
- [x] .env.example template with required variables
- [ ] Working multi-container environment
- [ ] Service configuration files
- [ ] Volume mount verification script
- [ ] Basic connectivity test results

## Acceptance Criteria
- [ ] All containers start successfully with `docker-compose up -d`
- [ ] VPN connection verified (IP address different from host)
- [ ] Prowlarr can search at least 3 public indexers
- [ ] qBittorrent WebUI accessible at configured port
- [ ] Plex WebUI loads and can scan media directories
- [ ] All health checks pass consistently
- [ ] Services restart properly after container reboot

## Environment Variables Required
```bash
# VPN Configuration
VPN_USER=your_vpn_username
VPN_PASS=your_vpn_password
VPN_PROVIDER=pia

# User Configuration  
PUID=1000
PGID=1000
TIMEZONE=America/New_York

# Network
LAN_NETWORK=192.168.0.0/24

# qBittorrent
QBITTORRENT_USER=admin
QBITTORRENT_PASS=adminpass

# Plex
PLEX_CLAIM_TOKEN=claim-token-from-plex.tv
```

## Testing Checklist
- [ ] VPN leak test shows VPN IP, not host IP
- [ ] Prowlarr search returns results from multiple indexers
- [ ] qBittorrent can add and start downloading test torrent
- [ ] Plex detects and plays test media file
- [ ] All containers survive host reboot
- [ ] Log files show no critical errors

## Troubleshooting Guide
- **VPN Connection Issues**: Check credentials, try different VPN endpoints
- **Permission Errors**: Verify PUID/PGID match host user
- **Port Conflicts**: Ensure no services using ports 3000, 8080, 9696, 32400
- **Volume Mount Issues**: Check Docker daemon has access to mount paths
- **Plex Setup**: Use Plex claim token from plex.tv/claim for initial config

## Next Steps
Upon completion, proceed to **PRP-02: Web UI Foundation** to begin building the React interface that will consume these service APIs.