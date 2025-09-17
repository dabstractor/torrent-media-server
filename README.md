# Torrent Media Hub - Local Infrastructure Setup

A complete self-hosted torrent management and media streaming solution with VPN-protected downloads, torrent indexing, Plex media server integration, and automated watchlist synchronization.

## 🚀 Quick Start

1. **Clone and Configure**
   ```bash
   git clone <repository-url>
   cd torrents
   cp .env.example .env
   # Edit .env with your VPN credentials
   ```

2. **Start Services**
   ```bash
   docker-compose up -d
   ```

3. **Access Services**
   - **Plex**: http://localhost:32400 (Media streaming)
   - **Prowlarr**: http://localhost:9696 (Torrent indexer aggregation)
   - **qBittorrent**: http://localhost:8080 (Torrent client)
   - **Sonarr**: http://localhost:8989 (TV series management)
   - **Radarr**: http://localhost:7878 (Movie management)
   - **Watchlistarr**: Automatic Plex watchlist sync (background service)
   - **Web UI**: http://localhost:3000 (Dashboard - configurable port via WEB_UI_PORT)

## 🏗️ Architecture

This setup provides:
- **VPN-Protected Downloads**: All torrent traffic routed through Cloudflare WARP VPN
- **Automated Media Management**: Sonarr/Radarr handle TV shows and movies
- **Centralized Search**: Prowlarr aggregates multiple torrent indexers
- **Watchlist Automation**: Watchlistarr syncs Plex watchlists with Sonarr/Radarr
- **Media Streaming**: Plex serves your downloaded content
- **Web Dashboard**: React-based mobile-friendly interface

## 📋 Prerequisites

- Docker and Docker Compose
- 20GB+ free disk space
- Plex account (for watchlist synchronization)

## ⚙️ Configuration

### Environment Variables

Edit `.env` file with your settings:

```bash
# Plex Configuration (Required for watchlist sync)
PLEX_TOKEN=your_plex_token_here

# Torrent Client
QBITTORRENT_USERNAME=admin
QBITTORRENT_PASSWORD=your_secure_password

# Media Directories
MEDIA_ROOT=./data/media
DOWNLOADS_ROOT=./data/downloads
CONFIG_ROOT=./config

# Timezone
TZ=America/New_York
```

### Plex Token Setup

To get your Plex token for watchlist synchronization:

1. Open Plex Web (localhost:32400) in your browser
2. Navigate to any library item (movie or show)
3. Click "Get Info" → "View XML"
4. Copy the `X-Plex-Token` parameter from the URL
5. Add it to your `.env` file as `PLEX_TOKEN=your_token_here`

**Note**: Uses Cloudflare WARP VPN by default (no configuration needed)

## 🗂️ Directory Structure

```
torrents/
├── docker-compose.yml      # Service orchestration
├── .env                   # Environment configuration
├── config/                # Persistent service configurations
│   ├── plex/             # Plex Media Server settings
│   ├── prowlarr/         # Indexer configurations
│   ├── qbittorrent/     # Torrent client settings
│   ├── sonarr/           # TV series automation
│   ├── radarr/           # Movie automation
│   └── watchlistarr/     # Watchlist sync configuration
├── data/                 # Media and download storage
│   ├── downloads/        # Active and completed downloads
│   │   ├── incomplete/   # Downloads in progress
│   │   └── complete/     # Finished downloads
│   ├── media/            # Organized media for Plex
│   │   ├── movies/       # Movie library
│   │   └── tv/           # TV series library
│   └── torrents/         # Stored .torrent files
└── web-ui/               # React dashboard application
```

## 🔧 Service Management

### Start Services
```bash
docker-compose up -d
```

### Check Status
```bash
docker-compose ps
```

### View Logs
```bash
docker-compose logs [service-name]
# Example: docker-compose logs plex
```

### Stop Services
```bash
docker-compose down
```

### Restart a Service
```bash
docker-compose restart [service-name]
```

## 🔍 Troubleshooting

### VPN Connection Issues
```bash
# Check VPN container logs
docker logs vpn

# Verify VPN is working
docker exec qbittorrent curl ipinfo.io

# Should show VPN provider's IP, not your real IP
```

### Service Health Checks
```bash
# Check if services are healthy
docker-compose ps

# All services should show "healthy" status
```

### Permission Issues
```bash
# Fix directory permissions
sudo chown -R 1000:1000 config/ data/
sudo chmod -R 755 config/ data/
```

### Port Conflicts
If you get port conflicts, update the port mappings in `docker-compose.yml`:
```yaml
ports:
  - "32401:32400"  # Change 32400 to 32401 if needed
```

## 🌐 Web UI Development

The web UI is a Next.js React application. To develop locally:

```bash
cd web-ui
npm install
npm run dev
```

For production builds:
```bash
npm run build
docker-compose up -d --build web-ui
```

## 🔐 Security Notes

- **VPN Required**: Never run without VPN - torrent traffic should always be protected
- **Change Default Passwords**: Update qBittorrent password in `.env`
- **Local Network Only**: Services are configured for LAN access only
- **Regular Updates**: Keep containers updated with `docker-compose pull`

## 🎯 Success Criteria

Your setup is working correctly when:

- ✅ All Docker containers show "healthy" status
- ✅ VPN connection is active (different IP from host)
- ✅ Plex accessible at localhost:32400  
- ✅ Prowlarr accessible at localhost:9696
- ✅ qBittorrent accessible at localhost:8080
- ✅ Directory structure created with proper permissions
- ✅ Services can communicate via Docker network

## 🛠️ Manual Processing Scripts

Convenience scripts are available for manual triggering of media processing:

### Trigger Plex Organization
```bash
./scripts/trigger-plex-organization.sh [filename]
```
- Triggers the full Plex organization process for a specific file
- Without arguments, lists all available files for processing

### Refresh Plex Library
```bash
./scripts/refresh-plex-library.sh [library_id]
```
- Manually triggers a Plex library refresh
- Without arguments, lists all available libraries with their IDs

### Process Recent Downloads
```bash
./scripts/process-recent-downloads.sh
```
- Processes all media files in the downloads directory
- Runs the full organization pipeline for each file

See `scripts/` directory for detailed usage of each script.

## 📚 Additional Resources

- [Plex Documentation](https://support.plex.tv/)
- [Prowlarr Wiki](https://wiki.servarr.com/prowlarr)
- [Sonarr/Radarr Setup](https://wiki.servarr.com/)
- [qBittorrent Guide](https://github.com/qbittorrent/qBittorrent/wiki)

## 🤝 Contributing

This infrastructure is part of a larger media automation project. Contributions welcome for:
- Docker configuration improvements
- Web UI enhancements  
- Documentation updates
- Bug fixes and optimizations

---

⚡ **Generated with [Claude Code](https://claude.ai/code)**