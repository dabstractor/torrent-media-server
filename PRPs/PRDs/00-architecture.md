# System Architecture - Local Torrent + Plex Media Hub

## Service Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Docker Host Network                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────────┐   │
│  │   Web UI     │    │   Prowlarr   │    │   qBittorrent   │   │
│  │   (React)    │────│  (Indexer)   │    │   [VPN-ONLY]    │   │
│  │   :18787     │    │   :9696      │    │   via nginx     │   │
│  └──────────────┘    └──────────────┘    └─────────────────┘   │
│         │                    │                     │           │
│         │             ┌──────────────┐             │           │
│         │             │ FlareSolverr │             │           │
│         │             │ (CF Bypass)  │             │           │
│         │             │   :18191     │             │           │
│         │             └──────────────┘             │           │
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
   - Dependencies: FlareSolverr for CloudFlare bypass
   - Health Check: HTTP GET /api/v1/system/status

2. **FlareSolverr** (CloudFlare Bypass)
   - Port: 18191
   - Purpose: Bypass CloudFlare protection for indexers
   - Dependencies: None (direct internet access required)
   - Health Check: HTTP GET /

3. **qBittorrent + VPN** (Download Service)
   - Port: 18080 (via nginx proxy)
   - Purpose: VPN-protected torrent client
   - Dependencies: VPN container
   - Health Check: HTTP GET / (proxied)
   - Network: Isolated VPN container ONLY

4. **Web UI** (Frontend Service)
   - Port: 18787
   - Purpose: Mobile-first search and management interface
   - Dependencies: prowlarr, qbittorrent, flaresolverr
   - Health Check: HTTP GET /health

5. **Plex** (Media Server)
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

### Container Network Isolation
- **VPN-Isolated**: qBittorrent routes ALL traffic through VPN container via `network_mode: "container:vpn"`
- **Direct Internet Access**: FlareSolverr, Prowlarr, Sonarr, Radarr require direct internet access
- **Host Network**: Plex uses host networking for discovery and direct play
- **Bridge Networks**:
  - `media_network` (172.27.0.0/16): Supporting services communication
  - `vpn_network` (172.29.0.0/16): VPN container isolation

### Critical Security Rules
- **qBittorrent ONLY** requires VPN isolation to prevent IP leaks
- **NO SOCKS5 proxy** for supporting containers (causes timeouts)
- **Prowlarr database**: Ensure `proxyenabled=False` to prevent FlareSolverr timeouts
- **FlareSolverr**: Must bypass all proxies for CloudFlare handling

### Access Patterns
- **Direct Ports**: Plex (32400), Prowlarr (9696), Sonarr (8989), Radarr (7878)
- **Proxied Access**: qBittorrent via nginx (18080)
- **Web UI Dashboard**: Central interface (18787)

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