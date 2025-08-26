# Project Context - Local Torrent + Plex Media Hub

## Project Overview
A self-hosted, LAN-only torrent management and media streaming solution combining search, download, and playback capabilities in a mobile-first interface.

## Architecture Summary

### Core Services
1. **Prowlarr** (Port 9696): Torrent indexer aggregation
2. **qBittorrent + VPN** (Port 8080): VPN-protected torrent client  
3. **Web UI** (Port 3000): Custom React interface
4. **Plex** (Port 32400): Media streaming server

### Data Flow
```
Search → Prowlarr → Results → Web UI → qBittorrent → Downloads → Plex → Streaming
```

### Key Volumes
- `/data/downloads`: Active downloads and completed media
- `/data/torrents`: Stored .torrent files for re-download
- `/config/*`: Service configuration persistence

## Development Context

### Technology Stack
- **Frontend**: React/Next.js with mobile-first design
- **Backend APIs**: Prowlarr REST, qBittorrent WebUI API  
- **Infrastructure**: Docker Compose with health checks
- **VPN**: binhex/arch-qbittorrentvpn container
- **Media**: Plex Media Server

### Environment Requirements
- Linux Docker host
- VPN provider credentials (PIA recommended)
- Local network access only
- Minimum 2GB RAM, 10GB storage

### Security Model
- VPN-isolated torrent traffic
- LAN-only web interface access
- No external authentication (v1)
- Container isolation between services

## Implementation Guidelines

### Code Organization
```
/
├── docker-compose.yml          # Service orchestration
├── .env.example               # Environment template
├── web-ui/                    # React application
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── api/              # Service integrations
│   │   ├── hooks/            # React hooks
│   │   └── utils/            # Helper functions
│   └── Dockerfile            # Web UI container
├── config/                   # Service configurations  
│   ├── prowlarr/
│   ├── qbittorrent/
│   └── plex/
└── data/                     # Persistent data
    ├── downloads/
    │   ├── incomplete/
    │   └── complete/
    └── torrents/
```

### API Integration Patterns
- **Prowlarr**: Use API key authentication for searches
- **qBittorrent**: Session-based auth with cookie management
- **Error Handling**: Consistent error format across all APIs
- **Rate Limiting**: Respect indexer rate limits (1 req/sec)

### UI/UX Principles
- Mobile-first responsive design
- Touch-friendly interface elements
- Progressive web app capabilities
- Real-time download progress updates
- Intuitive navigation patterns

## Development Workflow

### Setup Process
1. Copy `.env.example` to `.env` and configure VPN credentials
2. Run `docker-compose up -d` to start all services
3. Configure Prowlarr indexers via web interface
4. Set up qBittorrent download preferences
5. Add Plex libraries pointing to `/data` volume

### Testing Strategy
- Health check endpoints for all services
- API integration tests for critical paths
- Mobile responsive testing across devices  
- VPN connectivity verification
- Download completion workflow testing

### Deployment Considerations
- Ensure VPN credentials are properly configured
- Verify local network firewall rules
- Monitor container resource usage
- Set up log rotation for long-running containers
- Plan for graceful shutdown/restart procedures

## Integration Points

### Service Dependencies
- Web UI depends on Prowlarr + qBittorrent health
- Plex monitors `/data/downloads/complete` for new media
- qBittorrent saves completed files to shared volume
- All services share Docker bridge network

### Critical Workflows
1. **Search Flow**: UI → Prowlarr → Indexers → Results
2. **Download Flow**: UI → qBittorrent → VPN → Torrent Network
3. **Media Flow**: qBittorrent → File System → Plex → Stream

### Monitoring Requirements
- VPN connection status
- Download progress and completion
- Disk space usage
- Service health and uptime
- API response times

## Known Limitations & Considerations

### Technical Constraints
- Public indexers only (no private tracker support v1)
- LAN-only access (no remote streaming v1) 
- No automated media organization (manual Plex structure)
- Single-user interface (no multi-user support)

### Performance Considerations
- Indexer search rate limits
- VPN connection stability
- Docker container resource limits
- Large file download impact on network

### Security Considerations
- All torrent traffic must route through VPN
- Web interface exposes full system control
- No authentication mechanism in place
- Container privilege escalation for VPN

## Next Steps for Developers

1. **Start with PRP-01**: Infrastructure setup and container orchestration
2. **Focus on API integration**: Ensure all service APIs work correctly
3. **Mobile-first UI**: Build responsive interface from smallest screen up
4. **Real-time updates**: Implement WebSocket for download progress
5. **Error resilience**: Handle service failures gracefully
6. **Testing coverage**: Verify critical user paths work end-to-end

## Support Resources
- Docker Compose documentation: https://docs.docker.com/compose/
- qBittorrent WebUI API: https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)
- Prowlarr API docs: https://prowlarr.com/docs/api/
- React/Next.js documentation: https://nextjs.org/docs