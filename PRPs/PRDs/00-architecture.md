# System Architecture - Local Torrent + Plex Media Hub

## Service Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Docker Host Network                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────────┐   │
│  │   Web UI     │    │   Prowlarr   │    │   qBittorrent   │   │
│  │   (React)    │────│  (Indexer)   │    │   + VPN         │   │
│  │   :3000      │    │   :9696      │    │   :8080         │   │
│  └──────────────┘    └──────────────┘    └─────────────────┘   │
│         │                    │                     │           │
│         │                    │                     │           │
│         └────────────────────┼─────────────────────┘           │
│                              │                                 │
│                    ┌──────────────┐                           │
│                    │    Plex      │                           │
│                    │ Media Server │                           │
│                    │   :32400     │                           │
│                    └──────────────┘                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Service Dependencies

1. **Prowlarr** (Indexer Service)
   - Port: 9696
   - Purpose: Aggregate public torrent indexers
   - Dependencies: None (starts first)
   - Health Check: HTTP GET /api/v1/system/status

2. **qBittorrent + VPN** (Download Service)
   - Port: 8080
   - Purpose: VPN-protected torrent client
   - Dependencies: None (independent startup)
   - Health Check: HTTP GET /api/v2/app/version
   - Network: Isolated VPN container

3. **Web UI** (Frontend Service)
   - Port: 3000
   - Purpose: Mobile-first search and management interface
   - Dependencies: prowlarr, qbittorrent
   - Health Check: HTTP GET /health

4. **Plex** (Media Server)
   - Port: 32400
   - Purpose: Stream completed downloads
   - Dependencies: None (reads from shared volume)
   - Health Check: HTTP GET /web/index.html

## Data Flow

```
User → Web UI → Prowlarr API → Search Results → User Selection
                     ↓
User Selection → Web UI → qBittorrent API → Download Start
                     ↓
qBittorrent → Downloads Complete → Shared Volume
                     ↓
Plex → Scans Volume → Updates Library → Available for Streaming
```

## Volume Strategy

1. **Media Volume**: `/data/media`
   - Shared between qBittorrent (/downloads/complete) and Plex (/data)
   - Contains completed downloads organized for Plex

2. **Torrents Volume**: `/data/torrents`
   - Stores .torrent files for re-download capability
   - Persistent across container restarts

3. **Config Volumes**: Service-specific configurations
   - `/config/prowlarr`: Prowlarr indexer configurations
   - `/config/qbittorrent`: qBittorrent settings
   - `/config/plex`: Plex media library database

4. **Download Volume**: `/data/downloads`
   - qBittorrent working directory
   - Subdirectories: /incomplete, /complete

## Network Architecture

- **Default Bridge Network**: All services communicate internally
- **Host Network Access**: Web UI accessible at host:3000, Plex at host:32400
- **VPN Isolation**: qBittorrent traffic routed through VPN container
- **API Communication**: Internal HTTP APIs between services

## Security Considerations

1. **VPN Isolation**: All torrent traffic protected by VPN
2. **LAN-Only Access**: No external port exposure
3. **Container Isolation**: Each service runs in isolated container
4. **No Authentication**: LAN-trusted environment (v1)

## Service Communication Patterns

1. **Web UI ↔ Prowlarr**: REST API calls for search operations
2. **Web UI ↔ qBittorrent**: WebUI API for torrent management
3. **qBittorrent → File System**: Direct file writes to shared volume
4. **Plex → File System**: Read-only access to completed downloads