# Media Organization Configuration Reference

## Overview

This document provides comprehensive configuration details for automated media organization using Radarr and Sonarr with qBittorrent integration, specifically for the torrents-plex-organization project.

## qBittorrent Category Configuration

### Required Categories

```bash
# Categories that must be configured for proper automation
"radarr"  -> /downloads/movies  # Managed by Radarr
"sonarr"  -> /downloads/tv      # Managed by Sonarr
```

### API Configuration Commands

```bash
# Create Radarr category
curl -X POST "http://nginx-proxy:8080/api/v2/torrents/createCategory" \
  -d "category=radarr&savePath=/downloads/movies"

# Create Sonarr category
curl -X POST "http://nginx-proxy:8080/api/v2/torrents/createCategory" \
  -d "category=sonarr&savePath=/downloads/tv"
```

## Radarr Database Schema

### DownloadClients Table Configuration

```sql
-- Required configuration in radarr.db.template
INSERT INTO DownloadClients (
  Enable, Name, Implementation, Settings, ConfigContract
) VALUES (
  1,
  'qBittorrent',
  'QBittorrent',
  '{"host":"nginx-proxy","port":8080,"category":"radarr","priority":0,"removeCompletedDownloads":false,"removeFailedDownloads":true}',
  'QBittorrentSettings'
);
```

### RootFolders Configuration

```sql
-- Root folder for movies
INSERT INTO RootFolders (Path) VALUES ('/movies');
```

### Naming Configuration

```sql
-- Movie naming format for Plex compatibility
UPDATE NamingConfig SET
  RenameMovies = 1,
  StandardMovieFormat = '{Movie Title} ({Release Year}) - {Quality Full}',
  MovieFolderFormat = '{Movie Title} ({Release Year})';
```

## Sonarr Database Schema

### DownloadClients Table Configuration

```sql
-- Required configuration in sonarr.db.template
INSERT INTO DownloadClients (
  Enable, Name, Implementation, Settings, ConfigContract
) VALUES (
  1,
  'qBittorrent',
  'QBittorrent',
  '{"host":"nginx-proxy","port":8080,"category":"sonarr","priority":0,"removeCompletedDownloads":false,"removeFailedDownloads":true}',
  'QBittorrentSettings'
);
```

### RootFolders Configuration

```sql
-- Root folder for TV shows
INSERT INTO RootFolders (Path) VALUES ('/tv');
```

### Naming Configuration

```sql
-- TV show naming format with season folders
UPDATE NamingConfig SET
  RenameEpisodes = 1,
  StandardEpisodeFormat = '{Series Title} - S{season:00}E{episode:00} - {Episode Title}',
  SeasonFolderFormat = 'Season {season:00}';
```

## Docker Volume Mappings

### Correct Volume Structure (Already Configured)

```yaml
# Radarr service
volumes:
  - ${DOWNLOADS_ROOT:-./data/downloads}:/downloads  # Download monitoring
  - ${MEDIA_ROOT:-./data/media}/movies:/movies      # Organized movies

# Sonarr service
volumes:
  - ${DOWNLOADS_ROOT:-./data/downloads}:/downloads  # Download monitoring
  - ${MEDIA_ROOT:-./data/media}/tv:/tv              # Organized TV shows

# qBittorrent service
volumes:
  - ${DOWNLOADS_ROOT:-./data/downloads}:/downloads  # Download destination

# Plex service
volumes:
  - ${MEDIA_ROOT:-./data/media}:/media              # Media library
```

## API Endpoints for Validation

### qBittorrent API

```bash
# Get categories
GET http://nginx-proxy:8080/api/v2/torrents/categories

# Get torrent list with categories
GET http://nginx-proxy:8080/api/v2/torrents/info

# Add torrent with category
POST http://nginx-proxy:8080/api/v2/torrents/add
Content-Type: multipart/form-data
category=radarr&urls=magnet:...
```

### Radarr API

```bash
# Get download clients
GET http://radarr:7878/api/v3/downloadclient
X-Api-Key: 1896856646174be29ab7cca907e77458

# Get root folders
GET http://radarr:7878/api/v3/rootfolder
X-Api-Key: 1896856646174be29ab7cca907e77458

# Get system status
GET http://radarr:7878/api/v3/system/status
X-Api-Key: 1896856646174be29ab7cca907e77458
```

### Sonarr API

```bash
# Get download clients
GET http://sonarr:8989/api/v3/downloadclient
X-Api-Key: afde353290c6439497772562330d4eb0

# Get root folders
GET http://sonarr:8989/api/v3/rootfolder
X-Api-Key: afde353290c6439497772562330d4eb0

# Get system status
GET http://sonarr:8989/api/v3/system/status
X-Api-Key: afde353290c6439497772562330d4eb0
```

## Workflow Automation

### Expected Automation Flow

1. **Download Initiation**: Radarr/Sonarr sends torrent to qBittorrent with category
2. **Category Assignment**: qBittorrent saves to category-specific download path
3. **Completion Detection**: Radarr/Sonarr monitors download client for completion
4. **File Organization**: Radarr/Sonarr moves/hardlinks files to media directories
5. **Library Refresh**: Web UI detects completion and triggers Plex library refresh

### File Organization Patterns

```bash
# Movies (Radarr)
/downloads/movies/Movie.Title.2023.1080p.BluRay.x264/
└── Movie.Title.2023.1080p.BluRay.x264.mkv

# Organized to:
/data/media/movies/Movie Title (2023)/
└── Movie Title (2023) - Bluray-1080p.mkv

# TV Shows (Sonarr)
/downloads/tv/Show.Name.S01E01.1080p.WEB.h264/
└── Show.Name.S01E01.1080p.WEB.h264.mkv

# Organized to:
/data/media/tv/Show Name (2020)/Season 01/
└── Show Name - S01E01 - Episode Title.mkv
```

## Troubleshooting

### Common Issues

**Categories Not Creating Downloads:**
- Verify qBittorrent category configuration
- Check download client settings in Radarr/Sonarr
- Ensure nginx-proxy:8080 endpoint is accessible

**Files Not Organizing:**
- Verify root folder configuration in *arr services
- Check volume mappings enable hardlinks (same filesystem)
- Ensure download completion detection is working

**Permission Issues:**
- All services run as PUID=1000, PGID=1000
- Verify file ownership matches across containers
- Check UMASK settings for proper permissions

### Validation Commands

```bash
# Test qBittorrent categories
curl -s "http://localhost:25861/api/v2/torrents/categories" | jq .

# Test Radarr download client
curl -s "http://localhost:25860/api/v3/downloadclient" \
  -H "X-Api-Key: 1896856646174be29ab7cca907e77458" | jq .

# Test Sonarr download client
curl -s "http://localhost:34245/api/v3/downloadclient" \
  -H "X-Api-Key: afde353290c6439497772562330d4eb0" | jq .

# Verify hardlink capability
echo "test" > /data/downloads/test.txt
ln /data/downloads/test.txt /data/media/test.txt
ls -i /data/downloads/test.txt /data/media/test.txt  # Should show same inode
```

## Security Considerations

### VPN Isolation

- qBittorrent MUST remain on VPN network via `network_mode: "container:vpn"`
- Radarr/Sonarr communicate via media_network only
- Download client access through nginx-proxy maintains isolation

### Database Security

- Template databases contain no sensitive information
- API keys are injected via environment variables
- No hardcoded credentials in templates

### Network Access

- Internal service communication via Docker networks
- External access only through nginx reverse proxy
- Authentication disabled for local network addresses only